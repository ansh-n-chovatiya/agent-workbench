// Aligns a Recordly export to its source clip by its frames when no saved
// project says what was edited. Both are sampled at `fps` as small grayscale
// frames. Three steps:
//
// 1. Where the export looks: for every export frame, the box of the source
//    it shows (Recordly zooms, pans and pads the video inside a background),
//    tracked from frame to frame and found afresh by a grid search when the
//    tracked box stops explaining the frame.
// 2. What each export frame could show: the source is reduced to "states",
//    runs of frames that look the same (a web page sits still between
//    actions), and each export frame is scored against every state through
//    its box, counting only the cells where two states clearly differ.
// 3. When: a monotonic path through those scores allows holds, speed-ups
//    and cuts; the source frames that fit each export frame as well as the
//    path's form a corridor, and the map is the straightest line through it,
//    so time between two visible changes is spread evenly. The result is a
//    piecewise-linear TimeMap with a 0-1 confidence.
// 4. How sure: between two visible changes the frames cannot say where time
//    was cut or sped up, so each caption start gets the width of the export
//    times it could plausibly have (`map.uncertainty(t)`).
//
// Frames are read from disk one at a time and the per-frame costs are kept
// per state, so memory grows with the clip's length only through one byte
// per export x source frame pair (the path's back-pointers).
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { run, ffprobeDuration } from './env.mjs';
import { identityMap, mapFromPoints } from './timemap.mjs';

const SW = 128; // source frames, width in pixels
const EW = 192; // export frames: wider, so a zoomed-in view keeps detail
const GW = 64; // grid over the source for telling states apart, in cells
const BOX_W = 40; // samples across a box when scoring it
const RW = 48; // thumbnails for the grid search
const ZOOMS = [1, 1.1, 1.21, 1.33, 1.46, 1.61, 1.77, 1.95, 2.14];
const PADS = [0.95, 0.9, 0.85, 0.8, 0.75, 0.7];
const MAX_REFS = 32;
// A tracked box explaining less than this share of its frame triggers a
// grid search.
const GOOD = 0.98;
// Moves of a box, and zooms about its centre and each corner: a zoom
// anchored off-centre shifts the box as it scales, which single-axis moves
// follow only by crawling. [dx, dy, dw, anchor x, anchor y]
const MOVES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]].map((m) => [...m, 0, 0])
  .concat([[0.5, 0.5], [0, 0], [1, 0], [0, 1], [1, 1]].flatMap(([ax, ay]) => [[0, 0, 1, ax, ay], [0, 0, -1, ax, ay]]));

// Telling states apart (see the cost below). Grey levels are 0-255 means
// over grid cells.
const STATE_THR = 3; // a cell may drift this much within one state
const SIG_LEVEL = 6; // smallest cell difference that counts as a change
const K_FLAT = 4; // ... and at least this many times the export's noise
const K_EDGE = 3; // ... and its stray per unit of local contrast
const TAU = 0.5; // cost 1 once the export sits halfway past the best state
const EPS = 100; // squared grey levels: a change smaller than this weighs less
const RHO_DROP = 0.1; // correlation below the best's by more: clearly another state
const TIE = 0.25; // cost up to which a source frame fits as well as the best

const MAX_STEP = 8; // source frames per export frame without a cut: up to 8x
const CUT_COST = 1;
const HOLD_COST = 0.02;
const FAST_COST = 0.005;

// Raw grayscale frames, written to a file in `dir` (env.run collects output
// as text, which would corrupt binary pixels) and read back one at a time:
// holding every frame of a 10-minute export would take ~100 MB. Every read
// fills the same buffer, so a frame must be used before the next is read.
async function frames(file, fps, width, height, dir, name) {
  const raw = path.join(dir, name);
  const r = await run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-an',
    '-vf', `fps=${fps},scale=${width}:${height}:flags=area,format=gray`, '-f', 'rawvideo', raw]);
  if (r.code !== 0) throw new Error(`ffmpeg could not read frames from ${file}: ${r.stderr.trim().split('\n').pop()}`);
  const size = width * height;
  const fd = openSync(raw, 'r');
  const buf = Buffer.alloc(size);
  return {
    fd,
    count: Math.floor(fstatSync(fd).size / size),
    read: (k) => { readSync(fd, buf, 0, size, k * size); return buf; },
  };
}

async function size(file) {
  const r = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]);
  const [w, h] = String(r.stdout).trim().split(',').map(Number);
  if (!(w > 0 && h > 0)) throw new Error(`ffprobe could not read the frame size of ${file}`);
  return { w, h };
}

// Summed-area table of a w x h image, (w + 1) x (h + 1); into `S` when
// given (one used only for this size: its first row and column stay 0).
function summed(px, w, h, square = false, S = new Float64Array((w + 1) * (h + 1))) {
  const w1 = w + 1;
  for (let y = 0; y < h; y++) {
    let r = 0;
    for (let x = 0; x < w; x++) {
      const p = px[y * w + x];
      r += square ? p * p : p;
      S[(y + 1) * w1 + x + 1] = S[y * w1 + x + 1] + r;
    }
  }
  return S;
}

// The summed-area table at a fractional point, clamped to the image, with
// pixels as uniform squares.
function at(S, w, h, x, y) {
  x = Math.min(w, Math.max(0, x));
  y = Math.min(h, Math.max(0, y));
  const x0 = Math.min(w - 1, Math.floor(x));
  const y0 = Math.min(h - 1, Math.floor(y));
  const fx = x - x0;
  const fy = y - y0;
  const w1 = w + 1;
  const a = S[y0 * w1 + x0];
  const b = S[y0 * w1 + x0 + 1];
  const c = S[(y0 + 1) * w1 + x0];
  const d = S[(y0 + 1) * w1 + x0 + 1];
  return a + (b - a) * fx + (c - a) * fy + (d - b - c + a) * fx * fy;
}

