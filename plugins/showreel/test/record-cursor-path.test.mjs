import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planMove, dwellMs, pressMs, settleAfterClickMs, typingDelays, holdMs, targetPoint,
} from '../scripts/lib/record/cursor-path.mjs';
import { rngFor } from '../scripts/lib/record/rng.mjs';

const near = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) <= epsilon, `${a} != ${b}`);
const keys = Array.from({ length: 256 }, (_, i) => `s${i}:3`);
const cases = [
  [{ x: 0, y: 0 }, { x: 5, y: 0 }],
  [{ x: 20, y: -10 }, { x: 20, y: -20 }],
  [{ x: -10, y: 30 }, { x: -25, y: 10 }],
  [{ x: -200, y: 50 }, { x: -160, y: 50 }],
  [{ x: 0, y: 0 }, { x: 100, y: 0 }],
  [{ x: 4, y: -80 }, { x: 4, y: 180 }],
  [{ x: 100, y: 100 }, { x: -100, y: -100 }],
  [{ x: 400, y: 0 }, { x: 0, y: 0 }],
  [{ x: -200, y: 50 }, { x: 400, y: 50 }],
  [{ x: 0, y: 600 }, { x: 0, y: -600 }],
  [{ x: -500, y: -400 }, { x: 940, y: 680 }],
  [{ x: 1000, y: 800 }, { x: -440, y: -280 }],
  // Also exercise both duration clamps and the threshold above the early return.
  [{ x: 0, y: 0 }, { x: 2, y: 0 }],
  [{ x: 10000, y: 8000 }, { x: -20000, y: -10000 }],
];

function speedsOf(samples) {
  return samples.slice(1).map((point, i) => {
    const prev = samples[i];
    return {
      speed: Math.hypot(point.x - prev.x, point.y - prev.y) / (point.t - prev.t),
      t: (point.t + prev.t) / 2,
    };
  });
}

test('256 seeds trace one bounded arc with exact endpoints, regular timing and one speed peak', () => {
  for (const [from, to] of cases) for (const key of keys) for (const hz of [30, 60, 120]) {
    const move = planMove(from, to, { key, hz });
    const { durationMs, samples } = move;
    const dx = to.x - from.x, dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    const label = `${key}, D=${distance}, hz=${hz}`;
    assert.deepEqual(samples[0], { t: 0, ...from });
    assert.deepEqual(samples.at(-1), { t: durationMs, ...to });
    assert.ok(durationMs >= 320 * 0.97 && durationMs <= 1300 * 1.03, label);
    assert.deepEqual(move, planMove(from, to, { key, hz }));
    let remaining = distance;
    let side = 0;
    const margin = 0.04 * distance + 1;
    for (const [i, point] of samples.entries()) {
      for (const axis of ['x', 'y']) {
        assert.ok(point[axis] >= Math.min(from[axis], to[axis]) - margin, label);
        assert.ok(point[axis] <= Math.max(from[axis], to[axis]) + margin, label);
      }
      const nextRemaining = Math.hypot(point.x - to.x, point.y - to.y);
      assert.ok(nextRemaining <= remaining + 1e-6, `extra movement: ${label}`);
      remaining = nextRemaining;
      const deviation = (dx * (point.y - from.y) - dy * (point.x - from.x)) / distance;
      assert.ok(Math.abs(deviation) <= 0.04 * distance + 0.5, label);
      if (Math.abs(deviation) > 1e-8) {
        if (!side) side = Math.sign(deviation);
        assert.equal(Math.sign(deviation), side, `changed arc side: ${label}`);
      }
      if (!i) continue;
      const dt = point.t - samples[i - 1].t;
      assert.ok(dt > 0, label);
      if (i < samples.length - 1) near(dt, 1000 / hz);
      else assert.ok(dt <= 1000 / hz + 1e-8, label);
    }
    const speeds = speedsOf(samples);
    const peak = Math.max(...speeds.map(({ speed }) => speed));
    const peakIndex = speeds.findIndex(({ speed }) => speed === peak);
    const tolerance = peak * 1e-6;
    for (let i = 1; i < speeds.length; i++) {
      if (i <= peakIndex) {
        assert.ok(speeds[i].speed >= speeds[i - 1].speed - tolerance, `speed dip: ${label}`);
      } else {
        assert.ok(speeds[i].speed <= speeds[i - 1].speed + tolerance, `second speed peak: ${label}`);
      }
    }
    if (distance > 60) {
      const peakTime = speeds[peakIndex].t / durationMs;
      assert.ok(peakTime >= 0.3 && peakTime <= 0.55, `peak at ${peakTime}: ${label}`);
    }
  }
});

test('at least 90% of 200 seeded keys produce distinct paths for the same endpoints', () => {
  for (const [from, to] of cases) {
    const outputs = new Set(keys.slice(0, 200).map((key) => JSON.stringify(planMove(from, to, { key }))));
    assert.ok(outputs.size >= 180, `${outputs.size} distinct paths`);
  }
});

