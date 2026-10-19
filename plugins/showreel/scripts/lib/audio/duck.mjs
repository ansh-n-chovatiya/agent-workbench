// Gain envelope that lowers music under narration. Pure; the result multiplies the music bus sample by sample.
const ramp = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));

export function mergeIntervals(intervals, gapSec = 0) {
  const sorted = intervals.filter((i) => Number.isFinite(i?.start) && Number.isFinite(i?.end) && i.end > i.start)
    .map((i) => ({ start: i.start, end: i.end })).sort((a, b) => a.start - b.start);
  const merged = [];
  for (const i of sorted) {
    const last = merged.at(-1);
    if (last && i.start - last.end < gapSec) last.end = Math.max(last.end, i.end);
    else merged.push(i);
  }
  return merged;
}
// Inside an interval the gain is exactly 10^(-depthDb/20). It falls over attackMs before the interval starts (so the music
// is already low when the voice begins) and rises over releaseMs after it ends, both on a raised-cosine curve.
export function duckEnvelope({ intervals, length, sampleRate, depthDb = 12, attackMs = 150, releaseMs = 400 }) {
  const out = new Float32Array(length).fill(1);
  const low = 10 ** (-depthDb / 20), attack = Math.max(1, Math.round(attackMs / 1000 * sampleRate)), release = Math.max(1, Math.round(releaseMs / 1000 * sampleRate));
  for (const { start, end } of mergeIntervals(intervals, releaseMs / 1000)) {
    const s = Math.round(start * sampleRate), e = Math.round(end * sampleRate);
    const from = Math.max(0, s - attack), to = Math.min(length, e + release);
    for (let i = from; i < to; i++) {
      const g = i < s ? 1 - (1 - low) * ramp((i - (s - attack)) / attack)
        : i < e ? low : 1 - (1 - low) * (1 - ramp((i - e) / release));
      if (g < out[i]) out[i] = g;
    }
  }
  return out;
}
