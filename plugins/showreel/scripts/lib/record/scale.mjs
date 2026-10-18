const SCALES = [1, 1.33, 1.67, 2];

export function chooseScale({ requested, benchmarkScale, layoutDriftExcess, minFps50 }) {
  if (requested !== 'auto' && !SCALES.includes(requested)) {
    throw new Error('requested scale must be auto, 1, 1.33, 1.67 or 2');
  }
  let used = requested;
  let reason = 'requested';
  if (requested === 'auto') {
    used = SCALES.includes(benchmarkScale) ? benchmarkScale : 1;
    reason = SCALES.includes(benchmarkScale) ? 'benchmark' : 'no benchmark';
  }
  // FPS eligibility is already reflected in the stored benchmark choice.
  if (layoutDriftExcess > 0.02) return { used: 1, reason: 'layout guard' };
  return { used, reason };
}
