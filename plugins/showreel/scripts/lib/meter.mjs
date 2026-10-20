import { appendFileSync, existsSync, readFileSync, renameSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectDir } from './paths.mjs';

export const SIMPLE_BUDGET_TOKENS = 6000;
export const OUTPUT_CAP_TOKENS = 1200;
export const ROTATE_BYTES = 1_000_000;
// UTF-8 bytes / 4 is a deterministic estimate, not a model tokenizer.
export const estimateTokens = text => Math.ceil(Buffer.byteLength(text) / 4);
export const countLines = text => text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
export const STAGES = ['intake', 'guide', 'storyboard', 'scenario', 'record', 'edit/render', 'voice', 'other'];
export function stageFor(command) {
  const first = command.split(' ')[0];
  return ({ brief: 'intake', init: 'intake', guide: 'guide', snapshot: 'guide', storyboard: 'storyboard', scenario: 'scenario', record: 'record', login: 'record', runs: 'record', edit: 'edit/render', render: 'edit/render', composition: 'edit/render', scenes: 'edit/render', brand: 'edit/render', voice: 'voice' })[first] ?? 'other';
}
export function appendSurface(dir, entry) {
  try {
    const file = path.join(dir, 'surface.jsonl');
    const line = JSON.stringify(entry) + '\n';
    if (Buffer.byteLength(line) > ROTATE_BYTES) return;
    if (existsSync(file) && statSync(file).size + Buffer.byteLength(line) > ROTATE_BYTES) renameSync(file, file + '.1');
    // One O_APPEND write publishes one complete line. Never store output or argument content.
    appendFileSync(file, line, { flag: 'a', mode: 0o600 });
  } catch { /* Meter failures must never change a command's result. */ }
}
export function readSurface(dir) {
  return ['surface.jsonl.1', 'surface.jsonl'].flatMap(name => {
    try { return readFileSync(path.join(dir, name), 'utf8').split('\n').filter(Boolean).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } }); }
    catch { return []; }
  });
}
function authoredFiles(dir, args, exitCode) {
  const command = args.slice(0, 2).join(' ');
  try {
    if (args[0] === 'make' && !exitCode) {
      // Claude authors the plan; brief/storyboard/scenario are generated from it.
      const at = args.indexOf('--plan');
      return at < 0 ? [] : [{ path: 'plan.json', bytes: statSync(args[at + 1]).size }];
    }
    if (command === 'brief set') {
      if (exitCode) return [];
      const brief = JSON.parse(readFileSync(path.join(dir, 'brief.json'), 'utf8'));
      const bytes = args.slice(2).filter(a => !a.startsWith('--') && a.includes('=')).reduce((n, pair) => {
        const value = pair.slice(0, pair.indexOf('=')).split('.').reduce((v, k) => v?.[k], brief);
        return n + Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value) ?? '');
      }, 0);
      return [{ path: 'brief.json', bytes }];
    }
    if (['storyboard validate', 'scenario build', 'scenario validate'].includes(command)) {
      const file = command === 'scenario validate' ? 'scenario.json' : 'storyboard.json';
      const data = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
      const bytes = (data.steps ?? []).reduce((n, s) => n + ['caption', 'narration'].reduce((m, k) => m + (typeof s[k] === 'string' ? Buffer.byteLength(s[k]) : 0), 0), 0);
      return [{ path: file, bytes }];
    }
  } catch { /* Missing or invalid authored files are not measured. */ }
  return [];
}
export async function meteredRun(args, run) {
  let dir;
  try {
    const at = args.indexOf('--name');
    if (at >= 0) dir = projectDir(args[at + 1]);
    else if (existsSync(path.join(process.cwd(), 'brief.json')) && path.basename(path.dirname(process.cwd())) === 'projects') dir = process.cwd();
  } catch { /* Let the command report invalid names. */ }
  if (!dir || process.env.SHOWREEL_METER === '0') return run();
  const counts = { stdoutBytes: 0, stderrBytes: 0 }, originals = {};
  for (const stream of ['stdout', 'stderr']) {
    originals[stream] = process[stream].write;
    process[stream].write = function(chunk, encoding, callback) {
      counts[`${stream}Bytes`] += typeof chunk === 'string' ? Buffer.byteLength(chunk, typeof encoding === 'string' ? encoding : 'utf8') : chunk.byteLength;
      return originals[stream].call(this, chunk, encoding, callback);
    };
  }
  try { return await run(); }
  finally {
    for (const stream of ['stdout', 'stderr']) process[stream].write = originals[stream];
    if (!(args[0] === 'tokens' && args.includes('--reset'))) {
      const exitCode = Number(process.exitCode ?? 0);
      const commands = ['make', 'tokens', 'doctor', 'init', 'brief', 'storyboard', 'scenario', 'guide', 'snapshot', 'record', 'login', 'runs', 'render', 'edit', 'composition', 'voice', 'scenes', 'brand', 'cursor-demo', '--help'];
      const subs = ['init', 'show', 'set', 'questions', 'draft', 'validate', 'build', 'resolve', 'add', 'list', 'remove', 'move', 'reset', 'install', 'samples', 'generate', 'status', 'import', 'clean', 'apply', 'clear'];
      const command = (commands.includes(args[0]) ? args[0] : 'unknown') + (subs.includes(args[1]) ? ` ${args[1]}` : '');
      const files = authoredFiles(dir, args, exitCode);
      appendSurface(dir, { v: 1, t: new Date().toISOString(), command, ...counts, estTokens: Math.ceil((counts.stdoutBytes + counts.stderrBytes) / 4), authored: { files }, claudeWrittenTokens: Math.ceil(files.reduce((n, f) => n + f.bytes, 0) / 4), exitCode });
    }
  }
}
export function aggregateSurface(entries, { budget = SIMPLE_BUDGET_TOKENS, skillTokens = 0 } = {}) {
  const stages = Object.fromEntries(STAGES.map(stage => [stage, { claudeReadTokens: 0, claudeWrittenTokens: 0 }]));
  const latest = new Map();
  const hasStoryboard = entries.some(e => e.authored?.files?.some(f => f.path === 'storyboard.json'));
  for (const row of entries) {
    const stage = stageFor(row.command ?? '');
    stages[stage].claudeReadTokens += Number(row.estTokens) || 0;
    for (const f of row.authored?.files ?? []) {
      // Brief assignments are incremental; generated scenario prose is the same storyboard text.
      if (f.path === 'brief.json') stages.intake.claudeWrittenTokens += Math.ceil(f.bytes / 4);
      else if (f.path !== 'scenario.json') latest.set(f.path, { stage: f.path === 'storyboard.json' ? 'storyboard' : stage, bytes: f.bytes });
      else if (!hasStoryboard) latest.set(f.path, { stage, bytes: f.bytes });
    }
  }
  for (const { stage, bytes } of latest.values()) stages[stage].claudeWrittenTokens += Math.ceil(bytes / 4);
  const claudeReadTokens = Object.values(stages).reduce((n, s) => n + s.claudeReadTokens, 0);
  const claudeWrittenTokens = Object.values(stages).reduce((n, s) => n + s.claudeWrittenTokens, 0);
  const totalTokens = claudeReadTokens + claudeWrittenTokens + skillTokens;
  return { stages, claudeReadTokens, claudeWrittenTokens, skillLoadTokens: skillTokens, totalTokens, budget, pass: totalTokens <= budget };
}
export function tokensCommand(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!['--name', '--budget', '--json', '--skill', '--reset'].includes(flag) || Object.hasOwn(options, flag)) throw new Error(`Invalid option: ${flag}`);
    if (['--json', '--skill', '--reset'].includes(flag)) options[flag] = true;
    else {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for ${flag}`);
      options[flag] = args[++i];
    }
  }
  const dir = projectDir(options['--name']);
  if (options['--reset']) { for (const file of ['surface.jsonl', 'surface.jsonl.1']) { try { unlinkSync(path.join(dir, file)); } catch (e) { if (e.code !== 'ENOENT') throw e; } } console.log('meter reset'); return; }
  const budget = options['--budget'] === undefined ? SIMPLE_BUDGET_TOKENS : Number(options['--budget']);
  if (!Number.isFinite(budget) || budget < 0) throw new Error('--budget must be a non-negative number');
  const skillTokens = options['--skill'] ? estimateTokens(readFileSync(fileURLToPath(new URL('../../skills/showreel/SKILL.md', import.meta.url)), 'utf8')) : 0;
  const report = aggregateSurface(readSurface(dir), { budget, skillTokens });
  console.log(options['--json'] ? JSON.stringify(report, null, 2) : ['stage          read  written', ...Object.entries(report.stages).map(([s, v]) => `${s.padEnd(14)} ${v.claudeReadTokens}  ${v.claudeWrittenTokens}`), `skill load: ${report.skillLoadTokens}`, `total: ${report.totalTokens}/${budget} ${report.pass ? 'PASS' : 'FAIL'} (estimated tokens)`].join('\n'));
  process.exitCode = report.pass ? 0 : 1;
}
