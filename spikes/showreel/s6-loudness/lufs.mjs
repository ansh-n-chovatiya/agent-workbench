// ITU-R BS.1770-4 K-weighting (48 kHz coefficients) and gated integrated loudness.
const SHELF = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585] };
const HIPASS = { b: [1, -2, 1], a: [1, -1.99004745483398, 0.99007225036621] };

function biquad(x, { b, a }) {
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
const kWeight = (x) => biquad(biquad(x, SHELF), HIPASS);

export function integratedLufs(channels, sampleRate) {
  if (sampleRate !== 48000) throw new Error('spike supports 48 kHz only; resample first');
  const w = channels.map(kWeight);
  const block = Math.round(0.4 * sampleRate), hop = Math.round(0.1 * sampleRate);
  const energies = [];
  for (let s = 0; s + block <= w[0].length; s += hop) {
    let sum = 0;
    for (const ch of w) { let e = 0; for (let i = s; i < s + block; i++) e += ch[i] * ch[i]; sum += e / block; }
    energies.push(sum);
  }
  const lufs = (z) => -0.691 + 10 * Math.log10(z);
  const abs = energies.filter((z) => z > 0 && lufs(z) > -70);
  if (!abs.length) return -Infinity;
  const mean = (a) => a.reduce((p, c) => p + c, 0) / a.length;
  const relGate = lufs(mean(abs)) - 10;
  const rel = abs.filter((z) => lufs(z) > relGate);
  return rel.length ? lufs(mean(rel)) : -Infinity;
}
export const gainToTarget = (measured, target) => 10 ** ((target - measured) / 20);
