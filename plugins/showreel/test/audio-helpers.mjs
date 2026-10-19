// Seeded synthetic signals for the audio tests (not a test file: node --test only runs *.test.mjs).
export const SR = 48000;
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const sine = (hz, dbfs, seconds, sr = SR) => {
  const a = 10 ** (dbfs / 20), out = new Float32Array(Math.round(seconds * sr));
  for (let i = 0; i < out.length; i++) out[i] = a * Math.sin((2 * Math.PI * hz * i) / sr);
  return out;
};
// Syllable-like bursts of band-limited noise-ish harmonics with gaps, peaks well above the average level.
export function speechLike(seconds, seed = 1, peak = 0.9) {
  const r = rng(seed), out = new Float32Array(Math.round(seconds * SR));
  let i = 0;
  while (i < out.length) {
    const burst = Math.round((0.08 + r() * 0.15) * SR), gap = Math.round((0.03 + r() * 0.12) * SR), f = 90 + r() * 200, amp = 0.25 + r() * 0.75;
    for (let k = 0; k < burst && i + k < out.length; k++) {
      const env = Math.sin(Math.PI * k / burst) ** 2, t = (i + k) / SR;
      let v = 0; for (let h = 1; h <= 8; h++) v += Math.sin(2 * Math.PI * f * h * t + h) / h;
      out[i + k] = amp * env * v + 0.05 * (r() - 0.5);
    }
    i += burst + gap;
  }
  let max = 0; for (const v of out) max = Math.max(max, Math.abs(v));
  for (let k = 0; k < out.length; k++) out[k] *= peak / max;
  return out;
}
export const noise = (seconds, dbfs, seed = 2) => { const r = rng(seed), a = 10 ** (dbfs / 20) * Math.sqrt(3), out = new Float32Array(Math.round(seconds * SR)); for (let i = 0; i < out.length; i++) out[i] = a * (2 * r() - 1); return out; };
export const rms = (x, from = 0, to = x.length) => { let s = 0; for (let i = from; i < to; i++) s += x[i] * x[i]; return Math.sqrt(s / (to - from)); };
export const dbOf = (v) => 20 * Math.log10(v);
