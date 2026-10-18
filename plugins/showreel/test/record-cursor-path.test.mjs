import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planMove, dwellMs, pressMs, settleAfterClickMs, typingDelays, holdMs, targetPoint,
} from '../scripts/lib/record/cursor-path.mjs';
import { rngFor } from '../scripts/lib/record/rng.mjs';

const jerk = (t) => 10 * t ** 3 - 15 * t ** 4 + 6 * t ** 5;
const near = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) <= epsilon, `${a} != ${b}`);
const keys = Array.from({ length: 256 }, (_, i) => `s${i}:3`);

// Reconstruct the unjittered geometry independently to measure the actual jitter residual.
function geometry(from, to, key) {
  const rng = rngFor(key);
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  const duration = Math.max(280, Math.min(1100, 180 + 110 * Math.log2(1 + d / 40)))
    * (0.9 + 0.2 * rng());
  const u = { x: (to.x - from.x) / d, y: (to.y - from.y) / d };
  const excess = d > 350 ? Math.min(18, 0.03 * d) : 0;
  const end = { x: to.x + u.x * excess, y: to.y + u.y * excess };
  const offsets = [rng(), rng()].map((r) => Math.max(-40, Math.min(40, d * 0.06 * (r * 2 - 1))));
  const phases = [rng(), rng()].map((r) => r * 2 * Math.PI);
  function at(tau) {
    const split = excess ? 0.88 : 1;
    if (tau > split) {
      const s = jerk((tau - split) / (1 - split));
      return { x: end.x + (to.x - end.x) * s, y: end.y + (to.y - end.y) * s };
    }
    const s = jerk(tau / split), q = 1 - s;
    const value = (axis, perpendicular) => {
      const c1 = from[axis] + (end[axis] - from[axis]) * 0.3 + perpendicular * offsets[0];
      const c2 = from[axis] + (end[axis] - from[axis]) * 0.7 + perpendicular * offsets[1];
      return q ** 3 * from[axis] + 3 * q ** 2 * s * c1 + 3 * q * s ** 2 * c2 + s ** 3 * end[axis];
    };
    return { x: value('x', -u.y), y: value('y', u.x) };
  }
  return { duration, u, d, phases, at };
}

test('256 seeds preserve endpoints, timing, bounds, overshoot limits and speed peaks', () => {
  const cases = [
    [{ x: 0, y: 0 }, { x: 2, y: 0 }],
    [{ x: -200, y: 50 }, { x: -160, y: 50 }],
    [{ x: 4, y: -80 }, { x: 4, y: 180 }],
    [{ x: 100, y: 100 }, { x: -100, y: -100 }],
    [{ x: 0, y: 0 }, { x: 350, y: 0 }],
    [{ x: 0, y: 0 }, { x: 350.001, y: 0 }],
    [{ x: -500, y: -400 }, { x: 1000, y: 700 }],
    [{ x: 10000, y: 8000 }, { x: -20000, y: -10000 }],
  ];
  for (const [from, to] of cases) {
    const outputs = new Set();
    for (const key of keys) {
      const move = planMove(from, to, { key });
      const { durationMs: duration, samples } = move;
      const { d, u, duration: expected } = geometry(from, to, key);
      assert.deepEqual(samples[0], { t: 0, ...from });
      assert.deepEqual(samples.at(-1), { t: duration, ...to });
      assert.ok(duration >= 280 * 0.9 && duration <= 1100 * 1.1);
      near(duration, expected);
      assert.deepEqual(move, planMove(from, to, { key }));
      outputs.add(JSON.stringify(move));
      let peak = { speed: -1, tau: 0 };
      let maxBeyond = -Infinity;
      for (const [i, p] of samples.entries()) {
        assert.ok(p.x >= Math.min(from.x, to.x) - 60 && p.x <= Math.max(from.x, to.x) + 60);
        assert.ok(p.y >= Math.min(from.y, to.y) - 60 && p.y <= Math.max(from.y, to.y) + 60);
        const beyond = (p.x - to.x) * u.x + (p.y - to.y) * u.y;
        maxBeyond = Math.max(maxBeyond, beyond);
        assert.ok(beyond <= (d > 350 ? Math.min(18, 0.03 * d) : 0) + 0.6 + 1e-8);
        if (!i) continue;
        const prev = samples[i - 1];
        assert.ok(p.t > prev.t);
        if (i < samples.length - 1) near(p.t - prev.t, 1000 / 60);
        else assert.ok(p.t - prev.t <= 1000 / 60 + 1e-8);
        const speed = Math.hypot(p.x - prev.x, p.y - prev.y) / (p.t - prev.t);
        if (speed > peak.speed) peak = { speed, tau: (p.t + prev.t) / 2 / duration };
      }
      if (d <= 350) {
        assert.ok(maxBeyond <= 1e-8, `unexpected overshoot ${key}`);
        assert.ok(peak.tau >= 0.3 && peak.tau <= 0.7, `peak at ${peak.tau} for ${key}, D=${d}`);
      } else {
        assert.ok(maxBeyond > 0, `missing overshoot ${key}`);
      }
    }
    assert.equal(outputs.size, keys.length);
  }
});

test('256 seeds have bounded two-sine jitter and smooth first/last 15% ramps', () => {
  for (const key of keys) for (const d of [2, 80, 350, 351, 2000]) {
    const from = { x: -20, y: 10 }, to = { x: from.x + d, y: from.y };
    const model = geometry(from, to, key);
    // Dense samples exercise the taper rather than only the exact endpoint overrides.
    const { durationMs, samples } = planMove(from, to, { key, hz: 500 });
    for (const p of samples) {
      const tau = p.t / durationMs;
      const base = model.at(tau);
      const envelope = jerk(Math.min(1, tau / 0.15)) * jerk(Math.min(1, (1 - tau) / 0.15));
      const amplitude = Math.min(0.6, d * 0.01);
      const expected = amplitude / 2 * envelope * (
        Math.sin(2 * Math.PI * tau + model.phases[0])
        + Math.sin(4 * Math.PI * tau + model.phases[1])
      );
      near(p.x, base.x);
      near(p.y - base.y, expected);
      assert.ok(Math.hypot(p.x - base.x, p.y - base.y) <= 0.6 * envelope + 1e-8);
      if (tau === 0 || tau === 1) near(p.y - base.y, 0);
    }
  }
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
          assert.ok(point[axis] >= start + Math.max(4, size / 4));
          assert.ok(point[axis] <= start + size - Math.max(4, size / 4));
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
