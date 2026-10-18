import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const home = await mkdtemp(path.join(os.tmpdir(), 'showreel-doctor-'));
process.env.SHOWREEL_HOME = path.join(home, 'state');
after(() => rm(home, { recursive: true, force: true }));
const { evaluate, doctor } = await import('../scripts/lib/doctor.mjs');
const GB = 1024 ** 3;
const healthy = { totalmem: 8 * GB, cpus: 4, freeBytes: 5 * GB, nodeVersion: '22.12.0', platform: 'test-os', arch: 'test-arch' };
const item = (result, id) => result.items.find((entry) => entry.id === id);

test('doctor accepts the exact Node engine boundaries', () => {
  for (const nodeVersion of ['20.19.0', '20.20.0', '22.12.0', '22.13.0', '23.0.0', '24.14.0']) assert.equal(item(evaluate({ ...healthy, nodeVersion }), 'node').level, 'ok', nodeVersion);
  for (const nodeVersion of ['18.20.0', '20.18.9', '21.99.0', '22.11.9', 'invalid']) assert.equal(item(evaluate({ ...healthy, nodeVersion }), 'node').level, 'fail', nodeVersion);
});

test('doctor uses exact memory, CPU and disk thresholds', () => {
  const result = evaluate(healthy);
  assert.equal(result.ok, true);
  assert.ok(result.items.every((entry) => entry.level === 'ok'));
  assert.equal(item(result, 'platform').detail, 'test-os test-arch');
  assert.equal(result.recommendations.voiceTier, 'kokoro');
  for (const values of [{ totalmem: 8 * GB - 1 }, { cpus: 3 }]) {
    const low = evaluate({ ...healthy, ...values });
    assert.equal(low.recommendations.voiceTier, 'kokoro-low-priority');
    assert.equal(low.ok, true);
    assert.equal(item(low, values.cpus ? 'cpu' : 'memory').level, 'warn');
  }
  for (const [freeBytes, level] of [[0, 'fail'], [GB - 1, 'fail'], [GB, 'warn'], [5 * GB - 1, 'warn'], [5 * GB, 'ok']]) {
    const result = evaluate({ ...healthy, freeBytes });
    assert.equal(item(result, 'disk').level, level);
    assert.equal(result.ok, level !== 'fail');
  }
});

test('live doctor creates only temporary state and removes its write probe', async () => {
  const result = await doctor();
  assert.deepEqual(result.items.map(({ id }) => id), ['node', 'platform', 'memory', 'cpu', 'disk', 'home-writable', 'browser']);
  assert.equal(item(result, 'home-writable').level, 'ok');
  assert.deepEqual(await readdir(process.env.SHOWREEL_HOME), []);
  const browser = item(result, 'browser');
  if (browser.level === 'fail') assert.equal(browser.fix, 'npx playwright install chromium');
  assert.equal(result.ok, !result.items.some(({ level }) => level === 'fail'));
});
