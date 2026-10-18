import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cursorAt, pressAmount, rippleAt } from '../scripts/lib/compose/cursor-track.mjs';
const events = { viewport: { width: 1000, height: 600 }, cursor: [{ t: 1, x: 100, y: 200 }, { t: 2, x: 300, y: 400 }], clicks: [{ t: 2, x: 300, y: 400 }, { t: 2.2, x: 350, y: 450 }] };
test('cursor hits samples, interpolates, clamps and falls back to viewport centre', () => {
  assert.deepEqual(cursorAt(events, 1), { x: 100, y: 200 });
  assert.deepEqual(cursorAt(events, 1.5), { x: 200, y: 300 });
  assert.deepEqual(cursorAt(events, -1), { x: 100, y: 200 });
  assert.deepEqual(cursorAt(events, 2), { x: 300, y: 400 });
  assert.deepEqual(cursorAt(events, 10), { x: 300, y: 400 });
  assert.deepEqual(cursorAt({ ...events, cursor: [] }, 1), { x: 500, y: 300 });
  assert.deepEqual(cursorAt({ ...events, cursor: [events.cursor[0], { t: 1, x: 150, y: 250 }, events.cursor[1]] }, 1), { x: 150, y: 250 });
});
test('press smoothstep has expected extremes and is continuous, including rapid clicks', () => {
  assert.equal(pressAmount(events, 1.99), 1); assert.equal(pressAmount(events, 2), 1);
  assert.ok(Math.abs(pressAmount(events, 2.045) - 0.86) < 1e-12);
  assert.equal(pressAmount(events, 2.12), 1);
  const rapid = { ...events, clicks: [{ t: 2 }, { t: 2.05 }] };
  let previous = pressAmount(rapid, 1.9);
  for (let t = 1.9; t < 2.3; t += 0.0001) {
    const value = pressAmount(rapid, t);
    assert.ok(value >= 0.86 && value <= 1); assert.ok(Math.abs(value - previous) < 0.001);
    previous = value;
  }
});
test('ripple uses most recent click with an exclusive end', () => {
  assert.equal(rippleAt(events, 1.999), null);
  assert.deepEqual(rippleAt(events, 2), { x: 300, y: 400, progress: 0 });
  assert.deepEqual(rippleAt(events, 2.2), { x: 350, y: 450, progress: 0 });
  assert.ok(Math.abs(rippleAt(events, 2.475).progress - 0.5) < 1e-12);
  assert.equal(rippleAt(events, 2.75), null);
  assert.equal(rippleAt({ ...events, clicks: [] }, 3), null);
});
