import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planCamera, cameraAt } from '../scripts/lib/compose/camera.mjs';
const source = { width: 1280, height: 720 };
const region = { tStart: 1, tEnd: 4, depth: 2, keyframes: [{ t: 1, x: 950, y: 530 }] };
const inside = ({ cx, cy, z }) => { assert.ok(z >= 1); assert.ok(cx - 640 / z >= -1e-9); assert.ok(cx + 640 / z <= 1280 + 1e-9); assert.ok(cy - 360 / z >= -1e-9); assert.ok(cy + 360 / z <= 720 + 1e-9); };
test('empty camera is constant and includes exact terminal sample', () => {
  const plan = planCamera({ source, duration: 1.01, regions: [] });
  assert.equal(plan.samples.at(-1).t, 1.01);
  for (const s of plan.samples) assert.deepEqual(cameraAt(plan, s.t), { cx: 640, cy: 360, z: 1 });
  assert.deepEqual(planCamera({ source, duration: 0, regions: [] }).samples, [{ t: 0, cx: 640, cy: 360, z: 1 }]);
});
test('critical spring settles, returns, has no overshoot, remains bounded and is deterministic', () => {
  const input = { source, duration: 7, regions: [region] };
  const plan = planCamera(input);
  assert.deepEqual(planCamera(input), plan);
  assert.ok(cameraAt(plan, 2.4).z >= 1.98);
  assert.ok(cameraAt(plan, 5.4).z <= 1.02);
  for (const [i, s] of plan.samples.entries()) {
    inside(s); assert.ok(s.z <= 2 * 1.005);
    if (i) {
      const prev = plan.samples[i - 1];
      assert.ok(Math.abs(s.z - prev.z) < 0.06);
      assert.ok(Math.abs(s.cx - prev.cx) < 20); assert.ok(Math.abs(s.cy - prev.cy) < 20);
    }
  }
  const a = plan.samples[100], b = plan.samples[101], mid = cameraAt(plan, (a.t + b.t) / 2);
  assert.ok(Math.abs(mid.z - (a.z + b.z) / 2) < 1e-12);
  assert.deepEqual(cameraAt(plan, -10), { cx: 640, cy: 360, z: 1 });
  assert.deepEqual(cameraAt(plan, 100), cameraAt(plan, 7));
});
test('seeded edge focuses and keyframe pans keep every sampled and interpolated crop inside source', () => {
  let seed = 42;
  const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  for (let run = 0; run < 20; run++) {
    const input = { source, duration: 6, hz: 30, regions: [{ ...region, depth: 1.05 + rand() * 2.95,
      keyframes: [1, 2, 3].map((t) => ({ t, x: rand() * 1280, y: rand() * 720 })) }] };
    const before = structuredClone(input), plan = planCamera(input);
    assert.deepEqual(input, before);
    for (let t = 0; t <= 6; t += 0.007) inside(cameraAt(plan, t));
  }
  assert.throws(() => planCamera({ source, duration: 1, regions: [], hz: 0 }));
});
