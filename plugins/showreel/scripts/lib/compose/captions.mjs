import { outputAt } from './timemap.mjs';
const smooth = (t) => t * t * (3 - 2 * t);
export function cuesFromRun({ storyboard, events, captionsEnabled }) {
  if (!captionsEnabled) return [];
  const cues = storyboard.steps.flatMap((step) => {
    const timing = events.steps.find((entry) => entry.id === step.id);
    return step.caption?.trim() && timing ? [{ id: step.id, text: step.caption, start: timing.tStart + 0.15, end: timing.tEnd - 0.1 }] : [];
  }).sort((a, b) => a.start - b.start);
  return cues.map((cue, i) => ({ ...cue, end: Math.min(Math.max(cue.end, cue.start + 1), cues[i + 1] ? cues[i + 1].start - 0.05 : Infinity) }))
    .filter((cue) => cue.end > cue.start);
}
export function captionAlpha(cue, t) {
  if (t <= cue.start || t >= cue.end) return 0;
  return smooth(Math.min(1, (t - cue.start) / 0.2, (cue.end - t) / 0.2));
}

function wrap(text, width, measure) {
  const lines = [];
  let line = '';
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= width) { line = candidate; continue; }
    if (line) { lines.push(line); line = ''; }
    if (measure(word) <= width) { line = word; continue; }
    for (const char of word) {
      if (line && measure(line + char) > width) { lines.push(line); line = ''; }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}
export function wrapLines(text, maxWidth, measure, { maxLines = 2 } = {}) {
  if (!Number.isFinite(maxWidth) || maxWidth <= 0 || !Number.isInteger(maxLines) || maxLines < 1) throw new Error('Invalid caption wrapping bounds');
  let lines;
  for (const scale of [1, 0.9, 0.8]) {
    lines = wrap(text, maxWidth / scale, measure);
    if (lines.length <= maxLines) return { lines, scale };
  }
  lines = lines.slice(0, maxLines);
  let last = lines.at(-1);
  const width = maxWidth / 0.8;
  // Remove whole words first; a single oversized word may be shortened by characters.
  while (measure(last + '…') > width && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' '));
  while (last && measure(last + '…') > width) last = Array.from(last).slice(0, -1).join('');
  lines[lines.length - 1] = measure('…') <= width ? last + '…' : '';
  return { lines, scale: 0.8 };
}
function timestamp(t, delimiter) {
  const ms = Math.max(0, Math.round(t * 1000));
  const pad = (v, n = 2) => String(v).padStart(n, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}${delimiter}${pad(ms % 1000, 3)}`;
}
function exportCues(cues, timemap, delimiter) {
  const toOutput = (t) => typeof timemap.toOutput === 'function' ? timemap.toOutput(t) : outputAt(timemap, t);
  return cues.flatMap((cue) => {
    const start = toOutput(cue.start);
    if (start === null) return [];
    let end = toOutput(cue.end);
    if (end === null) {
      // End may lie in a trim: use the exact output edge, without an epsilon drift.
      const kept = (timemap.segments ?? []).filter((s) => s.end > cue.start && s.start < cue.end).at(-1);
      end = kept ? kept.outputStart + (Math.min(kept.end, cue.end) - kept.start) / kept.rate : null;
    }
    return end !== null && end > start ? [{ start, end, text: cue.text }] : [];
  }).map((cue, i) => `${i + 1}\n${timestamp(cue.start, delimiter)} --> ${timestamp(cue.end, delimiter)}\n${cue.text}\n`).join('\n');
}
export const toSrt = (cues, timemap) => exportCues(cues, timemap, ',');
export const toVtt = (cues, timemap) => `WEBVTT\n\n${exportCues(cues, timemap, '.')}`;
