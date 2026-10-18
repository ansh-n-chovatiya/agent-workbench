import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { mapFromEdits, replanCaptions, replanNarration } from '../scripts/lib/timemap.mjs';
import { parseProject, findProject } from '../scripts/lib/recordly-project.mjs';
import { alignExport } from '../scripts/lib/align.mjs';

const near = (a, b, tol = 1e-9, msg) => assert.ok(a !== null && Math.abs(a - b) <= tol, `${msg ?? ''} ${a} != ${b}`);

// A wrong map puts every caption after the first edit at the wrong moment,
// and nothing downstream can tell: the export plays fine without captions.
test('mapFromEdits reproduces Recordly: trims removed, speed pieces last len/speed', () => {
  const trim = mapFromEdits({ duration: 10, trims: [{ start: 2, end: 4 }] });
  assert.equal(trim.duration, 8);
  near(trim.map(1), 1); assert.equal(trim.map(3), null); near(trim.map(4), 2); near(trim.map(9), 7);
  near(trim.inverse(2.5), 4.5);

  const fast = mapFromEdits({ duration: 10, speeds: [{ start: 2, end: 6, speed: 4 }] });
  assert.equal(fast.duration, 7); // 2 + 4/4 + 4
  near(fast.map(4), 2.5); near(fast.map(6), 3); near(fast.map(8), 5);
  near(fast.inverse(2.5), 4);

  // A trim inside a speed region: only the kept source plays fast.
  const both = mapFromEdits({ duration: 10, trims: [{ start: 3, end: 5 }], speeds: [{ start: 2, end: 6, speed: 4 }] });
  assert.equal(both.duration, 2 + 1 / 4 + 1 / 4 + 4);
  near(both.map(2.5), 2.125); assert.equal(both.map(4), null); near(both.map(5.5), 2.375); near(both.map(7), 3.5);

  // Overlaps: trims merge; where speed regions overlap the earlier-starting
  // one wins (Recordly's cursor has already passed the overlap).
  const over = mapFromEdits({ duration: 10,
    trims: [{ start: 1, end: 3 }, { start: 2, end: 4 }],
    speeds: [{ start: 5, end: 8, speed: 2 }, { start: 7, end: 9, speed: 4 }] });
  assert.equal(over.duration, 1 + 1 + 3 / 2 + 1 / 4 + 1);
  assert.equal(over.map(3.5), null);
  near(over.map(7.5), 1 + 1 + 1.25); // still 2x inside the overlap
  near(over.map(8.5), 1 + 1 + 1.5 + 0.125);
});

// Captions or narration that overlap, play for a cut step, or rush through
// a sped-up one are only visible by watching the whole video.
test('replanCaptions drops cut steps, keeps floors, never overlaps; narration keeps a breath', () => {
  const map = mapFromEdits({ duration: 20, trims: [{ start: 4, end: 8 }], speeds: [{ start: 8, end: 12, speed: 4 }] });
  const captions = [
    { index: 0, text: 'Open', start: 0, end: 4 },
    { index: 1, text: 'Cut away', start: 4, end: 8 },
    { index: 2, text: 'Fast', start: 8, end: 12 },
    { index: 3, text: 'Next', start: 12, end: 16 },
  ];
  const { captions: out, dropped } = replanCaptions(captions, map, { floorFor: () => 2 });
  assert.deepEqual(dropped, [1]);
  assert.deepEqual(out.map((c) => c.index), [0, 2, 3]);
  const fast = out[1];
  near(fast.start, 4); near(fast.end, 6); // 1 s after 4x, held to its 2 s floor
  near(out[2].start, 6); // pushed from 5 by the floor above
  for (let k = 1; k < out.length; k++) assert.ok(out[k].start >= out[k - 1].end, 'captions overlap');

  const clips = [
    { index: 0, start: 0, duration: 1, file: 'a.wav' }, // room to spare: stays put
    { index: 1, start: 4, duration: 2, file: 'b.wav' }, // its step was cut
    { index: 2, start: 8, duration: 2.2, file: 'c.wav' }, // 1 s of 4x export before the next
    { index: 3, start: 12, duration: 1, file: 'd.wav' },
    { index: 4, start: 16, duration: 1, file: 'e.wav' },
  ];
  const { voice } = replanNarration(clips, map);
  assert.deepEqual(voice.map((v) => v.index), [0, 2, 3, 4]);
  near(voice[0].start, 0, 1e-3, 'clip with room delayed');
  near(voice[1].start, 4, 1e-3, 'clip with room delayed');
  assert.equal(voice[1].tempo, 1.1);
  near(voice[3].start, 9, 1e-3, 'clip with room delayed');
  for (const v of voice) assert.ok(v.tempo <= 1.1);
  for (let k = 1; k < voice.length; k++) assert.ok(voice[k].start - voice[k - 1].end >= 0.45 - 1e-3, 'no breath between clips');

  // A caption stays until its narration has finished.
  const withVoice = replanCaptions(captions, map, { floorFor: () => 0.5, narration: voice }).captions;
  for (const c of withVoice) {
    const v = voice.find((n) => n.index === c.index);
    if (v) assert.ok(c.end >= v.end && c.start >= v.start, `caption ${c.index} ends before its narration`);
  }
});