// Smoothness is a property of the curve, so it is measured at 1000 Hz: at 60 Hz a short 320 ms stroke has only about 19 frames, which
// makes any per-frame ratio large however smooth the motion is (measured: 22% at 60 Hz for a 25 px move, 1.4% at 1000 Hz).
test('256 seeds have a jolt-free speed curve: no step above 2% of peak when sampled at 1000 Hz', () => {
  let worst = { ratio: 0 };
  for (const [from, to] of cases) for (const key of keys) {
    const { samples } = planMove(from, to, { key, hz: 1000 });
    const speeds = speedsOf(samples.slice(0, -1));   // the last gap is shorter than the rest, which would inflate its ratio
    const peak = Math.max(...speeds.map(({ speed }) => speed));
    for (let i = 1; i < speeds.length; i++) {
      const ratio = Math.abs(speeds[i].speed - speeds[i - 1].speed) / peak;
      if (ratio > worst.ratio) worst = { ratio, key, from, to };
    }
  }
  assert.ok(worst.ratio < 0.02, `largest speed step must be below 2% of peak: ${JSON.stringify(worst)}`);
});

test('sub-2px moves use one destination sample; custom sample rates retain the exact final time', () => {
  for (const key of keys) for (const x of [0, 0.1, 1.999]) {
    assert.deepEqual(planMove({ x: 0, y: 0 }, { x, y: 0 }, { key }), {
      durationMs: 0, samples: [{ t: 0, x, y: 0 }],
    });
  }
  for (const hz of [1, 20, 120]) {
    const { samples, durationMs } = planMove({ x: 0, y: 0 }, { x: 100, y: 50 }, { key: 's1:0', hz });
    assert.equal(samples.at(-1).t, durationMs);
    for (let i = 1; i < samples.length; i++) assert.ok(samples[i].t > samples[i - 1].t);
  }
  for (const hz of [0, -1, Infinity, NaN]) {
    assert.throws(() => planMove({ x: 0, y: 0 }, { x: 2, y: 0 }, { key: 'a', hz }), /hz/);
  }
});

test('seeded click timings and target points stay within all limits across 256 keys', () => {
  for (const key of keys) {
    for (const [fn, lo, hi] of [[dwellMs, 110, 230], [pressMs, 60, 110], [settleAfterClickMs, 250, 450]]) {
      assert.ok(fn(key) >= lo && fn(key) <= hi);
      assert.equal(fn(key), fn(key));
    }
    for (const w of [1, 7.99, 8, 9, 16, 200]) for (const h of [2, 8, 12, 100]) {
      const box = { x: -20, y: 50, w, h };
      const point = targetPoint(box, { key });
      assert.deepEqual(point, targetPoint(box, { key }));
      if (w < 8 || h < 8) {
        assert.deepEqual(point, { x: box.x + w / 2, y: box.y + h / 2 });
      }
      for (const [axis, start, size] of [['x', box.x, w], ['y', box.y, h]]) {
        if (size < 8) assert.equal(point[axis], start + size / 2);
        else {
          assert.ok(point[axis] >= start + Math.max(4, size * 0.35));
          assert.ok(point[axis] <= start + size - Math.max(4, size * 0.35));
        }
      }
    }
  }
});

test('typing follows the seeded formula including punctuation, hesitations and a 25ms floor', () => {
  let hesitations = 0;
  for (const key of keys) for (const cps of [14, 200]) {
    const text = 'Hello, world. Why; yes: go! Really? 🙂';
    const rng = rngFor(key);
    const expected = Array.from(text, (char) => {
      let delay = 1000 / cps * (0.65 + 0.7 * rng());
      if (' ,.;:!?'.includes(char)) delay += 60 + 80 * rng();
      if (rng() < 0.03) { delay += 150 + 150 * rng(); hesitations++; }
      return Math.max(25, delay);
    });
    const actual = typingDelays(text, { key, cps });
    assert.deepEqual(actual, expected);
    assert.deepEqual(actual, typingDelays(text, { key, cps }));
    assert.equal(actual.length, Array.from(text).length);
    assert.ok(actual.every((delay) => delay >= 25));
  }
  assert.ok(hesitations > 0);
  assert.deepEqual(typingDelays('', { key: 'a' }), []);
  assert.equal(typingDelays('a', { key: 'a' })[0], typingDelays('a', { key: 'a', cps: 14 })[0]);
  for (const cps of [0, -1, Infinity, NaN]) assert.throws(() => typingDelays('a', { key: 'a', cps }), /cps/);
});

test('holds respect explicit bounds, caption length, narration words and the cap', () => {
  for (const explicit of [0, 1, 10000]) assert.equal(holdMs({ explicit, caption: 'x'.repeat(1000) }), explicit);
  assert.equal(holdMs({}), 1800);
  assert.equal(holdMs({ caption: null }), 1800);
  assert.equal(holdMs({ caption: 'x'.repeat(40) }), 2200);
  assert.equal(holdMs({ narration: '  one\n two   three four five  ' }), 2000);
  assert.equal(holdMs({ caption: 'x'.repeat(1000) }), 15000);
  assert.equal(holdMs({ narration: 'word '.repeat(50) }), 15000);
  assert.equal(holdMs({ explicit: null, narration: ' ' }), 1800);
  for (const explicit of [-1, 10001, NaN, Infinity]) assert.throws(() => holdMs({ explicit }), /explicit/);
});