// Mean of the image over each of ow x oh equal cells of the rectangle
// (x0, y0, cw, ch): continuous in the rectangle, so a box can be refined by
// fractions of a pixel. Into `out` when given (at least ow x oh long).
function cells(S, w, h, x0, y0, cw, ch, ow, oh, out = new Float32Array(ow * oh)) {
  const sx = cw / ow;
  const sy = ch / oh;
  const area = sx * sy;
  let top = new Float64Array(ow + 1);
  let bot = new Float64Array(ow + 1);
  for (let x = 0; x <= ow; x++) top[x] = at(S, w, h, x0 + x * sx, y0);
  for (let y = 0; y < oh; y++) {
    const yy = y0 + (y + 1) * sy;
    for (let x = 0; x <= ow; x++) bot[x] = at(S, w, h, x0 + x * sx, yy);
    for (let x = 0; x < ow; x++) out[y * ow + x] = (bot[x + 1] - bot[x] - top[x + 1] + top[x]) / area;
    [top, bot] = [bot, top];
  }
  return out;
}

function pearson(a, b, n = a.length) {
  let sa = 0; let sb = 0; let saa = 0; let sbb = 0; let sab = 0;
  for (let i = 0; i < n; i++) { const x = a[i]; const y = b[i]; sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y; }
  const va = saa - (sa * sa) / n;
  const vb = sbb - (sb * sb) / n;
  if (va < 1e-6 || vb < 1e-6) return 0;
  return (sab - (sa * sb) / n) / Math.sqrt(va * vb);
}

// Normalised cross-correlation of template t (tw x th) at every position of
// img (iw x ih, with its summed-area tables); the best {score, x, y}.
function nccSearch(t, tw, th, img, iw, ih, S1, S2) {
  const n = tw * th;
  let tm = 0;
  for (let i = 0; i < n; i++) tm += t[i];
  tm /= n;
  const tz = new Float32Array(n);
  let tn = 0;
  for (let i = 0; i < n; i++) { tz[i] = t[i] - tm; tn += tz[i] * tz[i]; }
  tn = Math.sqrt(tn);
  let best = { score: -1, x: 0, y: 0 };
  if (tn < 1e-3) return best;
  const iw1 = iw + 1;
  for (let y = 0; y + th <= ih; y++) for (let x = 0; x + tw <= iw; x++) {
    const a = y * iw1 + x;
    const b = (y + th) * iw1 + x;
    const s1 = S1[b + tw] - S1[a + tw] - S1[b] + S1[a];
    const v = S2[b + tw] - S2[a + tw] - S2[b] + S2[a] - (s1 * s1) / n;
    if (v < 1e-3) continue;
    let num = 0;
    for (let r = 0; r < th; r++) {
      const row = (y + r) * iw + x;
      const trow = r * tw;
      for (let u = 0; u < tw; u++) num += tz[trow + u] * img[row + u];
    }
    const score = num / (tn * Math.sqrt(v));
    if (score > best.score) best = { score, x, y };
  }
  return best;
}

export async function alignExport({ source, exportFile, fps = 10 }) {
  const [{ w: sw0, h: sh0 }, { w: ew0, h: eh0 }, duration] = await Promise.all([size(source), size(exportFile), ffprobeDuration(exportFile)]);
  const sw = SW;
  const sh = Math.max(2, Math.round((SW * sh0) / sw0 / 2) * 2);
  const ew = EW;
  const eh = Math.max(2, Math.round((EW * eh0) / ew0 / 2) * 2);
  const dir = await mkdtemp(path.join(tmpdir(), 'demo-align-'));
  const got = await Promise.allSettled([frames(source, fps, sw, sh, dir, 'source.gray'), frames(exportFile, fps, ew, eh, dir, 'export.gray')]);
  try {
    const bad = got.find((g) => g.status === 'rejected');
    if (bad) throw bad.reason;
    return alignFrames(got[0].value, got[1].value, { sw, sh, ew, eh }, fps, duration);
  } finally {
    for (const g of got) if (g.status === 'fulfilled') closeSync(g.value.fd);
    await rm(dir, { recursive: true, force: true });
  }
}

