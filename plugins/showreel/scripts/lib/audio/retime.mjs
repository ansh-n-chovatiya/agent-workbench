// Narration placement on the edited timeline (docs/40 section 7, edit rules). Pure: step timings in source seconds, the
// time map from buildTimeMap (a JSON copy works too) and the clip durations in; output-time placements and warnings out.
import { sourceAt } from '../compose/timemap.mjs';

export const CAPTION_LEAD_SEC = 0.15;
export const MAX_VOICE_SPEEDUP = 1.1;
export const OVERLAP_GAP_SEC = 0.1;

// The parts of [start, end) that survive the edit, with their output times and playback rates.
export function keptParts(timemap, start, end) {
  const parts = [];
  for (const s of timemap.segments ?? []) {
    const a = Math.max(s.start, start), b = Math.min(s.end, end);
    if (b <= a) continue;
    parts.push({ srcStart: a, srcEnd: b, rate: s.rate, outStart: s.outputStart + (a - s.start) / s.rate, outEnd: s.outputStart + (b - s.start) / s.rate });
  }
  return parts;
}
const fixesFor = { 'voice-overruns-video': ['freeze', 'slow'], 'voice-over-sped-video': ['slow'], 'overlap-shifted': [], 'step-removed': [] };
const warn = (stepId, code, message, overrunSec = 0) => ({ stepId, code, message, overrunSec, fixes: [...fixesFor[code]] });
const seconds = (v) => `${v.toFixed(2)} s`;

export function placeNarration({ steps, clips, timemap, cues = [], muted = {}, fps = 30 }) {
  const warnings = [], candidates = [], tolerance = 1 / Math.max(1, fps);
  for (const step of steps) {
    const clip = clips?.[step.id];
    if (!clip || !(clip.durationSec > 0) || muted?.[step.id]) continue;
    const parts = keptParts(timemap, step.tStart, step.tEnd);
    if (!parts.length) { warnings.push(warn(step.id, 'step-removed', `Step ${step.id} is cut, so its narration was removed.`)); continue; }
    const cue = cues.find((c) => c.id === step.id), captionStart = cue?.start ?? step.tStart + CAPTION_LEAD_SEC;
    const inside = parts.find((p) => captionStart >= p.srcStart && captionStart < p.srcEnd);
    candidates.push({ step, clip, parts, start: inside ? inside.outStart + (captionStart - inside.srcStart) / inside.rate : parts[0].outStart });
  }
  candidates.sort((a, b) => a.start - b.start || a.parts[0].srcStart - b.parts[0].srcStart);
  const placements = [], captionSpans = [];
  let previousEnd = -Infinity;
  for (const { step, clip, parts, start: wanted } of candidates) {
    let start = wanted;
    if (start < previousEnd - 1e-9) {
      start = previousEnd + OVERLAP_GAP_SEC;
      warnings.push(warn(step.id, 'overlap-shifted', `Narration for step ${step.id} starts ${seconds(start - wanted)} later because the previous narration is still playing.`));
    }
    const end = start + clip.durationSec, videoEnd = parts.at(-1).outEnd, overrun = end - videoEnd;
    const rate = (parts.find((p) => start >= p.outStart && start < p.outEnd) ?? parts[0]).rate;
    if (overrun > tolerance) warnings.push(warn(step.id, 'voice-overruns-video', `Narration for step ${step.id} is ${seconds(overrun)} longer than the video that remains in the step.`, overrun));
    if (parts.some((p) => p.rate > MAX_VOICE_SPEEDUP && p.outStart < end && p.outEnd > start)) {
      warnings.push(warn(step.id, 'voice-over-sped-video', `Step ${step.id} is sped up more than ${MAX_VOICE_SPEEDUP}x while its narration plays; the voice is never sped up.`));
    }
    placements.push({ stepId: step.id, outStart: start, outEnd: end, rate });
    captionSpans.push({ stepId: step.id, outStart: start, outEnd: end });
    previousEnd = end;
  }
  return { placements, warnings, captionSpans };
}

// Captions follow narration: each cue grows (never shrinks) to cover its narration span. When a longer neighbour would make
// two cues overlap, the later cue starts after the earlier one ends instead (it follows its own, shifted narration).
export function extendCues(cues, spans, timemap, { gapSec = 0.05, minSec = 0.5 } = {}) {
  const sorted = cues.map((c) => ({ ...c })).sort((a, b) => a.start - b.start);
  for (const cue of sorted) {
    const span = spans.find((s) => s.stepId === cue.id);
    if (!span) continue;
    cue.start = Math.min(cue.start, sourceAt(timemap, span.outStart).t);
    cue.end = Math.max(cue.end, sourceAt(timemap, span.outEnd).t);
  }
  for (let i = 1; i < sorted.length; i++) {
    const before = sorted[i - 1], cue = sorted[i];
    if (cue.start >= before.end + gapSec) continue;
    cue.start = before.end + gapSec;
    if (cue.end < cue.start + minSec) cue.end = cue.start + minSec;
  }
  return sorted;
}
