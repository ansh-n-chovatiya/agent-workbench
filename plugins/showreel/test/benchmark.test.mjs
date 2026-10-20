import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { median, freshTokens, parseUsage, summarize, redact, validateScenario, marginalFreshTokens } from '../scripts/benchmark/metrics.mjs';
import { parseArgs, permissionArgs, preflight, loadScenario, makePrompt, makeFloorPrompt, hasExport, surfaceMeter, execute } from '../scripts/benchmark/run-claude.mjs';
import { budgetPass, delta, renderReport, main as reportMain } from '../scripts/benchmark/report.mjs';
import { startFixtureServer } from '../scripts/lib/fixture-server.mjs';
const sample = await readFile(new URL('./fixtures/claude-benchmark-result.json', import.meta.url), 'utf8');
const floorSample = await readFile(new URL('./fixtures/claude-benchmark-floor.json', import.meta.url), 'utf8');
const metrics = parseUsage(sample);
const good = { index: 1, ...metrics, ok: true, durationMs: 62000, floorFreshTokens: 39000, marginalFreshTokens: 3380, turnsSource: 'num_turns',
  surface: { status: 'ok', projects: [{ name: 'bench', status: 'ok', totals: { totalEstTokens: 4321, claudeWrittenBytes: 123 } }] } };
const temporary = async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'showreel-bench-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
};

test('median and fresh-token math match B0; failed runs never influence medians', () => {
  assert.equal(median([]), null);
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 2]), 3);
  assert.equal(freshTokens(metrics), 42380);
  assert.equal(summarize([{ ok: false, freshTokens: 1 }]), null);
  const summary = summarize([good, { ...good, input: 18, freshTokens: 42384 }, { ...good, ok: false, freshTokens: 9999999 }]);
  assert.equal(summary.freshTokens, 42382);
  assert.equal(summary.input, 16);
  assert.equal(summarize([{ ...good, input: 0, output: 10, cacheCreate: 0, freshTokens: 10 },
    { ...good, input: 10, output: 0, cacheCreate: 0, freshTokens: 10 },
    { ...good, input: 0, output: 0, cacheCreate: 10, freshTokens: 10 }]).freshTokens, 10);
});

test('parse realistic JSON result and result event array without double-counting modelUsage', () => {
  assert.equal(metrics.input, 14); assert.equal(metrics.output, 1929);
  assert.equal(metrics.cacheCreate, 40437); assert.equal(metrics.cacheRead, 281835);
  assert.equal(metrics.turns, 18); assert.equal(metrics.cacheReadTokens, 281835);
  assert.equal(metrics.costUsd, 0.21); assert.equal(metrics.claudeDurationMs, 61234);
  assert.equal(metrics.apiDurationMs, 48123); assert.match(metrics.transcript, /^Final video:/);
  assert.equal(parseUsage(JSON.stringify([{ type: 'system' }, JSON.parse(sample)])).freshTokens, 42380);
  for (const bad of ['not json', '{}', '{"usage":{"input_tokens":-1,"output_tokens":2}}']) assert.throws(() => parseUsage(bad));
  const missingCache = JSON.parse(sample);
  delete missingCache.usage.cache_creation_input_tokens; delete missingCache.usage.cache_read_input_tokens;
  assert.equal(parseUsage(JSON.stringify(missingCache)).cacheRead, 0);
  for (const turns of [undefined, -1, 1.5, '8']) {
    assert.equal(parseUsage(JSON.stringify({ ...missingCache, num_turns: turns })).turns, null);
  }
});