// The shape Recordly 1.4 writes: JSON.stringify({version: 2, projectId,
// videoPath, editor}, null, 2), editor carrying the region arrays in ms.
const project = (editor, videoPath = '/Users/x/for-recordly/flow-clip.mp4') =>
  JSON.stringify({ version: 2, projectId: 'p1', videoPath, editor: { zoomRegions: [], ...editor } }, null, 2);

// A misread project maps the whole video wrongly with full confidence.
test('parseProject reads Recordly regions in seconds, clip speeds included, and refuses junk', () => {
  const json = project({
    trimRegions: [{ id: 'trim-gap-1', startMs: 3000, endMs: 5000 }],
    speedRegions: [{ id: 's1', startMs: 6000, endMs: 8000, speed: 4 }],
    clipRegions: [
      { id: 'clip-1', startMs: 0, endMs: 3000, speed: 1 },
      { id: 'clip-2', startMs: 5000, endMs: 9000, speed: 1 },
      { id: 'clip-3', startMs: 10000, endMs: 12000, speed: 2 }, // plays source 10-14 s at 2x
    ],
  });
  const p = parseProject(json, { clipName: 'flow-clip.mp4' });
  assert.deepEqual(p.trims, [{ start: 3, end: 5 }]);
  assert.deepEqual(p.speeds, [{ start: 6, end: 8, speed: 4 }, { start: 10, end: 14, speed: 2 }]);
  assert.equal(p.references, true);
  assert.equal(parseProject(json, { clipName: 'other.mp4' }).references, false);
  // Found by key wherever it sits.
  assert.deepEqual(parseProject({ wrapper: { state: { trimRegions: [], speedRegions: [] } } }).trims, []);

  for (const bad of ['{"version": 2, "editor": ', '{"version":2}', project({ trimRegions: [{ startMs: 'a', endMs: 1 }] }),
    project({ speedRegions: [{ startMs: 0, endMs: 1000, speed: 0 }] })]) {
    const r = parseProject(bad);
    assert.equal(typeof r.error, 'string', `accepted ${bad}`);
  }
});

// The timing edits the tests above leave out, each as a saved project
// carries it: a 0.5x slow-down, a clip played at 2x (clipRegions; the trims
// are the gaps between clips) and trims at the very start and end. A misread
// one moves every later caption, and nothing downstream can tell.
test('a slow-down, a per-clip speed and trims at both ends put captions on the right cues', () => {
  const p = parseProject(project({
    trimRegions: [{ id: 't0', startMs: 0, endMs: 1000 }, { id: 't1', startMs: 19000, endMs: 20000 }],
    speedRegions: [{ id: 's0', startMs: 2000, endMs: 4000, speed: 0.5 }],
    clipRegions: [
      { id: 'c0', startMs: 1000, endMs: 8000, speed: 1 },
      { id: 'c1', startMs: 8000, endMs: 12000, speed: 2 }, // 4 s on the timeline: source 8-16 s
      { id: 'c2', startMs: 16000, endMs: 19000, speed: 1 },
    ],
  }));
  const map = mapFromEdits({ duration: 20, trims: p.trims, speeds: p.speeds });
  near(map.duration, 1 + 4 + 4 + 4 + 3); // 1-2, 2-4 at 0.5x, 4-8, 8-16 at 2x, 16-19
  const { captions, dropped } = replanCaptions([
    { index: 0, text: 'Trimmed start', start: 0.2, end: 0.8 },
    { index: 1, text: 'Slow', start: 1.5, end: 3 },
    { index: 2, text: 'Fast clip', start: 10, end: 12 },
    { index: 3, text: 'After', start: 17, end: 18.5 },
    { index: 4, text: 'Trimmed end', start: 19.2, end: 19.8 },
  ], map);
  assert.deepEqual(dropped, [0, 4]);
  assert.deepEqual(captions.map((c) => [c.index, c.start, c.end]), [[1, 0.5, 3], [2, 10, 11], [3, 14, 15.5]]);
});

