// edit <runDir>: raw/<clip>/{video.webm,trace.zip} + record.json -> edit/<clip>/
// {clip.mp4, captions.json, cursor.json, timeline.json}.
//
// Clock alignment. Playwright writes video.webm from the page's screencast and
// its first video frame is the first screencast frame, so raw video time 0 is
// the trace timestamp of the page's first `screencast-frame` event (t0) and
// every trace time t sits at (t - t0) ms in the webm. Page creation time is
// NOT t0: the first frame arrives ~150 ms later, once the page paints. The
// webm also runs ~1 s past the last trace event (the recorder holds the last
// frame on close), so ffprobe duration minus the frame span is a padding
// check, not an offset; the clip ends at the last step/action instead.
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { run, ffprobeDuration, log, warn } from './env.mjs';
import { DEFAULTS } from './config.mjs';
import { readTrace } from './trace.mjs';
import { computeCuts, mergeCuts, remap, buildCaptions, buildCursor, keepFloors, stepFloorMs, KEEP_MS } from './timeline.mjs';

const FPS = 60;
const CLICKS = new Set(['click', 'dblclick', 'tap', 'check', 'uncheck', 'setChecked']);
const TEXT = new Set(['fill', 'type']);
const POINTER = new Set([...CLICKS, 'selectOption']);

export async function main(argv, ctx) {
  const [runDir] = argv;
  if (!runDir) throw new Error('usage: demo.mjs edit <runDir>');
  await editRun(path.resolve(ctx.cwd, runDir));
}

// Returns { <clip>: {duration, cuts} } for the run summary. `only` limits it
// to those clip names; `keepCaptions` leaves an existing captions.json (the
// user's edits) as it is.
export async function editRun(runDir, { only = null, keepCaptions = false } = {}) {
  const record = JSON.parse(await readFile(path.join(runDir, 'record.json'), 'utf8'));
  const maxWaitMs = record.config?.maxWaitMs ?? DEFAULTS.maxWaitMs;
  const pace = { ...DEFAULTS.pace, ...record.config?.pace };
  const summary = {};
  for (const clip of record.clips) {
    if (only && !only.includes(clip.name)) continue;
    summary[clip.name] = await editClip(runDir, clip, { maxWaitMs, pace, keepCaptions, narration: record.narration?.[clip.name] ?? [] });
  }
  return summary;
}

