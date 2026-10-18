// Builds demo.mp4 in one ffmpeg pass (title card -> laptop -> phone -> end
// card, crossfaded, captions burned in with soft fades, or in caption mode
// 'off' carried as a soft subtitle track instead), then derives the short version, poster and contact
// sheet from it.
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { run, ffprobeDuration } from './env.mjs';
import { W, H, RING, BAND_BG, captionBand } from './cards.mjs';
import { toSrt } from './subtitles.mjs';

export const TITLE_SEC = 2.0;
export const END_SEC = 2.0;
export const XFADE_SEC = 0.5;
export const CAPTION_FADE_SEC = 0.2;
// Content after the title card starts here in demo.mp4; subtitles add it too.
export const TITLE_OFFSET = TITLE_SEC - XFADE_SEC;
const FPS = 60;
const BACKDROP = '0x0e131d';

// The first lines of stderr name the cause; the rest is ffmpeg unwinding.
const failed = (what, stderr) => new Error(`${what} failed: ${stderr.trim().split('\n').slice(0, 2).join(' | ')}`);

async function ffmpeg(args, what, signal) {
  const { code, stderr } = await run('ffmpeg', ['-y', '-hide_banner', '-v', 'error', ...args], { signal });
  if (code !== 0) throw failed(what, stderr);
}

// ffmpeg with `-progress` on stdout: calls onProgress(pct) (0-100) about once
// a second from how much of `total` seconds has been written, and 100 at the end.
function ffmpegProgress(args, what, total, onProgress) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', ['-y', '-hide_banner', '-v', 'error', '-nostats', '-progress', 'pipe:1', '-stats_period', '1', ...args],
      { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    let buf = '';
    child.stderr.on('data', (d) => { stderr += d; });
    child.stdout.on('data', (d) => {
      buf += d;
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        const m = line.match(/^out_time_us=(\d+)/);
        if (m) onProgress(Math.min(99, Math.floor((Number(m[1]) / 1e6 / total) * 100)));
      }
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(failed(what, stderr));
      onProgress(100);
      resolve();
    });
  });
}

// Segment start times in demo.mp4 from the clip durations.
export function layout(laptopSec, phoneSec = null) {
  const laptop = TITLE_OFFSET;
  const phone = phoneSec == null ? null : laptop + laptopSec - XFADE_SEC;
  const end = (phone == null ? laptop + laptopSec : phone + phoneSec) - XFADE_SEC;
  return { laptop, phone, end, total: end + END_SEC };
}

// Adds the input and filter chain that overlays each caption PNG while its
// caption applies, fading in and out. Returns the output label.
function burn(inputs, filters, label, captions, pngs, tag) {
  let last = label;
  captions.forEach((c, i) => {
    const dur = Math.max(c.end - c.start, 2 * CAPTION_FADE_SEC + 0.05);
    const a = c.start.toFixed(3);
    const b = (c.start + dur).toFixed(3);
    const k = inputs.push(['-loop', '1', '-framerate', String(FPS), '-t', dur.toFixed(3), '-i', pngs[i].file]) - 1;
    filters.push(`[${k}:v]format=rgba,fade=t=in:st=0:d=${CAPTION_FADE_SEC}:alpha=1,`
      + `fade=t=out:st=${(dur - CAPTION_FADE_SEC).toFixed(3)}:d=${CAPTION_FADE_SEC}:alpha=1,setpts=PTS-STARTPTS+${a}/TB[${tag}c${i}]`);
    filters.push(`[${last}][${tag}c${i}]overlay=${pngs[i].x}:${pngs[i].y}:eof_action=pass:enable='between(t,${a},${b})'[${tag}v${i}]`);
    last = `${tag}v${i}`;
  });
  return last;
}

// Recordly v2 samples -> points on the frame. `rect` is where the clip's
// picture sits in the frame ({x, y, w, h}).
export function cursorPoints(samples, rect) {
  const pts = [];
  for (const p of samples) {
    const pt = { t: p.timeMs / 1000, x: rect.x + p.cx * rect.w, y: rect.y + p.cy * rect.h, type: p.cursorType || 'arrow', click: p.interactionType === 'click' };
    if (pts.length && pt.t <= pts.at(-1).t) pts[pts.length - 1] = { ...pt, click: pt.click || pts.at(-1).click };
    else pts.push(pt);
  }
  return pts;
}