function alignFrames(src, exp, { sw, sh, ew, eh }, fps, duration) {
  const N = src.count;
  const M = exp.count;
  const fail = (reason) => Object.assign(mapFromPoints([], duration, { confidence: 0 }), { reason, uncertainty: () => duration });
  if (!N || !M) return fail('no frames to compare');

  // Summed-area tables, kept only for the few frames in use at a time (one
  // per frame would hold every source frame at eight times its size); the
  // oldest source table's memory is reused for the next.
  const srcSums = new Map();
  const srcSum = (i) => {
    let s = srcSums.get(i);
    if (!s) {
      let reuse;
      if (srcSums.size >= 64) { const [old, t] = srcSums.entries().next().value; srcSums.delete(old); reuse = t; }
      s = summed(src.read(i), sw, sh, false, reuse);
      srcSums.set(i, s);
    }
    return s;
  };
  let lastJ = -1;
  const lastSum = { S: new Float64Array((ew + 1) * (eh + 1)), Q: new Float64Array((ew + 1) * (eh + 1)) };
  const expSum = (j) => {
    if (j !== lastJ) { const px = exp.read(j); lastJ = j; summed(px, ew, eh, false, lastSum.S); summed(px, ew, eh, true, lastSum.Q); }
    return lastSum;
  };

  // A box {x, y, w} is the part of the source (source pixels, height from
  // the export's aspect) that an export frame shows; it may reach past the
  // source where the export shows Recordly's background.
  const bh = (b) => (b.w * eh) / ew;
  const regions = (b) => {
    const ox = Math.max(0, b.x);
    const oy = Math.max(0, b.y);
    const ow = Math.min(sw, b.x + b.w) - ox;
    const oh = Math.min(sh, b.y + bh(b)) - oy;
    if (ow < sw * 0.15 || oh < sh * 0.15 || ow * oh < 0.25 * b.w * bh(b)) return null;
    const k = ew / b.w;
    return { src: [ox, oy, ow, oh], exp: [(ox - b.x) * k, (oy - b.y) * k, ow * k, oh * k] };
  };

  // How much of export frame j the box explains, with source frame i inside
  // it and a flat background outside: 1 - residual / variance. A box that
  // leaves page content outside, or fits only a small patch, loses.
  let boxA = new Float32Array(0);
  let boxB = boxA;
  const boxScore = (j, i, b) => {
    const r = regions(b);
    if (!r) return -1;
    const oh = Math.max(4, Math.round((BOX_W * r.src[3]) / r.src[2]));
    const { S, Q } = expSum(j);
    // Scratch rows: this runs thousands of times a frame.
    if (boxA.length < BOX_W * oh) { boxA = new Float32Array(BOX_W * oh); boxB = new Float32Array(BOX_W * oh); }
    const rho = Math.max(0, pearson(cells(S, ew, eh, ...r.exp, BOX_W, oh, boxA), cells(srcSum(i), sw, sh, ...r.src, BOX_W, oh, boxB), BOX_W * oh));
    const rect = (T, x, y, w, h) => at(T, ew, eh, x + w, y + h) - at(T, ew, eh, x, y + h) - at(T, ew, eh, x + w, y) + at(T, ew, eh, x, y);
    const [x, y, w, h] = r.exp;
    const nI = w * h;
    const nA = ew * eh;
    const sI = rect(S, x, y, w, h);
    const qI = rect(Q, x, y, w, h);
    const sA = S[S.length - 1];
    const qA = Q[Q.length - 1];
    const vA = qA - (sA * sA) / nA;
    if (vA < nA) return rho; // a flat frame: nothing to explain
    const vI = Math.max(0, qI - (sI * sI) / nI);
    const nO = nA - nI;
    const vO = nO > 0.5 ? Math.max(0, qA - qI - ((sA - sI) ** 2) / nO) : 0;
    return 1 - (vI * (1 - rho * rho) + vO) / vA;
  };

  // Pattern search on the box, down to a fifth of a source pixel.
  const refine = (j, i, b0, step0) => {
    let b = b0;
    let s = boxScore(j, i, b);
    let step = step0;
    while (step > 0.2) {
      let moved = false;
      for (const [dx, dy, dw, ax, ay] of MOVES) {
        const w = b.w + dw * step;
        if (w < sw / 2.6 || w > sw / 0.6) continue;
        const nb = { x: b.x + dx * step - dw * step * ax, y: b.y + dy * step - ((dw * step * eh) / ew) * ay, w };
        const ns = boxScore(j, i, nb);
        if (ns > s + 1e-5) { s = ns; b = nb; moved = true; }
      }
      if (!moved) step /= 2;
    }
    return { box: b, score: s, i };
  };

  // Grid search: the export frame shrunk by each zoom slid over the source
  // frame, and the source frame shrunk by each padding slid over the export
  // frame, on thumbnails; the best few boxes, each refined.
  const RH = Math.max(4, Math.round((RW * sh) / sw));
  const REH = Math.max(4, Math.round((RW * eh) / ew));
  const thumbs = new Map();
  const thumb = (i) => {
    let t = thumbs.get(i);
    if (!t) { const img = cells(srcSum(i), sw, sh, 0, 0, sw, sh, RW, RH); t = { img, S1: summed(img, RW, RH), S2: summed(img, RW, RH, true) }; thumbs.set(i, t); }
    return t;
  };
  const fit = Math.min(1, REH / RH);
  const search = (j, pool) => {
    const e = cells(expSum(j).S, ew, eh, 0, 0, ew, eh, RW, REH);
    const eS1 = summed(e, RW, REH);
    const eS2 = summed(e, RW, REH, true);
    const perScale = new Map();
    const keep = (key, c) => { const o = perScale.get(key); if (!o || c.score > o.score) perScale.set(key, c); };
    for (const z of ZOOMS) {
      const tw = Math.round(RW / z);
      const th = Math.round(REH / z);
      if (tw > RW || th > RH) continue;
      const t = cells(eS1, RW, REH, 0, 0, RW, REH, tw, th);
      for (const i of pool) {
        const { img, S1, S2 } = thumb(i);
        const m = nccSearch(t, tw, th, img, RW, RH, S1, S2);
        keep(`z${z}`, { score: m.score, i, box: { x: (m.x * sw) / RW, y: (m.y * sh) / RH, w: (tw * sw) / RW } });
      }
    }
    for (const f of PADS) {
      const tw = Math.round(RW * fit * f);
      const th = Math.round(RH * fit * f);
      for (const i of pool) {
        const { img } = thumb(i);
        const t = cells(summed(img, RW, RH), RW, RH, 0, 0, RW, RH, tw, th);
        const m = nccSearch(t, tw, th, e, RW, REH, eS1, eS2);
        const k = sw / tw;
        keep(`p${f}`, { score: m.score, i, box: { x: -m.x * k, y: -m.y * k, w: RW * k } });
      }
    }
    return [...perScale.values()].sort((a, b) => b.score - a.score).slice(0, 4).map((c) => refine(j, c.i, c.box, sw / 24));
  };

  // Source frames on the grid; the export frame seen through a box on the
  // same grid (only the cells wholly inside the part of the source it shows).
  const gh = Math.max(2, Math.round((GW * sh) / sw));
  const cell = sw / GW;
  // States: runs of source frames whose grid cells all stay within
  // STATE_THR grey levels of the run's first frame. Frames within a state
  // cannot be told apart, so they share one score (step 2). Only the states'
  // first frames and every `coarse`-th frame (for `nearest`) keep their grid.
  const coarse = Math.max(1, Math.floor(N / 200));
  const coarseGrid = [];
  const state = new Int32Array(N);
  const first = [];
  const reps = [];
  const scratch = new Float64Array((sw + 1) * (sh + 1));
  for (let i = 0; i < N; i++) {
    const g = cells(summed(src.read(i), sw, sh, false, scratch), sw, sh, 0, 0, sw, sh, GW, gh);
    const r = reps.length ? reps[reps.length - 1] : null;
    let same = !!r;
    if (r) for (let c = 0; c < g.length; c++) if (Math.abs(g[c] - r[c]) > STATE_THR) { same = false; break; }
    if (!same) { first.push(i); reps.push(g); }
    state[i] = first.length - 1;
    if (i % coarse === 0) coarseGrid.push(g);
  }
  const K = first.length;
  // Source frames of state k: first[k] .. stateEnd(k) - 1.
  const stateEnd = (k) => (k + 1 < K ? first[k + 1] : N);
  const view = (j, b) => {
    const r = regions(b);
    if (!r) return null;
    const [ox, oy, ow, oh] = r.src;
    const cx0 = Math.ceil(ox / cell - 1e-6);
    const cy0 = Math.ceil(oy / cell - 1e-6);
    const cx1 = Math.min(GW, Math.floor((ox + ow) / cell + 1e-6));
    const cy1 = Math.min(gh, Math.floor((oy + oh) / cell + 1e-6));
    if (cx1 - cx0 < 4 || cy1 - cy0 < 4) return null;
    const k = ew / b.w;
    const e = cells(expSum(j).S, ew, eh, (cx0 * cell - b.x) * k, (cy0 * cell - b.y) * k, (cx1 - cx0) * cell * k, (cy1 - cy0) * cell * k, cx1 - cx0, cy1 - cy0);
    return { e, cx0, cy0, cx1, cy1 };
  };
  const pick = (g, v, out) => {
    let n = 0;
    for (let y = v.cy0; y < v.cy1; y++) { const row = y * GW; for (let x = v.cx0; x < v.cx1; x++) out[n++] = g[row + x]; }
    return out;
  };

  // Up to `k` source frames that look most like export frame j seen through
  // box b, best first, a few frames apart.
  const nearest = (j, b, k) => {
    const v = view(j, b);
    if (!v) return [];
    const sub = new Float32Array(v.e.length);
    const all = [];
    for (let i = 0; i < N; i += coarse) all.push([pearson(v.e, pick(coarseGrid[i / coarse], v, sub)), i]);
    all.sort((a, c) => c[0] - a[0]);
    const out = [];
    for (const [, i] of all) { if (out.every((o) => Math.abs(o - i) > 5)) out.push(i); if (out.length === k) break; }
    return out;
  };

  // 1. Boxes. Each frame starts from the previous frame's box, refined
  // against the source frame it most resembles through it. A grid search
  // runs at the start and when the tracked box explains less than GOOD of
  // its frame, against the frames nearest the source time the last good
  // frame implies (a cut only moves forward) and those it resembles; a
  // search that finds nothing better waits twice as long before the next
  // (an unrelated video never gets a good box). A frame that repeats the
  // last tracked one (no thumbnail cell a quarter grey level off) while its
  // box is good keeps that box: a still page repeats for seconds.
  const every = Math.max(10, Math.ceil(N / MAX_REFS));
  const refs = [];
  for (let i = Math.floor(every / 2); i < N; i += every) refs.push(i);
  if (!refs.length) refs.push(0);
  const boxes = new Array(M);
  const boxFit = new Float32Array(M);
  let prev = null;
  let lastGood = null;
  let wait = 0;
  let backoff = 4;
  let tracked = null;
  for (let j = 0; j < M; j++) {
    const look = cells(expSum(j).S, ew, eh, 0, 0, ew, eh, RW, REH);
    if (prev && prev.score >= GOOD && tracked && look.every((v, c) => Math.abs(v - tracked[c]) < 0.25)) {
      wait--;
      lastGood = { j, i: prev.i };
      boxes[j] = prev.box;
      boxFit[j] = prev.score;
      continue;
    }
    tracked = look;
    const near = prev ? nearest(j, prev.box, 2) : [];
    let best = prev && near.length ? refine(j, near[0], prev.box, 1) : null;
    wait--;
    if (!best || (best.score < GOOD && wait <= 0)) {
      const before = best?.score ?? -Infinity;
      const pool = new Set(near);
      if (lastGood) for (const d of [-10, 0, 10, 30, 60]) pool.add(Math.min(N - 1, Math.max(0, lastGood.i + (j - lastGood.j) + d)));
      if (!lastGood || backoff > 4) for (const i of refs) pool.add(i);
      for (const c of search(j, [...pool])) if (!best || c.score > best.score) best = c;
      const [i] = nearest(j, best.box, 1);
      if (i !== undefined) { const r = refine(j, i, best.box, 2); if (r.score >= best.score) best = r; }
      backoff = best.score > before + 0.005 ? 4 : Math.min(backoff * 2, 64);
      wait = backoff;
    }
    if (best.score >= GOOD) lastGood = { j, i: best.i };
    boxes[j] = best.box;
    boxFit[j] = best.score;
    prev = best;
  }
  thumbs.clear();

  // 2. Telling the states apart.
  // Per state and cell: the largest step to a neighbouring cell, the local
  // contrast a box a fraction of a cell off would smear.
  const steps = reps.map((g) => {
    const t = new Float32Array(g.length);
    for (let y = 0; y < gh; y++) for (let x = 0; x < GW; x++) {
      const v = g[y * GW + x];
      let m = 0;
      if (x > 0) m = Math.max(m, Math.abs(g[y * GW + x - 1] - v));
      if (x < GW - 1) m = Math.max(m, Math.abs(g[y * GW + x + 1] - v));
      if (y > 0) m = Math.max(m, Math.abs(g[(y - 1) * GW + x] - v));
      if (y < gh - 1) m = Math.max(m, Math.abs(g[(y + 1) * GW + x] - v));
      t[y * GW + x] = m;
    }
    return t;
  });

  // Cost of export frame j showing state k, from 0 (as good as the best
  // state) to 1 (it clearly shows the best state instead): the extra squared
  // error of k over the best, as a share of how much the two differ. Only
  // cells where the two differ by clearly more than the export strays from
  // the best state where nothing changed count: more than SIG_LEVEL, more
  // than K_FLAT times the typical stray in flat cells (compression) and more
  // than K_EDGE times the typical stray per unit of local contrast (a box a
  // fraction of a cell off, a page a pixel off). A difference outside the
  // view costs nothing; a typed letter counts as much as a new page.
  // Only the states costing less than 1 are kept per export frame (a
  // handful): the cost of any source frame is then a lookup (costAt,
  // costRow), where a full table would be export x source frames.
  const rowK = new Array(M); // per export frame: states costing less than 1
  const rowC = new Array(M); // ... and their costs
  const rhoBest = new Float32Array(M); // correlation with the chosen state
  const blank = new Uint8Array(M); // nothing to compare: every frame fits
  const costK = new Float32Array(K);
  const rho = new Float32Array(K);
  // Each state's grey variance over the view's cells, and its distance
  // from its block's anchor (every ANCHOR-th state), recomputed only when
  // the cells in view change (a zoom or a pan): the correlation with each
  // state is then one dot product, and a state whose anchor correlates so
  // poorly that even that distance cannot lift it near the best is skipped.
  // Correlation is a dot product of unit vectors, so it differs from the
  // anchor's by at most the distance between the two (Cauchy-Schwarz): the
  // skipped states could never be the best or a candidate.
  const ANCHOR = 8;
  const repV = new Float64Array(K);
  const reach = new Float64Array(K);
  let inView = '';
  // An export frame that repeats the last scored one (same cells in view,
  // no cell a quarter grey level off: below the export's own compression
  // noise) takes its scores; a still page repeats for seconds.
  let scored = null;
  const ez = new Float64Array(GW * gh);
  for (let j = 0; j < M; j++) {
    const v = view(j, boxes[j]);
    if (!v) { blank[j] = 1; continue; }
    const { e, cx0, cy0, cx1, cy1 } = v;
    const n = e.length;
    let eS = 0; let eQ = 0;
    for (let c = 0; c < n; c++) { eS += e[c]; eQ += e[c] * e[c]; }
    const eV = eQ - (eS * eS) / n;
    if (Math.sqrt(eV / n) < 1.5) { blank[j] = 1; continue; }
    const key = `${cx0},${cy0},${cx1},${cy1}`;
    if (scored && scored.key === key) {
      let same = true;
      for (let c = 0; c < n; c++) if (Math.abs(e[c] - scored.e[c]) >= 0.25) { same = false; break; }
      if (same) { rowK[j] = rowK[scored.j]; rowC[j] = rowC[scored.j]; rhoBest[j] = rhoBest[scored.j]; continue; }
    }
    scored = { j, e, key };
    if (key !== inView) {
      inView = key;
      let aS = 0;
      for (let k = 0; k < K; k++) {
        const g = reps[k];
        const h = reps[k - (k % ANCHOR)];
        let gS = 0; let gQ = 0; let gh2 = 0;
        for (let y = cy0; y < cy1; y++) for (let x = cx0, row = y * GW; x < cx1; x++) { const w = g[row + x]; gS += w; gQ += w * w; gh2 += w * h[row + x]; }
        if (k % ANCHOR === 0) aS = gS;
        repV[k] = gQ - (gS * gS) / n;
        const va = repV[k - (k % ANCHOR)];
        const r = repV[k] < 1e-6 || va < 1e-6 ? NaN : (gh2 - (gS * aS) / n) / Math.sqrt(repV[k] * va);
        reach[k] = Number.isNaN(r) ? Infinity : Math.sqrt(Math.max(0, 2 - 2 * r)) + 1e-6;
      }
    }
    for (let c = 0; c < n; c++) ez[c] = e[c] - eS / n;
    const dot = (k) => {
      const g = reps[k];
      let d = 0;
      for (let y = cy0, c = 0; y < cy1; y++) for (let x = cx0, row = y * GW; x < cx1; x++, c++) d += ez[c] * g[row + x];
      return eV < 1e-6 || repV[k] < 1e-6 ? 0 : d / Math.sqrt(eV * repV[k]);
    };
    let most = -Infinity;
    for (let k = 0; k < K; k += ANCHOR) { rho[k] = dot(k); most = Math.max(most, rho[k]); }
    for (let k = 0; k < K; k++) {
      if (k % ANCHOR === 0) continue;
      if (rho[k - (k % ANCHOR)] + reach[k] < most - RHO_DROP) { rho[k] = -Infinity; continue; }
      rho[k] = dot(k);
      most = Math.max(most, rho[k]);
    }
    let best = 0;
    for (let k = 1; k < K; k++) if (rho[k] > rho[best]) best = k;
    // The export's grey levels mapped onto the best state's (least squares),
    // so a brightness or contrast shift is not a difference.
    const b0 = pick(reps[best], v, new Float32Array(n));
    let bS = 0; let cov = 0;
    for (let c = 0; c < n; c++) { bS += b0[c]; cov += (e[c] - eS / n) * b0[c]; }
    const ga = cov > 0 ? cov / eV : 1;
    const ev = new Float32Array(n);
    for (let c = 0; c < n; c++) ev[c] = ga * (e[c] - eS / n) + bS / n;
    const flat = [];
    const edge = [];
    for (let y = cy0, c = 0; y < cy1; y++) for (let x = cx0; x < cx1; x++, c++) {
      const st = steps[best][y * GW + x];
      const m = Math.abs(ev[c] - b0[c]);
      if (st < 4) flat.push(m); else if (st >= 8) edge.push(m / st);
    }
    const median = (a) => { if (!a.length) return 0; a.sort((u, w) => u - w); return a[a.length >> 1]; };
    const floor = Math.max(SIG_LEVEL, K_FLAT * median(flat));
    const ratio = K_EDGE * median(edge);
    const score = (k, b) => {
      const g = reps[k];
      const h = reps[b];
      const tg = steps[k];
      const th = steps[b];
      let num = 0;
      let den = 0;
      for (let y = cy0, c = 0; y < cy1; y++) {
        const row = y * GW;
        for (let x = cx0; x < cx1; x++, c++) {
          const dlt = g[row + x] - h[row + x];
          const ad = Math.abs(dlt);
          if (ad < floor || ad < ratio * tg[row + x] || ad < ratio * th[row + x]) continue;
          const rk = ev[c] - g[row + x];
          const rb = ev[c] - h[row + x];
          num += rk * rk - rb * rb;
          den += dlt * dlt;
        }
      }
      return den > 0 ? num / (TAU * den + EPS) : 0;
    };
    // States far below the best correlation are clearly something else;
    // the rest are scored, and the best moves to any that beats it.
    const cand = [];
    for (let k = 0; k < K; k++) if (rho[k] >= rho[best] - RHO_DROP) cand.push(k);
    for (let pass = 0; pass < 2; pass++) {
      let next = best;
      let most = 0;
      for (const k of cand) { if (k === best) continue; const s = score(k, best); if (s < most) { most = s; next = k; } }
      if (next === best) break;
      best = next;
    }
    costK.fill(1);
    for (const k of cand) costK[k] = k === best ? 0 : Math.min(1, Math.max(0, score(k, best)));
    rhoBest[j] = rho[best];
    const kept = cand.filter((k) => costK[k] < 1);
    rowK[j] = Int32Array.from(kept);
    rowC[j] = Float32Array.from(kept, (k) => costK[k]);
  }
  const costAt = (j, i) => {
    if (blank[j]) return 0;
    const ks = rowK[j];
    for (let t = 0; t < ks.length; t++) if (ks[t] === state[i]) return rowC[j][t];
    return 1;
  };
  const costRow = (j, out) => {
    if (blank[j]) return out.fill(0);
    out.fill(1);
    const ks = rowK[j];
    for (let t = 0; t < ks.length; t++) out.fill(rowC[j][t], first[ks[t]], stateEnd(ks[t]));
    return out;
  };

  // 3. The path, then runs between cuts.
  const p = bestPath(costRow, M, N);
  const runs = [];
  let from = 0;
  for (let j = 1; j <= M; j++) if (j === M || p[j] - p[j - 1] > MAX_STEP || p[j] < p[j - 1]) { runs.push([from, j - 1]); from = j; }

  // The source frames each export frame could show: the stretch around its
  // path frame that fits it as well. Narrow at a change, wide on a still
  // page; blank frames could show anything.
  const lo = new Float64Array(M);
  const hi = new Float64Array(M);
  for (let j = 0; j < M; j++) {
    if (blank[j] || costAt(j, p[j]) > TIE) { lo[j] = 0; hi[j] = N - 1; continue; }
    // A state's frames share one cost, so the stretch grows a state at a time.
    let a = p[j];
    let b = p[j];
    while (a > 0 && costAt(j, a - 1) <= TIE) a = first[state[a - 1]];
    while (b < N - 1 && costAt(j, b + 1) <= TIE) b = stateEnd(state[b + 1]) - 1;
    lo[j] = a; hi[j] = b;
  }
  const q = new Float64Array(M);
  const pins = []; // per run, the changes below: [export frame, source frame]
  for (const [a, b] of runs) {
    // A corridor the path can run forward through.
    for (let j = a + 1; j <= b; j++) lo[j] = Math.max(lo[j], lo[j - 1]);
    for (let j = b - 1; j >= a; j--) hi[j] = Math.min(hi[j], hi[j + 1]);
    // Ends: the export's own start and end sit at the source's start and end
    // unless the frames rule it out; either side of a cut, the source plays
    // on at 1x from the nearest change, as far as the frames allow. A change
    // is placed where one frame's corridor is narrow, or where two
    // neighbours' corridors meet (the last frame before it, the first after).
    const changes = [];
    for (let j = a; j <= b; j++) {
      if (hi[j] - lo[j] <= 2) changes.push([j, (lo[j] + hi[j]) / 2]);
      else if (j < b && hi[j] - lo[j + 1] <= 1) changes.push([j + 0.5, (hi[j] + lo[j + 1]) / 2]);
    }
    pins.push(changes);
    const clampQ = (j, v) => Math.min(hi[j], Math.max(lo[j], v));
    const [fx, fy] = changes[0] ?? [];
    const [lx, ly] = changes[changes.length - 1] ?? [];
    const qa = a === 0 || !changes.length ? lo[a] : clampQ(a, fy - (fx - a));
    const qb = b === M - 1 || !changes.length ? hi[b] : clampQ(b, ly + (b - lx));
    taut(lo, hi, a, b, qa, qb, q);
  }
  // How straight the path the frames allow is, before the still stretches
  // are shaped: pieces under a second are a path that wanders.
  let irregular = 0;
  for (const [a, b] of runs) {
    const v = [];
    simplify(q, a, b, 1.0, v);
    v.push(b);
    for (let k = 1; k < v.length; k++) if (v[k] - v[k - 1] < fps) irregular += v[k] - v[k - 1];
    if (b === a) irregular += 1;
  }
  for (const [a, b] of runs) bendStill(q, lo, hi, a, b);

  // 4. Certainty: the source frames export frame j could plausibly show,
  // [L[j], H[j]], from the changes either side of it (`pins`). Recordly
  // edits are a few cuts and speed regions, so between two changes the
  // likeliest story is the speed seen before the first playing on until it
  // switches to the speed seen after the second; when one switch explains
  // the time the export spends between them, the range is that path. When
  // none does (a cut, or a speed region starting and ending on a still
  // page), the source could have played at the earlier speed right up to j
  // or at the later one ever since it, and the range spans both: from zero
  // at a change up to the unexplained time in the middle of the stretch.
  // The export starts and ends where the recording does, as the map assumes
  // (a trimmed still opening cannot be seen); either side of a cut, the run's
  // end with no change to pin it stands at the corridor's edge (the cut may
  // land anywhere on a still page), with 1x beyond it. The map's own guess
  // is always inside, and all of it within the corridor.
  const L = new Float64Array(M);
  const H = new Float64Array(M);
  runs.forEach(([a, b], r) => {
    const pts = pins[r].map(([x, y]) => [x, y, true]);
    if (!pts.length || pts[0][0] > a) pts.unshift([a, lo[a], a === 0]);
    if (pts[pts.length - 1][0] < b) pts.push([b, hi[b], b === M - 1]);
    // Speed seen next to pts[k], towards `dir`, as [slowest, fastest]: over
    // at least two export frames to the next change, each change's source
    // frame taken as a frame either way; 1x where no change is seen.
    const speed = (k, dir) => {
      if (!pts[k][2]) return [1, 1];
      for (let m = k + dir; m >= 0 && m < pts.length && pts[m][2]; m += dir) {
        const dx = pts[m][0] - pts[k][0];
        if (Math.abs(dx) >= 2) { const v = (pts[m][1] - pts[k][1]) / dx; const e = 2 / Math.abs(dx); return [Math.max(0, v - e), v + e]; }
      }
      return [1, 1];
    };
    let k = 0;
    for (let j = a; j <= b; j++) {
      while (k + 2 < pts.length && pts[k + 1][0] <= j) k++;
      const kr = Math.min(k + 1, pts.length - 1);
      const [xl, yl, realL] = pts[k];
      const [xr, yr, realR] = pts[kr];
      const sL = speed(k, -1);
      const sR = speed(kr, 1);
      const g = [q[j]];
      // Every one-switch story the speeds allow; failing that, both ends.
      let told = false;
      if (realL && realR) {
        for (const u of [sL[0], (sL[0] + sL[1]) / 2, sL[1]]) for (const v of [sR[0], (sR[0] + sR[1]) / 2, sR[1]]) {
          const z = Math.abs(u - v) > 1e-3 ? (yr - yl - v * xr + u * xl) / (u - v) : NaN;
          if (z >= xl && z <= xr) { told = true; g.push(j <= z ? yl + (j - xl) * u : yr - (xr - j) * v); }
        }
      }
      if (!told) for (const u of sL) for (const v of sR) g.push(yl + (j - xl) * u, yr - (xr - j) * v);
      L[j] = Math.min(hi[j], Math.max(lo[j], Math.min(...g)));
      H[j] = Math.min(hi[j], Math.max(lo[j], Math.max(...g)));
    }
  });
  // Export seconds between the first frame that could show source time t
  // and the first that surely shows it or later, plus a frame for the
  // sampling (a change is placed a frame or so either way, more at a
  // speed-up): how far a caption starting at t may be off.
  const uncertainty = (t) => {
    const x = t * fps;
    let e0 = 0;
    while (e0 < M && H[e0] < x) e0++;
    let e1 = e0;
    while (e1 < M && L[e1] < x) e1++;
    return Math.round(((e1 - e0 + 1) / fps) * 100) / 100;
  };

  const points = [];
  for (const [a, b] of runs) {
    const v = [];
    simplify(q, a, b, 1.0, v);
    v.push(b);
    for (const j of v) points.push([q[j] / fps, j / fps]);
    // The run's last frame lasts one frame at the run's final speed.
    const tail = v.length > 1 ? (q[b] - q[v[v.length - 2]]) / Math.max(1, b - v[v.length - 2]) : 1;
    points.push([(q[b] + Math.max(tail, 0)) / fps, (b + 1) / fps]);
  }

  // Confidence: how well the frames match the states on the path and how
  // well the boxes explain them, how straight the path is, and how many
  // frames had anything to compare.
  let quality = 0;
  let seen = 0;
  const unit = (v) => Math.min(1, Math.max(0, v));
  for (let j = 0; j < M; j++) if (!blank[j]) { seen++; quality += Math.min(unit((rhoBest[j] - 0.5) / 0.4), unit((boxFit[j] - 0.5) / 0.4)); }
  quality = seen ? quality / seen : 0;
  const regularity = 1 - irregular / M;
  const evidence = seen / M;
  const confidence = Math.round(unit(quality * regularity * evidence) * 100) / 100;
  const identity = runs.length === 1 && q.every((i, j) => Math.abs(i - j) <= 1) && Math.abs(N - M) <= 1
    && boxes.every((b) => Math.abs(b.w - sw) < 2 && Math.abs(b.x) < 2 && Math.abs(b.y) < 2);
  if (identity && confidence >= 0.8) return Object.assign(identityMap(duration), { confidence, uncertainty, reason: 'export matches the source frame for frame' });
  return Object.assign(mapFromPoints(points, duration, { confidence }), {
    uncertainty,
    reason: `aligned by frames: ${runs.length - 1} cut(s), match ${quality.toFixed(2)}, regularity ${regularity.toFixed(2)}`,
  });
}

