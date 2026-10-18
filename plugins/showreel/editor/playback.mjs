// The output clock remains authoritative when the native decoder cannot match the rate.
export function playbackSync(sourceT, videoTime, planRate, uiRate) {
  return { action: Math.abs(videoTime - sourceT) > 0.12 ? 'seek' : 'none',
    playbackRate: Math.max(0.25, Math.min(8, planRate * uiRate)) };
}

// Cap expected frames by native frame availability so sparse VFR holds do not warn.
export function previewBelowRate(samples, averageFrameRate) {
  if (samples.length < 2 || !(averageFrameRate > 0)) return false;
  const seconds = (samples.at(-1).now - samples[0].now) / 1000;
  const expected = samples.slice(1).reduce((sum, s) => sum + s.expected, 0);
  const presented = samples.slice(1).reduce((sum, s) => sum + s.presented, 0);
  return seconds >= 1.8 && expected > 0 && presented / seconds < 24 && presented < expected * 0.7;
}
