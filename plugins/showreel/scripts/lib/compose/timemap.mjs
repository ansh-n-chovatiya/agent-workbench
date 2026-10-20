const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

function validateRanges(ranges, name, duration, speeds = false) {
  if (!Array.isArray(ranges)) throw new Error(`${name} must be an array`);
  ranges.forEach((r, i) => {
    if (!r || !Number.isFinite(r.start) || !Number.isFinite(r.end)
      || r.start < 0 || r.end > duration || r.start >= r.end
      || (i > 0 && r.start < ranges[i - 1].end)) throw new Error(`${name}[${i}] is invalid or overlaps the preceding range`);
    if (speeds && (!Number.isFinite(r.rate) || r.rate < 0.25 || r.rate > 30)) throw new Error(`${name}[${i}].rate must be from 0.25 to 30`);
  });
}

// These helpers also accept a JSON round-tripped map: the drawing plan needs no functions on the wire.
export function sourceAt(map, tOut) {
  const { segments, mainStart, mainEnd, titleEnd, outroStart, outputDuration } = map;
  const t = clamp(tOut, 0, outputDuration);
  const s = segments.find((s) => t < s.outputEnd) ?? segments.at(-1);
  const first = segments[0];
  const sourceT = !s ? 0 : t <= mainStart ? first.start : t >= mainEnd ? s.end
    : s.start + (t - s.outputStart) * s.rate;
  const alphaTitle = titleEnd === 0 || t >= titleEnd ? 0 : t <= mainStart ? 1
    : (titleEnd - t) / (titleEnd - mainStart);
  const alphaOutro = outroStart === null || t < outroStart ? 0 : t >= mainEnd ? 1
    : (t - outroStart) / (mainEnd - outroStart);
  return { t: sourceT, rate: s?.rate ?? 1,
    section: t < mainStart ? 'title' : t <= mainEnd ? 'main' : outroStart !== null && t >= outroStart ? 'outro' : 'title',
    alphaTitle: clamp(alphaTitle, 0, 1), alphaOutro: clamp(alphaOutro, 0, 1) };
}

export function outputAt(map, tSrc) {
  if (!Number.isFinite(tSrc) || tSrc < 0 || tSrc > map.duration) return null;
  // Removed intervals are half-open; their right edge belongs to the next kept segment.
  if (map.trims.some(({ start, end }) => tSrc >= start && tSrc < end)) return null;
  // A held (frozen) frame first appears where its hold begins.
  const held = map.segments.find((s) => s.rate === 0 && s.start === tSrc);
  if (held) return held.outputStart;
  const s = map.segments.find((s) => tSrc >= s.start && tSrc < s.end)
    ?? (tSrc === map.duration && map.segments.at(-1)?.end === tSrc ? map.segments.at(-1) : null);
  return s ? s.outputStart + (tSrc - s.start) / s.rate : null;
}

// Holds freeze one source frame for `duration` extra output seconds: { t, duration } in source time, sorted, one per t.
export const MAX_HOLD_SEC = 30;
function validateHolds(holds, trims, sourceDuration) {
  if (!Array.isArray(holds)) throw new Error('holds must be an array');
  holds.forEach((h, i) => {
    if (!h || !Number.isFinite(h.t) || !Number.isFinite(h.duration) || h.t < 0 || h.t > sourceDuration
      || h.duration <= 0 || h.duration > MAX_HOLD_SEC || (i > 0 && h.t <= holds[i - 1].t)) {
      throw new Error(`holds[${i}] is invalid, out of range or overlaps the preceding hold`);
    }
    if (trims.some((r) => h.t >= r.start && h.t < r.end)) throw new Error(`holds[${i}] is inside a removed range`);
  });
}

export function buildTimeMap({ duration, trims = [], speeds = [], holds = [], lead = 0, tail = 0, fade = 0 }) {
  for (const [key, value] of Object.entries({ duration, lead, tail, fade })) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${key} must be finite and nonnegative`);
  }
  validateRanges(trims, 'trims', duration);
  validateRanges(speeds, 'speeds', duration, true);
  speeds.forEach((s, i) => {
    if (trims.some((r) => s.start < r.end && s.end > r.start)) throw new Error(`speeds[${i}] intersects a trim`);
  });
  validateHolds(holds, trims, duration);
  const mainStart = Math.max(0, lead - fade);
  const points = [...new Set([0, duration, ...trims.flatMap((r) => [r.start, r.end]), ...speeds.flatMap((r) => [r.start, r.end]), ...holds.map((h) => h.t)])].sort((a, b) => a - b);
  const segments = [];
  let output = mainStart;
  const hold = (t) => {
    const h = holds.find((x) => x.t === t);
    if (!h) return;
    segments.push({ start: t, end: t, rate: 0, hold: true, outputStart: output, outputEnd: output + h.duration });
    output += h.duration;
  };
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i], end = points[i + 1];
    if (trims.some((r) => start >= r.start && start < r.end)) continue;
    hold(start);
    const rate = speeds.find((r) => start >= r.start && start < r.end)?.rate ?? 1;
    const outputEnd = output + (end - start) / rate;
    segments.push({ start, end, rate, outputStart: output, outputEnd });
    output = outputEnd;
  }
  hold(duration); // A hold on the very last frame comes after the last segment.
  // A short/empty main or short outro cannot crossfade for longer than it exists.
  const outroStart = tail > 0 ? output - Math.min(fade, tail, output - mainStart) : null;
  const map = { duration, trims: trims.map((r) => ({ ...r })), holds: holds.map((h) => ({ ...h })), segments,
    mainStart, mainEnd: output, titleEnd: lead, outroStart,
    outputDuration: Math.max(lead, tail > 0 ? outroStart + tail : output) };
  return { ...map, toSource: (t) => sourceAt(map, t), toOutput: (t) => outputAt(map, t) };
}
