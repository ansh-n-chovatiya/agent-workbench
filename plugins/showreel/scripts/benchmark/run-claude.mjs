#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFixtureServer } from '../lib/fixture-server.mjs';
import { readSurface } from '../lib/meter.mjs';
import { PLUGIN_ROOT } from '../lib/env.mjs';
import { parseUsage, redact, summarize, validateScenario, marginalFreshTokens } from './metrics.mjs';

const script = fileURLToPath(import.meta.url);
export function parseArgs(args) {
  const options = { runs: 3, skill: 'showreel', model: 'sonnet' };
  for (let i = 0; i < args.length; i++) {
    const key = args[i].slice(2);
    if (!args[i].startsWith('--') || !['scenario', 'runs', 'skill', 'model', 'out'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Usage: --scenario simple|hard [--runs 3] [--skill showreel|demo-video] [--model M] [--out report.json]');
    options[key] = args[++i];
  }
  options.runs = Number(options.runs);
  if (!['simple', 'hard'].includes(options.scenario) || !['showreel', 'demo-video'].includes(options.skill) || !Number.isSafeInteger(options.runs) || options.runs < 1) throw new Error('Invalid scenario, skill, or run count');
  return options;
}

// Async child execution keeps the in-process fixture HTTP server responsive.
// Capture output privately: Claude stdout/stderr may contain secret tool output.
export function execute(command, args, { cwd, env = process.env, timeoutMs = 20 * 60_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    let stdout = '', stderr = '', failure = null, bytes = 0;
    const stop = () => {
      try { if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch {}
    };
    const timer = setTimeout(() => { failure = 'Command timed out'; stop(); }, timeoutMs);
    for (const [stream, key] of [[child.stdout, 'stdout'], [child.stderr, 'stderr']]) {
      stream.on('data', (data) => {
        bytes += data.length;
        if (bytes > 64 * 1024 * 1024) { failure = 'Command output exceeded 64 MiB'; stop(); return; }
        if (key === 'stdout') stdout += data; else stderr += data;
      });
    }
    child.on('error', () => { failure = 'Command could not start'; });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, failure }); });
  });
}

