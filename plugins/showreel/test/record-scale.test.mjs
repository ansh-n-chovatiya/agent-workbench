import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseScale } from '../scripts/lib/record/scale.mjs';

test('explicit scales use the requested value regardless of benchmark or FPS', () => {
  for (const requested of [1, 1.33, 1.67, 2]) for (const minFps50 of [undefined, false, true, 10, 60]) {
    assert.deepEqual(chooseScale({ requested, benchmarkScale: 2, minFps50 }), { used: requested, reason: 'requested' });
  }
  for (const requested of [undefined, null, '1', 0, 1.5, NaN, Infinity]) {
    assert.throws(() => chooseScale({ requested }), /requested scale/);
  }
});

test('auto uses a valid benchmark or the scale-1 fallback', () => {
  for (const benchmarkScale of [1, 1.33, 1.67, 2]) {
    assert.deepEqual(chooseScale({ requested: 'auto', benchmarkScale }), { used: benchmarkScale, reason: 'benchmark' });
  }
  for (const benchmarkScale of [undefined, null, 0, 1.5, '2', Infinity]) {
    assert.deepEqual(chooseScale({ requested: 'auto', benchmarkScale }), { used: 1, reason: 'no benchmark' });
  }
});

test('layout guard overrides numeric and automatic choices strictly above 0.02', () => {
  for (const requested of [1, 1.33, 1.67, 2, 'auto']) {
    for (const layoutDriftExcess of [0.020001, 1]) {
      assert.deepEqual(chooseScale({ requested, benchmarkScale: 2, layoutDriftExcess }), {
        used: 1, reason: 'layout guard',
      });
    }
    for (const layoutDriftExcess of [-0.1, 0, 0.02]) {
      assert.equal(chooseScale({ requested, benchmarkScale: 2, layoutDriftExcess }).used, requested === 'auto' ? 2 : requested);
    }
  }
});
