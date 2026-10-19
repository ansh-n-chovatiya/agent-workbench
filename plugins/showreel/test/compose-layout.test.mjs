import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutFor } from '../scripts/lib/compose/layout.mjs';
const input = { output: { width: 1920, height: 1080 }, source: { width: 1280, height: 720 }, composition: { frame: { paddingPct: 5 }, captions: { enabled: true, mode: 'band' } } };
test('band reserves 13%, overlay sits inside frame, and captions can be disabled', () => {
  const band = layoutFor(input);
  assert.deepEqual(band.caption, { x: 0, y: 940, w: 1920, h: 140 });
  assert.deepEqual(band.frame, { x: 221, y: 54, w: 1479, h: 832 });
  const overlay = layoutFor({ ...input, composition: { ...input.composition, captions: { enabled: true, mode: 'overlay' } } });
  assert.deepEqual(overlay.frame, { x: 96, y: 54, w: 1728, h: 972 });
  assert.deepEqual(overlay.caption, { x: 269, y: 902, w: 1382, h: 81 });
  assert.equal(overlay.scaleFramePx, 1.35);
  const disabled = layoutFor({ ...input, composition: { ...input.composition, captions: { enabled: false, mode: 'band' } } });
  assert.equal(disabled.caption, null); assert.deepEqual(disabled.frame, overlay.frame);
  assert.throws(() => layoutFor({ ...input, source: { width: 0, height: 720 } }));
});
test('seeded aspect ratios preserve source shape and frame bounds with integer rectangles', () => {
  let seed = 26;
  const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  for (let run = 0; run < 100; run++) {
    const source = { width: 400 + Math.floor(rand() * 2000), height: 400 + Math.floor(rand() * 2000) };
    const result = layoutFor({ ...input, source }), f = result.frame;
    for (const rect of [f, result.caption]) for (const value of Object.values(rect)) assert.ok(Number.isInteger(value));
    assert.ok(f.x >= 0 && f.y >= 0 && f.x + f.w <= 1920 && f.y + f.h <= result.caption.y);
    assert.ok(Math.abs(f.h - f.w * source.height / source.width) <= 3);
  }
});

test('square frames preserve source shape and keep the caption band outside the frame', () => {
  for (const source of [{width:519,height:1123},{width:1920,height:1080},{width:1080,height:1080}]) {
    const l=layoutFor({...input,output:{preset:'square',width:1080,height:1080},source,
      composition:{captions:{enabled:true,mode:'band'},layout:{safeZones:true}}});
    assert.ok(Math.abs(l.frame.w/l.frame.h-source.width/source.height)/(source.width/source.height)<.005);
    assert.ok(l.frame.y>=Math.ceil(1080*.07));assert.ok(l.frame.y+l.frame.h<=l.caption.y);
    assert.ok(l.caption.y+l.caption.h<=1080-Math.ceil(1080*.14));
  }
});
