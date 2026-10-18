import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, ffprobeDuration } from '../scripts/lib/env.mjs';
import { readTrace } from '../scripts/lib/trace.mjs';
import { computeCuts, mergeCuts, remap, buildCaptions, buildCursor, keepFloors, stepFloorMs } from '../scripts/lib/timeline.mjs';
import { DEFAULTS } from '../scripts/lib/config.mjs';
import { editRun } from '../scripts/lib/edit.mjs';

const SAMPLE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'trace-sample.zip');
const FRAME = 1 / 60;

test('timeline: a 3 s wait keeps 0.5 s and every later caption and cursor time moves 2.5 s earlier', () => {
  const actions = [
    { method: 'mouseMove', start: 0, end: 2000 }, // slow travel is motion, never cut
    { method: 'waitForFunction', start: 1000, end: 4000 },
  ];
  const cuts = computeCuts(actions, { maxWaitMs: 1200, keepMs: 500 });
  assert.deepEqual(cuts, [[1500, 4000]]);
  assert.equal(remap(4000, cuts) - remap(1000, cuts), 500);

  const caps = buildCaptions([{ index: 0, title: 'a', start: 0, end: 4500 }, { index: 1, title: 'b', start: 4500, end: 6000 }], cuts);
  assert.deepEqual(caps.map((c) => [c.start, c.end]), [[0, 2], [2, 3.5]]);

  const moves = [{ t: 0, x: 0, y: 0 }, { t: 5000, x: 50, y: 50 }];
  const { samples } = buildCursor(moves, [{ t: 5000, x: 50, y: 50 }], { width: 100, height: 100, durationMs: 6000 }, cuts);
  const click = samples.find((s) => s.interactionType === 'click');
  assert.equal(click.timeMs, 2500);
  const arrived = samples.find((s) => s.interactionType === 'move' && s.cx === 0.5);
  assert.ok(arrived.timeMs >= 2500 && arrived.timeMs <= 2500 + 17, `cursor arrived at ${arrived.timeMs}`);
});

// A phone clip has no cursor travel to keep, so almost all of each step is
// busy waits, expects and navigations: waits nest, cross step boundaries and
// start before the first paint. Cut without floors, a 43 s clip shrinks to a
// few seconds and captions flash past unread.
test('edit: a phone clip whose steps are mostly waits keeps every step at its floor (else it is cut to seconds and captions flash past)', () => {
  const pace = { ...DEFAULTS.pace };
  const steps = [
    { index: 0, title: 'Open the store on the phone', start: 0, end: 9000 },
    { index: 1, title: 'Search for running shoes', start: 9000, end: 21000 },
    { index: 2, title: 'Open the first result', start: 21000, end: 33000 },
    { index: 3, title: 'Add it to the bag and check the total', start: 33000, end: 43000 },
  ];
  const actions = [
    { method: 'goto', start: 200, end: 5200 }, // slow first load, painted at 3000
    { method: 'waitForFunction', start: 5300, end: 8900 },
    { method: 'tap', start: 9000, end: 9300 },
    { method: 'expect', start: 9300, end: 20800 },
    { method: 'waitForURL', start: 9500, end: 18000 }, // nested in the expect
    { method: 'tap', start: 21000, end: 21200 },
    { method: 'waitForFunction', start: 21200, end: 36000 }, // runs into the next step
    { method: 'expect', start: 36000, end: 42900 },
  ];
  const shown = 3000;
  const floorOf = (s) => stepFloorMs(s.title, pace);
  const cuts = keepFloors(steps, mergeCuts([[0, shown], ...computeCuts(actions, { maxWaitMs: 1200 })]), floorOf, shown);
  const caps = buildCaptions(steps, cuts);
  for (const s of steps) {
    const c = caps.find((x) => x.index === s.index);
    assert.ok(c.end - c.start >= floorOf(s) / 1000 - 0.002, `"${s.title}" lasts ${(c.end - c.start).toFixed(3)} s, floor ${floorOf(s) / 1000} s`);
  }
  assert.ok(remap(43000, cuts) >= steps.slice(1).reduce((n, s) => n + floorOf(s), 0), 'whole clip shorter than its steps');
});