// Monotonic path (export frame -> source frame) minimising the costs plus a
// step cost: a hold or a speed-up costs a little (so near-identical
// neighbouring frames do not let the path wander), past 4x more, and a jump
// of more than MAX_STEP frames (a cut) costs CUT_COST. Starting anywhere but
// the first frames, or ending anywhere but the last, is a cut too.
// `costRow(j, out)` fills export frame j's cost for every source frame.
// Back-pointers take half a byte per cell: the step back (0 to MAX_STEP
// frames) or CUT, whose origin (the best frame far enough back) is found
// again on the way back from the path costs, recomputed from the nearest
// saved row.
// ponytail: half a byte per export x source frame pair (18 MB for 10
// minutes); a band around a coarse path if hour-long exports appear.
const stepCost = (a) => (a === 0 ? HOLD_COST : (a - 1) * FAST_COST + (a > 4 ? (a - 4) * 0.1 : 0));
const CUT = 15;
const SAVE_EVERY = 64;
function bestPath(costRow, M, N) {
  const back = new Uint8Array(Math.ceil((M * N) / 2));
  const saved = new Map();
  const c = new Float32Array(N);
  // Row j's path costs into `out` from row j - 1's (`D`).
  const row = (j, D, out, record) => {
    costRow(j, c);
    let preMin = Infinity; // best of D[0 .. i - MAX_STEP - 1]
    for (let i = 0; i < N; i++) {
      const old = i - MAX_STEP - 1;
      if (old >= 0 && D[old] < preMin) preMin = D[old];
      let best = preMin + CUT_COST;
      let code = CUT;
      for (let a = 0; a <= MAX_STEP && a <= i; a++) {
        const v = D[i - a] + stepCost(a);
        if (v < best) { best = v; code = a; }
      }
      out[i] = c[i] + best;
      if (record) { const at = j * N + i; back[at >> 1] |= code << ((at & 1) * 4); }
    }
  };
  let D = new Float32Array(N);
  let next = new Float32Array(N);
  costRow(0, c);
  for (let i = 0; i < N; i++) D[i] = c[i] + (i > 1 ? CUT_COST : 0);
  saved.set(0, D.slice());
  for (let j = 1; j < M; j++) {
    row(j, D, next, true);
    [D, next] = [next, D];
    if (j % SAVE_EVERY === 0) saved.set(j, D.slice());
  }
  let end = N - 1;
  for (let i = 0; i < N; i++) if (D[i] + (i < N - 2 ? CUT_COST : 0) < D[end]) end = i;
  const rowAt = (j) => {
    const s = j - (j % SAVE_EVERY);
    let A = saved.get(s).slice();
    let B = new Float32Array(N);
    for (let r = s + 1; r <= j; r++) { row(r, A, B, false); [A, B] = [B, A]; }
    return A;
  };
  const p = new Int32Array(M);
  for (let j = M - 1, i = end; j >= 0; j--) {
    p[j] = i;
    if (j === 0) break;
    const at = j * N + i;
    const code = (back[at >> 1] >> ((at & 1) * 4)) & 15;
    if (code !== CUT) { i -= code; continue; }
    // The first frame with the lowest cost, as the forward pass took it.
    const prev = rowAt(j - 1);
    let arg = 0;
    for (let k = 1; k <= i - MAX_STEP - 1; k++) if (prev[k] < prev[arg]) arg = k;
    i = arg;
  }
  return p;
}