test('scenarios have exact budgets, steps, baselines and safe prompt substitutions', async () => {
  const simple = await loadScenario('simple'), hard = await loadScenario('hard');
  assert.deepEqual(simple.budget, { marginalFreshTokens: 4000, costUsd: 0.15, cacheReadTokens: 250000, turns: 5, durationMs: 90000 });
  assert.deepEqual(simple.baseline, { freshTokens: 42380, costUsd: 0.21, durationMs: 61000, cacheReadTokens: 281835 });
  assert.deepEqual(hard.budget, { marginalFreshTokens: 12000, costUsd: 0.30, cacheReadTokens: 600000, turns: 14, durationMs: 150000 });
  assert.equal(hard.baseline, null); assert.equal(hard.expectedSteps, 12);
  const prompt = makePrompt(hard, { skill: 'showreel', url: 'http://fixture', project: 'bench', exports: '/tmp/exports' });
  assert.match(prompt, /showreel login --name bench --url http:\/\/fixture\/login/);
  assert.match(prompt, /SHOWREEL_SECRET_S2/); assert.match(prompt, /scroll down once/);
  assert.doesNotMatch(prompt, /\{\{/);
  assert.match(makePrompt(hard, { skill: 'demo-video', url: 'http://fixture', project: 'bench', exports: '/tmp' }), /demo-video login command/);
  assert.throws(() => validateScenario({ ...simple, expectedSteps: 12 }));
  assert.throws(() => validateScenario({ ...hard, budget: { freshTokens: -1 } }));
  await assert.rejects(loadScenario('../simple'));
});

test('CLI rejects invalid options and defaults to median-of-three with sonnet', () => {
  assert.deepEqual(parseArgs(['--scenario', 'simple']), { scenario: 'simple', runs: 3, skill: 'showreel', model: 'sonnet' });
  assert.equal(parseArgs(['--scenario', 'hard', '--skill', 'demo-video', '--runs', '2']).runs, 2);
  for (const args of [[], ['--scenario', 'unknown'], ['--scenario', 'hard', '--runs', '0'], ['--scenario', 'simple', '--runs', '1.5'], ['--scenario', 'simple', '--skip']]) assert.throws(() => parseArgs(args));
});

test('headless permission discovery refuses implicit bypass and restricts explicit fallback to temp cwd', async (t) => {
  const root = await temporary(t), warnings = [];
  const common = { cwd: root, tempRoot: root, env: {}, warn: (s) => warnings.push(s) };
  const help = '--permission-mode <mode> choices: "dontAsk", "bypassPermissions"\n  --allowedTools <tools>\n  --dangerously-skip-permissions';
  assert.deepEqual(await permissionArgs(help, common), ['--permission-mode', 'dontAsk', '--allowedTools', 'Bash,Read,Write,Edit,Skill']);
  const fallback = '--dangerously-skip-permissions';
  await assert.rejects(permissionArgs(fallback, common), /Refusing permission bypass/);
  await assert.rejects(permissionArgs('--permission-mode <mode> choices: "bypassPermissions"', common), /Refusing/);
  assert.deepEqual(await permissionArgs(fallback, { ...common, env: { BENCH_ALLOW_SKIP_PERMS: '1' } }), ['--dangerously-skip-permissions']);
  assert.match(warnings[0], /WARNING.*not an OS sandbox/);
  await assert.rejects(permissionArgs(fallback, { ...common, cwd: process.cwd(), env: { BENCH_ALLOW_SKIP_PERMS: '1' } }), /restricted/);
});

test('preflight refuses unavailable network/auth and never echoes provider output', async () => {
  for (const response of [{ code: 1, stderr: 'private-provider-secret' }, { code: 0, stdout: '{}' },
    { code: 0, stdout: JSON.stringify({ ...JSON.parse(sample), is_error: true }) }]) {
    await assert.rejects(preflight({ exec: async () => response, model: 'sonnet' }), (err) => {
      assert.match(err.message, /network access and logged-in Claude/);
      assert.doesNotMatch(err.message, /private-provider-secret/); return true;
    });
  }
  await preflight({ model: 'sonnet', exec: async (cmd, args) => {
    assert.equal(cmd, 'claude'); assert.equal(args[1], 'ok'); assert.equal(args.at(-1), '');
    return { code: 0, stdout: sample };
  } });
});

test('MP4 evidence accepts only nonempty files under exports', async (t) => {
  const root = await temporary(t);
  assert.equal(await hasExport(root), false);
  await mkdir(path.join(root, 'nested'));
  const file = path.join(root, 'nested', 'demo.mp4'); await writeFile(file, '');
  assert.equal(await hasExport(root), false);
  await writeFile(file, 'fixture video bytes'); assert.equal(await hasExport(root), true);
});

test('surface meter queries every project and records missing T1 without inventing totals', async (t) => {
  const root = await temporary(t);
  for (const project of ['one', 'two']) await mkdir(path.join(root, 'projects', project), { recursive: true });
  const seen = [];
  const surface = await surfaceMeter(root, 'showreel', {}, root, async (_, args) => {
    seen.push(args);
    return args.includes('one') ? { code: 0, stdout: '{"totalEstTokens":123}' } : { code: 1, stdout: 'private secret' };
  });
  assert.equal(seen.length, 2); assert.deepEqual(seen[0].slice(1, 3), ['tokens', '--name']);
  assert.equal(surface.status, 'unavailable');
  assert.equal(surface.projects.find((p) => p.name === 'one').totals.totalEstTokens, 123);
  assert.equal(surface.projects.find((p) => p.name === 'two').totals, undefined);
  assert.doesNotMatch(JSON.stringify(surface), /private secret/);
  assert.equal((await surfaceMeter(root, 'demo-video')).status, 'not-applicable');
});

test('secret redaction covers raw, escaped, URL encoded and nested values without breaking numbers', () => {
  const secret = 'private "note"/value';
  const env = { SHOWREEL_SECRET_S2: secret, ANTHROPIC_API_KEY: 'api-private', SHOWREEL_HOME: '/tmp/home' };
  const value = { nested: [secret, encodeURIComponent(secret), JSON.stringify(secret)], message: 'api-private', input: 14 };
  const safe = redact(value, env);
  assert.doesNotMatch(safe, /private|value/); assert.equal(JSON.parse(safe).input, 14);
  assert.equal(redact('keep normal text', env), 'keep normal text');
  assert.equal(JSON.parse(redact({ input: 1, result: '1' }, { SECRET: '1' })).input, 1);
});

test('Markdown reports include budget verdicts, medians, deltas, failed runs and surface totals', async (t) => {
  const scenarios = await Promise.all(['simple', 'hard'].map(loadScenario));
  const report = { scenario: 'simple', skill: 'showreel', model: 'sonnet', wallTimeMs: 90000,
    runs: [good, { ...good, index: 2, ok: false, failure: 'No final video' }] };
  const md = renderReport([report], scenarios);
  for (const pattern of [/42380/, /281835/, /0\.2100/, /FAIL/, /No final video/, /4321/, /90\.0 s/, /hard \(12 steps\)/, /PENDING/, /How to reproduce/]) assert.match(md, pattern);
  assert.equal(delta(25000, 42380), '-41.0%'); assert.equal(delta(1, null), '—');
  assert.equal(budgetPass({ ...scenarios[0].budget }, scenarios[0].budget), true);
  for (const key of Object.keys(scenarios[0].budget)) {
    assert.equal(budgetPass({ ...scenarios[0].budget, [key]: scenarios[0].budget[key] + 1 }, scenarios[0].budget), false);
    assert.equal(budgetPass({ ...scenarios[0].budget, [key]: null }, scenarios[0].budget), false);
  }
  assert.equal(budgetPass(null, scenarios[0].budget), false);
  const hard = { ...report, scenario: 'hard' };
  const withBaseline = renderReport([hard, { ...hard, skill: 'demo-video' }], scenarios);
  assert.match(withBaseline, /old skill measured from supplied files/); assert.match(withBaseline, /0\.0%/);
  const dir = await temporary(t), input = path.join(dir, 'run.json'), output = path.join(dir, 'report.md');
  await writeFile(input, JSON.stringify(report)); await reportMain([input, '--out', output]);
  assert.equal(await readFile(output, 'utf8'), md);
});

test('fixture hard routes authenticate, post settings without reflecting secrets, and serve deterministic pages', async (t) => {
  const server = await startFixtureServer(); t.after(server.close);
  const request = (route, options) => fetch(server.url + route, { redirect: 'manual', ...options });
  const login = await request('/login'); assert.equal(login.status, 200);
  const html = await login.text(); assert.match(html, /name="username"/); assert.match(html, /type="password"/);
  const blocked = await request('/account'); assert.equal(blocked.status, 303); assert.equal(blocked.headers.get('location'), '/login');
  const invalid = await request('/login', { method: 'POST', body: 'username=demo' });
  assert.equal(invalid.status, 400); await invalid.text();
  const accepted = await request('/login', { method: 'POST', body: 'username=demo&password=fixture' });
  assert.equal(accepted.status, 303);
  const cookie = accepted.headers.get('set-cookie'); assert.match(cookie, /HttpOnly; SameSite=Lax; Path=\//);
  const headers = { Cookie: cookie.split(';')[0] };
  const account = await request('/account', { headers }); const body = await account.text();
  assert.equal(account.status, 200); assert.match(body, /<table>/); assert.match(body, /Workspace note/);
  const secret = 'never-reflect-this-value';
  const saved = await request('/account', { method: 'POST', headers, body: `workspace_note=${secret}` });
  assert.equal(saved.status, 303); assert.equal(saved.headers.get('location'), '/account?saved=1');
  const updated = await (await request('/account?saved=1', { headers })).text();
  assert.match(updated, /Settings saved/); assert.ok(!updated.includes(secret));
  const reports = await (await request('/reports')).text();
  assert.equal((reports.match(/href="\/reports\/\d"/g) ?? []).length, 3);
  for (const n of [1, 2, 3]) {
    const detail = await request(`/reports/${n}`); assert.equal(detail.status, 200);
    assert.match(await detail.text(), new RegExp(`Report ${n}:`));
  }
  const missing = await request('/reports/4'); assert.equal(missing.status, 404); await missing.text();
  const long = await (await request('/long')).text();
  assert.match(long, /Final checklist/); assert.equal((long.match(/class="long-chapter"/g) ?? []).length, 4);
  assert.equal((await request('/long', { method: 'HEAD' })).status, 200);
  const method = await request('/reports', { method: 'POST' }); assert.equal(method.status, 405); await method.text();
});

test('async child execution handles failures and timeouts without invoking Claude', async () => {
  const ok = await execute(process.execPath, ['-e', 'process.stdout.write("ok")']);
  assert.equal(ok.code, 0); assert.equal(ok.stdout, 'ok');
  const timeout = await execute(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeoutMs: 50 });
  assert.equal(timeout.failure, 'Command timed out');
  const missing = await execute('showreel-nonexistent-command', []); assert.equal(missing.failure, 'Command could not start');
});

test('runner integrates preflight, isolated runs, successful-only medians, export fallback and old plugin without Claude', async (t) => {
  const { runBenchmark } = await import('../scripts/benchmark/run-claude.mjs');
  const root = await temporary(t), out = path.join(root, 'report.json');
  let videoCalls = 0, closed = false;
  const calls = [], logs = [];
  const report = await runBenchmark({ scenario: 'simple', skill: 'demo-video', model: 'sonnet', runs: 3, out }, {
    createTemp: async () => root,
    environment: { SHOWREEL_SECRET_S2: 'private-bench-secret' },
    log: (s) => logs.push(s),
    startServer: async () => ({ url: 'http://fixture.invalid', close: async () => { closed = true; } }),
    exec: async (cmd, args, opts) => {
      calls.push({ cmd, args, opts });
      if (args[0] === '--help') return { code: 0, stdout: '--permission-mode <mode> choices: "dontAsk"\n  --allowedTools <tools>' };
      if (args[1] === 'ok') return { code: 0, stdout: sample };
      if (args[1] === makeFloorPrompt('demo-video')) {
        return { code: 0, stdout: floorSample };
      }
      videoCalls++;
      const result = JSON.parse(sample);
      if (videoCalls === 2) result.result = 'Render failed';
      if (videoCalls === 3) {
        result.result = 'Rendered successfully';
        await writeFile(path.join(opts.env.DEMO_VIDEO_DELIVER, 'demo.mp4'), 'mp4 bytes');
      }
      return { code: 0, stdout: JSON.stringify(result) };
    },
  });
  assert.equal(closed, true); assert.equal(videoCalls, 3);
  assert.equal(report.floor.freshTokens, 48700);
  assert.equal(report.median.marginalFreshTokens, 0);
  assert.equal(report.runs[0].turns, 18);
  assert.equal(report.runs[0].turnsSource, 'num_turns');
  assert.equal(calls.filter((call) => call.args[1] === makeFloorPrompt('demo-video')).length, 1);
  assert.equal(report.okRuns, 2); assert.equal(report.median.freshTokens, 42380);
  assert.equal(report.runs[0].evidence.finalVideoMarker, true);
  assert.equal(report.runs[1].ok, false);
  assert.equal(report.runs[2].evidence.exportedMp4, true);
  assert.equal(report.runs[0].surface.status, 'not-applicable');
  const runs = calls.filter((call) => call.args.includes('--plugin-dir') && call.args[1] !== makeFloorPrompt('demo-video'));
  const floorCall = calls.find((call) => call.args[1] === makeFloorPrompt('demo-video'));
  assert.deepEqual(floorCall.args.slice(2), runs[0].args.slice(2));
  assert.equal(new Set(runs.map((call) => call.opts.env.SHOWREEL_HOME)).size, 3);
  for (const call of runs) {
    assert.ok(call.opts.cwd.startsWith(root));
    assert.match(call.args[call.args.indexOf('--plugin-dir') + 1], /plugins[\\/]skills-demo$/);
    assert.doesNotMatch(call.args[1], /private-bench-secret/);
    assert.ok(call.args.includes('dontAsk'));
    assert.ok(!call.args.includes('--dangerously-skip-permissions'));
  }
  assert.doesNotMatch(await readFile(out, 'utf8'), /private-bench-secret|Final video:/);
  assert.doesNotMatch(logs.join('\n'), /private-bench-secret/);
});

test('runner refuses failed auth preflight before starting the server or video runs', async (t) => {
  const { runBenchmark } = await import('../scripts/benchmark/run-claude.mjs');
  const root = await temporary(t);
  let serverStarted = false;
  await assert.rejects(runBenchmark({ scenario: 'simple', skill: 'showreel', model: 'sonnet', runs: 3 }, {
    createTemp: async () => root, environment: {},
    startServer: async () => { serverStarted = true; throw new Error('Unexpected server start'); },
    exec: async (_, args) => args[0] === '--help'
      ? { code: 0, stdout: '--permission-mode <mode> choices: "dontAsk"\n  --allowedTools <tools>' }
      : { code: 1, stderr: 'private-provider-error' },
  }), /requires network access and logged-in Claude/);
  assert.equal(serverStarted, false);
});

test('surface meter retains totals on budget-failure exit status', async (t) => {
  const root = await temporary(t);
  await mkdir(path.join(root, 'projects', 'over-budget'), { recursive: true });
  const surface = await surfaceMeter(root, 'showreel', {}, root, async () => ({ code: 1, stdout: '{"totalTokens":7000,"budget":6000,"pass":false}' }));
  assert.equal(surface.status, 'ok');
  assert.equal(surface.projects[0].totals.totalTokens, 7000);
  assert.equal(surface.projects[0].totals.pass, false);
});


test('runner clamps marginal tokens and falls back to recorded surface commands without counting its query', async (t) => {
  const { runBenchmark } = await import('../scripts/benchmark/run-claude.mjs');
  const root = await temporary(t);
  const report = await runBenchmark({ scenario: 'simple', skill: 'showreel', model: 'sonnet', runs: 1, out: path.join(root, 'report.json') }, {
    createTemp: async () => root, environment: {}, log: () => {},
    startServer: async () => ({ url: 'http://fixture.invalid', close: async () => {} }),
    exec: async (cmd, args, opts) => {
      if (args[0] === '--help') return { code: 0, stdout: '--permission-mode <mode> choices: "dontAsk"\n  --allowedTools <tools>' };
      if (args[1] === 'ok') return { code: 0, stdout: sample };
      if (args[1] === makeFloorPrompt('showreel')) return { code: 0, stdout: floorSample };
      if (cmd === process.execPath) {
        // A query adds a meter entry after reading the totals. It is not a Claude turn.
        await writeFile(path.join(opts.env.SHOWREEL_HOME, 'projects', 'bench', 'surface.jsonl'), '{"command":"tokens"}\n', { flag: 'a' });
        return { code: 0, stdout: '{"totalTokens":50}' };
      }
      const dir = path.join(opts.env.SHOWREEL_HOME, 'projects', 'bench');
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'surface.jsonl.1'), '{"command":"init"}\n');
      await writeFile(path.join(dir, 'surface.jsonl'), '{"command":"render"}\n');
      const result = JSON.parse(sample);
      delete result.num_turns;
      result.usage = { input_tokens: 1, output_tokens: 2 };
      return { code: 0, stdout: JSON.stringify(result) };
    },
  });
  assert.equal(report.runs[0].marginalFreshTokens, 0);
  assert.equal(report.runs[0].turns, 2);
  assert.equal(report.runs[0].turnsSource, 'surface-commands (partial)');
  assert.equal(report.median.turns, 2);
});

