import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const home = await mkdtemp(path.join(os.tmpdir(), 'showreel-phase2-'));
process.env.SHOWREEL_HOME = home;
after(() => rm(home, { recursive: true, force: true }));
const { spawnSync } = await import('node:child_process');
const { PLUGIN_ROOT } = await import('../scripts/lib/env.mjs');
const cli = (...args) => spawnSync(process.execPath, [path.join(PLUGIN_ROOT, 'scripts/showreel.mjs'), ...args], { encoding: 'utf8', cwd: home, env: { ...process.env, SHOWREEL_HOME: home } });
const project = (name, file) => path.join(home, 'projects', name, file);
const sample = await readFile(new URL('./fixtures/guide.resolved.sample.json', import.meta.url), 'utf8');
function succeeds(...args) { const result = cli(...args); assert.equal(result.status, 0, result.stderr); return result; }
test('CLI runs the intake to scenario chain, reports the secret error, and preserves state', async () => {
  const name = 'chain';
  assert.equal(succeeds('brief', 'init', '--name', name, '--url', 'http://localhost:3000', '--topic', 'Demo').stdout.trim(), project(name, 'brief.json'));
  assert.equal(cli('brief', 'init', '--name', name).status, 1);
  assert.equal(succeeds('brief', 'set', '--name', name, 'flowMode=guide', 'voice.enabled=false', 'targetSeconds=30').stdout.trim(), 'ok');
  assert.deepEqual(JSON.parse(succeeds('brief', 'questions', '--name', name, '--json').stdout), []);
  assert.equal(succeeds('brief', 'questions', '--name', name).stdout.trim(), 'all answered');
  assert.equal(JSON.parse(succeeds('brief', 'show', '--name', name).stdout).targetSeconds, 30);
  await writeFile(project(name, 'guide.resolved.json'), sample);
  assert.equal(succeeds('storyboard', 'draft', '--name', name).stdout.trim(), '6 steps');
  assert.equal(succeeds('storyboard', 'draft', '--name', name).stdout.trim(), 'unchanged');
  succeeds('storyboard', 'draft', '--name', name, '--force');
  succeeds('storyboard', 'validate', '--name', name);
  const built = cli('scenario', 'build', '--name', name);
  assert.equal(built.status, 0);   // a sensitive step is pending, not an error: the secret is supplied at run time
  assert.equal(built.stderr.trim(), 'pending: step s5 needs a secret at run time');
  const scenario = JSON.parse(await readFile(project(name, 'scenario.json'), 'utf8'));
  assert.equal(scenario.steps[4].actions[0].value, null);
  const validated = cli('scenario', 'validate', '--name', name);
  assert.equal(validated.status, 0);
  assert.match(validated.stderr, /pending: step s5 needs a secret at run time/);
  // writing a secret into a sensitive field is rejected: values for sensitive fields are never stored
  scenario.steps[4].actions[0] = { ...scenario.steps[4].actions[0], value: 'test-only-value' };
  await writeFile(project(name, 'scenario.json'), JSON.stringify(scenario));
  assert.equal(cli('scenario', 'validate', '--name', name).status, 1);
});
test('CLI handles errors without saving invalid briefs and unknown subcommands exit 2', async () => {
  const name = 'errors'; succeeds('brief', 'init', '--name', name);
  assert.deepEqual(JSON.parse(succeeds('brief', 'questions', '--name', name, '--json').stdout).map((q) => q.key), ['topic', 'baseURL', 'flowMode', 'voice.enabled']);
  assert.match(succeeds('brief', 'questions', '--name', name).stdout, /^1\. /);
  const before = await readFile(project(name, 'brief.json'), 'utf8');
  for (const args of [
    ['brief', 'set', '--name', name, 'theme=nope', 'targetSeconds=1'],
    ['brief', 'set', '--name', name, 'x=value'], ['brief', 'set', '--name', name],
    ['brief', 'show'], ['brief', 'show', '--name', '../escape'], ['brief', 'show', '--name', name, '--extra'],
    ['brief', 'init', '--name', 'invalid', '--url', 'file:///tmp'],
    ['storyboard', 'draft', '--name', 'missing'], ['scenario', 'validate', '--name', 'missing'],
  ]) {
    const result = cli(...args); assert.equal(result.status, 1, result.stdout); assert.equal(result.stderr.trim().split('\n').length, 1);
  }
  assert.equal(await readFile(project(name, 'brief.json'), 'utf8'), before);
  for (const cmd of ['brief', 'storyboard', 'scenario']) for (const sub of [[], ['unknown']]) {
    const result = cli(cmd, ...sub); assert.equal(result.status, 2); assert.match(result.stdout, /Usage: showreel/);
  }
});
test('CLI validation prints all errors and warnings and respects caption settings', async () => {
  const name = 'validation'; succeeds('brief', 'init', '--name', name, '--url', 'http://localhost:3000');
  await writeFile(project(name, 'guide.resolved.json'), sample);
  succeeds('storyboard', 'draft', '--name', name);
  const sb = JSON.parse(await readFile(project(name, 'storyboard.json'), 'utf8'));
  sb.steps.pop(); sb.steps[0].caption = null;
  await writeFile(project(name, 'storyboard.json'), JSON.stringify(sb));
  let result = cli('storyboard', 'validate', '--name', name);
  assert.equal(result.status, 1); assert.match(result.stderr, /caption/); assert.match(result.stderr, /warning: resolvedGuide.steps.5/);
  succeeds('brief', 'set', '--name', name, 'captions.enabled=false');
  result = succeeds('storyboard', 'validate', '--name', name); assert.match(result.stderr, /warning:/);
  sb.steps[0].caption = 'Open details'; sb.steps[0].zoom = 'invalid'; sb.steps[0].highlight = 'invalid';
  await writeFile(project(name, 'storyboard.json'), JSON.stringify(sb));
  result = cli('scenario', 'build', '--name', name); assert.equal(result.status, 1); assert.match(result.stderr, /zoom/); assert.match(result.stderr, /highlight/);
});
