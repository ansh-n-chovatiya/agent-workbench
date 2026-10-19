// Pure audio metering and levelling on Float32Array channels at 48 kHz.
// BS.1770-4 K-weighting with EBU R128 gating, 4x oversampled true peak, gain helpers and a lookahead true-peak limiter.
export const SAMPLE_RATE = 48000;
const SHELF = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585] };
const HIPASS = { b: [1, -2, 1], a: [1, -1.99004745483398, 0.99007225036621] };
const toDb = (linear) => (linear > 0 ? 20 * Math.log10(linear) : -Infinity);

function biquad(x, { b, a }) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
function checkChannels(channels) {
  if (!Array.isArray(channels) || !channels.length || channels.length > 2) throw new Error('Audio must have one or two channels');
  const length = channels[0].length;
  if (channels.some((c) => !(c instanceof Float32Array) || c.length !== length)) throw new Error('Audio channels must be Float32Arrays of equal length');
  return length;
}

// Integrated loudness in LUFS; -Infinity for silence or audio shorter than one 400 ms block.
export function integratedLufs(channels) {
  checkChannels(channels);
  const block = Math.round(0.4 * SAMPLE_RATE), hop = Math.round(0.1 * SAMPLE_RATE);
  // Prefix sums of squared K-weighted samples make each overlapping block O(1) per channel.
  const sums = channels.map((c) => {
    const w = biquad(biquad(c, SHELF), HIPASS), s = new Float64Array(w.length + 1);
    for (let i = 0; i < w.length; i++) s[i + 1] = s[i] + w[i] * w[i];
    return s;
  });
  const lufs = (z) => -0.691 + 10 * Math.log10(z);
  const energies = [];
  for (let start = 0; start + block <= channels[0].length; start += hop) {
    let z = 0;
    for (const s of sums) z += (s[start + block] - s[start]) / block;
    if (z > 0 && lufs(z) > -70) energies.push(z);
  }
  if (!energies.length) return -Infinity;
  const mean = (list) => list.reduce((p, c) => p + c, 0) / list.length;
  const relativeGate = lufs(mean(energies)) - 10;
  const kept = energies.filter((z) => lufs(z) > relativeGate);
  return kept.length ? lufs(mean(kept)) : -Infinity;
}

// 4x oversampling: three interpolated points between every pair of samples, 12-tap windowed-sinc phases.
const PHASES = [1, 2, 3].map((p) => {
  const f = p / 4, taps = [];
  for (let m = -5; m <= 6; m++) {
    const x = m - f, sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    taps.push(sinc * (0.5 + 0.5 * Math.cos(Math.PI * x / 6.5)));
  }
  const total = taps.reduce((p, c) => p + c, 0);
  return taps.map((t) => t / total);
});
// peakPerInterval[i] is the largest magnitude, across channels, in [i, i + 1] including the interpolated points.
function intervalPeaks(channels) {
  const n = channels[0].length, out = new Float32Array(n);
  for (const c of channels) {
    for (let i = 0; i < n; i++) {
      let peak = Math.abs(c[i]);
      const next = i + 1 < n ? Math.abs(c[i + 1]) : 0;
      if (next > peak) peak = next;
      for (let p = 0; p < 3; p++) {
        const taps = PHASES[p];
        let y = 0;
        for (let k = 0; k < 12; k++) {
          const j = i - 5 + k;
          if (j >= 0 && j < n) y += taps[k] * c[j];
        }
        y = Math.abs(y);
        if (y > peak) peak = y;
      }
      if (peak > out[i]) out[i] = peak;
    }
  }
  return out;
}
export function truePeakLinear(channels) {
  checkChannels(channels);
  let peak = 0;
  for (const v of intervalPeaks(channels)) if (v > peak) peak = v;
  return peak;
}
export function measureLoudness(channels) {
  checkChannels(channels);
  let sample = 0;
  for (const c of channels) for (let i = 0; i < c.length; i++) { const v = Math.abs(c[i]); if (v > sample) sample = v; }
  return { integratedLufs: integratedLufs(channels), truePeakDb: toDb(truePeakLinear(channels)), samplePeakDb: toDb(sample) };
}
// Gain in dB that moves `measured` (a LUFS number or a measureLoudness result) to `target`; 0 for silence.
export function gainToTarget(measured, target) {
  const lufs = typeof measured === 'number' ? measured : measured?.integratedLufs;
  return Number.isFinite(lufs) && Number.isFinite(target) ? target - lufs : 0;
}
export function applyGainDb(channels, gainDb) {
  const g = 10 ** (gainDb / 20);
  return channels.map((c) => { const out = new Float32Array(c.length); for (let i = 0; i < c.length; i++) out[i] = c[i] * g; return out; });
}

