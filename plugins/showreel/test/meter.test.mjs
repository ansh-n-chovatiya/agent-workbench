import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { estimateTokens, countLines, appendSurface, readSurface, aggregateSurface, OUTPUT_CAP_TOKENS, ROTATE_BYTES } from '../scripts/lib/meter.mjs';
import { resolveComposition } from '../scripts/lib/compose/composition.mjs';
import { formatSnapshot } from '../scripts/lib/snapshot.mjs';
import { withShortOutput } from '../scripts/lib/output.mjs';
const cliPath = fileURLToPath(new URL('../scripts/showreel.mjs', import.meta.url));
async function setup(t) {
  const home = await mkdtemp(path.join(os.tmpdir(), 'showreel-meter-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  const dir = path.join(home, 'projects', 'demo-app');
  const cli = (...args) => spawnSync(process.execPath, [cliPath, ...args], { cwd: home, encoding: 'utf8', env: { ...process.env, SHOWREEL_HOME: home, SHOWREEL_METER: '1' } });
  return { home, dir, cli };
}
test('UTF-8 estimates and lines', () => {
  assert.equal(estimateTokens(''), 0); assert.equal(estimateTokens('12345'), 2); assert.equal(estimateTokens('😀😀'), 2);
  assert.equal(countLines(''), 0); assert.equal(countLines('a\nb\n'), 2); assert.equal(countLines('a\nb'), 2);
});
test('CLI size-only line shape, authored fields, failures, budget, skill and reset', async t => {
  const { home, dir, cli } = await setup(t);
  assert.equal(cli('brief', 'init', '--name', 'demo-app').status, 0);
  const r = cli('brief', 'set', '--name', 'demo-app', 'notes=private-sentinel'); assert.equal(r.stdout, 'ok\n');
  const rows = readSurface(dir), row = rows[1]; assert.equal(rows.length, 2);
  assert.equal(row.v, 1); assert.equal(row.command, 'brief set'); assert.equal(row.stdoutBytes, 3); assert.equal(row.stderrBytes, 0);
  assert.equal(row.estTokens, 1); assert.equal(row.exitCode, 0); assert.equal(new Date(row.t).toISOString(), row.t);
  assert.deepEqual(row.authored.files, [{ path: 'brief.json', bytes: 16 }]); assert.ok(!JSON.stringify(rows).includes('private-sentinel'));
  spawnSync(process.execPath, [cliPath, 'brief', 'show', '--name', 'demo-app'], { env: { ...process.env, SHOWREEL_HOME: home, SHOWREEL_METER: '0' } });
  assert.equal(readSurface(dir).length, 2);
  assert.equal(cli('scenario', 'validate', '--name', 'demo-app').status, 1); assert.equal(readSurface(dir).at(-1).exitCode, 1);
  const budget = cli('tokens', '--name', 'demo-app', '--json', '--skill', '--budget', '0'); assert.equal(budget.status, 1);
  const report = JSON.parse(budget.stdout); assert.equal(report.pass, false); assert.ok(report.skillLoadTokens > 0);
  assert.equal(cli('tokens', '--name', 'demo-app', '--budget', '100000').status, 0);
  cli('tokens', '--reset', '--name', 'demo-app'); assert.deepEqual(readSurface(dir), []);
});
test('rotation, previous segment, malformed lines and failure tolerance', async t => {
  const { dir } = await setup(t); await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'surface.jsonl'), ' '.repeat(ROTATE_BYTES));
  appendSurface(dir, { v: 1, command: 'record', estTokens: 3 });
  assert.equal((await stat(path.join(dir, 'surface.jsonl.1'))).size, ROTATE_BYTES);
  assert.ok((await stat(path.join(dir, 'surface.jsonl'))).size < ROTATE_BYTES); assert.equal(readSurface(dir).length, 1);
  assert.doesNotThrow(() => appendSurface(path.join(dir, 'missing'), {}));
  assert.doesNotThrow(() => appendSurface(dir, { data: 'x'.repeat(ROTATE_BYTES) }));
});
test('stage aggregation and deduplication of generated scenario prose', () => {
  const entries = ['brief set', 'guide resolve', 'storyboard validate', 'scenario build', 'record', 'render', 'voice status', 'doctor'].map(command => ({ command, estTokens: 10, authored: { files: [] } }));
  entries[0].authored.files.push({ path: 'brief.json', bytes: 20 }); entries[2].authored.files.push({ path: 'storyboard.json', bytes: 40 });
  entries[3].authored.files.push({ path: 'storyboard.json', bytes: 40 }, { path: 'scenario.json', bytes: 40 });
  const r = aggregateSurface(entries, { budget: 100, skillTokens: 7 }); assert.equal(r.totalTokens, 102); assert.equal(r.pass, false);
  assert.equal(r.claudeWrittenTokens, 15); for (const stage of Object.values(r.stages)) assert.equal(stage.claudeReadTokens, 10);
});
test('audited default cap with stored demo-app guide and long listings', async t => {
  const { dir, cli } = await setup(t);
  cli('brief', 'init', '--name', 'demo-app', '--url', 'http://localhost:3000', '--topic', 'Demo');
  await writeFile(path.join(dir, 'guide.resolved.json'), await readFile(new URL('./fixtures/guide.resolved.sample.json', import.meta.url)));
  await writeFile(path.join(dir, 'composition.json'), JSON.stringify(resolveComposition({})));
  for (let i = 0; i < 160; i++) { const folder = path.join(dir, 'runs', `r${i}`); await mkdir(folder, { recursive: true }); await writeFile(path.join(folder, 'record.json'), JSON.stringify({ durationSec: 5 })); }
  const commands = [['doctor'], ['runs'], ['brief', 'show'], ['guide', 'add', '--action', 'click', '--selector', 'button', '--label', 'Open'], ['storyboard', 'draft'], ['storyboard', 'validate'], ['scenario', 'build'], ['scenario', 'validate'], ['voice', 'status'], ['composition', 'show'], ['scenes', 'list']];
  for (const args of commands) { const r = cli(...args, '--name', 'demo-app'); if (args[0] !== 'doctor') assert.equal(r.status, 0, r.stderr); assert.ok(estimateTokens(r.stdout + r.stderr) <= OUTPUT_CAP_TOKENS, args.join(' ')); }
  cli('brand', 'init', '--brand', 'demo');
  for (const args of [['brand', 'show', '--brand', 'demo'], ['voice', 'list']]) { const r = cli(...args); assert.equal(r.status, 0, r.stderr); assert.ok(estimateTokens(r.stdout + r.stderr) <= OUTPUT_CAP_TOKENS); }
  assert.match(cli('runs', '--name', 'demo-app').stdout, /more, use --verbose/);
  assert.equal(JSON.parse(cli('runs', '--name', 'demo-app', '--json').stdout).length, 160);
  assert.ok(cli('runs', '--name', 'demo-app', '--verbose').stdout.split('\n').length > 160);
  // No browser: feed snapshot output and resolver diagnostics through the same presentation layer.
  const original = console.log; let output = ''; console.log = text => { output += text + '\n'; };
  try { await withShortOutput([], async () => {
    console.log(formatSnapshot({ title: 'Demo app', headings: ['Demo'], elements: Array.from({ length: 500 }, () => ({ role: 'button', name: 'Open details', selector: 'button' })) }));
    for (let i = 0; i < 500; i++) console.log(`${i}: Open: no candidate matched on replay`);
  }); } finally { console.log = original; }
  assert.ok(estimateTokens(output) <= OUTPUT_CAP_TOKENS);
});
test('authored accounting excludes selectors and action values; repeated validation is a snapshot', async t => {
  const { dir, cli } = await setup(t);
  cli('brief', 'init', '--name', 'demo-app', '--url', 'http://localhost:3000', '--topic', 'Demo');
  await writeFile(path.join(dir, 'guide.resolved.json'), await readFile(new URL('./fixtures/guide.resolved.sample.json', import.meta.url)));
  cli('storyboard', 'draft', '--name', 'demo-app');
  const board = JSON.parse(await readFile(path.join(dir, 'storyboard.json'), 'utf8'));
  board.steps[0].narration = 'A short narration.';
  await writeFile(path.join(dir, 'storyboard.json'), JSON.stringify(board));
  cli('storyboard', 'validate', '--name', 'demo-app'); cli('storyboard', 'validate', '--name', 'demo-app');
  cli('scenario', 'build', '--name', 'demo-app'); cli('scenario', 'validate', '--name', 'demo-app');
  const rows = readSurface(dir), bytes = board.steps.reduce((n, s) => n + Buffer.byteLength(s.caption ?? '') + Buffer.byteLength(s.narration ?? ''), 0);
  assert.equal(rows.find(r => r.command === 'storyboard validate').authored.files[0].bytes, bytes);
  assert.equal(aggregateSurface(rows).claudeWrittenTokens, Math.ceil(bytes / 4));
  assert.ok(!JSON.stringify(rows).includes('A short narration.'));
  const report = JSON.parse(cli('tokens', '--name', 'demo-app', '--json', '--skill').stdout);
  assert.ok(report.totalTokens < 6000);
  const skill = await readFile(new URL('../skills/showreel/SKILL.md', import.meta.url), 'utf8');
  assert.ok(countLines(skill) < 100); assert.ok(estimateTokens(skill) <= 1800);
});
test('meter failure never breaks CLI output and project can be inferred from cwd', async t => {
  const { home, dir, cli } = await setup(t);
  cli('brief', 'init', '--name', 'demo-app');
  const inferred = spawnSync(process.execPath, [cliPath, '--help'], { cwd: dir, encoding: 'utf8', env: { ...process.env, SHOWREEL_HOME: home, SHOWREEL_METER: '1' } });
  assert.equal(inferred.status, 0); assert.equal(readSurface(dir).at(-1).command, '--help');
  cli('private-command-sentinel', '--name', 'demo-app'); assert.equal(readSurface(dir).at(-1).command, 'unknown');
  cli('tokens', '--name', 'demo-app', '--reset'); await mkdir(path.join(dir, 'surface.jsonl'));
  const result = cli('brief', 'set', '--name', 'demo-app', 'notes=hello');
  assert.equal(result.status, 0); assert.equal(result.stdout, 'ok\n'); assert.equal(result.stderr, '');
});
