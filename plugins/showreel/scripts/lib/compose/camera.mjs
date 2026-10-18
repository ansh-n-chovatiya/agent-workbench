const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export function planCamera({ regions, duration, source: { width, height }, hz = 60, omega = 7 }) {
  if (![width, height, hz, omega].every((v) => Number.isFinite(v) && v > 0) || !Number.isFinite(duration) || duration < 0) throw new Error('Invalid camera dimensions, duration or spring parameters');
  const maxDepth = Math.max(1, ...regions.map((r) => r.depth));
  let state = [width / 2, height / 2, 0], velocity = [0, 0, 0], time = 0;
  const samples = [];
  const sample = (t) => {
    const z = clamp(Math.exp(state[2]), 1, maxDepth);
    const cx = clamp(state[0], width / (2 * z), width - width / (2 * z));
    const cy = clamp(state[1], height / (2 * z), height - height / (2 * z));
    samples.push({ t, cx, cy, z });
  };
  sample(0);
  const boundaries = [...new Set(regions.flatMap((r) => [r.tStart, r.tEnd, ...r.keyframes.map((k) => k.t)]))].filter((t) => t > 0 && t < duration).sort((a, b) => a - b);
  let boundaryIndex = 0;
  for (let n = 1; time < duration; n++) {
    const next = Math.min(n / hz, duration);
    while (time < next) {
      while (boundaryIndex < boundaries.length && boundaries[boundaryIndex] <= time + 1e-12) boundaryIndex++;
      const end = Math.min(next, time + 1 / 240, boundaries[boundaryIndex] ?? Infinity);
      const dt = end - time;
      const region = regions.find((r) => time + 1e-12 >= r.tStart && time + 1e-12 < r.tEnd);
      const focus = region?.keyframes.findLast((k) => k.t <= time + 1e-12);
      const target = region ? [focus?.x ?? width / 2, focus?.y ?? height / 2, Math.log(region.depth)] : [width / 2, height / 2, 0];
      state = state.map((x, i) => {
        velocity[i] += (omega * omega * (target[i] - x) - 2 * omega * velocity[i]) * dt;
        return x + velocity[i] * dt;
      });
      time = end;
    }
    sample(next);
  }
  return { hz, samples };
}

export function cameraAt(plan, t) {
  const samples = plan.samples;
  if (!samples?.length) throw new Error('Camera plan must contain samples');
  let lo = 0, hi = samples.length - 1;
  if (t <= samples[lo].t) return pick(samples[lo]);
  if (t >= samples[hi].t) return pick(samples[hi]);
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (samples[mid].t <= t) lo = mid; else hi = mid; }
  const a = samples[lo], b = samples[hi], f = (t - a.t) / (b.t - a.t);
  // Linear interpolation preserves crop bounds because 1/z is convex for z > 0.
  return { cx: a.cx + (b.cx - a.cx) * f, cy: a.cy + (b.cy - a.cy) * f,
    z: a.z + (b.z - a.z) * f };
}
const pick = ({ cx, cy, z }) => ({ cx, cy, z });
