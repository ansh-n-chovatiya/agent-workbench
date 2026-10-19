// Browser-side audio conversion for recordings and imported files. The server accepts 16-bit PCM WAV only (scripts/lib/voice/import.mjs),
// so the editor decodes whatever the browser understands and re-encodes it. The encoder is pure so Node tests cover it.
export const WAV_RATE = 48000;
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

// channels: one Float32Array per channel, equal lengths, samples -1..1. Returns the bytes of a 16-bit PCM WAV file.
export function encodeWav16(channels, sampleRate = WAV_RATE) {
  const list = channels instanceof Float32Array ? [channels] : channels;
  if (!list?.length || list.length > 2 || !list.every(c => c instanceof Float32Array && c.length === list[0].length)) throw new Error('Audio must be one or two Float32Array channels of equal length.');
  if (!Number.isInteger(sampleRate) || sampleRate < 1000 || sampleRate > 384000) throw new Error('The sample rate must be a whole number from 1000 to 384000.');
  const frames = list[0].length, count = list.length, dataBytes = frames * count * 2;
  if (!frames) throw new Error('There is no audio to save.');
  if (dataBytes + 44 > 0xffffffff) throw new Error('The audio is too long for a WAV file.');
  const bytes = new Uint8Array(44 + dataBytes), view = new DataView(bytes.buffer);
  const tag = (offset, text) => { for (let i = 0; i < 4; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  tag(0, 'RIFF'); view.setUint32(4, 36 + dataBytes, true); tag(8, 'WAVE'); tag(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, count, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * count * 2, true); view.setUint16(32, count * 2, true); view.setUint16(34, 16, true);
  tag(36, 'data'); view.setUint32(40, dataBytes, true);
  let offset = 44;
  for (let i = 0; i < frames; i++) for (let c = 0; c < count; c++) {
    const x = list[c][i];
    view.setInt16(offset, Number.isFinite(x) ? Math.max(-32768, Math.min(32767, Math.round(x * 32768))) : 0, true); offset += 2;
  }
  return bytes;
}

// Decodes any audio the browser can play and returns a mono 48 kHz 16-bit WAV (Uint8Array) plus its length in seconds.
export async function convertToWav(arrayBuffer, { sampleRate = WAV_RATE } = {}) {
  if (!arrayBuffer?.byteLength) throw new Error('The recording is empty.');
  let decoded;
  try { decoded = await new OfflineAudioContext(1, 1, sampleRate).decodeAudioData(arrayBuffer.slice(0)); }
  catch { throw new Error('This browser cannot read that audio. Try a WAV or MP3 file.'); }
  if (!(decoded.duration > 0)) throw new Error('The audio file contains no sound.');
  // Rendering through an offline context resamples to 48 kHz and mixes stereo down to mono in one step.
  const frames = Math.max(1, Math.ceil(decoded.duration * sampleRate)), context = new OfflineAudioContext(1, frames, sampleRate), source = context.createBufferSource();
  source.buffer = decoded; source.connect(context.destination); source.start();
  const rendered = await context.startRendering();
  return { wav: encodeWav16([Float32Array.from(rendered.getChannelData(0))], sampleRate), durationSec: rendered.duration };
}
// 0..1 level of a block of time-domain samples (bytes from AnalyserNode.getByteTimeDomainData); drives the recording meter.
export function levelFromBytes(bytes) {
  if (!bytes?.length) return 0;
  let peak = 0;
  for (let i = 0; i < bytes.length; i++) peak = Math.max(peak, Math.abs(bytes[i] - 128));
  return Math.min(1, peak / 128);
}