export async function permissionArgs(help, { cwd, tempRoot, env = process.env, warn = console.error }) {
  const modes = help.match(/--permission-mode[\s\S]*?(?=\n\s+--|$)/)?.[0] ?? '';
  if (/\bdontAsk\b/.test(modes) && /--allowedTools\b|--allowed-tools\b/.test(help)) {
    return ['--permission-mode', 'dontAsk', '--allowedTools', 'Bash,Read,Write,Edit,Skill'];
  }
  if (env.BENCH_ALLOW_SKIP_PERMS !== '1' || !help.includes('--dangerously-skip-permissions')) {
    throw new Error('Claude lacks dontAsk with explicit tool allowances. Refusing permission bypass. Only in the temporary benchmark directory, BENCH_ALLOW_SKIP_PERMS=1 explicitly opts in to --dangerously-skip-permissions.');
  }
  const root = await realpath(tempRoot), working = await realpath(cwd), temp = await realpath(tmpdir());
  const relative = path.relative(root, working);
  if (path.dirname(root) !== temp || !path.basename(root).startsWith('showreel-bench-') || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Permission bypass is restricted to the temporary benchmark directory');
  warn('WARNING: BENCH_ALLOW_SKIP_PERMS=1 enables --dangerously-skip-permissions inside the temporary benchmark directory. Claude tools have unrestricted permissions; this is not an OS sandbox.');
  return ['--dangerously-skip-permissions'];
}

export async function preflight({ cwd, env, model, exec = execute }) {
  const response = await exec('claude', ['-p', 'ok', '--output-format', 'json', '--model', model, '--tools', ''], { cwd, env, timeoutMs: 60_000 });
  try {
    if (response.code !== 0 || response.failure || parseUsage(response.stdout).isError) throw new Error();
  } catch {
    throw new Error('Benchmark requires network access and logged-in Claude Code. The claude -p "ok" check failed; sign in with Claude and verify connectivity before retrying. No benchmark runs started.');
  }
}

export async function loadScenario(id) {
  if (!['simple', 'hard'].includes(id)) throw new Error('Unknown scenario');
  return validateScenario(JSON.parse(await readFile(new URL(`scenarios/${id}.json`, import.meta.url), 'utf8')));
}
export function makePrompt(scenario, { skill, url, project, exports }) {
  const values = { skill, url, project, exports, loginCommand: skill === 'showreel'
    ? `showreel login --name ${project} --url ${url}/login`
    : 'the demo-video login command with the login URL in its config' };
  return scenario.prompt.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]);
}
export function makeFloorPrompt(skill) {
  return `Invoke the ${skill} skill, do nothing else, then reply with the single word OK.`;
}
export async function hasExport(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true }).catch((err) => { if (err.code === 'ENOENT') return []; throw err; })) {
    const file = path.join(dir, entry.name);
    if (entry.isFile() && /\.mp4$/i.test(entry.name)) {
      if ((await stat(file)).size > 0) return true;
    }
    if (entry.isDirectory() && await hasExport(file)) return true;
  }
  return false;
}
export async function surfaceMeter(home, skill, env, cwd, exec = execute) {
  if (skill !== 'showreel') return { status: 'not-applicable', projects: [] };
  const projects = [];
  const entries = await readdir(path.join(home, 'projects'), { withFileTypes: true }).catch((err) => { if (err.code === 'ENOENT') return []; throw err; });
  for (const entry of entries.filter((item) => item.isDirectory())) {
    // Count before the harness's tokens query appends its own surface entry.
    const surfaceFile = path.join(home, 'projects', entry.name);
    const entries = readSurface(surfaceFile);
    const recorded = await stat(path.join(surfaceFile, 'surface.jsonl')).then(() => true, () => false);
    const commandCount = recorded ? entries.filter((row) => typeof row.command === 'string').length : null;
    const result = await exec(process.execPath, [path.join(PLUGIN_ROOT, 'scripts/showreel.mjs'), 'tokens', '--name', entry.name, '--json'], { cwd, env, timeoutMs: 30_000 });
    try {
      // A valid meter can exit 1 when its surface budget fails. Keep those totals.
      if (![0, 1].includes(result.code) || result.failure) throw new Error();
      const totals = JSON.parse(result.stdout);
      if (!totals || typeof totals !== 'object' || Array.isArray(totals)) throw new Error();
      projects.push({ name: entry.name, status: 'ok', totals, commandCount });
    } catch { projects.push({ name: entry.name, status: 'unavailable', commandCount, reason: 'showreel tokens --json failed or is not installed (Phase 8 T1)' }); }
  }
  return { status: projects.length ? (projects.every((p) => p.status === 'ok') ? 'ok' : 'unavailable') : 'no-project', projects };
}

