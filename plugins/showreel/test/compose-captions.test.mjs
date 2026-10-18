import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cuesFromRun, captionAlpha, wrapLines, toSrt, toVtt } from '../scripts/lib/compose/captions.mjs';
import { buildTimeMap } from '../scripts/lib/compose/timemap.mjs';
test('captions match storyboard IDs, extend short cues and prevent overlap', () => {
  const input = { captionsEnabled: true, storyboard: { steps: [{ id: 's1', caption: 'Open report', guideSteps: [20] }, { id: 's2', caption: 'Read report' }, { id: 's3', caption: null }, { id: 's4', caption: 'Missing' }] }, events: { steps: [{ id: 's1', tStart: 0, tEnd: 0.5 }, { id: 's2', tStart: 1, tEnd: 4 }, { id: 's3', tStart: 5, tEnd: 6 }] } };
  const before = structuredClone(input), cues = cuesFromRun(input);
  assert.deepEqual(cues, [{ id: 's1', text: 'Open report', start: 0.15, end: 1.0999999999999999 }, { id: 's2', text: 'Read report', start: 1.15, end: 3.9 }]);
  assert.deepEqual(input, before);
  assert.deepEqual(cuesFromRun({ ...input, captionsEnabled: false }), []);
  input.events.steps[0].tEnd = 2;
  assert.ok(cuesFromRun(input)[0].end < cuesFromRun(input)[1].start);
  input.storyboard.steps = [input.storyboard.steps[0]]; input.events.steps[0].tEnd = 0.2;
  assert.equal(cuesFromRun(input)[0].end, 1.15);
});
test('caption envelope is smooth, bounded and zero outside its cue', () => {
  const cue = { start: 1, end: 3 };
  for (const t of [0, 1, 3, 4]) assert.equal(captionAlpha(cue, t), 0);
  assert.ok(Math.abs(captionAlpha(cue, 1.1) - 0.5) < 1e-12);
  assert.equal(captionAlpha(cue, 2), 1);
  assert.ok(Math.abs(captionAlpha(cue, 2.9) - 0.5) < 1e-12);
  for (let t = 0; t < 4; t += 0.003) assert.ok(captionAlpha(cue, t) >= 0 && captionAlpha(cue, t) <= 1);
});
test('greedy wrapping fits, wraps, shrinks, truncates and breaks oversized words', () => {
  const measure = (s) => [...s].length;
  assert.deepEqual(wrapLines('one two', 10, measure), { lines: ['one two'], scale: 1 });
  assert.deepEqual(wrapLines('one two three', 7, measure), { lines: ['one two', 'three'], scale: 1 });
  assert.deepEqual(wrapLines('aaaa bbbb cccc dddd', 8.1, measure), { lines: ['aaaa bbbb', 'cccc dddd'], scale: 0.9 });
  assert.deepEqual(wrapLines('aaaa bbbb cccc dddd', 7.3, measure), { lines: ['aaaa bbbb', 'cccc dddd'], scale: 0.8 });
  const truncated = wrapLines('one two three four five six seven eight', 8, measure);
  assert.equal(truncated.scale, 0.8); assert.equal(truncated.lines.length, 2); assert.ok(truncated.lines.at(-1).endsWith('…'));
  const long = wrapLines('abcdefghijkl', 6, measure);
  assert.deepEqual(long, { lines: ['abcdef', 'ghijkl'], scale: 1 });
  assert.deepEqual(wrapLines('   ', 10, measure), { lines: [], scale: 1 });
  assert.throws(() => wrapLines('text', 0, measure));
  assert.throws(() => wrapLines('text', 10, measure, { maxLines: 0 }));
});
test('seeded wrapping obeys width and line limits with no splits for fitting words', () => {
  let seed = 57;
  const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  for (let run = 0; run < 150; run++) {
    const text = Array.from({ length: 1 + Math.floor(rand() * 20) }, () => 'a'.repeat(1 + Math.floor(rand() * 6))).join(' ');
    const width = 6 + rand() * 20, result = wrapLines(text, width, (s) => s.length);
    assert.ok(result.lines.length <= 2);
    for (const line of result.lines) assert.ok(line.length * result.scale <= width + 1e-9);
    if (!result.lines.at(-1)?.endsWith('…')) assert.equal(result.lines.join(' '), text);
  }
});
test('SRT and VTT exact output across trims, speeds and cards, including an end inside a trim', () => {
  const map = buildTimeMap({ duration: 8, trims: [{ start: 2, end: 3 }], speeds: [{ start: 4, end: 6, rate: 2 }], lead: 1, fade: 0.2 });
  const cues = [{ start: 0.5, end: 2.5, text: 'First' }, { start: 2.2, end: 3.5, text: 'Removed' }, { start: 4, end: 6, text: 'Faster' }];
  assert.equal(toSrt(cues, map), '1\n00:00:01,300 --> 00:00:02,800\nFirst\n\n2\n00:00:03,800 --> 00:00:04,800\nFaster\n');
  assert.equal(toVtt(cues, map), 'WEBVTT\n\n1\n00:00:01.300 --> 00:00:02.800\nFirst\n\n2\n00:00:03.800 --> 00:00:04.800\nFaster\n');
  assert.equal(toSrt(cues, JSON.parse(JSON.stringify(map))), toSrt(cues, map));
  assert.equal(toSrt([{ start: 0, end: 1, text: 'Custom map' }], { toOutput: (t) => t + 1 }), '1\n00:00:01,000 --> 00:00:02,000\nCustom map\n');
  assert.equal(toSrt([], map), ''); assert.equal(toVtt([], map), 'WEBVTT\n\n');
  const hour = buildTimeMap({ duration: 4000 });
  assert.match(toSrt([{ start: 3599.9996, end: 3601, text: 'Hour' }], hour), /01:00:00,000 --> 01:00:01,000/);
});
