// Pure audio analysis shared by synthesis and export auditing.
const finite = Number.isFinite;
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

// Bounds include the whole active windows, conservatively retaining speech at their edges.
export function speechBounds(channels, sampleRate, thresholdDb = -50) {
  const envelope = monoRmsEnvelope(channels, sampleRate);
  const threshold = 10 ** (thresholdDb / 20);
  const first = envelope.values.findIndex(v => v > threshold);
  if (first < 0) return null;
  let last = envelope.values.length - 1;
  while (envelope.values[last] <= threshold) last--;
  const width = Math.round(envelope.stepSec * sampleRate);
  return { start: first * width, end: Math.min(channels[0].length, (last + 1) * width) };
}

export function trimSilence(channels, sampleRate) {
  const bounds = speechBounds(channels, sampleRate), length = channels[0].length;
  // Uncertain/all-silent and already-short clips stay intact; never invent audio.
  if (!bounds || length < Math.ceil(sampleRate * 0.1)) return channels.map(c => c.slice());
  const start = Math.max(0, bounds.start - Math.ceil(sampleRate * 0.06));
  const end = Math.min(length, bounds.end + Math.ceil(sampleRate * 0.18));
  if (end - start < Math.ceil(sampleRate * 0.1)) return channels.map(c => c.slice());
  return channels.map(c => {
    const out = c.slice(start, end), fade = Math.round(sampleRate * 0.01);
    // Fade only new cut points, within the retained padding, never into detected speech.
    if (start > 0) for (let i = 0; i < fade; i++) out[i] *= i / Math.max(1, fade - 1);
    if (end < length) for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / Math.max(1, fade - 1);
    return out;
  });
}
