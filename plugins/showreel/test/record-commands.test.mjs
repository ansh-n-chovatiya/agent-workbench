import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const directory = await mkdtemp(path.join(os.tmpdir(), 'showreel-record-unit-'));
const env = { ...process.env, SHOWREEL_HOME: directory };
delete env.SHOWREEL_SECRET_S3;
delete env.SHOWREEL_SECRET_S5;
const run = promisify(execFile);
const cli = fileURLToPath(new URL('../scripts/showreel.mjs', import.meta.url));
const invoke = (...args) => run(process.execPath, [cli, ...args], { env });
after(() => rm(directory, { recursive: true, force: true }));

test('record refuses every pending secret before browser launch or creating any run', async () => {
  const dir = path.join(directory, 'projects', 'pending');
  await mkdir(dir, { recursive: true });
  const steps = ['s3', 's5'].map((id) => ({
    id, caption: 'Enter private value', narration: null, zoom: 'none', highlight: false, holdMs: 0,
    actions: [{ type: 'fill', selector: '#private', value: null, sensitive: true }],
  }));
  await writeFile(path.join(dir, 'brief.json'), JSON.stringify({ baseURL: 'https://example.test' }));
  await writeFile(path.join(dir, 'scenario.json'), JSON.stringify({
    version: 1, baseURL: 'https://example.test', steps,
  }));
  await assert.rejects(invoke('record', '--name', 'pending', '--scale', '1'), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /step s3 needs a secret: set SHOWREEL_SECRET_S3/);
    assert.match(error.stderr, /step s5 needs a secret: set SHOWREEL_SECRET_S5/);
    assert.equal(error.stderr.trim().split('\n').length, 1);
    return true;
  });
  await assert.rejects(stat(path.join(dir, 'runs')), { code: 'ENOENT' });
});

test('runs lists completed metadata in order and leaves interrupted runs alone', async () => {
  const dir = path.join(directory, 'projects', 'listing', 'runs');
  for (const id of ['20261018-140000', '20261018-130000', '20261018-150000']) {
    await mkdir(path.join(dir, id), { recursive: true });
    if (id.endsWith('150000')) continue;
    await writeFile(path.join(dir, id, 'record.json'), JSON.stringify({
      durationSec: 3.25, video: { bytes: 4000 },
    }));
  }
  const result = await invoke('runs', '--name', 'listing');
  assert.equal(result.stdout,
    '20261018-130000\t3.3 s\t4000 bytes\n20261018-140000\t3.3 s\t4000 bytes\n');
  assert.equal((await invoke('runs', '--name', 'absent')).stdout, '');
  assert.equal(JSON.parse(await readFile(path.join(dir, '20261018-140000', 'record.json'))).video.bytes, 4000);
});

test('new CLI commands validate arguments before accessing a browser', async () => {
  for (const args of [
    ['record'], ['login'], ['runs'], ['cursor-demo', '--unknown'],
    ['record', '--name', 'demo', '--fps', '45'], ['record', '--name', 'demo', '--scale', '3'],
    ['login', '--name', 'demo', '--headed'],
  ]) await assert.rejects(invoke(...args), (error) => error.code === 1);
});