// Lookahead limiter. The gain at each sample is no higher than the gain that would bring the oversampled peak of the
// neighbouring interval to the ceiling: a sliding minimum over the lookahead, a moving average of the same length for a
// smooth attack, then an exponential release that is never allowed above that bound. Channels are linked.
export function truePeakLimiter(channels, { ceilingDb = -1, lookaheadMs = 5, releaseMs = 80 } = {}) {
  const n = checkChannels(channels), ceiling = 10 ** (ceilingDb / 20);
  const L = Math.max(1, Math.round(lookaheadMs / 1000 * SAMPLE_RATE));
  const peaks = intervalPeaks(channels);
  const need = new Float32Array(n).fill(1);
  let any = false;
  for (let i = 0; i < n; i++) if (peaks[i] > ceiling) { any = true; const g = ceiling / peaks[i]; if (g < need[i]) need[i] = g; if (i + 1 < n && g < need[i + 1]) need[i + 1] = g; }
  if (!any) return { channels: channels.map((c) => Float32Array.from(c)), reductionDb: 0 };
  // An interval's bound applies to both of its end samples.
  const d = need;
  // Sliding minimum of d over [i, i + L - 1], scanning backwards with a monotonic deque of indices.
  const m = new Float64Array(n), queue = new Int32Array(n);
  let head = 0, tail = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (tail > head && d[queue[tail - 1]] >= d[i]) tail--;
    queue[tail++] = i;
    while (queue[head] > i + L - 1) head++;
    m[i] = d[queue[head]];
  }
  // Moving average of m over [i - L + 1, i]; every term is at most d[i]. Samples before the start repeat m[0], so the guarantee holds at the very first sample too.
  const gain = new Float64Array(n);
  let acc = L * m[0];
  for (let i = 0; i < n; i++) {
    acc += m[i] - (i - L >= 0 ? m[i - L] : m[0]);
    gain[i] = acc / L;
  }
  const release = 1 - Math.exp(-1 / (releaseMs / 1000 * SAMPLE_RATE));
  let r = 1, minGain = 1;
  const out = channels.map(() => new Float32Array(n));
  for (let i = 0; i < n; i++) {
    const target = Math.min(1, gain[i]);
    r = Math.min(target, r + (1 - r) * release);
    if (r < minGain) minGain = r;
    for (let c = 0; c < channels.length; c++) out[c][i] = channels[c][i] * r;
  }
  return { channels: out, reductionDb: -toDb(minGain) };
}

// Windowed-sinc resampler (Kaiser-like Blackman window, 16 zero crossings per side) from any rate to 48 kHz.
export function resample48k(channels, fromRate) {
  if (!Number.isFinite(fromRate) || fromRate <= 0) throw new Error('Invalid sample rate');
  if (fromRate === SAMPLE_RATE) return channels.map((c) => Float32Array.from(c));
  const ratio = SAMPLE_RATE / fromRate, cutoff = Math.min(1, ratio) * 0.97, half = 16 / cutoff, table = 2048;
  // kernel[k] samples h(x) for x = k / table source samples, 0 <= x <= half.
  const size = Math.ceil(half * table) + 2, kernel = new Float64Array(size);
  for (let k = 0; k < size; k++) {
    const x = k / table;
    if (x >= half) continue;
    const s = x === 0 ? cutoff : Math.sin(Math.PI * cutoff * x) / (Math.PI * x), u = x / half;
    kernel[k] = s * (0.42 + 0.5 * Math.cos(Math.PI * u) + 0.08 * Math.cos(2 * Math.PI * u));
  }
  const at = (x) => { const p = Math.abs(x) * table, i = Math.floor(p); return i + 1 >= size ? 0 : kernel[i] + (kernel[i + 1] - kernel[i]) * (p - i); };
  return channels.map((c) => {
    const outLength = Math.round(c.length * ratio), out = new Float32Array(outLength);
    for (let n = 0; n < outLength; n++) {
      const t = n / ratio, lo = Math.max(0, Math.ceil(t - half)), hi = Math.min(c.length - 1, Math.floor(t + half));
      let sum = 0;
      for (let j = lo; j <= hi; j++) sum += c[j] * at(j - t);
      out[n] = sum;
    }
    return out;
  });
}