test('captions: steps out of order or overlapping come out sorted and never overlap (else two captions burn at once)', () => {
  const caps = buildCaptions([
    { index: 1, title: 'second', start: 2000, end: 5000 },
    { index: 0, title: 'first', start: -100, end: 2500 }, // started before the first video frame
  ], []);
  assert.deepEqual(caps.map((c) => [c.index, c.start, c.end]), [[0, 0, 2], [1, 2, 5]]);
});

test('cursor: 60 Hz, normalized, a click+mouseup at the click point, text shape over a fill target', () => {
  const box = { x: 100, y: 100, width: 200, height: 20 };
  const { samples } = buildCursor(
    [{ t: 0, x: 1920, y: 0 }, { t: 500, x: 200, y: 110 }],
    [{ t: 800, x: 960, y: 540 }],
    { width: 1920, height: 1080, durationMs: 1000, targets: [{ start: 500, end: 700, box, cursorType: 'text' }] }, []);
  const moves = samples.filter((s) => s.interactionType === 'move');
  assert.equal(moves.length, 61);
  moves.slice(1).forEach((s, i) => assert.ok(Math.abs(s.timeMs - moves[i].timeMs - 1000 / 60) <= 1, `gap at ${s.timeMs}`));
  assert.ok(samples.every((s) => s.cx >= 0 && s.cx <= 1 && s.cy >= 0 && s.cy <= 1));
  assert.equal(moves[0].cx, 1);
  assert.equal(moves.at(-1).cursorType, 'text');
  const events = samples.filter((s) => s.interactionType !== 'move').map((s) => [s.interactionType, s.timeMs, s.cx, s.cy]);
  assert.deepEqual(events, [['click', 800, 0.5, 0.5], ['mouseup', 890, 0.5, 0.5]]);
});

test('trace: steps, the long expect, click points and the video page frames are read from a real trace', async () => {
  const t = await readTrace(SAMPLE);
  assert.deepEqual(t.steps.map((s) => s.title), ['Open the page', 'Type a name', 'Press the button', 'Done']);
  assert.ok(t.steps.every((s, i) => s.end >= s.start && (i === 0 || s.start >= t.steps[i - 1].end)));
  const expect = t.actions.find((a) => a.method === 'expect');
  assert.ok(expect.end - expect.start > 3000);
  assert.deepEqual(t.actions.find((a) => a.method === 'click').point, { x: 336.89, y: 50.5 });
  assert.ok(t.moves.length > 20 && t.frames.length > 5);
});

