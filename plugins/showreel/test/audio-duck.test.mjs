import test from 'node:test';
import assert from 'node:assert/strict';
import { duckEnvelope, mergeIntervals } from '../scripts/lib/audio/duck.mjs';
import { SR } from './audio-helpers.mjs';

const env = (intervals, extra = {}) => duckEnvelope({ intervals, length: 10 * SR, sampleRate: SR, ...extra });
test('depth is exactly reached inside an interval and absent outside', () => {
  const g = env([{ start: 3, end: 5 }], { depthDb: 12 }), low = 10 ** (-12 / 20);
  for (const t of [3, 3.5, 4, 4.999]) assert.ok(Math.abs(g[Math.round(t * SR)] - low) < 1e-6);
  assert.equal(g[0], 1); assert.equal(g[Math.round(2.5 * SR)], 1); assert.equal(g[Math.round(5.6 * SR)], 1); assert.equal(g.at(-1), 1);
  assert.ok(Math.abs(env([{ start: 3, end: 5 }], { depthDb: 20 })[4 * SR] - 0.1) < 1e-6);
  assert.ok(env([]).every((v) => v === 1));
});
test('ramps are monotonic, start before the voice and finish after it', () => {
  const g = env([{ start: 3, end: 5 }], { attackMs: 150, releaseMs: 400 });
  const a0 = 3 * SR - 0.15 * SR;
  assert.equal(g[a0 - 1], 1); assert.ok(g[a0 + 1] < 1);
  for (let i = a0; i < 3 * SR; i++) assert.ok(g[i + 1] <= g[i]);
  for (let i = 5 * SR; i < 5.4 * SR; i++) assert.ok(g[i + 1] >= g[i]);
  assert.ok(Math.abs(g[Math.round(5.4 * SR) + 2] - 1) < 1e-6);
});
test('no clicks: per-sample steps stay tiny', () => {
  const g = env([{ start: 1, end: 2 }, { start: 2.2, end: 3 }, { start: 6, end: 6.01 }], { depthDb: 30, attackMs: 10, releaseMs: 50 });
  let worst = 0; for (let i = 1; i < g.length; i++) worst = Math.max(worst, Math.abs(g[i] - g[i - 1]));
  assert.ok(worst < 0.01, String(worst));
});
test('intervals closer than the release time merge', () => {
  assert.deepEqual(mergeIntervals([{ start: 5, end: 6 }, { start: 1, end: 2 }, { start: 2.3, end: 3 }], 0.4), [{ start: 1, end: 3 }, { start: 5, end: 6 }]);
  assert.deepEqual(mergeIntervals([{ start: 1, end: 2 }, { start: 2.5, end: 3 }], 0.4).length, 2);
  assert.deepEqual(mergeIntervals([{ start: 2, end: 1 }, { start: NaN, end: 3 }]), []);
  const g = env([{ start: 2, end: 3 }, { start: 3.2, end: 4 }], { releaseMs: 400 });
  assert.ok(Math.abs(g[Math.round(3.1 * SR)] - 10 ** (-12 / 20)) < 1e-6);
  const apart = env([{ start: 2, end: 3 }, { start: 3.6, end: 4 }], { releaseMs: 400 });
  assert.ok(apart[Math.round(3.3 * SR)] > 0.5);
});
test('intervals outside the buffer are clipped and the result is deterministic', () => {
  const g = duckEnvelope({ intervals: [{ start: -1, end: 0.5 }, { start: 9.9, end: 20 }], length: 10 * SR, sampleRate: SR });
  assert.ok(g[0] < 0.3 && g.at(-1) < 0.3);
  assert.deepEqual(g, duckEnvelope({ intervals: [{ start: -1, end: 0.5 }, { start: 9.9, end: 20 }], length: 10 * SR, sampleRate: SR }));
});