test('floor failures abort before scenarios and never persist provider output', async (t) => {
  const { runBenchmark } = await import('../scripts/benchmark/run-claude.mjs');
  for (const response of [{ code: 1, stdout: floorSample }, { code: 0, stdout: 'private floor output' },
    { code: 0, stdout: JSON.stringify({ ...JSON.parse(floorSample), is_error: true }) }]) {
    const root = await temporary(t);
    await assert.rejects(runBenchmark({ scenario: 'simple', skill: 'showreel', model: 'sonnet', runs: 1 }, {
      createTemp: async () => root, environment: {},
      startServer: async () => { assert.fail('floor failure must not start fixture'); },
      exec: async (_, args) => args[0] === '--help'
        ? { code: 0, stdout: '--permission-mode <mode> choices: "dontAsk"\n  --allowedTools <tools>' }
        : args[1] === 'ok' ? { code: 0, stdout: sample } : response,
    }), /^Error: Benchmark floor measurement failed; no scenario runs started\.$/);
  }
});

test('reports never infer historical marginal tokens from the new skill floor', async () => {
  const scenarios = [await loadScenario('simple')];
  const report = { scenario: 'simple', skill: 'showreel', model: 'sonnet', runs: [good] };
  const md = renderReport([report], scenarios);
  assert.match(md, /Marginal fresh tokens \| 3380 \| 4000 \| PASS \| — \| — \| PENDING/);
  const legacy = { ...good };
  delete legacy.floorFreshTokens; delete legacy.marginalFreshTokens;
  const old = { ...report, skill: 'demo-video', runs: [legacy] };
  assert.match(renderReport([report, old], scenarios), /Marginal fresh tokens \| 3380 \| 4000 \| PASS \| — \| — \| PENDING/);
  old.floor = { freshTokens: 40000 };
  assert.match(renderReport([report, old], scenarios), /Marginal fresh tokens \| 3380 \| 4000 \| PASS \| 2380 \| 42.0% \| FAIL/);
  assert.equal(summarize([{ ...good, ok: false, marginalFreshTokens: 999999, turns: 999 }, good]).marginalFreshTokens, 3380);
});

test('skill floor prompts select the correct skill and model activation overhead', () => {
  for (const skill of ['showreel', 'demo-video']) {
    assert.equal(makeFloorPrompt(skill), `Invoke the ${skill} skill, do nothing else, then reply with the single word OK.`);
  }
  const floor = parseUsage(floorSample);
  assert.equal(floor.turns, 2);
  assert.equal(floor.cacheCreate, 38988 + 9700);
  assert.equal(marginalFreshTokens(floor.freshTokens + 3200, floor.freshTokens), 3200);
  assert.equal(marginalFreshTokens(1, floor.freshTokens), 0);
  assert.equal(marginalFreshTokens(null, floor.freshTokens), null);
  assert.equal(marginalFreshTokens(50000, undefined), null);
});
