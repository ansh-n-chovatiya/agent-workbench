import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const home = await mkdtemp(path.join(os.tmpdir(), 'showreel-paths-'));
process.env.SHOWREEL_HOME = home;
after(() => rm(home, { recursive: true, force: true }));
const { HOME_DIR, projectDir, expandHome, abs } = await import('../scripts/lib/paths.mjs');

test('state honours the isolated SHOWREEL_HOME', () => {
  assert.equal(HOME_DIR, path.resolve(home));
  assert.equal(projectDir('My App'), path.join(home, 'projects', 'my-app'));
});

test('project names cannot escape their project directory', () => {
  for (const name of ['../x', 'a/b', 'a\\b', '.', '..', '', ' ', null]) {
    assert.throws(() => projectDir(name), /plain name/);
  }
});

test('home expansion and absolute paths', () => {
  assert.equal(expandHome('~'), os.homedir());
  assert.equal(expandHome('~/demo'), path.join(os.homedir(), 'demo'));
  assert.equal(expandHome('~\\demo'), path.join(os.homedir(), 'demo'));
  assert.equal(expandHome('demo'), 'demo');
  assert.equal(abs('demo'), path.resolve('demo'));
});
