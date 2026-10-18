import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// paths.mjs reads DEMO_VIDEO_HOME once, at import, and render delivers to
// DEMO_VIDEO_DELIVER: both point into a temp folder before any skill module
// loads (static imports would load first), so no render here writes to the
// user's home or Desktop.
const TMP_HOME = await mkdtemp(path.join(tmpdir(), 'demo-render-home-'));
process.env.DEMO_VIDEO_HOME = path.join(TMP_HOME, 'demo-video');
process.env.DEMO_VIDEO_DELIVER = path.join(TMP_HOME, 'deliver');
delete process.env.DEMO_VIDEO_CONFIG;
test.after(() => rm(TMP_HOME, { recursive: true, force: true }));
const { toSrt, toVtt } = await import('../scripts/lib/subtitles.mjs');
const { parseFreeze, outsideCards, captionSync, doubleCaptions } = await import('../scripts/lib/checks.mjs');
const { TITLE_OFFSET, composeDemo } = await import('../scripts/lib/compose.mjs');
const { renderCards } = await import('../scripts/lib/cards.mjs');
const { DEFAULTS } = await import('../scripts/lib/config.mjs');
const { main: render } = await import('../scripts/lib/render.mjs');
const { main: recaption } = await import('../scripts/lib/recaption.mjs');

const ff = (args) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...args]);
const probe = (file, entries, stream = 'v:0') => JSON.parse(execFileSync('ffprobe',
  ['-v', 'error', '-select_streams', stream, '-show_entries', entries, '-of', 'json', file]).toString());

const CAPTIONS = [
  { index: 0, text: 'Open the product page', start: 0.8, end: 2.8 },
  { index: 1, text: 'Add it to the cart and check out with the saved card', start: 3.1, end: 5.7 },
];

// 60 Hz log easing from (0.3, 0.3) to a click at CLICK, then resting there.
const CLICK = { timeMs: 3000, cx: 0.6, cy: 0.28 };
const CURSOR = {
  version: 2,
  samples: Array.from({ length: 361 }, (_, f) => {
    const k = Math.min(1, f / 180);
    const e = k * k * (3 - 2 * k);
    const timeMs = Math.round((f * 1000) / 60);
    return { timeMs, cx: 0.3 + (CLICK.cx - 0.3) * e, cy: 0.3 + (CLICK.cy - 0.3) * e,
      interactionType: timeMs === CLICK.timeMs ? 'click' : 'move', cursorType: 'arrow' };
  }),
};