// Douglas-Peucker on (j, p[j]) within [a, b]: indices of the vertices.
function simplify(p, a, b, tol, out) {
  let far = -1;
  let dmax = tol;
  const slope = (p[b] - p[a]) / Math.max(1, b - a);
  for (let j = a + 1; j < b; j++) {
    const d = Math.abs(p[j] - (p[a] + slope * (j - a)));
    if (d > dmax) { dmax = d; far = j; }
  }
  if (far < 0) { out.push(a); return; }
  simplify(p, a, far, tol, out);
  simplify(p, far, b, tol, out);
}

// Shortest path from (a, qa) to (b, qb) that stays within [lo[j], hi[j]] at
// every export frame j (a taut string through the corridor): straight across
// still stretches, bending only where a change pins the source time.
// ponytail: O(n^2) on a run with many bends; a funnel with deques if runs of
// thousands of frames bend at every frame.
function taut(lo, hi, a, b, qa, qb, q) {
  let x0 = a;
  let y0 = qa;
  q[a] = qa;
  const line = (x1, y1) => { for (let j = x0 + 1; j <= x1; j++) q[j] = y0 + ((y1 - y0) * (j - x0)) / (x1 - x0); x0 = x1; y0 = y1; };
  while (x0 < b) {
    let sLo = -Infinity;
    let sHi = Infinity;
    let kLo = -1;
    let kHi = -1;
    let bent = false;
    for (let k = x0 + 1; k <= b; k++) {
      const L = k === b ? qb : lo[k];
      const U = k === b ? qb : hi[k];
      const sl = (L - y0) / (k - x0);
      const su = (U - y0) / (k - x0);
      if (sl > sHi) { line(kHi, y0 + sHi * (kHi - x0)); bent = true; break; }
      if (su < sLo) { line(kLo, y0 + sLo * (kLo - x0)); bent = true; break; }
      if (sl > sLo) { sLo = sl; kLo = k; }
      if (su < sHi) { sHi = su; kHi = k; }
    }
    if (!bent) line(b, qb);
  }
}