// Picking a stale project, or one for another clip, would apply someone
// else's edits.
test('findProject takes only fresh projects that name the clip, from dirs and recent-projects.json', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'rproj-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const since = Date.now() - 10_000;
  const f = (n) => path.join(dir, n);
  await writeFile(f('old.recordly'), project({ trimRegions: [] }));
  await utimes(f('old.recordly'), new Date(since - 60_000), new Date(since - 60_000));
  await writeFile(f('other.recordly'), project({ trimRegions: [] }, '/x/other.mp4'));
  assert.equal(await findProject({ dirs: [dir], since, clipName: 'flow-clip.mp4' }), null);
  const elsewhere = await mkdtemp(path.join(os.tmpdir(), 'rproj-else-'));
  t.after(() => rm(elsewhere, { recursive: true, force: true }));
  await writeFile(path.join(elsewhere, 'mine.recordly'), project({ trimRegions: [] }));
  await writeFile(f('recent-projects.json'), JSON.stringify({ paths: [path.join(elsewhere, 'mine.recordly')] }));
  assert.equal(await findProject({ dirs: [dir], since, clipName: 'flow-clip.mp4', recentFile: f('recent-projects.json') }),
    path.join(elsewhere, 'mine.recordly'));
});

// A wrong alignment reported as confident shifts every caption; an unrelated
// video reported as confident would put captions on the wrong video.
test('alignExport recovers a cut, a 4x section and a 110% zoom; an unrelated video scores low', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'align-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const f = (n) => path.join(dir, n);
  const ff = (args) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...args, '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p']);
  // Smooth, never-repeating motion plus a moving box.
  ff(['-f', 'lavfi', '-i', "nullsrc=s=320x180:r=30:d=20,geq=lum='128+60*sin(X/23+T*1.3)+45*sin(Y/13-T*0.7)+35*sin((X+Y)/29+T*T*0.11)':cb=128:cr=128,"
    + "drawbox=x='mod(t*47,300)':y='90+60*sin(t*0.9)-20':w=24:h=24:c=white:t=fill", f('src.mp4')]);
  // Keep 0-5, cut 5-8, keep 8-12, 4x over 12-16, keep 16-20; 110% centre crop.
  ff(['-i', f('src.mp4'), '-filter_complex',
    '[0:v]trim=0:5,setpts=PTS-STARTPTS[a];[0:v]trim=8:12,setpts=PTS-STARTPTS[b];[0:v]trim=12:16,setpts=(PTS-STARTPTS)/4[c];'
    + '[0:v]trim=16:20,setpts=PTS-STARTPTS[d];[a][b][c][d]concat=n=4:v=1,crop=iw/1.1:ih/1.1,scale=320:180,fps=30[v]',
    '-map', '[v]', f('export.mp4')]);
  ff(['-f', 'lavfi', '-i', 'testsrc2=s=320x180:r=30:d=12', f('other.mp4')]);

  const truth = (s) => (s < 5 ? s : s < 12 ? s - 3 : s < 16 ? 9 + (s - 12) / 4 : s - 6);
  const map = await alignExport({ source: f('src.mp4'), exportFile: f('export.mp4') });
  assert.ok(map.confidence >= 0.8, `confidence ${map.confidence}`);
  for (const s of [1, 4.5, 9, 13, 18]) near(map.map(s), truth(s), 0.2, `at ${s} s`);
  assert.equal(map.map(6.5), null, 'cut part still mapped');

  const other = await alignExport({ source: f('src.mp4'), exportFile: f('other.mp4') });
  assert.ok(other.confidence < 0.5, `unrelated video confidence ${other.confidence}`);
});

