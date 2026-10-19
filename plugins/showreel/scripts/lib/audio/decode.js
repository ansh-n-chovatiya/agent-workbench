// Browser only: decode an audio file (WAV, MP3, M4A, OGG) to 48 kHz Float32Array channels with WebAudio.
// The offline context resamples to 48 kHz, so the pure mixer never sees another rate.
import { resample48k } from './loudness.mjs';

export async function decodeAudio(arrayBuffer) {
  const context = new OfflineAudioContext(1, 1, 48000);
  const decoded = await context.decodeAudioData(arrayBuffer);
  const channels = [];
  for (let i = 0; i < Math.min(2, decoded.numberOfChannels); i++) channels.push(Float32Array.from(decoded.getChannelData(i)));
  return decoded.sampleRate === 48000 ? channels : resample48k(channels, decoded.sampleRate);
}
export async function loadAudio(url) {
  const response = await fetch(new URL(url, location.href));
  if (!response.ok) throw new Error(`Cannot load audio ${url} (${response.status})`);
  return decodeAudio(await response.arrayBuffer());
}
