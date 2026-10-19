import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeMap } from '../scripts/lib/compose/timemap.mjs';
import { placeNarration, extendCues } from '../scripts/lib/audio/retime.mjs';

const near = (a, b, m = '') => assert.ok(Math.abs(a - b) < 1e-9, `${m} ${a} != ${b}`);
const steps = [{ id: 's1', tStart: 0, holdStart: 3, tEnd: 4 }, { id: 's2', tStart: 4, holdStart: 7, tEnd: 8 }, { id: 's3', tStart: 8, holdStart: 10, tEnd: 12 }];
const clips = (d1, d2, d3) => ({ s1: { durationSec: d1, source: 'tts' }, s2: { durationSec: d2, source: 'tts' }, s3: { durationSec: d3, source: 'tts' } });
const codes = (r) => r.warnings.map((w) => `${w.stepId}:${w.code}`);

test('uncut video: narration starts with the caption and fits', () => {
  const r = placeNarration({ steps, clips: clips(3, 3, 3), timemap: buildTimeMap({ duration: 12 }), fps: 30 });
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.placements.map((p) => p.stepId), ['s1', 's2', 's3']);
  near(r.placements[0].outStart, 0.15); near(r.placements[0].outEnd, 3.15); assert.equal(r.placements[0].rate, 1);
  near(r.placements[1].outStart, 4.15);
  assert.deepEqual(r.captionSpans.map((s) => [s.stepId, s.outStart, s.outEnd]), r.placements.map((p) => [p.stepId, p.outStart, p.outEnd]));
});
test('title card lead shifts every placement', () => {
  const map = buildTimeMap({ duration: 12, lead: 2.2, tail: 2, fade: 0.4 });
  const r = placeNarration({ steps, clips: clips(2, 2, 2), timemap: map });
  near(r.placements[0].outStart, map.mainStart + 0.15);
  near(r.placements[2].outStart, map.mainStart + 8.15);
});
test('cues, when given, set the narration start', () => {
  const r = placeNarration({ steps, clips: clips(2, 2, 2), timemap: buildTimeMap({ duration: 12 }), cues: [{ id: 's2', start: 4.5, end: 7 }] });
  near(r.placements[1].outStart, 4.5);
});
test('a wholly trimmed step loses its narration with an informational note', () => {
  const r = placeNarration({ steps, clips: clips(2, 2, 2), timemap: buildTimeMap({ duration: 12, trims: [{ start: 4, end: 8 }] }) });
  assert.deepEqual(r.placements.map((p) => p.stepId), ['s1', 's3']);
  assert.deepEqual(codes(r), ['s2:step-removed']);
  assert.deepEqual(r.warnings[0].fixes, []); assert.equal(r.warnings[0].overrunSec, 0);
  near(r.placements[1].outStart, 4.15);
});
test('a partly cut step keeps its whole narration from the first kept moment and warns when the video is shorter', () => {
  const map = buildTimeMap({ duration: 12, trims: [{ start: 4, end: 7 }] });
  const r = placeNarration({ steps, clips: clips(2, 2.5, 2), timemap: map });
  const s2 = r.placements.find((p) => p.stepId === 's2');
  near(s2.outStart, 4); near(s2.outEnd, 6.5);
  const w = r.warnings.find((x) => x.stepId === 's2');
  assert.equal(w.code, 'voice-overruns-video'); near(w.overrunSec, 1.5); assert.deepEqual(w.fixes, ['freeze', 'slow']);
  // s3 begins at output 5 but s2's narration runs to 6.5: pushed after it.
  const s3 = r.placements.find((p) => p.stepId === 's3');
  assert.ok(s3.outStart >= s2.outEnd); assert.ok(codes(r).includes('s3:overlap-shifted'));
});
test('speed-ups: the voice is never sped; steps played faster than 1.1x are flagged and short video warns', () => {
  const map = buildTimeMap({ duration: 12, speeds: [{ start: 4, end: 8, rate: 2 }] });
  const r = placeNarration({ steps, clips: clips(1, 3, 1), timemap: map });
  const s2 = r.placements.find((p) => p.stepId === 's2');
  assert.equal(s2.rate, 2); near(s2.outEnd - s2.outStart, 3);
  assert.ok(codes(r).includes('s2:voice-over-sped-video')); assert.ok(codes(r).includes('s2:voice-overruns-video'));
  const gentle = placeNarration({ steps, clips: clips(1, 1, 1), timemap: buildTimeMap({ duration: 12, speeds: [{ start: 4, end: 8, rate: 1.1 }] }) });
  assert.ok(!codes(gentle).some((c) => c.endsWith('sped-video')));
});
test('slow-down leaves narration unchanged and fits more easily', () => {
  const map = buildTimeMap({ duration: 12, speeds: [{ start: 0, end: 4, rate: 0.5 }] });
  const r = placeNarration({ steps, clips: clips(5, 1, 1), timemap: map });
  near(r.placements[0].outEnd - r.placements[0].outStart, 5); assert.deepEqual(codes(r), []);
});
test('overlapping clips are pushed after the previous one; muted steps and missing clips are skipped', () => {
  const r = placeNarration({ steps, clips: clips(6, 2, 2), timemap: buildTimeMap({ duration: 12 }) });
  near(r.placements[1].outStart, r.placements[0].outEnd + 0.1);
  assert.ok(codes(r).includes('s2:overlap-shifted'));
  const skipped = placeNarration({ steps, clips: { s1: { durationSec: 1 }, s3: { durationSec: 1 } }, timemap: buildTimeMap({ duration: 12 }), muted: { s3: true } });
  assert.deepEqual(skipped.placements.map((p) => p.stepId), ['s1']); assert.deepEqual(skipped.warnings, []);
});
test('a JSON copy of the time map gives the same placements', () => {
  const map = buildTimeMap({ duration: 12, trims: [{ start: 1, end: 2 }], speeds: [{ start: 8, end: 12, rate: 2 }] });
  const a = placeNarration({ steps, clips: clips(2, 2, 4), timemap: map }), b = placeNarration({ steps, clips: clips(2, 2, 4), timemap: JSON.parse(JSON.stringify(map)) });
  assert.deepEqual(a, b);
});
test('extendCues grows cues to the narration span, never shrinks or overlaps', () => {
  const map = buildTimeMap({ duration: 12 });
  const cues = [{ id: 's1', text: 'a', start: 0.15, end: 1 }, { id: 's2', text: 'b', start: 4.15, end: 7.9 }, { id: 's3', text: 'c', start: 8.15, end: 8.5 }];
  const r = extendCues(cues, [{ stepId: 's1', outStart: 0.15, outEnd: 3 }, { stepId: 's2', outStart: 4.15, outEnd: 6 }, { stepId: 's3', outStart: 8.15, outEnd: 10 }], map);
  assert.equal(cues[0].end, 1);
  near(r[0].end, 3); near(r[1].end, 7.9); near(r[2].end, 10);
  for (let i = 1; i < r.length; i++) assert.ok(r[i].start >= r[i - 1].end);
  assert.deepEqual(extendCues(cues, [], map), cues);
  // A long narration pushes the next caption later rather than overlapping it.
  const pushed = extendCues(cues, [{ stepId: 's1', outStart: 0.15, outEnd: 5 }], map);
  near(pushed[0].end, 5); near(pushed[1].start, 5.05); near(pushed[1].end, 7.9);
});