// ffmpeg expression of t that is piecewise linear through pts[key] (held
// before the first and after the last point), merging runs of points that a
// straight line already fits within `tol` px, so an hour of 60 Hz samples
// stays a short expression.
export function piecewise(pts, key, tol = 0.4) {
  const v = (i) => pts[i][key];
  const fits = (i, j) => {
    for (let k = i + 1; k < j; k++) {
      const f = (pts[k].t - pts[i].t) / (pts[j].t - pts[i].t);
      if (Math.abs(v(i) + f * (v(j) - v(i)) - v(k)) > tol) return false;
    }
    return true;
  };
  const n = (x, d = 3) => +x.toFixed(d);
  const terms = [`lt(t,${n(pts[0].t)})*${n(v(0), 2)}`];
  for (let i = 0; i < pts.length - 1;) {
    let j = i + 1;
    while (j + 1 < pts.length && fits(i, j + 1)) j++;
    const slope = (v(j) - v(i)) / (pts[j].t - pts[i].t);
    terms.push(`gte(t,${n(pts[i].t)})*lt(t,${n(pts[j].t)})*(${n(v(i), 2)}+(t-${n(pts[i].t)})*${n(slope, 4)})`);
    i = j;
  }
  terms.push(`gte(t,${n(pts.at(-1).t)})*${n(v(pts.length - 1), 2)}`);
  return balancedSum(terms);
}

// ffmpeg's expression parser gives up on a flat chain of ~100 "+" terms
// (it nests them), so sum as a balanced tree of depth log2(n).
export const balancedSum = (a) => (a.length === 1 ? a[0] : `(${balancedSum(a.slice(0, a.length >> 1))}+${balancedSum(a.slice(a.length >> 1))})`);

// Press rings: one short PNG sequence per click, starting one frame after
// the press so the click frame itself shows the cursor alone.
function rings(inputs, filters, label, pts, ring, tag) {
  let last = label;
  pts.filter((p) => p.click).forEach((p, i) => {
    const a = p.t + 1 / FPS;
    const k = inputs.push(['-framerate', String(FPS), '-start_number', '0', '-i', ring.pattern]) - 1;
    filters.push(`[${k}:v]format=rgba,setpts=PTS-STARTPTS+${a.toFixed(3)}/TB[${tag}r${i}]`);
    filters.push(`[${last}][${tag}r${i}]overlay=${Math.round(p.x - ring.center)}:${Math.round(p.y - ring.center)}:eof_action=pass:`
      + `enable='between(t,${a.toFixed(3)},${(a + RING.frames / FPS).toFixed(3)})'[${tag}rv${i}]`);
    last = `${tag}rv${i}`;
  });
  return last;
}

// The cursor sprite for each cursorType, moved per frame along the log.
function cursor(inputs, filters, label, pts, sprites, tag) {
  if (!pts.length) return label;
  const xs = piecewise(pts, 'x');
  const ys = piecewise(pts, 'y');
  const spans = {};
  pts.forEach((p, i) => {
    if (i && pts[i - 1].type === p.type) return;
    const next = pts.slice(i + 1).find((q) => q.type !== p.type);
    (spans[p.type] ??= []).push([i ? p.t : -1, next ? next.t : 1e6]);
  });
  let last = label;
  for (const [type, windows] of Object.entries(spans)) {
    const sp = sprites[type] ?? sprites.arrow;
    const k = inputs.push(['-i', sp.file]) - 1;
    const on = balancedSum(windows.map(([a, b]) => `gte(t,${a.toFixed(3)})*lt(t,${b.toFixed(3)})`));
    filters.push(`[${last}][${k}:v]overlay=x='${xs}-${sp.hx}':y='${ys}-${sp.hy}':eval=frame:eof_action=repeat:enable='${on}'[${tag}k${type}]`);
    last = `${tag}k${type}`;
  }
  return last;
}

// Reading the graph from a file keeps a long cursor path out of argv (Linux
// caps one argument at 128 KB). ffmpeg 7 added `-/opt file`; 9 dropped the
// older -filter_complex_script and -filter_script.
let major;
async function ffmpegMajor() {
  if (major == null) {
    const { stdout } = await run('ffmpeg', ['-hide_banner', '-version']);
    major = Number(stdout.match(/version n?(\d+)\./)?.[1] ?? 99);
  }
  return major;
}
const graphOption = async () => ((await ffmpegMajor()) >= 7 ? '-/filter_complex' : '-filter_complex_script');
// The same for a simple -vf chain.
export const vfOption = async () => ((await ffmpegMajor()) >= 7 ? '-/vf' : '-filter_script:v');

