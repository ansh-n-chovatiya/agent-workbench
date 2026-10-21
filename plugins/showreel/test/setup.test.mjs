import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, cp, mkdir, mkdtemp, readFile, rm, writeFile, lstat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { supportedNode, runtimeDir } from '../scripts/lib/setup.mjs';

const REAL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skipWindows = process.platform === 'win32' ? 'fake executables use a shebang' : false;

// A plugin folder as the marketplace delivers it: the launcher, the setup module and a manifest, no node_modules.
async function installedPlugin(t) {
  const base = await mkdtemp(path.join(os.tmpdir(), 'showreel-setup-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const root = path.join(base, 'plugin');
  await mkdir(path.join(root, 'scripts', 'lib'), { recursive: true });
  await cp(path.join(REAL, 'scripts', 'showreel.mjs'), path.join(root, 'scripts', 'showreel.mjs'));
  await cp(path.join(REAL, 'scripts', 'lib', 'setup.mjs'), path.join(root, 'scripts', 'lib', 'setup.mjs'));
  await writeFile(path.join(root, 'scripts', 'cli.mjs'), "console.log('CLI RAN', process.argv.slice(2).join(' '));\n");
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ type: 'module', dependencies: { playwright: '9.9.9' } }));
  const data = path.join(base, 'data');
  const calls = path.join(base, 'calls.log');
  // A fake npm: records that it ran and creates what a real install would.
  const npm = path.join(base, 'fake-npm.mjs');
  await writeFile(npm, `#!/usr/bin/env node
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const prefix = process.argv[process.argv.indexOf('--prefix') + 1];
appendFileSync(${JSON.stringify(calls)}, 'npm ' + process.argv.slice(2).join(' ') + '\\n');
if (process.env.FAKE_NPM_FAILS) process.exit(1);
const pkg = path.join(prefix, 'node_modules', 'playwright');
mkdirSync(pkg, { recursive: true });
writeFileSync(path.join(pkg, 'package.json'), '{"name":"playwright","version":"9.9.9"}');
writeFileSync(path.join(pkg, 'cli.js'), 'require("fs").appendFileSync(' + JSON.stringify(${JSON.stringify(calls)}) + ', "chromium " + process.argv.slice(2).join(" ") + "\\\\n");');
`);
  await chmod(npm, 0o755);
  const run = (...args) => spawnSync(process.execPath, [path.join(root, 'scripts', 'showreel.mjs'), ...args], {
    encoding: 'utf8', env: { ...process.env, CLAUDE_PLUGIN_DATA: data, SHOWREEL_NPM: npm, SHOWREEL_HOME: path.join(base, 'home') },
  });
  const log = async () => (await readFile(calls, 'utf8').catch(() => '')).split('\n').filter(Boolean);
  return { root, data, run, log, runtime: path.join(data, 'showreel-runtime') };
}

test('node version rule matches the engines field', () => {
  assert.equal(supportedNode('v20.18.0'), false);
  assert.equal(supportedNode('v20.19.0'), true);
  assert.equal(supportedNode('v22.11.9'), false);
  assert.equal(supportedNode('v22.12.0'), true);
  assert.equal(supportedNode('v24.14.0'), true);
  assert.equal(supportedNode('garbage'), false);
});

test('the runtime folder survives plugin updates: it lives under CLAUDE_PLUGIN_DATA, else under the Showreel home', () => {
  assert.equal(runtimeDir({ CLAUDE_PLUGIN_DATA: '/d' }), path.join('/d', 'showreel-runtime'));
  assert.equal(runtimeDir({ SHOWREEL_HOME: '/h' }), path.join('/h', 'runtime'));
});

test('without dependencies every command stops with a plain instruction, not a stack trace', async (t) => {
  const { run } = await installedPlugin(t);
  for (const args of [['doctor'], ['--help'], ['record', '--name', 'x'], []]) {
    const result = run(...args);
    assert.equal(result.status, 3, args.join(' '));
    assert.match(result.stderr, /not set up on this machine yet/);
    assert.match(result.stderr, /setup/);
    assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND|at .*\.mjs:\d+/);
  }
});

test('setup --check reports the state and installs nothing', { skip: skipWindows }, async (t) => {
  const { run, log } = await installedPlugin(t);
  const result = run('setup', '--check');
  assert.equal(result.status, 1);
  assert.match(result.stdout, /todo\s+playwright\s+not installed/);
  assert.deepEqual(await log(), []);
});

test('setup installs once into the persistent folder, links it, downloads Chromium and then the CLI runs', { skip: skipWindows }, async (t) => {
  const { run, log, root, runtime } = await installedPlugin(t);
  const first = run('setup');
  assert.equal(first.status, 0, first.stdout + first.stderr);
  const calls = await log();
  assert.match(calls[0], /^npm install --omit=dev --no-audit --no-fund --prefix /);
  assert.ok(calls.some((c) => c.startsWith('chromium install chromium')));
  assert.ok((await lstat(path.join(root, 'node_modules'))).isSymbolicLink());
  assert.ok((await lstat(path.join(runtime, 'node_modules', 'playwright'))).isDirectory());
  assert.match(first.stdout, /CLI RAN doctor/); // setup finishes by running the doctor
  const after = run('make', '--name', 'x');
  assert.equal(after.status, 0, after.stderr);
  assert.match(after.stdout, /CLI RAN make --name x/);
});

test('a second setup does not download again, and a plugin update only needs the link back', { skip: skipWindows }, async (t) => {
  const { run, log, root, runtime } = await installedPlugin(t);
  run('setup');
  const installs = (await log()).filter((c) => c.startsWith('npm ')).length;
  run('setup');
  assert.equal((await log()).filter((c) => c.startsWith('npm ')).length, installs);
  // An update replaces the plugin folder: the link is gone, the persistent install is not.
  await rm(path.join(root, 'node_modules'), { recursive: true, force: true });
  const result = run('doctor');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /CLI RAN doctor/);
  assert.ok((await lstat(path.join(root, 'node_modules'))).isSymbolicLink());
  assert.equal((await log()).filter((c) => c.startsWith('npm ')).length, installs);
  assert.ok((await lstat(path.join(runtime, 'node_modules'))).isDirectory());
});

test('control: a failing install says what to do and leaves the plugin unusable rather than half-set-up', { skip: skipWindows }, async (t) => {
  const { run, root } = await installedPlugin(t);
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'showreel.mjs'), 'setup'], {
    encoding: 'utf8', env: { ...process.env, ...{ FAKE_NPM_FAILS: '1' }, CLAUDE_PLUGIN_DATA: path.join(root, '..', 'data'), SHOWREEL_NPM: path.join(root, '..', 'fake-npm.mjs') },
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /fail install/);
  assert.match(result.stdout, /npm install --prefix/);
  assert.equal(run('doctor').status, 3);
});