// Recordly zooms off-centre and changes the zoom mid-clip; a slow-down and a
// cut then leave long still stretches where only the page's own changes say
// what time it is. An aligner that loses the zoomed view, or turns the cut
// into a fast-forward, moves every later caption, and nothing downstream can
// tell.
test('alignExport follows an off-centre changing zoom through a cut, a 4x and a 0.5x section', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'align-zoom-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const f = (n) => path.join(dir, n);
  const ff = (args) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...args, '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p']);
  // A still, textured page on which blocks appear, as a page changes after
  // each action: at 1, 5, 9 (kept), 10-11 (a popup) and 13 and 16.3 s.
  const block = (x, y, when, c) => `drawbox=x=${x}:y=${y}:w=36:h=22:c=${c}:t=fill:enable='${when}'`;
  ff(['-f', 'lavfi', '-i', "nullsrc=s=320x160:r=30:d=20,geq=lum='150+40*sin(X/9)*sin(Y/7)+30*sin((X+2*Y)/23)+25*sin(X*Y/900)':cb=128:cr=128,"
    + [block(84, 36, 'gte(t,1)', 'white'), block(116, 70, 'gte(t,5)', 'black'), block(52, 22, 'gte(t,9)', 'white'),
      block(230, 30, 'between(t,10,11)', 'black'), block(168, 72, 'gte(t,13)', 'black'), block(186, 90, 'gte(t,16.3)', 'white')].join(','), f('src.mp4')]);
  // 4x over 5.5-7.5, cut 8-12 (the step with the popup), 0.5x over
  // 13.5-14.5; zoomed 1.6x about (0.35, 0.4) from 1-2 s of the export, then
  // out to 1.3x while panning to (0.6, 0.55) over 6-7 s.
  const z = 'if(lt(it,1),1,if(lt(it,2),1+0.6*(it-1),if(lt(it,6),1.6,if(lt(it,7),1.6-0.3*(it-6),1.3))))';
  const cx = 'if(lt(it,6),0.35,if(lt(it,7),0.35+0.25*(it-6),0.6))';
  const cy = 'if(lt(it,6),0.4,if(lt(it,7),0.4+0.15*(it-6),0.55))';
  ff(['-i', f('src.mp4'), '-filter_complex',
    '[0:v]trim=0:5.5,setpts=PTS-STARTPTS[a];[0:v]trim=5.5:7.5,setpts=(PTS-STARTPTS)/4[b];[0:v]trim=7.5:8,setpts=PTS-STARTPTS[c];'
    + '[0:v]trim=12:13.5,setpts=PTS-STARTPTS[d];[0:v]trim=13.5:14.5,setpts=(PTS-STARTPTS)/0.5[e];[0:v]trim=14.5:20,setpts=PTS-STARTPTS[g];'
    + `[a][b][c][d][e][g]concat=n=6:v=1,fps=30,zoompan=z='${z}':x='max(0,min(iw-iw/zoom,iw*${cx}-iw/zoom/2))'`
    + `:y='max(0,min(ih-ih/zoom,ih*${cy}-ih/zoom/2))':d=1:s=320x160:fps=30[v]`,
    '-map', '[v]', f('export.mp4')]);

  const map = await alignExport({ source: f('src.mp4'), exportFile: f('export.mp4') });
  assert.ok(map.confidence >= 0.8, `confidence ${map.confidence}`);
  // Caption starts at 0, 4, 12 and 16 s (the step at 8 s was cut). The cut
  // lands at 12 s with no change within 0.5 s either side (the popup went at
  // 11, inside the cut), so only its time is allowed the wider 0.35 s.
  near(map.map(0), 0, 0.2, 'at 0 s');
  near(map.map(4), 4, 0.2, 'at 4 s');
  near(map.map(12), 6.5, 0.35, 'at the cut landing, 12 s');
  near(map.map(16), 11.5, 0.2, 'at 16 s');
  assert.equal(map.map(10), null, 'the cut step still mapped');
});