async function videoSize(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]);
  const [w, h] = stdout.trim().split(',').map(Number);
  if (!w || !h) throw new Error(`ffprobe could not read the size of ${file}`);
  return { w, h };
}

// Slow push-in on the phone screen: the picture zooms between 1 and 1 + amp
// about (cx, cy) at `rate` per second, turning at either end. Touch has no
// idle pointer to show the page is live, and freezedetect reads a still page as
// frozen after 1.2 s; the push-in is what keeps it moving. 1%/s is well above
// the ~0.25%/s at which freezedetect (noise 0.003) stops seeing a UI as still,
// and still reads as a calm camera. Only the screen is zoomed: perspective
// costs ~0.4 s per second of 1080p, the screen is a tenth of that.
export const PUSH = { amp: 0.04, rate: 0.01 };
function pushIn(label, out, cx, cy) {
  const period = (2 * PUSH.amp) / PUSH.rate;
  // perspective has no `t`, only the frame count `in`.
  const m = `(1-1/(1+${PUSH.amp}*(1-abs(1-2*mod(in/${FPS},${period})/${period}))))`;
  const x0 = `${cx}*${m}`, x1 = `W-(W-${cx})*${m}`, y0 = `${cy}*${m}`, y2 = `H-(H-${cy})*${m}`;
  return `[${label}]perspective=x0='${x0}':y0='${y0}':x1='${x1}':y1='${y0}':x2='${x0}':y2='${y2}':x3='${x1}':y3='${y2}'`
    + `:interpolation=cubic:eval=frame[${out}]`;
}

const seal = (label, out) => `[${label}]fps=${FPS},format=yuv420p,setsar=1,settb=1/${FPS}[${out}]`;

// How the laptop picture fills the part of the frame above the band (`h` =
// H - band). A picture shaped like that area (the recorded clip, made at
// exactly that size) or 16:9 (a Recordly export at its default shape) is
// scaled to cover it and centre-cropped: a no-op for the clip, and for the
// export it trims only the top and bottom, Recordly's own background padding.
// Any other shape (the user changed the aspect ratio or crop in Recordly) is
// fitted whole and centred, so nothing they kept is cut away. Without a band
// the clip is always fitted whole.
export function covers(size, band = 0) {
  if (!band) return false;
  const r = size.w / size.h;
  return [W / (H - band), 16 / 9].some((a) => Math.abs(r / a - 1) < 0.01);
}
export function laptopRect(size, band = 0) {
  const h = band ? H - band : H;
  const k = covers(size, band) ? Math.max(W / size.w, h / size.h) : Math.min(W / size.w, h / size.h);
  return { x: (W - size.w * k) / 2, y: (h - size.h * k) / 2, w: size.w * k, h: size.h * k };
}

// Solid band under the picture, with a faint top hairline so it stays
// distinct from a dark UI.
const bandFill = (band) => `pad=${W}:${H}:0:0:color=${BAND_BG.replace('#', '0x')},`
  + `drawbox=x=0:y=${H - band}:w=${W}:h=1:color=white@0.07:t=fill`;

