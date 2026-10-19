// Offline mixer: places narration clips, loops and fades music, ducks it under the voice, normalises loudness and limits
// true peaks. Pure JavaScript on Float32Array channels, so the preview, the tests and the export page share one result.
import { SAMPLE_RATE, resample48k, integratedLufs, truePeakLinear, truePeakLimiter, applyGainDb, gainToTarget } from './loudness.mjs';
import { duckEnvelope } from './duck.mjs';

const toDb = (linear) => (linear > 0 ? 20 * Math.log10(linear) : -Infinity);
const stereo = (channels, rate) => {
  if (!Array.isArray(channels) || !channels.length || channels.length > 2 || channels.some((c) => !(c instanceof Float32Array))) throw new Error('Audio must be one or two Float32Array channels');
  const fixed = rate !== undefined && rate !== SAMPLE_RATE ? resample48k(channels, rate) : channels;
  return [fixed[0], fixed[1] ?? fixed[0]];
};
const fade = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));

export function placeClips(clips, length, sampleRate) {
  const bus = [new Float32Array(length), new Float32Array(length)], intervals = [];
  for (const clip of clips) {
    const [l, r] = stereo(clip.channels, clip.sampleRate), gain = 10 ** ((clip.gainDb ?? 0) / 20);
    const at = Math.round(clip.start * sampleRate), from = Math.max(0, at), to = Math.min(length, at + l.length);
    if (to <= from) continue;
    for (let i = from; i < to; i++) { bus[0][i] += l[i - at] * gain; bus[1][i] += r[i - at] * gain; }
    intervals.push({ start: from / sampleRate, end: to / sampleRate });
  }
  return { bus, intervals };
}

export function renderMusic(music, length, durationSec, sampleRate) {
  const out = [new Float32Array(length), new Float32Array(length)];
  const [l, r] = stereo(music.channels, music.sampleRate), n = l.length;
  if (!n) return out;
  const s0 = Math.max(0, Math.round((music.startSec ?? 0) * sampleRate)), s1 = Math.min(length, Math.round((music.endSec ?? durationSec) * sampleRate));
  if (s1 <= s0) return out;
  const gain = 10 ** ((music.gainDb ?? 0) / 20), span = s1 - s0;
  const inN = Math.round((music.fadeInSec ?? 0) * sampleRate), outN = Math.round((music.fadeOutSec ?? 0) * sampleRate);
  // A hard loop point that jumps in level would click, so it gets a 3 ms dip on each side of the seam.
  const seam = Math.min(Math.round(0.003 * sampleRate), n >> 2);
  const jump = music.loop && Math.max(Math.abs(l[n - 1] - l[0]), Math.abs(r[n - 1] - r[0])) > 0.01;
  for (let i = 0; i < span; i++) {
    let j = i;
    if (j >= n) { if (!music.loop) break; j %= n; }
    let g = gain;
    if (inN > 0 && i < inN) g *= fade(i / inN);
    if (outN > 0 && span - i <= outN) g *= fade((span - 1 - i) / outN);
    if (jump && seam > 0) {
      if (j < seam) g *= fade((j + 0.5) / seam);
      if (n - j <= seam) g *= fade((n - j - 0.5) / seam);
    }
    out[0][s0 + i] = l[j] * g; out[1][s0 + i] = r[j] * g;
  }
  return out;
}

export function mixAudio({ durationSec, sampleRate = SAMPLE_RATE, clips = [], music = null, duck = {}, loudness = {} }) {
  if (sampleRate !== SAMPLE_RATE) throw new Error('mixAudio supports 48 kHz only');
  if (!Number.isFinite(durationSec) || durationSec <= 0) throw new Error('durationSec must be positive');
  const length = Math.round(durationSec * sampleRate);
  const { bus, intervals } = placeClips(clips, length, sampleRate);
  let mixed = bus;
  if (music) {
    const m = renderMusic(music, length, durationSec, sampleRate);
    if (duck.enabled && intervals.length) {
      const env = duckEnvelope({ intervals, length, sampleRate, depthDb: duck.depthDb ?? 12, attackMs: duck.attackMs ?? 150, releaseMs: duck.releaseMs ?? 400 });
      for (const c of m) for (let i = 0; i < length; i++) c[i] *= env[i];
    }
    mixed = bus.map((c, k) => { for (let i = 0; i < length; i++) c[i] += m[k][i]; return c; });
  }
  const ceilingDb = loudness.truePeakDb ?? -1, preGainLufs = integratedLufs(mixed);
  let gainDb = loudness.enabled ? gainToTarget(preGainLufs, loudness.targetLufs ?? -16) : 0;
  let result;
  for (let pass = 0; pass < 4; pass++) {
    const limited = truePeakLimiter(applyGainDb(mixed, gainDb), { ceilingDb });
    result = { ...limited, integrated: integratedLufs(limited.channels) };
    const error = loudness.enabled && Number.isFinite(result.integrated) ? (loudness.targetLufs ?? -16) - result.integrated : 0;
    // The limiter takes a little level off loud material; add it back (within the ceiling) until the target is met.
    if (Math.abs(error) <= 0.05 || result.reductionDb === 0 && pass > 0) break;
    gainDb += error;
  }
  return { channels: result.channels,
    measured: { integratedLufs: result.integrated, truePeakDb: toDb(truePeakLinear(result.channels)), preGainLufs },
    appliedGainDb: gainDb, limiterReductionDb: result.reductionDb };
}
