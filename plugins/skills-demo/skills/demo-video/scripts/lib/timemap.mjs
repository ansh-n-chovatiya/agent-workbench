// Source-to-export time maps for a Recordly edit, and re-planning of
// captions, narration and the cursor log onto the edited timeline. Pure: no
// files, no processes. All times are seconds.
//
// A TimeMap is { segments: [{srcStart, srcEnd, expStart, speed}], duration
// (export seconds), source, confidence, map(t), inverse(t) }. Source time in a
// segment plays at `speed`, so it lasts (srcEnd - srcStart) / speed in the
// export; source time outside every segment was cut.

const EPS = 1e-4; // Recordly drops pieces shorter than this (splitBySpeed)

function build(segments, duration, source, confidence) {
  const segs = segments.slice().sort((a, b) => a.srcStart - b.srcStart);
  const expEnd = (s) => s.expStart + (s.srcEnd - s.srcStart) / s.speed;
  return {
    segments: segs,
    duration,
    source,
    confidence,
    // Export time of source time t; null where t was cut (or is off the clip).
    map(t) {
      for (const s of segs) {
        if (t >= s.srcStart && (t < s.srcEnd || (t === s.srcEnd && s === segs[segs.length - 1]))) {
          return s.expStart + (t - s.srcStart) / s.speed;
        }
      }
      return null;
    },
    // Source time shown at export time e; a gap in the export (alignment
    // only) resolves to the end of the segment before it.
    inverse(e) {
      if (!segs.length) return 0;
      let prev = segs[0].srcStart;
      for (const s of segs) {
        if (e < s.expStart) return prev;
        if (e <= expEnd(s)) return s.srcStart + (e - s.expStart) * s.speed;
        prev = s.srcEnd;
      }
      return prev;
    },
  };
}

// Recordly's computeSegments: the kept parts of [0, duration] once the trims
// (sorted by start, overlaps merged by the running max) are removed. Recordly
// does not clamp a trim to the clip; its decoder simply runs out of frames,
// so the clamp here gives the same export.
function computeSegments(duration, trims) {
  const out = [];
  let i = 0;
  for (const t of [...trims].sort((a, b) => a.start - b.start)) {
    if (i < t.start) out.push({ start: i, end: Math.min(t.start, duration) });
    i = Math.max(i, t.end);
  }
  if (i < duration) out.push({ start: i, end: duration });
  return out.filter((s) => s.end > s.start);
}

// Recordly's splitBySpeed: each kept part cut at the speed regions that touch
// it, in start order. Where regions overlap the earlier-starting one wins,
// because the cursor `i` has already passed the overlap when the later one
// is reached.
function splitBySpeed(segments, speeds) {
  const out = [];
  for (const seg of segments) {
    const hits = speeds.filter((r) => r.start < seg.end && r.end > seg.start).sort((a, b) => a.start - b.start);
    let i = seg.start;
    for (const r of hits) {
      const a = Math.max(r.start, seg.start);
      const b = Math.min(r.end, seg.end);
      if (i < a) out.push({ start: i, end: a, speed: 1 });
      const from = Math.max(i, a);
      if (b > from) out.push({ start: from, end: b, speed: r.speed });
      i = Math.max(i, b);
    }
    if (i < seg.end) out.push({ start: i, end: seg.end, speed: 1 });
  }
  return out.filter((s) => s.end - s.start > EPS);
}

// The map Recordly's exporter produces from a project's trims and speed
// regions. Its length is Recordly's getEffectiveDuration: the sum of each
// piece's length over its speed. (The exporter emits ceil(len/speed*fps)
// frames per piece, so a real export runs up to a frame per piece longer.)
// The exporter decodes the kept pieces in source order, so clips moved on
// Recordly's timeline still export in recording order: the map only ever
// runs forward, and nothing here handles a reordered clip.
export function mapFromEdits({ duration, trims = [], speeds = [] }) {
  const pieces = splitBySpeed(computeSegments(duration, trims), speeds);
  let exp = 0;
  const segments = pieces.map((p) => {
    const s = { srcStart: p.start, srcEnd: p.end, expStart: exp, speed: p.speed };
    exp += (p.end - p.start) / p.speed;
    return s;
  });
  return build(segments, exp, 'project', 1);
}

export function identityMap(duration) {
  return build([{ srcStart: 0, srcEnd: duration, expStart: 0, speed: 1 }], duration, 'identity', 1);
}