// Mean colour of each frame, one [r,g,b] per frame.
async function frameColours(file) {
  const out = path.join(await mkdtemp(path.join(tmpdir(), 'demo-edit-px-')), 'px.rgb');
  const r = await run('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'scale=1:1,format=rgb24', '-f', 'rawvideo', out]);
  assert.equal(r.code, 0, r.stderr);
  const buf = await readFile(out);
  return Array.from({ length: buf.length / 3 }, (_, i) => [buf[i * 3], buf[i * 3 + 1], buf[i * 3 + 2]]);
}
const isRed = ([r, g, b]) => r > 200 && g < 60 && b < 60;
const isGreen = ([r, g, b]) => g > 200 && r < 60 && b < 60;

// A run dir holding the sample recording (raw/laptop/{trace.zip,video.webm}),
// and the sample unzipped into shots/.
async function sampleRun() {
  const dir = await mkdtemp(path.join(tmpdir(), 'demo-edit-'));
  const raw = path.join(dir, 'raw', 'laptop');
  await mkdir(raw, { recursive: true });
  await copyFile(SAMPLE, path.join(raw, 'trace.zip'));
  const shots = path.join(dir, 'shots');
  assert.equal((await run('unzip', ['-qo', SAMPLE, '-d', shots])).code, 0);
  const lines = (await readFile(path.join(shots, 'test.trace'), 'utf8')).split('\n').filter(Boolean).map(JSON.parse);
  const video = lines.flatMap((l) => l.attachments ?? []).find((a) => a.name === 'video');
  await copyFile(path.join(shots, video.file), path.join(raw, 'video.webm'));
  await writeFile(path.join(dir, 'record.json'), JSON.stringify({
    version: 1, clips: [{ name: 'laptop', width: 400, height: 300, mobile: false }], config: { maxWaitMs: 1200 },
  }));
  return { dir, shots };
}

// The sample's "Press the button" step holds a 3.3 s expect, which the
// fixture cannot see and so adds no hold for; cut to 0.5 s, the step would
// flash by in 0.7 s, shorter than anyone can read its caption.
test('edit: a step whose 3 s expect is cut still lasts its floor on the edit (else its caption is gone before it can be read)', async () => {
  const { dir } = await sampleRun();
  await editRun(dir);
  const { steps } = JSON.parse(await readFile(path.join(dir, 'edit', 'laptop', 'timeline.json'), 'utf8'));
  const step = steps.find((s) => s.title === 'Press the button');
  const floor = stepFloorMs(step.title, DEFAULTS.pace) / 1000;
  assert.ok(step.end - step.start >= floor - 0.002, `step lasts ${(step.end - step.start).toFixed(3)} s, floor ${floor} s`);
});

test('edit: colour changes before and after a cut 3 s wait land on the edited frames the trace predicts (else captions and cursor drift off the video)', async () => {
  // The sample page turns red on click, then an expect waits 3.3 s (cut), then the
  // page turns green; the trace's own screencast frames say when each colour first appeared.
  const { dir, shots } = await sampleRun();
  await editRun(dir);
  const edit = path.join(dir, 'edit', 'laptop');
  const timeline = JSON.parse(await readFile(path.join(edit, 'timeline.json'), 'utf8'));
  const captions = JSON.parse(await readFile(path.join(edit, 'captions.json'), 'utf8'));
  const cuts = timeline.cuts.map(([a, b]) => [a * 1000, b * 1000]);
  assert.equal(cuts.length, 1, 'the 3.3 s expect is the only cut');

  const clip = path.join(edit, 'clip.mp4');
  assert.ok(Math.abs((await ffprobeDuration(clip)) - timeline.duration) <= FRAME, 'clip length matches timeline.duration');

  const t = await readTrace(SAMPLE);
  const t0 = t.frames[0].t;
  captions.forEach((c, i) => {
    const step = Math.max(0, remap(t.steps[i].start - t0, cuts)) / 1000;
    assert.ok(Math.abs(c.start - step) <= FRAME, `caption ${i} at ${c.start} s, its step starts at ${step.toFixed(3)} s`);
  });

  const traceFrames = (await readFile(path.join(shots, '1-trace.trace'), 'utf8')).split('\n')
    .filter((l) => l.includes('"screencast-frame"')).map(JSON.parse);
  const onset = async (pred) => {
    for (const f of traceFrames) if (pred((await frameColours(path.join(shots, f.file)))[0])) return f.timestamp;
    throw new Error('colour never appears in the trace');
  };
  const colours = await frameColours(clip);
  // The page turns red on the click and green as the last step starts, so the
  // cursor log's click and that step's caption must sit on those frames too.
  const cursor = JSON.parse(await readFile(path.join(edit, 'cursor.json'), 'utf8'));
  const click = cursor.samples.find((s) => s.interactionType === 'click').timeMs / 1000;
  for (const [name, pred, written] of [['red', isRed, click], ['green', isGreen, captions[3].start]]) {
    const expected = remap((await onset(pred)) - t0, cuts) / 1000;
    const seen = colours.findIndex(pred) / 60;
    // The webm is 25 fps, so a change can show up to one source frame (40 ms) off.
    assert.ok(Math.abs(seen - expected) <= 0.05, `${name}: trace says ${expected.toFixed(3)} s, first seen at ${seen.toFixed(3)} s`);
    assert.ok(Math.abs(seen - written) <= 0.05, `${name}: edit wrote ${written.toFixed(3)} s, first seen at ${seen.toFixed(3)} s`);
  }
});