// A 6 s moving test clip at `size`; `still` holds one frame from 2 s to 5 s.
function testClip(file, size, still) {
  const src = ['-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=60:duration=6`];
  const enc = ['-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', file];
  if (still) ff([...src, '-filter_complex', '[0]split[a][b];[a]trim=0:2,tpad=stop_mode=clone:stop_duration=3[p];[b]trim=5:6,setpts=PTS-STARTPTS[q];[p][q]concat', ...enc]);
  else ff([...src, ...enc]);
}

// A run dir as the edit stage leaves it (no raw/, so render does not re-edit).
// `still` holds the laptop clip still from 2 s to 5 s, `stillPhone` adds a
// phone clip that does the same, with no fixture pauses to explain it.
// Captions are passed in because a caption fading in also breaks a still span.
async function handMadeRun({ still = false, stillPhone = false, captions = CAPTIONS } = {}) {
  const runDir = await mkdtemp(path.join(tmpdir(), 'demo-render-test-'));
  const edit = path.join(runDir, 'edit', 'laptop');
  await mkdir(edit, { recursive: true });
  await mkdir(path.join(runDir, 'voice', 'laptop'), { recursive: true });
  testClip(path.join(edit, 'clip.mp4'), '1920x1080', still);
  for (const i of [0, 1]) ff(['-f', 'lavfi', '-i', `sine=frequency=${440 + 220 * i}:duration=1.2`, path.join(runDir, 'voice', 'laptop', `${i}.wav`)]);
  await writeFile(path.join(edit, 'captions.json'), JSON.stringify(captions));
  await writeFile(path.join(edit, 'cursor.json'), JSON.stringify(CURSOR));
  await writeFile(path.join(edit, 'timeline.json'), JSON.stringify({
    duration: 6, cuts: [],
    steps: captions.map((c) => ({ index: c.index, title: c.text, start: c.start + 0.3, end: c.end })),
    narration: captions.map((c) => ({ index: c.index, file: `voice/laptop/${c.index}.wav`, start: c.start + 0.3 })),
  }));
  const clips = [{ name: 'laptop', width: 1920, height: 1080, mobile: false }];
  if (stillPhone) {
    const phone = path.join(runDir, 'edit', 'phone');
    await mkdir(phone, { recursive: true });
    testClip(path.join(phone, 'clip.mp4'), '390x844', true);
    await writeFile(path.join(phone, 'captions.json'), JSON.stringify([{ index: 0, text: 'On the phone', start: 0.2, end: 5.8 }]));
    await writeFile(path.join(phone, 'cursor.json'), JSON.stringify({ version: 2, samples: [] }));
    await writeFile(path.join(phone, 'timeline.json'), JSON.stringify({ duration: 6, cuts: [], steps: [], narration: [], pauses: [] }));
    clips.push({ name: 'phone', width: 390, height: 844, mobile: true });
  }
  await writeFile(path.join(runDir, 'record.json'), JSON.stringify({
    version: 1, scenario: 'checkout-flow.spec.ts', runId: 'x', startedAt: '2026-01-15T10:00:00Z',
    clips, blocked: [], recordly: false, voice: true,
    config: { baseURL: 'http://localhost:3000', phone: { enabled: stillPhone } },
  }));
  return runDir;
}

// Mean absolute gray difference between demo.mp4 at `t` and the source clip at
// the matching instant, over the caption band: ~0 without a caption, large with one.
function captionBandDiff(demo, clip, t) {
  const grab = (file, at) => execFileSync('ffmpeg', ['-v', 'error', '-ss', at.toFixed(3), '-i', file, '-frames:v', '1',
    '-vf', 'crop=1920:110:0:890,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 24 });
  const a = grab(demo, t);
  const b = grab(clip, t - TITLE_OFFSET);
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

// Top-left of what differs from the source clip in a 160 px box right-below
// (x, y) at demo time t: the arrow's tip, since the arrow extends right-down.
function cursorTip(demo, clip, t, x, y) {
  const S = 160;
  const bx = Math.round(x) - 20;
  const by = Math.round(y) - 20;
  const grab = (file, at) => execFileSync('ffmpeg', ['-v', 'error', '-ss', at.toFixed(4), '-i', file, '-frames:v', '1',
    '-vf', `crop=${S}:${S}:${bx}:${by},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 24 });
  const a = grab(demo, t);
  const b = grab(clip, t - TITLE_OFFSET);
  let mx = Infinity;
  let my = Infinity;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > 60) { mx = Math.min(mx, i % S); my = Math.min(my, Math.floor(i / S)); }
  }
  return { x: bx + mx, y: by + my };
}

test('subtitles: cue times carry the title-card offset and use each format\'s separator (a wrong one shifts or breaks every cue)', () => {
  const caps = [{ text: 'Hello', start: 0.5, end: 61.2345 }];
  assert.equal(toSrt(caps, 1.5), '1\n00:00:02,000 --> 00:01:02,735\nHello\n');
  // Rounding carries across units: 3599.9996 s is 01:00:00.000, not 00:59:59.1000.
  assert.equal(toVtt([{ text: 'Hi', start: 3599.9996, end: 3601 }]), 'WEBVTT\n\n01:00:00.000 --> 01:00:01.000\nHi\n');
});

test('freeze parser: an unterminated freeze runs to the end, and card stills are not reported (else every render fails or a real freeze hides)', () => {
  const log = `[freezedetect @ 0x1] lavfi.freezedetect.freeze_start: 0
[freezedetect @ 0x1] lavfi.freezedetect.freeze_duration: 1.6
[freezedetect @ 0x1] lavfi.freezedetect.freeze_end: 1.6
[freezedetect @ 0x1] lavfi.freezedetect.freeze_start: 3.5
[freezedetect @ 0x1] lavfi.freezedetect.freeze_duration: 3.01
[freezedetect @ 0x1] lavfi.freezedetect.freeze_end: 6.51
[freezedetect @ 0x1] lavfi.freezedetect.freeze_start: 8.1`;
  const spans = parseFreeze(log, 10);
  assert.deepEqual(spans.map(([s, d]) => [s, +d.toFixed(2)]), [[0, 1.6], [3.5, 3.01], [8.1, 1.9]]);
  assert.deepEqual(outsideCards(spans, 10, { skipStart: 2, skipEnd: 2 }), [[3.5, 3.01]]);
  // A freeze spilling from the content into the end card counts only when its content part is long.
  assert.deepEqual(outsideCards([[6.5, 2.5]], 10, { skipStart: 2, skipEnd: 2 }), [[6.5, 1.5]]);
  assert.deepEqual(outsideCards([[7.5, 2.5]], 10, { skipStart: 2, skipEnd: 2 }), []);
});

test('render: a hand-made edit/ becomes every output, 1080p60, voiced, with subtitles on the burned captions; caption edits survive recaption and render', { timeout: 300_000 }, async (t) => {
  const runDir = await handMadeRun();
  t.after(() => rm(runDir, { recursive: true, force: true }));
  const out = path.join(runDir, 'out');
  await render([runDir, '--voice', '--no-recordly'], { cwd: runDir });

  const v = probe(path.join(out, 'demo.mp4'), 'stream=codec_name,width,height,r_frame_rate').streams[0];
  assert.deepEqual(v, { codec_name: 'h264', width: 1920, height: 1080, r_frame_rate: '60/1' });
  assert.equal(probe(path.join(out, 'demo.mp4'), 'stream=codec_name', 'a').streams[0]?.codec_name, 'aac');

  const s = probe(path.join(out, 'demo-short.mp4'), 'stream=width,height').streams[0];
  assert.ok(s.height <= 720, `short is ${s.height}p`);
  const runJson = JSON.parse(await readFile(path.join(out, 'run.json'), 'utf8'));
  const mbPerMin = (await stat(path.join(out, 'demo-short.mp4'))).size / 1e6 / (runJson.render.durations.short / 60);
  assert.ok(mbPerMin <= 8, `short is ${mbPerMin.toFixed(1)} MB/min`);
  assert.deepEqual(probe(path.join(out, 'contact-sheet.png'), 'stream=width,height').streams[0], { width: 1920, height: 810 });
  assert.ok((await stat(path.join(out, 'poster.png'))).size > 10_000);
  assert.equal(runJson.render.freeze.ok, true);
  assert.equal(runJson.scenario, 'checkout-flow.spec.ts');

  // Cue starts are the caption starts plus the title offset...
  const expected = CAPTIONS.map((c) => ({ start: c.start + TITLE_OFFSET }));
  assert.equal(runJson.render.sync.ok, true, runJson.render.sync.detail);
  assert.match(await readFile(path.join(out, 'demo.srt'), 'utf8'), /^1\n00:00:02,300 --> /);
  assert.match(await readFile(path.join(out, 'demo.vtt'), 'utf8'), /^WEBVTT\n\n00:00:02\.300 --> /);
  // ...and the pixels agree: no pill just before a cue starts, a pill just after it faded in.
  const clip = path.join(runDir, 'edit', 'laptop', 'clip.mp4');
  for (const { start } of expected) {
    assert.ok(captionBandDiff(path.join(out, 'demo.mp4'), clip, start - 0.05) < 4, `caption burned before ${start}s`);
    assert.ok(captionBandDiff(path.join(out, 'demo.mp4'), clip, start + 0.2) > 15, `no caption burned at ${start}s`);
  }

  // The drawn cursor's tip sits on the logged click point on the click frame.
  const tip = cursorTip(path.join(out, 'demo.mp4'), clip, CLICK.timeMs / 1000 + TITLE_OFFSET, CLICK.cx * 1920, CLICK.cy * 1080);
  assert.ok(Math.abs(tip.x - CLICK.cx * 1920) <= 2 && Math.abs(tip.y - CLICK.cy * 1080) <= 2, `cursor tip at ${tip.x},${tip.y}`);

  // recaption picks up an edited caption text, and the recorded narration
  // comes along without asking (it belongs to the recording, not the render).
  const caps = structuredClone(CAPTIONS);
  caps[0].text = 'Open the product details';
  await writeFile(path.join(runDir, 'edit', 'laptop', 'captions.json'), JSON.stringify(caps));
  await recaption([runDir], { cwd: runDir });
  assert.match(await readFile(path.join(out, 'demo.srt'), 'utf8'), /Open the product details/);
  assert.equal(probe(path.join(out, 'demo.mp4'), 'stream=codec_name', 'a').streams.length, 1);

  // A later render keeps the hand edit even with the raw recording present
  // (re-editing from raw/ would rewrite captions.json and silently drop it).
  await mkdir(path.join(runDir, 'raw', 'laptop'), { recursive: true });
  await render([runDir, '--no-recordly'], { cwd: runDir });
  assert.match(await readFile(path.join(out, 'demo.srt'), 'utf8'), /Open the product details/);
});

test('render: a 3 s still stretch fails the render and names it (the "stuck mouse" must never ship)', { timeout: 300_000 }, async (t) => {
  const runDir = await handMadeRun({ still: true, captions: [
    { index: 0, text: 'Open the page', start: 0.3, end: 1.9 },
    { index: 1, text: 'Wait for the result', start: 5.1, end: 5.9 },
  ] });
  t.after(() => rm(runDir, { recursive: true, force: true }));
  // Clip 2 s..5 s sits at 3.5 s..6.5 s in demo.mp4 (title offset 1.5 s). The drawn
  // cursor keeps moving until clip 3.0 s, and a moving cursor is not a freeze, so
  // the reported span starts once page and cursor are both still.
  await assert.rejects(render([runDir, '--no-recordly'], { cwd: runDir }), /frozen video in demo\.mp4 at 4\.[5-7]\ds-6\.[45]\ds/);
  const runJson = JSON.parse(await readFile(path.join(runDir, 'out', 'run.failed.json'), 'utf8'));
  assert.equal(runJson.render.freeze.ok, false);
  assert.ok(existsSync(path.join(runDir, 'out', 'demo.failed.mp4')) && !existsSync(path.join(runDir, 'out', 'demo.mp4')), 'a failed video took the good name');
});

test('render: a phone recording that holds still outside the fixture\'s pauses fails the render (else the push-in zoom makes a stuck phone clip look alive)', { timeout: 300_000 }, async (t) => {
  const runDir = await handMadeRun({ stillPhone: true });
  t.after(() => rm(runDir, { recursive: true, force: true }));
  // Phone clip 2 s..5 s sits at 9 s..12 s in demo.mp4 (it starts at 1.5 + 6 - 0.5 = 7 s).
  await assert.rejects(render([runDir, '--no-recordly'], { cwd: runDir }), /frozen video in demo\.mp4 at (8\.9|9\.0)\ds-1[12]\.\d\ds/);
});

test('recaption: an earlier Recordly export is not reused after a render without it (else an old cut ships)', { timeout: 300_000 }, async (t) => {
  const runDir = await handMadeRun();
  t.after(() => rm(runDir, { recursive: true, force: true }));
  await mkdir(path.join(runDir, 'recordly'));
  testClip(path.join(runDir, 'recordly', 'laptop-export.mp4'), '1920x1080', false);
  await render([runDir, '--no-recordly'], { cwd: runDir });
  await recaption([runDir], { cwd: runDir });
  const runJson = JSON.parse(await readFile(path.join(runDir, 'out', 'run.json'), 'utf8'));
  assert.equal(runJson.render.recordlyExport, null, 'recaption rendered a Recordly export the last render did not use');
});

// A 15 s recording and a "Recordly export" of it: 3.2-6.0 s cut, 6.2-10.2 s
// played at 4x, the rest as recorded (9.2 s), plus the project that says so.
const EDIT_CAPTIONS = [
  { index: 0, text: 'Open the product page', start: 0.8, end: 3.0 },
  { index: 1, text: 'This step is cut', start: 3.5, end: 5.5 },
  { index: 2, text: 'Skip ahead quickly', start: 6.5, end: 10.0 },
  { index: 3, text: 'Check out with the saved card', start: 10.5, end: 13.5 },
];
function editedExport(src, out) {
  const piece = (a, b, k, speed = 1) => `[s${k}]trim=${a}:${b},setpts=(PTS-STARTPTS)/${speed}[p${k}]`;
  ff(['-i', src, '-filter_complex', `[0:v]split=4[s0][s1][s2][s3];${piece(0, 3.2, 0)};${piece(6.0, 6.2, 1)};${piece(6.2, 10.2, 2, 4)};${piece(10.2, 15, 3)};`
    + '[p0][p1][p2][p3]concat=n=4,fps=60[v]', '-map', '[v]', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', out]);
}
const PROJECT = { version: 2, videoPath: '/somewhere/for-recordly/checkout-flow.mp4', editor: {
  trimRegions: [{ id: 't1', startMs: 3200, endMs: 6000 }], speedRegions: [{ id: 's1', startMs: 6200, endMs: 10200, speed: 4 }] } };

test('render: a Recordly export with a cut, a 4x section and added audio keeps its length and its audio, its captions land on the re-planned cues, the cut step\'s caption is gone, narration never overlaps, and recaption keeps the same map (else captions drift off the user\'s edit)', { timeout: 600_000 }, async (t) => {
  const runDir = await handMadeRun({ captions: EDIT_CAPTIONS });
  t.after(() => rm(runDir, { recursive: true, force: true }));
  const clip = path.join(runDir, 'edit', 'laptop', 'clip.mp4');
  ff(['-f', 'lavfi', '-i', 'testsrc2=size=1920x1080:rate=60:duration=15', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', clip]);
  for (const i of [2, 3]) ff(['-f', 'lavfi', '-i', `sine=frequency=${440 + 110 * i}:duration=1.2`, path.join(runDir, 'voice', 'laptop', `${i}.wav`)]);
  const tl = JSON.parse(await readFile(path.join(runDir, 'edit', 'laptop', 'timeline.json'), 'utf8'));
  tl.duration = 15;
  await writeFile(path.join(runDir, 'edit', 'laptop', 'timeline.json'), JSON.stringify(tl));
  const exp = path.join(runDir, 'export.mp4');
  editedExport(clip, path.join(runDir, 'silent.mp4'));
  // Music the user added in Recordly: a steady tone under the whole export.
  ff(['-i', path.join(runDir, 'silent.mp4'), '-f', 'lavfi', '-i', 'sine=frequency=1000:duration=30', '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'aac', '-shortest', exp]);
  const projects = path.join(runDir, 'projects');
  await mkdir(projects);
  await writeFile(path.join(projects, 'checkout-flow.recordly'), JSON.stringify(PROJECT));
  process.env.DEMO_RECORDLY_FAKE = JSON.stringify({ projectDirs: [projects], recentFile: null });
  t.after(() => { delete process.env.DEMO_RECORDLY_FAKE; });

  await render([runDir, '--recordly-export', exp, '--no-open'], { cwd: runDir });
  const out = path.join(runDir, 'out');
  const runJson = JSON.parse(await readFile(path.join(out, 'run.json'), 'utf8'));
  const r = runJson.render;
  assert.equal(r.timeMap.source, 'project', r.timeMap.reason);
  const seconds = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
  const expSec = seconds(exp);
  const demoSec = seconds(path.join(out, 'demo.mp4'));
  assert.ok(Math.abs(demoSec - (expSec + TITLE_OFFSET + 2 - 0.5)) <= 0.1, `demo.mp4 is ${demoSec} s for a ${expSec} s export`);
  assert.deepEqual(r.droppedCaptions, [1]);
  const srt = await readFile(path.join(out, 'demo.srt'), 'utf8');
  assert.doesNotMatch(srt, /This step is cut/);
  assert.equal(r.sync.ok, true, r.sync.detail);
  // Caption 2 starts where its source moment plays in the export: 6.5 s
  // lies in the 4x piece that starts at 3.4 s, so (6.5 - 6.2) / 4 + 3.4.
  const c2 = r.captions.find((c) => c.index === 2);
  assert.ok(Math.abs(c2.start - (3.475 + TITLE_OFFSET)) < 0.01, `caption 2 at ${c2.start}`);
  for (const c of r.captions) {
    assert.ok(captionBandDiff(path.join(out, 'demo.mp4'), exp, c.start - 0.05) < 4, `caption burned before ${c.start}s`);
    // A short caption lights fewer band pixels than the 15 used above.
    assert.ok(captionBandDiff(path.join(out, 'demo.mp4'), exp, c.start + 0.2) > 8, `no caption burned at ${c.start}s`);
  }
  for (let k = 1; k < r.captions.length; k++) assert.ok(r.captions[k].start >= r.captions[k - 1].end - 1e-3, 'captions overlap');
  assert.deepEqual(r.narration.map((n) => n.index), [0, 2, 3]);
  for (let k = 1; k < r.narration.length; k++) assert.ok(r.narration[k].start >= r.narration[k - 1].end + 0.45 - 1e-3, `narration ${k} starts before the last one ended plus a breath`);
  for (const n of r.narration) {
    assert.ok(n.start >= r.captions.find((c) => c.index === n.index).start - 1e-3, `narration ${n.index} plays before its caption`);
    assert.ok(n.tempo <= 1.1);
  }
  // Between two narration clips only the user's audio can be heard; a render
  // that kept the narration alone is silent there.
  const [a, b] = [r.narration[0].end + 0.1, r.narration[1].start - 0.1];
  assert.ok(b - a > 0.3, `no narration gap to measure (${a}-${b})`);
  const level = Number(spawnSync('ffmpeg', ['-hide_banner', '-ss', a.toFixed(3), '-t', (b - a).toFixed(3), '-i', path.join(out, 'demo.mp4'),
    '-af', 'volumedetect', '-vn', '-f', 'null', '-']).stderr.toString().match(/mean_volume: (-?[\d.]+)/)?.[1] ?? -Infinity);
  assert.ok(level > -40, `the export's audio is gone between narration clips (${level} dB)`);

  await recaption([runDir, '--no-open'], { cwd: runDir });
  const again = JSON.parse(await readFile(path.join(out, 'run.json'), 'utf8')).render;
  assert.equal(again.timeMap.source, 'project');
  assert.deepEqual(again.captions, r.captions);
});

test('chooseMap: a project whose length does not match the export is not trusted and alignment takes over (Recordly can export a saved 4x as 1.5x; trusting it puts every later caption on the wrong moment)', { timeout: 120_000 }, async (t) => {
  const { chooseMap } = await import('../scripts/lib/render.mjs');
  const dir = await mkdtemp(path.join(tmpdir(), 'demo-choose-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const src = path.join(dir, 'checkout-flow.mp4');
  ff(['-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=30:duration=15', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', src]);
  const exp = path.join(dir, 'export.mp4');
  editedExport(src, exp);
  const project = path.join(dir, 'p.recordly');
  const wrong = structuredClone(PROJECT);
  wrong.editor.speedRegions[0].speed = 1.5;
  await writeFile(project, JSON.stringify(wrong));
  const { map, info } = await chooseMap({ source: src, exportFile: exp, project, clipName: 'checkout-flow.mp4', print: () => {} });
  assert.equal(info.source, 'alignment', info.reason);
  assert.match(info.reason, /project predicts/);
  assert.ok(Math.abs(map.map(6.5) - 3.475) < 0.2, `6.5 s maps to ${map.map(6.5)}`);
});

test('render: with Recordly\'s own captions on in the saved project, none of ours are burned in and no soft track is added, but demo.srt keeps them (else every caption shows twice)', { timeout: 300_000 }, async (t) => {
  const runDir = await handMadeRun();
  t.after(() => rm(runDir, { recursive: true, force: true }));
  const clip = path.join(runDir, 'edit', 'laptop', 'clip.mp4');
  // An export with no edits (re-encoded, as Recordly would).
  const exp = path.join(runDir, 'export.mp4');
  ff(['-i', clip, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '10', '-pix_fmt', 'yuv420p', exp]);
  const projects = path.join(runDir, 'projects');
  await mkdir(projects);
  await writeFile(path.join(projects, 'checkout-flow.recordly'), JSON.stringify({ version: 2, videoPath: '/somewhere/for-recordly/checkout-flow.mp4', editor: {
    trimRegions: [], speedRegions: [], autoCaptions: [{ id: 'c1', startMs: 800, endMs: 2800, text: 'Open the product page' }],
    autoCaptionSettings: { enabled: true } } }));
  process.env.DEMO_RECORDLY_FAKE = JSON.stringify({ projectDirs: [projects], recentFile: null });
  t.after(() => { delete process.env.DEMO_RECORDLY_FAKE; });

  await render([runDir, '--recordly-export', exp, '--no-open'], { cwd: runDir });
  const out = path.join(runDir, 'out');
  const r = JSON.parse(await readFile(path.join(out, 'run.json'), 'utf8')).render;
  assert.equal(r.edits.autoCaptions, true);
  for (const c of r.captions) {
    const d = captionBandDiff(path.join(out, 'demo.mp4'), exp, (c.start + c.end) / 2);
    assert.ok(d < 4, `a caption of ours is burned at ${c.start}s (differs by ${d.toFixed(1)})`);
  }
  assert.equal(probe(path.join(out, 'demo.mp4'), 'stream=index', 's').streams.length, 0, 'soft subtitle track added');
  assert.match(await readFile(path.join(out, 'demo.srt'), 'utf8'), /Open the product page/);
});

test('compose: a 1:1 export is fitted whole above the band on the band colour, not cropped (else the user\'s reshaped video loses its top and bottom)', { timeout: 300_000 }, async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'demo-fit-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const layout = { mode: 'band', band: 120 };
  const caps = [{ index: 0, text: 'Open the product page', start: 1.0, end: 2.6 }];
  const cards = await renderCards({ dir, config: structuredClone(DEFAULTS), title: 'Fit', subtitle: 'test', endText: 'End', laptopCaptions: caps, layout });
  const clip = path.join(dir, 'square.mp4');
  ff(['-f', 'lavfi', '-i', 'testsrc2=size=1080x1080:rate=60:duration=3', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', clip]);
  const demo = await composeDemo({ outFile: path.join(dir, 'demo.mp4'), workDir: dir, laptop: { video: clip, captions: caps, cursor: null }, cards, layout, preset: 'ultrafast' });
  // 960 px high above the band, so the square is 960x960 at x 480.
  const t0 = 1.5 + TITLE_OFFSET;
  const inside = meanDiff(gray(demo.file, t0, 'crop=960:960:480:0,scale=240:240'), gray(clip, 1.5, 'scale=240:240'));
  assert.ok(inside < 6, `the square is not shown whole (differs by ${inside.toFixed(1)})`);
  const side = gray(demo.file, t0, 'crop=400:960:0:0');
  const mean = side.reduce((a, v) => a + v, 0) / side.length;
  assert.ok(mean < 30, `the side is not the band colour (mean ${mean.toFixed(1)})`);
});

// Mean absolute gray difference of two same-size raw gray frames.
const meanDiff = (a, b) => { let sum = 0; for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]); return sum / a.length; };
const gray = (file, at, vf) => execFileSync('ffmpeg', ['-v', 'error', '-ss', at.toFixed(4), '-i', file, '-frames:v', '1',
  '-vf', `${vf},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 24 });

test('band layout: the UI fills the frame above the band edge to edge and the caption sits only in the band (else captions cover the product or side margins return)', { timeout: 300_000 }, async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'demo-band-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const layout = { mode: 'band', band: 120 };
  const caps = [{ index: 0, text: 'Open the product page', start: 1.0, end: 2.6 }];
  const cards = await renderCards({ dir, config: structuredClone(DEFAULTS), title: 'Band', subtitle: 'test', endText: 'End', laptopCaptions: caps, layout });
  // The recorded clip (1920x960, the viewport above the band) and a
  // Recordly-sized 16:9 export: the export is scaled to cover and centre-cropped.
  for (const [size, source] of [['1920x960', 'null'], ['1920x1080', 'crop=1920:960:0:60']]) {
    const clip = path.join(dir, `clip-${size}.mp4`);
    ff(['-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=60:duration=3`, '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', clip]);
    const demo = await composeDemo({ outFile: path.join(dir, `demo-${size}.mp4`), workDir: dir, laptop: { video: clip, captions: caps, cursor: null },
      cards, layout, preset: 'ultrafast' });
    const at = (clipT) => clipT + TITLE_OFFSET;
    // While the caption shows, the area above the band is the source picture, full width.
    const top = meanDiff(gray(demo.file, at(1.5), 'crop=1920:960:0:0'), gray(clip, 1.5, source));
    assert.ok(top < 3, `${size}: the picture above the band differs from the source by ${top.toFixed(1)}`);
    // The band is solid before the caption and carries it after.
    const bandBefore = gray(demo.file, at(0.8), 'crop=1920:120:0:960');
    const bandDuring = gray(demo.file, at(1.5), 'crop=1920:120:0:960');
    const mean = bandBefore.reduce((a, v) => a + v, 0) / bandBefore.length;
    assert.ok(mean < 30, `${size}: the band is not the dark band colour (mean ${mean.toFixed(1)})`);
    const lit = bandDuring.filter((v, i) => v - bandBefore[i] > 100).length;
    assert.ok(lit > 2000, `${size}: no caption in the band (${lit} bright pixels)`);
    assert.deepEqual(demo.captionBand, { x: 0, y: 960, w: 1920, h: 120 });

    // The caption check passes on the band.
    const srt = toSrt(demo.burned);
    const sync = await captionSync(demo.file, srt, toVtt(demo.burned), demo.captionBand);
    assert.equal(sync.ok, true, sync.detail);
  }
});

test('subtitles: a band render embeds no subtitle track and an off render does (else players draw a default soft track over the burned captions: double subtitles)', { timeout: 300_000 }, async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'demo-softsub-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const caps = [{ index: 0, text: 'Open the product page', start: 0.5, end: 1.5 }];
  for (const [mode, band, size, tracks] of [['band', 120, '1920x960', 0], ['off', 0, '1920x1080', 1]]) {
    const layout = { mode, band };
    const clip = path.join(dir, `clip-${mode}.mp4`);
    ff(['-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=60:duration=2`, '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', clip]);
    const cards = await renderCards({ dir, config: structuredClone(DEFAULTS), title: 'Subs', subtitle: 'test', endText: 'End', laptopCaptions: caps, layout });
    const demo = await composeDemo({ outFile: path.join(dir, `demo-${mode}.mp4`), workDir: dir, laptop: { video: clip, captions: caps, cursor: null }, cards, layout, preset: 'ultrafast' });
    assert.equal(probe(demo.file, 'stream=codec_name', 's').streams.length, tracks, `${mode}: subtitle streams`);
    assert.equal((await doubleCaptions(demo.file, mode)).ok, true, `${mode}: render's duplicate check`);
  }
  // The render check fails a burned-caption video that carries a track, whatever made it.
  assert.equal((await doubleCaptions(path.join(dir, 'demo-off.mp4'), 'band')).detail, 'captions would show twice: burned in and an embedded subtitle track');
});

// Pixels of `file` at `t` on row `y` that are the phone clip's magenta.
const magentaRun = (file, t, y) => {
  const row = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', file, '-frames:v', '1',
    '-vf', `crop=1920:2:0:${y},format=rgb24`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 24 });
  let n = 0;
  for (let i = 0; i < 1920 * 3; i += 3) if (row[i] > 180 && row[i + 1] < 90 && row[i + 2] > 180) n++;
  return n;
};

test('render: a deliverDir set after recording is where the video lands, in the recording\'s dated folder (else the user\'s later choice is silently ignored)', { timeout: 300_000 }, async (t) => {
  const runDir = await handMadeRun();
  t.after(() => rm(runDir, { recursive: true, force: true }));
  // As record writes it with no deliverDir: the default root, the recording's date.
  const rec = JSON.parse(await readFile(path.join(runDir, 'record.json'), 'utf8'));
  rec.deliver = path.join(TMP_HOME, 'Desktop', 'Demo Videos', 'checkout-flow-2026-01-15-1000');
  await writeFile(path.join(runDir, 'record.json'), JSON.stringify(rec));
  const chosen = path.join(TMP_HOME, 'chosen');
  await writeFile(path.join(runDir, 'demo.config.json'), JSON.stringify({ ...rec.config, deliverDir: chosen }));
  // Only the config names the folder here; the test-run redirect (which would
  // move any unredirected delivery to a temp folder) is lifted for this render.
  const saved = { DEMO_VIDEO_DELIVER: process.env.DEMO_VIDEO_DELIVER, NODE_TEST_CONTEXT: process.env.NODE_TEST_CONTEXT };
  delete process.env.DEMO_VIDEO_DELIVER;
  delete process.env.NODE_TEST_CONTEXT;
  try {
    await render([runDir, '--no-recordly', '--no-voice', '--no-open'], { cwd: runDir });
  } finally {
    for (const [k, v] of Object.entries(saved)) if (v !== undefined) process.env[k] = v;
  }
  assert.ok(existsSync(path.join(chosen, 'checkout-flow-2026-01-15-1000', 'checkout-flow.mp4')), 'video not under the new deliverDir');
});

test('render: the phone card takes its shape from the recorded phone clip, not a later config (else the phone clip is squashed)', { timeout: 300_000 }, async (t) => {
  const runDir = await handMadeRun({ stillPhone: true });
  t.after(() => rm(runDir, { recursive: true, force: true }));
  const phone = path.join(runDir, 'edit', 'phone');
  // A flat colour to measure; its stillness is one long fixture pause.
  ff(['-f', 'lavfi', '-i', 'color=c=0xff00ff:size=390x844:rate=60:duration=6', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', path.join(phone, 'clip.mp4')]);
  await writeFile(path.join(phone, 'timeline.json'), JSON.stringify({ duration: 6, cuts: [], steps: [], narration: [], pauses: [[0, 6]] }));
  const rec = JSON.parse(await readFile(path.join(runDir, 'record.json'), 'utf8'));
  rec.config.phone = { enabled: true, width: 375, height: 667 };
  await writeFile(path.join(runDir, 'record.json'), JSON.stringify(rec));
  await render([runDir, '--no-recordly', '--no-voice'], { cwd: runDir });
  // The screen is 718 px high; 390x844 makes it 332 px wide (375x667 would be 404).
  const w = magentaRun(path.join(runDir, 'out', 'demo.mp4'), 10, 445);
  assert.ok(Math.abs(w - 332) <= 4, `phone screen is ${w} px wide`);
});