export async function runBenchmark(options, {
  exec = execute, startServer = startFixtureServer,
  createTemp = () => mkdtemp(path.join(tmpdir(), 'showreel-bench-')),
  environment = process.env, log = console.log, warn = console.error,
} = {}) {
  const scenario = await loadScenario(options.scenario);
  const root = await createTemp();
  // Preserve Claude's real auth location; isolate only video state, not OS HOME.
  const env = { ...environment, SHOWREEL_HOME: path.join(root, 'preflight-home') };
  let server;
  try {
    const help = await exec('claude', ['--help'], { cwd: root, env, timeoutMs: 15_000 });
    if (help.code !== 0 || help.failure) throw new Error('Claude Code is unavailable. Install/sign in to Claude and enable network access before running this manual benchmark.');
    const permissions = await permissionArgs(help.stdout, { cwd: root, tempRoot: root, env, warn });
    await preflight({ cwd: root, env, model: options.model, exec });
    const plugin = options.skill === 'showreel' ? PLUGIN_ROOT : path.resolve(PLUGIN_ROOT, '../skills-demo');
    const claudeArgs = (prompt) => ['-p', prompt, '--output-format', 'json', '--plugin-dir', plugin, '--model', options.model, ...permissions];
    const floorStart = Date.now();
    const floorResult = await exec('claude', claudeArgs(makeFloorPrompt(options.skill)), { cwd: root, env });
    let floor;
    try {
      const { transcript, ...usage } = parseUsage(floorResult.stdout);
      if (floorResult.code !== 0 || floorResult.failure || usage.isError) throw new Error();
      floor = { ...usage, kind: 'skill-activation', skill: options.skill, durationMs: Date.now() - floorStart };
    } catch { throw new Error('Benchmark floor measurement failed; no scenario runs started.'); }
    server = await startServer();
    const runs = [], started = Date.now();
    for (let i = 0; i < options.runs; i++) {
      const cwd = path.join(root, `run-${i + 1}`), home = path.join(cwd, 'home'), exports = path.join(home, 'exports');
      await mkdir(exports, { recursive: true });
      const runEnv = { ...env, SHOWREEL_HOME: home, DEMO_VIDEO_HOME: path.join(home, 'demo-video'), DEMO_VIDEO_DELIVER: exports,
        SHOWREEL_SECRET_S2: env.SHOWREEL_SECRET_S2 || randomBytes(24).toString('hex') };
      const project = `bench-${scenario.id}-${i + 1}`;
      const prompt = makePrompt(scenario, { skill: options.skill, url: server.url, project, exports });
      const t0 = Date.now();
      const result = await exec('claude', claudeArgs(prompt), { cwd, env: runEnv });
      const durationMs = Date.now() - t0;
      let run;
      try {
        const { transcript, ...usage } = parseUsage(result.stdout);
        const marker = /(?:^|\n)\s*Final video:\s*\S/m.test(transcript), mp4 = await hasExport(exports);
        const ok = result.code === 0 && !result.failure && !usage.isError && (marker || mp4);
        run = { ...usage, ok, evidence: { finalVideoMarker: marker, exportedMp4: mp4 },
          failure: ok ? null : (result.failure ?? (result.code !== 0 ? 'Claude exited unsuccessfully' : 'Claude error or no final video')) };
      } catch { run = { ok: false, failure: result.failure ?? 'Claude returned invalid JSON usage' }; }
      run = { index: i + 1, ...run, durationMs, surface: await surfaceMeter(home, options.skill, runEnv, cwd, exec) };
      const counts = run.surface.projects.map((project) => project.commandCount);
      const fallback = counts.length && counts.every((count) => Number.isSafeInteger(count)) ? counts.reduce((a, b) => a + b, 0) : null;
      run.floorFreshTokens = floor.freshTokens;
      run.marginalFreshTokens = marginalFreshTokens(run.freshTokens, floor.freshTokens);
      run.turnsSource = run.turns !== null && run.turns !== undefined ? 'num_turns' : fallback !== null ? 'surface-commands (partial)' : 'unavailable';
      run.turns ??= fallback;
      // Never persist the transcript, raw stderr, or prompt (which contains paths).
      runs.push(JSON.parse(redact(run, runEnv)));
      log(`Run ${i + 1}/${options.runs}: ${run.ok ? 'PASS' : 'FAIL'} (${(durationMs / 1000).toFixed(1)} s)`);
    }
    const report = { version: 2, floor, scenario: scenario.id, skill: options.skill, model: options.model, expectedSteps: scenario.expectedSteps,
      budget: scenario.budget, baseline: scenario.baseline, createdAt: new Date().toISOString(),
      wallTimeMs: Date.now() - started, okRuns: runs.filter((r) => r.ok).length, runs, median: summarize(runs),
      notes: ['Medians include successful videos only; step counts are prompt requirements, not independently verified.',
        'Floor activates the selected skill once with the same model/plugin/flags; marginal fresh = max(0, fresh - floor fresh). Surface fallback counts only recorded commands, not all tools.',
        'Preflight and floor usage are excluded from video usage and batch wall time. Temporary video state is retained for inspection.',
        'Hard scenario login currently requires an operator in the login window.'] };
    const out = path.resolve(options.out ?? `benchmark-${scenario.id}-${options.skill}.json`);
    await writeFile(out, redact(report, env) + '\n', { mode: 0o600 });
    log(`Report written. Passing videos: ${report.okRuns}/${runs.length}.`);
    return report;
  } finally { await server?.close(); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === script) {
  try {
    const report = await runBenchmark(parseArgs(process.argv.slice(2)));
    if (!report.okRuns) process.exitCode = 1;
  } catch (error) { console.error(redact(error.message)); process.exitCode = 1; }
}
