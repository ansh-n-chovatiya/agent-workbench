import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pendingSecrets, checkDisk, checkScenario } from '../scripts/lib/record/preflight.mjs';

const step = (id, actions) => ({
  id, actions, caption: 'Demo', narration: null, zoom: 'auto', highlight: true, holdMs: null,
});
const scenario = () => ({
  version: 1, baseURL: 'https://example.test',
  steps: [
    step('s1', [{ type: 'goto', url: 'https://example.test' }]),
    step('s2', [{ type: 'fill', selector: '#secret', value: null, sensitive: true }]),
    step('s3', [{ type: 'fill', selector: '#name', value: 'Demo' }]),
  ],
});

test('pending secrets returns each affected step once, using upper-case step ids', () => {
  const sc = scenario();
  sc.steps[1].actions.push({ type: 'fill', sensitive: true, value: null, selector: '#second' });
  sc.steps.push(step('s4', [{ type: 'fill', sensitive: true, value: null, selector: '#other' }]));
  const original = structuredClone(sc);
  assert.deepEqual(pendingSecrets(sc, {}), [sc.steps[1], sc.steps[3]]);
  for (const missing of [undefined, '']) {
    assert.deepEqual(pendingSecrets(sc, { SHOWREEL_SECRET_S2: missing }), [sc.steps[1], sc.steps[3]]);
  }
  assert.deepEqual(pendingSecrets(sc, { SHOWREEL_SECRET_s2: 'wrong case' }), [sc.steps[1], sc.steps[3]]);
  assert.deepEqual(pendingSecrets(sc, { SHOWREEL_SECRET_S2: 'runtime' }), [sc.steps[3]]);
  assert.deepEqual(pendingSecrets(sc, { SHOWREEL_SECRET_S2: 'runtime', SHOWREEL_SECRET_S4: 'runtime' }), []);
  assert.deepEqual(sc, original);
});

test('disk headroom is the capped worst-case bitrate with 50% margin, and a 2GB floor applies independently', () => {
  const GB = 1024 ** 3;
  for (const minutes of [0, 0.1, 1, 5]) for (const scale of [1, 1.33, 1.67, 2]) {
    const needBytes = Math.round(minutes * 60 * (Math.min(60e6, 1920 * 1080 * 6 * scale ** 2) / 8) * 1.5);
    const minimum = Math.max(2 * GB, needBytes);
    assert.deepEqual(checkDisk(minimum, minutes, scale), { ok: true, needBytes });
    assert.deepEqual(checkDisk(minimum - 1, minutes, scale), { ok: false, needBytes });
  }
  for (const values of [[NaN, 1, 1], [-1, 1, 1], [Infinity, 1, 1], [5 * GB, -1, 1], [5 * GB, 1, 0]]) {
    assert.throws(() => checkDisk(...values), /finite/);
  }
});

test('scenario checks preserve ordered ids and allow pending runtime secrets but reject invalid input', () => {
  const sc = scenario();
  assert.deepEqual(checkScenario(sc), sc.steps);
  assert.deepEqual(checkScenario(sc).map((s) => s.id), ['s1', 's2', 's3']);
  for (const invalid of [null, {}, { ...sc, steps: [] }]) assert.throws(() => checkScenario(invalid), /scenario.json/);
  sc.steps[0].actions = [{ type: 'click' }];
  assert.throws(() => checkScenario(sc), /selector/);
});

test('a five-minute recording at the largest scale needs a few GB, not tens', () => {
  const { needBytes } = checkDisk(100 * 1024 ** 3, 5, 2);
  assert.ok(needBytes > 1e9 && needBytes < 4e9, `needBytes=${needBytes}`);   // 5 min x 60 Mbit/s x 1.5 = 3.4 GB
  assert.equal(checkDisk(10 * 1024 ** 3, 5, 1).ok, true);
});

