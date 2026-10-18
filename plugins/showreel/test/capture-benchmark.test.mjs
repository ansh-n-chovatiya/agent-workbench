import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJpegSize, recommendScale } from '../scripts/lib/capture-benchmark.mjs';

const fast = (scale, overrides = {}) => ({ scale, fps: 60, layoutDrift: 0, ...overrides });

test('all scales fast and aligned selects the highest', () => {
  assert.equal(recommendScale([1, 1.33, 1.67, 2].map((scale) => fast(scale))), 2);
});

test('fast but drifting scale is skipped', () => {
  assert.equal(recommendScale([fast(1.33), fast(2, { layoutDrift: 0.021 })]), 1.33);
});

test('slow scale is skipped and thresholds are inclusive', () => {
  assert.equal(recommendScale([fast(1.67, { fps: 50, layoutDrift: 0.02 }), fast(2, { fps: 49.9 })]), 1.67);
});

test('nothing qualifying returns 1', () => {
  for (const results of [[], [fast(2, { fps: 0 })], [fast(2, { layoutDrift: 1 })],
    [fast(2, { layoutDrift: null })], [fast(2, { error: 'failed' })]]) {
    assert.equal(recommendScale(results), 1);
  }
});

test('ties and unordered input choose the highest without mutating input', () => {
  const results = [fast(1.67), fast(1), fast(2), fast(1.33), fast(2)];
  const original = structuredClone(results);
  assert.equal(recommendScale(results), 2);
  assert.deepEqual(results, original);
});

// Minimal single-component SOF0: precision, height=720, width=1280, component data.
const sof0 = [0xff, 0xc0, 0, 11, 8, 2, 0xd0, 5, 0, 1, 1, 0x11, 0];
test('JPEG reader finds dimensions in an SOF0 header', () => {
  assert.deepEqual(readJpegSize(new Uint8Array([0xff, 0xd8, ...sof0])), { width: 1280, height: 720 });
});

test('JPEG reader skips a leading APP0 segment', () => {
  const app0 = [0xff, 0xe0, 0, 6, 0x4a, 0x46, 0x49, 0x46];
  assert.deepEqual(readJpegSize(new Uint8Array([0xff, 0xd8, ...app0, ...sof0])), { width: 1280, height: 720 });
});

test('JPEG reader returns null for garbage and truncated segments', () => {
  for (const bytes of [[], [1, 2, 3], [0xff, 0xd8], [0xff, 0xd8, 0xff],
    [0xff, 0xd8, 0xff, 0xe0, 0xff, 0xff], [0xff, 0xd8, ...sof0.slice(0, -1)]]) {
    assert.equal(readJpegSize(new Uint8Array(bytes)), null);
  }
  assert.equal(readJpegSize(null), null);
});

test('layout drift is judged against the scale-1 noise floor of an animated page', () => {
  const noisy = (scale, fps, layoutDrift) => ({ scale, fps, layoutDrift, framesDropped: 0 });
  // measured on a real animated site: scale 1 already differs from the baseline by 0.077
  const results = [noisy(1, 59.5, 0.0769), noisy(1.33, 59.7, 0.0776), noisy(1.67, 59.2, 0.0834), noisy(2, 44.7, 0.0824)];
  assert.equal(recommendScale(results), 1.67);                       // 2 is too slow, 1.67 is within floor + 0.02
  assert.equal(recommendScale([noisy(1, 59.5, 0.0769), noisy(2, 59.5, 0.12)]), 1);   // drift well above the floor is rejected
});