// Piecewise-linear map through [srcT, expT] points (sorted and made monotonic
// here). Two points with the same export time are a cut between them; two
// with the same source time are a hold in the export, left as a gap.
export function mapFromPoints(points, duration, { source = 'alignment', confidence = 0 } = {}) {
  const pts = points.filter(([s, e]) => Number.isFinite(s) && Number.isFinite(e)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const segments = [];
  for (let k = 1; k < pts.length; k++) {
    const [s0, e0] = pts[k - 1];
    const [s1, e1] = pts[k];
    if (s1 - s0 > EPS && e1 - e0 > EPS) segments.push({ srcStart: s0, srcEnd: s1, expStart: e0, speed: (s1 - s0) / (e1 - e0) });
  }
  return build(segments, duration, source, confidence);
}

// Export interval showing the kept part of source [a, b], or null when all of
// it was cut.
function mapSpan(map, a, b) {
  let first = null;
  let last = null;
  for (const s of map.segments) {
    const lo = Math.max(a, s.srcStart);
    const hi = Math.min(b, s.srcEnd);
    if (hi - lo <= EPS) continue;
    const e0 = s.expStart + (lo - s.srcStart) / s.speed;
    const e1 = s.expStart + (hi - s.srcStart) / s.speed;
    if (first === null || e0 < first) first = e0;
    if (last === null || e1 > last) last = e1;
  }
  return first === null ? null : [first, last];
}

const ms = (t) => Math.round(t * 1000) / 1000;

// Captions moved onto the export: a caption whose whole span was cut is
// dropped; the rest keep order, never overlap, and stay on screen at least
// floorFor(text) seconds, pushing the next one later. `narration`
// ([{index, start, end}] from replanNarration, export seconds) holds a
// caption back until its clip starts and on screen until it has finished.
// Nothing runs past `end` (the export's length): a caption pushed there is
// cut short at it, or dropped (`late`) when that leaves it less than its
// floor.
export function replanCaptions(captions, map, { floorFor = () => 0, narration = [], end = Infinity } = {}) {
  const voice = new Map(narration.map((n) => [n.index, n]));
  const out = [];
  const dropped = [];
  const late = [];
  let prevEnd = 0;
  for (const c of [...captions].sort((a, b) => a.start - b.start)) {
    const span = mapSpan(map, c.start, c.end);
    if (!span) { dropped.push(c.index); continue; }
    const n = voice.get(c.index);
    const start = Math.max(span[0], prevEnd, n ? n.start : 0);
    let stop = Math.max(span[1], start + floorFor(c.text), n ? n.end : 0);
    if (stop > end) {
      if (end - start < Math.max(floorFor(c.text), EPS)) { late.push(c.index); continue; }
      stop = end;
    }
    out.push({ ...c, start: ms(start), end: ms(stop) });
    prevEnd = ms(stop);
  }
  return { captions: out, dropped, late };
}

// Narration clips (source-time starts) placed on the export: each at the
// first kept moment of its span (from its start up to the next clip's start),
// skipped when that span was cut entirely. A clip that would run into the
// breathing gap (a minimum, never added where there is room) before the next
// clip is sped up by at most maxTempo; if that is not enough the next clip
// waits. Nothing plays past `end` (the export's length, where the next part
// or the end card begins): when the clips left would not fit before it even
// at maxTempo, the breath shrinks towards minBreathSec, and a clip that still
// cannot fit, or would start in the last half second, is dropped (`late`),
// earlier steps keeping theirs first. Returns {voice: export-time {index, start,
// end, tempo, file}, late: indices}.
export function replanNarration(clips, map, { maxTempo = 1.1, breathSec = 0.45, minBreathSec = 0.2, end = map.duration } = {}) {
  const sorted = [...clips].sort((a, b) => a.start - b.start);
  const lastSrc = map.segments.length ? map.segments[map.segments.length - 1].srcEnd : 0;
  const placed = [];
  sorted.forEach((c, k) => {
    const until = k + 1 < sorted.length ? sorted[k + 1].start : Math.max(lastSrc, c.start + c.duration);
    const span = mapSpan(map, c.start, until);
    if (span) placed.push({ ...c, at: span[0] });
  });
  // Which clips fit: in order, each kept if it still ends before `end` with
  // everything kept so far packed tight (maxTempo, the shortest breath).
  const late = [];
  const kept = [];
  let tight = -Infinity;
  for (const c of placed) {
    const finish = Math.max(c.at, tight + minBreathSec) + c.duration / maxTempo;
    if (c.at > end - 0.5 || finish > end) { late.push(c.index); continue; }
    kept.push(c);
    tight = finish;
  }
  // Backwards from the end: the latest each kept clip may finish so that
  // the ones after it still fit, packed tight.
  const latest = new Array(kept.length);
  let limit = end;
  for (let k = kept.length - 1; k >= 0; k--) { latest[k] = limit; limit -= kept[k].duration / maxTempo + minBreathSec; }
  const out = [];
  let prevEnd = -Infinity;
  kept.forEach((c, k) => {
    const finish = latest[k];
    // The full breath where it fits; less only as the end requires.
    const start = Math.max(c.at, prevEnd + minBreathSec, Math.min(prevEnd + breathSec, finish - c.duration / maxTempo));
    const next = k + 1 < kept.length ? kept[k + 1].at : Infinity;
    const room = Math.min(next - breathSec, finish) - start;
    const tempo = c.duration > room ? Math.min(maxTempo, c.duration / Math.max(room, EPS)) : 1;
    prevEnd = start + c.duration / tempo;
    out.push({ index: c.index, start: ms(start), end: ms(prevEnd), tempo: Math.round(tempo * 1000) / 1000, file: c.file });
  });
  return { voice: out, late };
}

// A Recordly cursor log ({samples: [{timeMs, ...}]}) moved onto the export;
// samples inside a cut are dropped.
export function mapCursor(cursorLog, map) {
  if (!cursorLog || !Array.isArray(cursorLog.samples)) return cursorLog;
  const samples = [];
  for (const s of cursorLog.samples) {
    const t = map.map(s.timeMs / 1000);
    if (t !== null) samples.push({ ...s, timeMs: Math.round(t * 1000) });
  }
  samples.sort((a, b) => a.timeMs - b.timeMs);
  return { ...cursorLog, samples };
}
