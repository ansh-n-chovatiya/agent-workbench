// Output guards: no frozen stretch in the demo, subtitles in step with the
// burn, captions never shown twice.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { run, ffprobeDuration } from './env.mjs';
import { parseCues } from './subtitles.mjs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { balancedSum, vfOption } from './compose.mjs';

export const FREEZE = { noise: 0.003, minSec: 1.2 };

// Frozen spans [[start, dur]] from freezedetect's log. A freeze still open at
// the end of the file (no freeze_end) runs to `duration`.
export function parseFreeze(stderr, duration) {
  const spans = [];
  let start = null;
  for (const m of stderr.matchAll(/freeze_(start|end): ([\d.]+)/g)) {
    const t = parseFloat(m[2]);
    if (m[1] === 'start') start = t;
    else if (start != null) { spans.push([start, t - start]); start = null; }
  }
  if (start != null && duration != null) spans.push([start, duration - start]);
  return spans;
}

// Keeps the part of each span outside the cards ([0, skipStart) and the last
// skipEnd seconds, which are still by design) when that part is itself long
// enough to count as a freeze.
export function outsideCards(spans, duration, { skipStart = 0, skipEnd = 0, minSec = FREEZE.minSec } = {}) {
  const lo = skipStart;
  const hi = duration - skipEnd;
  const out = [];
  for (const [s, d] of spans) {
    const a = Math.max(s, lo);
    const b = Math.min(s + d, hi);
    if (b - a >= minSec - 1e-3) out.push([+a.toFixed(3), +(b - a).toFixed(3)]);
  }
  return out;
}

// The chain is read from a file: a crop that follows the cursor holds its
// whole path, which on a long recording outgrows one command-line argument.
async function detect(file, { from = 0, to = null, crop = null } = {}, signal) {
  const window = ['-ss', from.toFixed(3), ...(to != null ? ['-to', to.toFixed(3)] : [])];
  const vf = `${crop ? `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},` : ''}freezedetect=n=${FREEZE.noise}:d=${FREEZE.minSec}`;
  const dir = await mkdtemp(path.join(tmpdir(), 'demo-freeze-'));
  try {
    await writeFile(path.join(dir, 'vf'), vf);
    const { code, stderr } = await run('ffmpeg', ['-hide_banner', '-nostats', ...window, '-i', file, await vfOption(), path.join(dir, 'vf'), '-an', '-f', 'null', '-'], { signal });
    if (code !== 0) throw new Error(`freezedetect failed on ${file}: ${stderr.trim().split('\n').pop()}`);
    return stderr;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Frozen spans of `file` outside the title and end cards; `regions`
// ([{from, to, crop}]) limits the check to those parts of the video.
export async function freezeCheck(file, { skipStart = 0, skipEnd = 0, regions = null, signal } = {}) {
  const duration = await ffprobeDuration(file);
  const spans = [];
  for (const r of regions ?? [{}]) {
    const from = r.from ?? 0;
    const end = r.to ?? duration;
    for (const [s, d] of parseFreeze(await detect(file, r, signal), end - from)) spans.push([s + from, d]);
  }
  const out = outsideCards(spans, duration, { skipStart, skipEnd }).sort((a, b) => a[0] - b[0]);
  return { ok: out.length === 0, spans: out };
}

// Spans [start, dur] (seconds) in which a Recordly cursor log stays put:
// within `tol` (normalized; ~0.5 px at 1920) of one point for at least minSec.
// No samples means a cursor that never moves.
export function cursorStill(samples, duration, { minSec = FREEZE.minSec, tol = 2.5e-4 } = {}) {
  const spans = [];
  let from = 0;
  let ref = samples[0];
  const close = (to) => { if (to - from >= minSec - 1e-3) spans.push([+from.toFixed(3), +(to - from).toFixed(3)]); };
  for (const p of samples) {
    if (Math.abs(p.cx - ref.cx) <= tol && Math.abs(p.cy - ref.cy) <= tol) continue;
    close(p.timeMs / 1000);
    from = p.timeMs / 1000;
    ref = p;
  }
  close(duration);
  return spans;
}

// The still spans the fixture's own pauses ([from, to] seconds) do not
// explain. Pauses under `gap` apart form one window (the actions between them
// changed nothing); a span is explained when it lies in a window, give or take
// `slack` at either end, and outlasts it by at most `slack`.
export function outsidePauses(spans, pauses, { slack = 0.5, gap = 0.25 } = {}) {
  const windows = [];
  for (const [a, b] of [...pauses].sort((x, y) => x[0] - y[0])) {
    const last = windows.at(-1);
    if (last && a - last[1] <= gap) last[1] = Math.max(last[1], b);
    else windows.push([a, b]);
  }
  return spans.filter(([s, d]) => !windows.some(([a, b]) => s >= a - slack && s + d <= b + slack && d <= b - a + slack));
}

// Cue times of the soft subtitle track in `file` ([] when it has none).
export async function subtitleCues(file, { signal } = {}) {
  const { code, stdout } = await run('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:s:0?', '-f', 'srt', '-'], { signal });
  return code === 0 ? parseCues(stdout) : [];
}