// A cut inside a stretch where the page does not change leaves no trace in
// the frames: a caption there can land seconds off while the alignment as a
// whole still looks confident. Unflagged, the render ships it silently.
test('a caption on a still stretch with a hidden cut is reported uncertain, captions at changes certain, and the render refuses it unasked', { timeout: 120_000 }, async (t) => {
  const { chooseMap } = await import('../scripts/lib/render.mjs');
  const dir = await mkdtemp(path.join(os.tmpdir(), 'align-still-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const f = (n) => path.join(dir, n);
  const ff = (args) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...args, '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p']);
  // A textured page that changes at 1, 4 and 12 s and stands still between.
  const block = (x, y, from, c) => `drawbox=x=${x}:y=${y}:w=36:h=22:c=${c}:t=fill:enable='gte(t,${from})'`;
  ff(['-f', 'lavfi', '-i', "nullsrc=s=320x160:r=30:d=16,geq=lum='150+40*sin(X/9)*sin(Y/7)+30*sin((X+2*Y)/23)':cb=128:cr=128,"
    + [block(84, 36, 1, 'white'), block(116, 70, 4, 'black'), block(200, 40, 12, 'white')].join(','), f('src.mp4')]);
  // 7-9 s cut: inside the still stretch 4-12 s, so no frame shows it.
  ff(['-i', f('src.mp4'), '-filter_complex', '[0:v]trim=0:7,setpts=PTS-STARTPTS[a];[0:v]trim=9:16,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1[v]',
    '-map', '[v]', f('export.mp4')]);

  const map = await alignExport({ source: f('src.mp4'), exportFile: f('export.mp4') });
  for (const s of [1, 4, 12]) assert.ok(map.uncertainty(s) <= 0.2, `caption at the change at ${s} s reported ${map.uncertainty(s)} s uncertain`);
  assert.ok(map.uncertainty(10) > 0.35, `caption on the still page after the hidden cut reported only ${map.uncertainty(10)} s uncertain`);

  const captions = [[1, 'Open'], [4, 'Filter'], [10, 'Wait'], [12, 'Save']].map(([start, text], index) => ({ index, text, start, end: start + 2 }));
  const said = [];
  const { map: used, info } = await chooseMap({ source: f('src.mp4'), exportFile: f('export.mp4'), project: null, clipName: 'src.mp4', captions, print: (m) => said.push(m) });
  assert.equal(used, null, 'a caption that may be seconds off was used without asking');
  assert.deepEqual(info.captions.filter((c) => c.uncertainty > 0.35).map((c) => c.index), [2]);
  assert.match(said.join('\n'), /1 caption may be up to [\d.]+ s off \("Wait"\).*Cmd\+S/);
});

// Edits that leave the steps less time than their narration (a trimmed end,
// the whole clip sped up) must not push narration past the export's end:
// it would talk over the end card or the phone part, and the last captions
// would be cut off, with nothing downstream saying so.
test('narration and captions stay inside the export when edits leave too little time: tempo first, then shorter breaths, then late steps dropped', async () => {
  const { settle } = await import('../scripts/lib/render.mjs');
  const captions = Array.from({ length: 6 }, (_, index) => ({ index, text: `Step ${index + 1}`, start: index * 3, end: index * 3 + 3 }));
  const clips = captions.map((c) => ({ index: c.index, start: c.start, duration: 2.75, file: `${c.index}.wav` }));
  const floorFor = () => 1.5;
  const cases = [
    ['last 2.5 s trimmed', mapFromEdits({ duration: 20, trims: [{ start: 17.5, end: 20 }] })],
    ['whole clip at 2x', mapFromEdits({ duration: 20, speeds: [{ start: 0, end: 20, speed: 2 }] })],
  ];
  for (const [name, map] of cases) {
    const end = map.duration;
    const { voice: planned, late } = replanNarration(clips, map, { breathSec: 0.45, end });
    const { captions: caps, voice } = settle(replanCaptions(captions, map, { floorFor, narration: planned, end }).captions, planned, 0.45, { end, floorFor });
    for (const v of voice) assert.ok(v.end <= end + 1e-3 && v.tempo <= 1.1, `${name}: narration ${v.index} ends at ${v.end} s (export ${end} s) at ${v.tempo}x`);
    for (let k = 1; k < voice.length; k++) assert.ok(voice[k].start - voice[k - 1].end >= 0.2 - 1e-3, `${name}: narration ${voice[k].index} starts ${voice[k].start - voice[k - 1].end} s after the last`);
    for (const c of caps) assert.ok(c.end <= end + 1e-3 && c.end - c.start >= 1.5 - 1e-3, `${name}: caption ${c.index} at ${c.start}-${c.end} s (export ${end} s)`);
    if (name === 'last 2.5 s trimmed') {
      // 0.25 s short: the last clip speeds up rather than anything being lost.
      assert.deepEqual([late, voice.length], [[], 6], `${name}: dropped ${late}`);
      assert.ok(voice[5].tempo > 1, `${name}: last clip at ${voice[5].tempo}x`);
    } else {
      assert.ok(late.length > 0 && voice.length + late.length === 6, `${name}: ${voice.length} kept, late ${late}`);
    }
  }
});
