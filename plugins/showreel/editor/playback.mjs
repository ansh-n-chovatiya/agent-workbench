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

// Preview audio: one audio clock. While the mix plays, the output time is the audio context time (less the device
// latency, because sound reaches the speakers that much later than the context says), and the video follows it.
export function outputLatencySec(context) {
  const total = (Number.isFinite(context?.baseLatency) ? context.baseLatency : 0) + (Number.isFinite(context?.outputLatency) ? context.outputLatency : 0);
  return Math.max(0, Math.min(1, total));
}
export function audioClock({ contextTime, startContextTime, offsetSec, latencySec = 0, duration = 0, loop = false }) {
  const elapsed = Math.max(0, contextTime - startContextTime - latencySec), t = Math.max(0, offsetSec) + elapsed;
  if (!(duration > 0)) return t;
  return loop ? t % duration : Math.min(t, duration);
}
// Audio plays only at normal speed; at any other rate the preview is silent and says so.
export const audioMutedAtRate = rate => rate !== 1;
// Everything the mix depends on; unrelated plan changes (zoom, cursor, captions) leave this unchanged.
export function audioSignature(audio) {
  if (!audio?.enabled) return '';
  return JSON.stringify({ d: audio.durationSec, r: audio.sampleRate,
    n: audio.narration.map(n => [n.clipUrl, n.outStart, n.durationSec, n.gainDb]),
    m: audio.music && [audio.music.url, audio.music.gainDb, audio.music.loop, audio.music.fadeInSec, audio.music.fadeOutSec, audio.music.startSec, audio.music.endSec],
    k: audio.duck, l: audio.loudness });
}