// With nothing burned (`band` null, caption mode 'off') the soft track is
// what a player shows, so it must carry the .srt's cues (within 50 ms:
// mov_text stores milliseconds, the muxer may round). Otherwise each
// subtitle cue must start where a caption visibly appears in `file`:
// the caption region ({x, y, w, h}) 120 ms before the cue and 200 ms after it
// (the fade-in takes 200 ms) must differ, whether the band was empty or held
// the previous caption. Checked on the pixels, so it fails when subtitles and
// burned captions part, whatever list either was made from. One ffmpeg pass
// pulls every frame needed.
const SYNC = { before: 0.12, after: 0.2, minDiff: 3, hardDiff: 80, minHard: 300, fps: 60 };
export async function captionSync(file, srt, vtt, band, { signal } = {}) {
  const cues = parseCues(srt);
  const other = parseCues(vtt);
  if (other.length !== cues.length || other.some((c, i) => Math.abs(c.start - cues[i].start) > 0.001)) {
    return { ok: false, cues: cues.length, detail: 'demo.srt and demo.vtt cue times disagree' };
  }
  if (!band) {
    const soft = await subtitleCues(file, { signal });
    if (soft.length !== cues.length || soft.some((c, i) => Math.abs(c.start - cues[i].start) > 0.05 || Math.abs(c.end - cues[i].end) > 0.05)) {
      return { ok: false, cues: cues.length, detail: `the embedded subtitle track (${soft.length} cues) does not match demo.srt (${cues.length} cues)` };
    }
    return { ok: true, cues: cues.length, detail: `nothing burned; the embedded subtitle track matches all ${cues.length} cues` };
  }
  const frame = (t) => Math.max(0, Math.round(t * SYNC.fps));
  const want = [...new Set(cues.flatMap((c) => [frame(c.start - SYNC.before), frame(c.start + SYNC.after)]))].sort((a, b) => a - b);
  if (!want.length) return { ok: true, cues: 0, detail: 'no cues' };
  const size = band.w * band.h;
  const vf = `select='${balancedSum(want.map((n) => `eq(n,${n})`))}',crop=${band.w}:${band.h}:${band.x}:${band.y},format=gray`;
  const { stdout } = await promisify(execFile)('ffmpeg', ['-v', 'error', '-i', file, '-vf', vf, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-'],
    { encoding: 'buffer', maxBuffer: want.length * size + 1024, signal });
  const frames = new Map(want.map((n, i) => [n, stdout.subarray(i * size, (i + 1) * size)]));
  const diffs = cues.map((c) => {
    const a = frames.get(frame(c.start - SYNC.before));
    const b = frames.get(frame(c.start + SYNC.after));
    if (a.length < size || b.length < size) return 0; // past the end of the video
    // A short caption ("Done") changes too little of a full-width band to
    // move the mean, but its letters still flip a few hundred pixels hard.
    let sum = 0;
    let hard = 0;
    for (let i = 0; i < size; i++) {
      const d = Math.abs(a[i] - b[i]);
      sum += d;
      if (d > SYNC.hardDiff) hard++;
    }
    return hard >= SYNC.minHard ? Math.max(sum / size, SYNC.minDiff) : sum / size;
  });
  const late = cues.filter((c, i) => diffs[i] < SYNC.minDiff).map((c) => `${c.start.toFixed(2)} s`);
  return {
    ok: !late.length,
    cues: cues.length,
    minDiff: +Math.min(...diffs).toFixed(1),
    detail: late.length ? `no caption appears at the cue(s) starting ${late.join(', ')}` : `a caption appears at each of ${cues.length} cues`,
  };
}

// Captions burned into the picture (caption mode 'band' or 'overlay') must not
// also ride along as an embedded subtitle track: players show a lone MP4
// subtitle track by default, so every caption would be read twice. Counts
// streams, not cues, so an empty track fails too.
export async function doubleCaptions(file, mode, { signal } = {}) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 's', '-show_entries', 'stream=index', '-of', 'csv=p=0', file], { signal });
  const subtitleStreams = stdout.split('\n').filter(Boolean).length;
  const ok = mode === 'off' || subtitleStreams === 0;
  return { ok, mode, subtitleStreams, detail: ok ? `${subtitleStreams} embedded subtitle track(s) in ${mode} mode` : 'captions would show twice: burned in and an embedded subtitle track' };
}

export const formatSpans = (spans) => spans.map(([s, d]) => `${s.toFixed(2)}s-${(s + d).toFixed(2)}s (${d.toFixed(2)}s)`).join(', ');