// A straight stretch of the taut path that is not 1x is a still stretch
// whose speed change the frames cannot place. Keep the speeds seen on either
// side (1x at a run end) and put the change where they meet, if they meet
// inside the stretch and the corridor allows it; equal speeds on both sides
// never meet, so they are kept for a quarter of the stretch at each end and
// the middle half takes up the difference.
function bendStill(q, lo, hi, a, b) {
  const knots = [a];
  for (let j = a + 1; j < b; j++) if (Math.abs(q[j + 1] - 2 * q[j] + q[j - 1]) > 1e-6) knots.push(j);
  knots.push(b);
  const slope = (k) => (k < 0 || k + 1 >= knots.length ? 1 : (q[knots[k + 1]] - q[knots[k]]) / (knots[k + 1] - knots[k]));
  const out = Float64Array.from(q);
  const tryLine = (u, v, y) => {
    const cand = [];
    for (let j = u + 1; j < v; j++) {
      const t = y(j);
      if (t < lo[j] - 1e-6 || t > hi[j] + 1e-6) return;
      cand.push([j, t]);
    }
    for (const [j, t] of cand) out[j] = t;
  };
  for (let k = 0; k + 1 < knots.length; k++) {
    const [u, v] = [knots[k], knots[k + 1]];
    if (v - u < 3 || Math.abs(slope(k) - 1) < 0.05) continue;
    const sL = k === 0 ? 1 : slope(k - 1);
    const sR = k + 2 >= knots.length ? 1 : slope(k + 1);
    if (Math.abs(sL - sR) < 1e-6) {
      const x1 = u + (v - u) / 4;
      const x2 = v - (v - u) / 4;
      const y1 = q[u] + sL * (x1 - u);
      const y2 = q[v] - sR * (v - x2);
      if (y2 >= y1) tryLine(u, v, (j) => (j <= x1 ? q[u] + sL * (j - u) : j >= x2 ? q[v] - sR * (v - j) : y1 + ((y2 - y1) * (j - x1)) / (x2 - x1)));
      continue;
    }
    const x = (q[v] - q[u] - sR * v + sL * u) / (sL - sR);
    if (x > u && x < v) tryLine(u, v, (j) => (j <= x ? q[u] + sL * (j - u) : q[v] - sR * (v - j)));
  }
  q.set(out);
}