// trace.zip holds the recording's network log (request headers, cookies).
// After the first edit only what edit reads is kept, in trace.json, and the zip
// is deleted; a later edit reads trace.json.
async function editClip(runDir, clip, { maxWaitMs, pace, keepCaptions, narration }) {
  const raw = path.join(runDir, 'raw', clip.name);
  const webm = path.join(raw, 'video.webm');
  const zip = path.join(raw, 'trace.zip');
  const trace = existsSync(zip) ? await readTrace(zip) : JSON.parse(await readFile(path.join(raw, 'trace.json'), 'utf8'));
  if (!trace.frames.length) throw new Error(`${clip.name}: the trace has no screencast frames, so the video cannot be aligned`);

  const t0 = trace.frames[0].t;
  const videoMs = (await ffprobeDuration(webm)) * 1000;
  const spanMs = trace.frames[trace.frames.length - 1].t - t0;
  if (videoMs + 100 < spanMs) warn(`${clip.name}: video (${(videoMs / 1000).toFixed(2)} s) is shorter than its trace (${(spanMs / 1000).toFixed(2)} s); captions may drift`);

  const at = (t) => t - t0;
  const steps = trace.steps.map((s) => ({ ...s, start: at(s.start), end: at(s.end) }));
  const actions = trace.actions.map((a) => ({ ...a, start: at(a.start), end: at(a.end), inputAt: a.inputAt == null ? null : at(a.inputAt) }));
  const moves = trace.moves.map((m) => ({ ...m, t: at(m.t) }));

  const lastEvent = Math.max(0, ...steps.map((s) => s.end), ...actions.map((a) => a.end));
  const endMs = Math.min(videoMs, lastEvent || videoMs);
  // The page is blank (about:blank) until the first navigation paints, so the
  // clip starts at the first frame after it; captions starting earlier land on 0.
  const nav = actions.find((a) => a.method === 'goto');
  const shown = nav ? trace.frames.map((f) => at(f.t)).find((t) => t >= nav.end) : null;
  const spoken = new Map(narration.map((n) => [n.index, n.duration]));
  const cuts = keepFloors(steps, mergeCuts([
    ...(shown > 0 ? [[0, shown]] : []),
    ...computeCuts(actions, { maxWaitMs, keepMs: KEEP_MS }),
  ].map(([a, b]) => [Math.max(0, a), Math.min(endMs, b)]).filter(([a, b]) => b > a)),
  (s) => stepFloorMs(s.title, pace, spoken.get(s.index)), shown > 0 ? shown : 0);
  const frames = Math.max(1, Math.round((remap(endMs, cuts) / 1000) * FPS));
  const duration = frames / FPS;

  const out = path.join(runDir, 'edit', clip.name);
  await mkdir(out, { recursive: true });

  // Same cut as the proven trim: resample to 60 fps first so `t` is on the
  // output grid, drop frames inside cuts, then renumber the survivors.
  const expr = cuts.map(([a, b]) => `between(t,${(a / 1000).toFixed(3)},${(b / 1000).toFixed(3)})`).join('+') || '0';
  const { width: W, height: H } = clip;
  const vf = `fps=${FPS},select='not(${expr})',setpts=N/${FPS}/TB,`
    + `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
  const ff = await run('ffmpeg', ['-y', '-v', 'error', '-i', webm, '-vf', vf, '-frames:v', String(frames), '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart',
    path.join(out, 'clip.mp4')]);
  if (ff.code !== 0) throw new Error(`${clip.name}: ffmpeg failed to cut the video: ${ff.stderr.trim().split('\n').pop()}`);

  const captions = buildCaptions(steps, cuts).map((c) => ({ ...c, end: Math.min(c.end, duration) }));
  const targets = actions.filter((a) => a.box && (TEXT.has(a.method) || POINTER.has(a.method)))
    .map((a) => ({ start: a.start, end: a.end, box: a.box, cursorType: TEXT.has(a.method) ? 'text' : 'pointer' }));
  const clicks = actions.filter((a) => CLICKS.has(a.method) && a.point && a.inputAt != null)
    .map((a) => ({ t: a.inputAt, x: a.point.x, y: a.point.y }));
  const cursor = buildCursor(moves, clicks, { width: W, height: H, hz: FPS, durationMs: endMs, targets }, cuts);

  const startOf = new Map(captions.map((c) => [c.index, c.start]));
  // The fixture's deliberate still pauses (ms from their step's start), as
  // [from, to] seconds on the edited clip.
  const stepStart = new Map(steps.map((s) => [s.index, s.start]));
  const edited = (ms) => Math.round(remap(ms, cuts)) / 1000;
  const pauses = JSON.parse(await readFile(path.join(raw, 'pauses.json'), 'utf8').catch(() => '[]'))
    .filter((p) => stepStart.has(p.step))
    .map((p) => [edited(stepStart.get(p.step) + p.from), edited(stepStart.get(p.step) + p.to)]);
  const timeline = {
    duration,
    cuts: cuts.map((c) => c.map((ms) => Math.round(ms) / 1000)),
    steps: captions.map((c) => ({ index: c.index, title: c.text, start: c.start, end: c.end })),
    narration: narration.filter((n) => startOf.has(n.index)).map((n) => ({ index: n.index, file: n.file, start: startOf.get(n.index) })),
    pauses,
  };
  if (!keepCaptions || !existsSync(path.join(out, 'captions.json'))) await writeFile(path.join(out, 'captions.json'), JSON.stringify(captions, null, 1));
  await writeFile(path.join(out, 'cursor.json'), JSON.stringify(cursor));
  await writeFile(path.join(out, 'timeline.json'), JSON.stringify(timeline, null, 1));
  if (existsSync(zip)) {
    await writeFile(path.join(raw, 'trace.json'), JSON.stringify(trace));
    await rm(zip);
  }
  const cutSec = cuts.reduce((s, [a, b]) => s + b - a, 0) / 1000;
  log(`${clip.name}: ${(videoMs / 1000).toFixed(1)} s -> ${duration.toFixed(1)} s (${cuts.length} cuts, ${cutSec.toFixed(1)} s removed)`);
  return { duration, cuts: timeline.cuts };
}
