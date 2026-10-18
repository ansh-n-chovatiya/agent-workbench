import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestZoomRegions, validateRegions, maxSharpZoom } from '../scripts/lib/compose/zoom.mjs';
const events = (times) => ({ viewport: { width: 1000, height: 600 }, targets: times.map((t, i) => ({ t, kind: 'click', stepId: `s${i + 1}`, sensitive: true, box: { x: 200, y: 100, w: 100, h: 40 } })), clicks: times.map((t, i) => ({ t: t + 0.3, stepId: `s${i + 1}`, x: 250, y: 120 })), keys: [] });
const suggest = (e, options) => suggestZoomRegions({ events: e, record: { durationSec: 20 }, options });
test('single click, close click merge, distant click separation, clipping and sensitive targets', () => {
  const [region] = suggest(events([0]));
  assert.deepEqual(region, { id: 'z1', tStart: 0.1, tEnd: 1.2, depth: 1.7, keyframes: [{ t: 0.1, x: 250, y: 120 }], stepIds: ['s1'], source: 'auto' });
  assert.equal(suggest(events([1, 1.3])).length, 1);
  assert.equal(suggest(events([1, 1.3]))[0].keyframes.length, 2);
  assert.equal(suggest(events([1, 4])).length, 2);
  assert.equal(suggest(events([0]), { leadIn: -0.2 })[0].tStart, 0);
  assert.equal(suggest(events([19.8])).length, 0);
});
test('fill follows last key, no keys falls back to click, huge boxes and unwanted kinds are skipped', () => {
  const e = events([1]); e.targets[0].kind = 'fill';
  e.keys = [{ t: 2, stepId: 's1' }, { t: 3, stepId: 's1' }, { t: 4, stepId: 's2' }];
  assert.equal(suggest(e)[0].tEnd, 3.6);
  e.keys = []; assert.equal(suggest(e)[0].tEnd, 2.2);
  e.targets[0].kind = 'press'; assert.equal(suggest(e).length, 0);
  e.targets[0].kind = 'click'; e.targets[0].box = { x: 0, y: 0, w: 1000, h: 600 };
  assert.equal(suggest(e).length, 0);
});
test('seeded suggestions are ordered, disjoint and within viewport and duration without mutation', () => {
  let seed = 101;
  const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  for (let n = 0; n < 100; n++) {
    const e = events(Array.from({ length: 30 }, () => rand() * 20).sort((a, b) => a - b));
    for (const target of e.targets) target.box = { x: rand() * 2000 - 500, y: rand() * 1200 - 300, w: 20, h: 20 };
    const before = structuredClone(e), regions = suggest(e);
    assert.deepEqual(e, before); assert.equal(validateRegions(regions, { duration: 20 }).ok, true);
    for (const r of regions) for (const k of r.keyframes) assert.ok(k.x >= 0 && k.x <= 1000 && k.y >= 0 && k.y <= 600);
  }
});
test('region validation collects errors and exact sharpness warnings', () => {
  assert.equal(maxSharpZoom({ sourceWidthPx: 100, frameWidthPx: 200 }), 1);
  assert.equal(maxSharpZoom({ sourceWidthPx: 400, frameWidthPx: 200 }), 2);
  assert.throws(() => maxSharpZoom({ sourceWidthPx: 100, frameWidthPx: 0 }));
  const regions = suggest(events([1, 4]));
  assert.deepEqual(validateRegions(regions, { duration: 20, maxSharp: 1.2 }).warnings, ['region z1 depth 1.7 exceeds the sharp limit 1.2', 'region z2 depth 1.7 exceeds the sharp limit 1.2']);
  regions[1].tStart = 0; regions[1].depth = 5; regions[0].keyframes[0].t = -1;
  const result = validateRegions(regions, { duration: 1 });
  assert.equal(result.ok, false); assert.ok(result.errors.length >= 4);
  for (const input of [null, {}, [null], [{}]]) assert.equal(validateRegions(input).ok, false);
});