// laptop: {video, captions, cursor}; phone: the same or null. `cursor` is the
// Recordly log to draw, or null when the video already shows a cursor (a
// Recordly export). cards from renderCards; narration: an audio file of the
// full length, or null. The filter graph is written into workDir. `preset`
// trades encode time for file size at the same quality (crf).
// `layout` ({mode: 'band'|'overlay'|'off', band}) is the recording's caption
// layout; it defaults to the one the cards were rendered for (overlay for
// runs made before bands). onProgress(stage, pct) reports the main encode as
// ('compose', 0-100), about once a second. softSubtitles false leaves the
// soft track out of 'off' mode (the picture already carries captions).
// Returns {file, duration, layout, burned, cursor, captionBand, subtitles}:
// burned = every caption with its start/end on demo.mp4's timeline (also the
// .srt's cues in every mode, and the soft subtitle track's in 'off', where
// nothing is burned), cursor = the drawn laptop cursor's points on that
// timeline (null when none was drawn), captionBand = the region the caption
// check should read (null in 'off'), subtitles = whether a soft track was muxed.
export async function composeDemo({ outFile, workDir, laptop, phone = null, cards, narration = null, preset = 'slow', layout: lay = cards.layout ?? { mode: 'overlay', band: 0 }, softSubtitles = true, onProgress = null }) {
  const mode = lay.mode ?? 'overlay';
  const band = mode === 'band' ? lay.band : 0;
  const drawn = cards.layout ?? { mode: 'overlay', band: 0 };
  if (drawn.mode !== mode || (drawn.band ?? 0) !== band) {
    throw new Error(`captions were drawn for the ${drawn.mode} layout but demo.mp4 is being composed as ${mode}; pass the same layout to renderCards and composeDemo`);
  }
  const lapSec = await ffprobeDuration(laptop.video);
  const phoneSec = phone ? await ffprobeDuration(phone.video) : null;
  const at = layout(lapSec, phoneSec);
  const inputs = [];
  const filters = [];
  const burnIf = (label, caps, pngs, tag) => (mode === 'off' ? label : burn(inputs, filters, label, caps, pngs, tag));

  const t = inputs.push(['-loop', '1', '-framerate', String(FPS), '-t', String(TITLE_SEC), '-i', cards.title]) - 1;
  filters.push(`[${t}:v]fade=t=in:st=0:d=0.4[t0]`, seal('t0', 'T'));

  const l = inputs.push(['-i', laptop.video]) - 1;
  // With a band the picture fills the area above it (see laptopRect) and the
  // cursor is drawn before the band is added, so neither reaches into it. A
  // fitted picture sits on the band's colour, reading as one surface.
  const lapSize = await videoSize(laptop.video);
  const area = H - band;
  filters.push(covers(lapSize, band)
    ? `[${l}:v]fps=${FPS},scale=${W}:${area}:force_original_aspect_ratio=increase,crop=${W}:${area},setsar=1,setpts=PTS-STARTPTS[l0]`
    : `[${l}:v]fps=${FPS},scale=${W}:${area}:force_original_aspect_ratio=decrease,`
      + `pad=${W}:${area}:(ow-iw)/2:(oh-ih)/2:color=${band ? BAND_BG.replace('#', '0x') : BACKDROP},setsar=1,setpts=PTS-STARTPTS[l0]`);
  let lap = 'l0';
  let cursorPts = null;
  if (laptop.cursor?.samples?.length) {
    const rect = laptopRect(lapSize, band);
    const pts = cursorPoints(laptop.cursor.samples, rect);
    cursorPts = pts.map((p) => ({ ...p, t: p.t + at.laptop }));
    lap = cursor(inputs, filters, rings(inputs, filters, lap, pts, cards.cursor.ring, 'l'), pts, cards.cursor, 'l');
  }
  if (band) {
    filters.push(`[${lap}]${bandFill(band)}[lb]`);
    lap = 'lb';
  }
  filters.push(seal(burnIf(lap, laptop.captions, cards.laptopCaps, 'l'), 'L'));

  let chain = 'T';
  let n = 0;
  const join = (seg, offset) => {
    filters.push(`[${chain}][${seg}]xfade=transition=fade:duration=${XFADE_SEC}:offset=${offset.toFixed(3)}[j${n}]`);
    chain = `j${n++}`;
  };
  join('L', at.laptop);

  if (phone) {
    const s = cards.phoneScreen;
    const bg = inputs.push(['-loop', '1', '-framerate', String(FPS), '-t', phoneSec.toFixed(3), '-i', cards.phoneBg]) - 1;
    const pv = inputs.push(['-i', phone.video]) - 1;
    const mask = inputs.push(['-loop', '1', '-framerate', String(FPS), '-t', phoneSec.toFixed(3), '-i', cards.phoneMask]) - 1;
    filters.push(`[${pv}:v]fps=${FPS},scale=${s.w}:${s.h},setsar=1,setpts=PTS-STARTPTS[pv0]`);
    // Touch has no pointer: taps show as press rings only, drawn on the
    // screen before the push-in so they stay on what was tapped.
    const taps = phone.cursor?.samples?.length ? cursorPoints(phone.cursor.samples, { x: 0, y: 0, w: s.w, h: s.h }) : [];
    const ph = rings(inputs, filters, 'pv0', taps, cards.cursor.ring, 'p');
    filters.push(pushIn(ph, 'pz', s.w / 2, s.h / 2), '[pz]format=yuva420p[pv]');
    filters.push(`[${mask}:v]format=gray,setsar=1[pm]`, '[pv][pm]alphamerge[pr]');
    filters.push(`[${bg}:v]setsar=1[pbg]`, `[pbg][pr]overlay=${s.x}:${s.y}:eof_action=repeat[p0]`);
    filters.push(seal(burnIf('p0', phone.captions, cards.phoneCaps, 'p'), 'P'));
    join('P', at.phone);
  }

  const e = inputs.push(['-loop', '1', '-framerate', String(FPS), '-t', String(END_SEC), '-i', cards.end]) - 1;
  filters.push(`[${e}:v]fade=t=out:st=${END_SEC - 0.5}:d=0.5[e0]`, seal('e0', 'E'));
  join('E', at.end);

  const shift = (caps, off) => caps.map((c) => ({ index: c.index, text: c.text, start: +(c.start + off).toFixed(3), end: +(c.end + off).toFixed(3) }));
  const burned = [...shift(laptop.captions, at.laptop), ...(phone ? shift(phone.captions, at.phone) : [])];

  const args = [...inputs.flat()];
  let extra = inputs.length;
  let audio = ['-an'];
  if (narration) {
    args.push('-i', narration);
    audio = ['-map', `${extra++}:a`, '-c:a', 'copy'];
  }
  // In 'off' the captions go in as a soft track, from the same cues as
  // demo.srt, so a player can show them. Only there: MP4 marks a lone subtitle
  // track default whatever -disposition says, so players would draw it over
  // burned captions too. The .srt/.vtt are written in every mode.
  let subs = [];
  if (burned.length && mode === 'off' && softSubtitles) {
    const srt = path.join(workDir, 'demo.subtitles.srt');
    await writeFile(srt, toSrt(burned));
    args.push('-i', srt);
    subs = ['-map', `${extra++}:s`, '-c:s', 'mov_text', '-metadata:s:s:0', 'language=eng'];
  }
  const graph = path.join(workDir, 'demo.filtergraph');
  await writeFile(graph, filters.join(';\n'));
  const encode = [...args, await graphOption(), graph, '-map', `[${chain}]`, ...audio, ...subs,
    '-c:v', 'libx264', '-crf', '18', '-preset', preset, '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-t', at.total.toFixed(3), '-movflags', '+faststart', outFile];
  if (onProgress) await ffmpegProgress(encode, 'demo.mp4 encode', at.total, (pct) => onProgress('compose', pct));
  else await ffmpeg(encode, 'demo.mp4 encode');

  return { file: outFile, duration: at.total, layout: at, burned, cursor: cursorPts,
    captionBand: captionBand(cards.captionPosition ?? 'bottom', { mode, band }), subtitles: subs.length > 0 };
}

// 1280x720 at 30 fps with a bitrate ceiling: ~7 MB per minute, under the
// 8 MB/min budget whatever the content.
export async function shortVersion(src, outFile, { preset = 'slow', signal } = {}) {
  await ffmpeg(['-i', src, '-vf', 'scale=1280:720:flags=lanczos,fps=30', '-c:v', 'libx264', '-crf', '28', '-preset', preset,
    '-maxrate', '850k', '-bufsize', '1700k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', outFile], 'demo-short.mp4 encode', signal);
  return outFile;
}

export async function poster(src, atSec, outFile, { signal } = {}) {
  await ffmpeg(['-ss', atSec.toFixed(3), '-i', src, '-frames:v', '1', outFile], 'poster', signal);
  return outFile;
}

// 12 frames, evenly spaced and centered in their slice, 480 px wide, 4x3.
// The last half second is the fade to black and is left out.
export async function contactSheet(src, duration, outFile, { signal } = {}) {
  const step = (duration - 0.5) / 12;
  await ffmpeg(['-ss', (step / 2).toFixed(3), '-i', src, '-vf', `fps=1/${step.toFixed(4)},scale=480:-2,tile=4x3`,
    '-frames:v', '1', outFile], 'contact sheet', signal);
  return outFile;
}
