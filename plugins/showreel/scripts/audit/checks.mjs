// Pure quality checks. Times are seconds; image metrics use RGB levels (0..255).
const row = (id, pass, measured, target, detail) => ({ id, pass, measured, target, detail });
export const skipped = (id, detail, neededInput = false) => ({ ...row(id, true, null, null, detail), skipped: true, neededInput });
const finite = Number.isFinite;
export function checkCadence({ frames, fps, containerDuration }) {
  const sorted = [...frames].sort((a, b) => a.timestamp - b.timestamp);
  const deltas = sorted.slice(1).map((f, i) => f.timestamp - sorted[i].timestamp);
  const median = [...deltas].sort((a, b) => a - b)[Math.floor(deltas.length / 2)];
  fps ??= 1 / median;
  const step = 1 / fps, tolerance = 0.001 + 1e-9;
  const duration = sorted.length ? sorted.at(-1).timestamp + sorted.at(-1).duration : 0;
  const badIntervals = deltas.filter(d => !finite(d) || d <= 0 || Math.abs(d - step) > tolerance).length;
  const badDurations = sorted.filter(f => !finite(f.duration) || f.duration <= 0 || Math.abs(f.duration - step) > tolerance).length;
  const pass = sorted.length > 1 && finite(fps) && fps > 0 && finite(containerDuration) && containerDuration > 0
    && Math.abs(sorted[0].timestamp) <= tolerance && !badIntervals && !badDurations && Math.abs(duration - containerDuration) <= 0.1 + 1e-9;
  return row('cadence', pass, { fps, count: frames.length, duration, containerDuration, badIntervals, badDurations },
    'constant frame duration ±1 ms; container ±0.1 s', `${fps.toFixed(3)} fps; ${frames.length} frames; ${badIntervals} gaps/irregular intervals`);
}
// Non-overlapping 5 ms windows of the mono downmix, timestamped at each window's start.
export function monoRmsEnvelope(channels, sampleRate, stepSec = 0.005) {
  const width = Math.round(sampleRate * stepSec), values = [];
  if (!channels.length || width < 1 || !finite(sampleRate) || channels.some(c => c.length !== channels[0].length)) throw new Error('Invalid audio channels or sample rate');
  for (let start = 0; start < channels[0].length; start += width) {
    const end = Math.min(start + width, channels[0].length); let energy = 0;
    for (let i = start; i < end; i++) {
      const mono = channels.reduce((sum, channel) => sum + channel[i], 0) / channels.length;
      energy += mono * mono;
    }
    values.push(Math.sqrt(energy / (end - start)));
  }
  return { values, stepSec: width / sampleRate };
}
export function narrationOnsets(envelope, narration) {
  const threshold = 10 ** (-45 / 20), step = envelope?.stepSec;
  const values = envelope?.values ?? [], candidates = [];
  if (finite(step) && step > 0) for (let i = 0; i < values.length; i++) {
    // Require 10 ms of silence, with virtual silence before the beginning of the file.
    if (finite(values[i]) && values[i] > threshold && [1, 2].every(back => i < back || values[i - back] <= threshold)) candidates.push(i * step);
  }
  const used = new Set();
  return narration.map(({ stepId, outStart: expected }) => {
    const onset = candidates.filter(t => !used.has(t) && Math.abs(t - expected) <= 0.3 + 1e-9)
      .sort((a, b) => Math.abs(a - expected) - Math.abs(b - expected))[0] ?? null;
    if (onset !== null) used.add(onset);
    return { stepId, expected, onset, errorMs: onset === null ? null : Math.abs(onset - expected) * 1000 };
  });
}
export function checkSync(videoDuration, audioDuration, { envelope, narration = null } = {}) {
  if (audioDuration === null) return skipped('av-sync', 'no audio');
  const durationDifferenceMs = Math.abs(audioDuration - videoDuration) * 1000;
  const onsets = narration === null ? null : narrationOnsets(envelope, narration);
  const errors = onsets?.map(o => o.errorMs) ?? [];
  const complete = errors.every(e => e !== null && finite(e));
  const worstMs = complete && errors.length ? Math.max(...errors) : null;
  const meanMs = complete && errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : null;
  const detail = onsets === null ? 'onset not checked (no --project)' : !onsets.length ? 'no narration placements' :
    `${onsets.length} narration onsets; worst ${worstMs?.toFixed(2) ?? 'unknown'} ms; mean ${meanMs?.toFixed(2) ?? 'unknown'} ms; ${errors.filter(e => e === null).length} missing`;
  return row('av-sync', finite(videoDuration) && finite(audioDuration) && durationDifferenceMs <= 100 + 1e-6
    && complete && errors.every(e => e <= 40 + 1e-6),
    { videoDuration, audioDuration, durationDifferenceMs, onsets, worstMs, meanMs },
    'duration difference ≤100 ms; narration onset ±40 ms (with --project)', `${durationDifferenceMs.toFixed(2)} ms duration difference; ${detail}`);
}
export function checkLoudness(measured) {
  if (measured === null) return skipped('loudness', 'no audio');
  const { integratedLufs, truePeakDb } = measured;
  return row('loudness', finite(integratedLufs) && Math.abs(integratedLufs + 16) <= 1 + 1e-9
    && (finite(truePeakDb) || truePeakDb === -Infinity) && truePeakDb <= -0.8 + 1e-9,
  measured, '-16 ±1 LUFS; true peak ≤-0.8 dBTP', `${integratedLufs.toFixed(2)} LUFS; ${truePeakDb.toFixed(2)} dBTP`);
}
function cueTime(text) {
  const m = /^(?:(\d{2,}):)?(\d{2}):(\d{2})[,.](\d{3})$/.exec(text);
  if (!m || +m[2] > 59 || +m[3] > 59) throw new Error(`Invalid caption timestamp: ${text}`);
  return +(m[1] ?? 0) * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000;
}
export function parseCaptions(text) {
  const blocks = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim().split(/\n\s*\n/).filter(Boolean);
  if (blocks[0]?.startsWith('WEBVTT')) blocks.shift();
  return blocks.flatMap(block => {
    if (/^(NOTE|STYLE|REGION)(\s|$)/.test(block)) return [];
    const lines = block.split('\n'), index = lines[0].includes('-->') ? 0 : 1;
    const match = /^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/.exec(lines[index] ?? '');
    if (!match || !lines.slice(index + 1).join('\n').trim()) throw new Error('Malformed caption cue');
    return [{ start: cueTime(match[1]), end: cueTime(match[2]), text: lines.slice(index + 1).join('\n') }];
  });
}
export function checkCaptions(text, duration) {
  if (text === null) return skipped('captions', 'no caption file; supply --srt', true);
  try {
    const cues = parseCaptions(text), errors = [];
    cues.forEach((c, i) => {
      if (c.end - c.start < 0.5 - 1e-9) errors.push(`cue ${i + 1}: shorter than 0.5 s`);
      if (c.end > duration + 1e-9) errors.push(`cue ${i + 1}: beyond video`);
      if (i && (c.start <= cues[i - 1].start || c.start < cues[i - 1].end - 1e-9)) errors.push(`cue ${i + 1}: unordered or overlapping`);
    });
    return row('captions', !errors.length, { count: cues.length, errors }, 'ordered; no overlap; ≥0.5 s; inside video', errors.join('; ') || `${cues.length} valid cues`);
  } catch (error) { return row('captions', false, { error: error.message }, 'valid SRT/VTT', error.message); }
}
export function meanDifference(a, b, channels = 3) {
  if (!a.length || a.length !== b.length || a.length % channels) throw new Error('Image sizes differ or are empty');
  const sums = Array(channels).fill(0);
  for (let i = 0; i < a.length; i++) {
    if (!finite(a[i]) || !finite(b[i])) throw new Error('Invalid pixel');
    sums[i % channels] += Math.abs(a[i] - b[i]);
  }
  return sums.map(s => s / (a.length / channels));
}
// Subtract exemptions before applying the run threshold: an allowed card must not hide an adjacent freeze.
export function checkFrozen(samples, allowed = [], cadencePass = true) {
  const runs = []; let start = null, end = null;
  const flush = () => { if (start !== null) runs.push({ start, end }); start = end = null; };
  for (let i = 1; i < samples.length; i++) {
    const s = samples[i];
    if (s.difference < 0.2) { start ??= samples[i - 1].time; end = s.time; }
    else flush();
  }
  flush();
  const ranges = runs.flatMap(run => {
    let parts = [run];
    for (const a of allowed) parts = parts.flatMap(p => a.end <= p.start || a.start >= p.end ? [p] :
      [a.start > p.start ? { start: p.start, end: a.start } : null, a.end < p.end ? { start: a.end, end: p.end } : null].filter(Boolean));
    return parts.filter(p => p.end > p.start);
  });
  const stalls = ranges.filter(p => p.end - p.start > 4 + 1e-9);
  const stillMoments = ranges.filter(p => p.end - p.start <= 4 + 1e-9);
  const longest = Math.max(0, ...stillMoments.map(p => p.end - p.start));
  return row('frozen', samples.length > 1 && !stalls.length && cadencePass,
    { ranges: stalls, stillMoments, longest, samples: samples.length, allowed, cadencePass },
    'no stalls >4.0 s outside cards/holds; cadence passes; MAD <0.2',
    `stalls: ${stalls.length || 'none'}; ${stillMoments.length} still moments (longest ${longest.toFixed(1)} s)${cadencePass ? '' : '; cadence failed'}`);
}
export function allowedFreezeRanges(plan) {
  const m = plan.timemap, ranges = [];
  if (m.titleEnd > 0) ranges.push({ start: 0, end: m.titleEnd });
  if (m.outroStart !== null) ranges.push({ start: m.outroStart, end: m.outputDuration });
  const holds = (map, offset = 0) => (map.segments ?? []).filter(s => s.rate === 0).map(s => ({ start: offset + s.outputStart, end: offset + s.outputEnd }));
  ranges.push(...(plan.scenes ? plan.scenes.flatMap(s => holds(s.plan.timemap, s.outputStart)) : holds(m)));
  return ranges;
}
export function checkParity(values) {
  if (values === null) return skipped('parity', 'no project; supply --project', true);
  return row('parity', values.length === 3 && values.every(v => v.difference.length === 3 && v.difference.every(d => finite(d) && d <= 6)),
    values, 'RGB mean absolute difference ≤6 at 20%, 50%, 80%', values.map(v => `${v.time.toFixed(3)}s: ${v.difference.map(d => d.toFixed(2)).join('/')}`).join('; '));
}
export function checkContainer({ format, codec, width, height, sizeBytes }) {
  return row('container', format === 'mp4' && typeof codec === 'string' && !!codec && [width, height].every(v => Number.isInteger(v) && v > 0 && v % 2 === 0) && sizeBytes > 0,
    { format, codec, width, height, sizeBytes }, 'MP4; even dimensions', `${format}; ${codec}${codec === 'avc' ? ' (H.264)' : ' (fallback)'}; ${width}×${height}; ${sizeBytes} bytes`);
}
export const auditPassed = (checks, strict = false) => checks.every(c => c.pass && !(strict && c.skipped && c.neededInput));
export function formatAudit(report) {
  // Bound each row for predictable agent-facing output; full details remain in --json.
  const clean = text => String(text).replace(/[^\x20-\x7E]/g, '?').slice(0, 220);
  return ['CHECK       RESULT  DETAIL', ...report.checks.map(c => `${c.id.padEnd(11)} ${(!c.pass ? 'FAIL' : c.skipped ? 'SKIP' : 'PASS').padEnd(7)} ${clean(c.detail)}`),
    `${report.pass ? 'PASS' : 'FAIL'}${report.strict ? ' (strict)' : ''}; use --json for full measurements.`].join('\n');
}
