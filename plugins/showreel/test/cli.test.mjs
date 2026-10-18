import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PLUGIN_ROOT } from '../scripts/lib/env.mjs';
import { readConfigFile } from '../scripts/lib/config.mjs';

async function setup(t) {
  const home = await mkdtemp(path.join(os.tmpdir(), 'showreel-cli-'));
  const cwd = path.join(home, 'demoed-project');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(cwd);
  t.after(() => rm(home, { recursive: true, force: true }));
  const cli = (...args) => spawnSync(process.execPath, [path.join(PLUGIN_ROOT, 'scripts/showreel.mjs'), ...args], { cwd, encoding: 'utf8', env: { ...process.env, SHOWREEL_HOME: path.join(home, 'state') } });
  return { home, cwd, cli };
}

test('help succeeds and unknown commands print help with exit 2', async (t) => {
  const { cli } = await setup(t);
  const help = cli('--help');
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Usage: showreel/);
  for (const args of [['unknown'], []]) {
    const result = cli(...args);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /Usage: showreel/);
  }
});

test('init creates validated state, refuses overwrite and leaves the demoed project alone', async (t) => {
  const { home, cwd, cli } = await setup(t);
  const result = cli('init', '--name', 'My App', '--url', 'https://example.test');
  assert.equal(result.status, 0, result.stderr);
  const file = path.join(home, 'state', 'projects', 'my-app', 'config.json');
  assert.equal(result.stdout.trim(), file);
  assert.equal((await readConfigFile(file)).baseURL, 'https://example.test');
  const original = await readFile(file, 'utf8');
  const second = cli('init', '--name', 'My App', '--url', 'https://other.test');
  assert.equal(second.status, 1);
  assert.match(second.stderr, /Refusing to overwrite/);
  assert.equal(await readFile(file, 'utf8'), original);
  assert.deepEqual(await readdir(cwd), []);
});

test('invalid init arguments cannot create configuration files', async (t) => {
  const { home, cli } = await setup(t);
  for (const args of [[], ['--name', 'a'], ['--name', '../x', '--url', 'http://localhost'], ['--name', 'a', '--url', 'file:///tmp'], ['--name', 'a', '--url', 'http://localhost', '--extra', 'x'], ['--name', 'a', '--name', 'b', '--url', 'http://localhost']]) {
    const result = cli('init', ...args);
    assert.equal(result.status, 1, result.stdout);
    assert.ok(result.stderr.trim());
  }
  assert.deepEqual((await readdir(home)).sort(), ['demoed-project']);
});

test('doctor JSON is parseable and exit status reflects failed checks', async (t) => {
  const { cli } = await setup(t);
  const result = cli('doctor', '--json');
  const parsed = JSON.parse(result.stdout);
  assert.equal(result.status, parsed.ok ? 0 : 1, result.stderr);
  assert.equal(typeof parsed.ok, 'boolean');
  assert.equal(parsed.items.length, 7);
  assert.ok(['kokoro', 'kokoro-low-priority'].includes(parsed.recommendations.voiceTier));
  assert.equal(cli('doctor', '--unsupported').status, 1);
});
