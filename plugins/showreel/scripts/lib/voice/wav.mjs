// Minimal WAV reader/writer. Writes 16-bit PCM; reads 16/24/32-bit int PCM and 32-bit float, mono or multichannel.
export const MAX_WAV_BYTES = 512 * 1024 * 1024;

export function encodeWav(channels, sampleRate) {
  const list = channels instanceof Float32Array ? [channels] : channels;
  if (!list.length || !list.every((c) => c instanceof Float32Array && c.length === list[0].length)) throw new Error('encodeWav needs equal-length Float32Array channels');
  if (!Number.isInteger(sampleRate) || sampleRate < 1000 || sampleRate > 384000) throw new Error('sampleRate must be an integer from 1000 to 384000');
  const n = list[0].length, ch = list.length, dataBytes = n * ch * 2;
  if (dataBytes + 44 > 0xffffffff) throw new Error('audio is too long for a WAV file');
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0, 'ascii'); buf.writeUInt32LE(36 + dataBytes, 4); buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii'); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * ch * 2, 28); buf.writeUInt16LE(ch * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii'); buf.writeUInt32LE(dataBytes, 40);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
    const x = list[c][i];
    const v = Number.isFinite(x) ? Math.max(-32768, Math.min(32767, Math.round(x * 32768))) : 0;
    buf.writeInt16LE(v, o); o += 2;
  }
  return buf;
}

// Returns { sampleRate, channels, bitsPerSample, format: 'int'|'float', frames, durationSec, data: Float32Array[] }.
export function parseWav(buf, { maxBytes = MAX_WAV_BYTES, headerOnly = false } = {}) {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
  if (buf.length > maxBytes) throw new Error(`WAV is too large (${buf.length} bytes; limit ${maxBytes})`);
  if (buf.length < 12) throw new Error('Not a WAV file: truncated header');
  const tag = (o) => buf.toString('ascii', o, o + 4);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Not a WAV file (missing RIFF/WAVE header)');
  let fmt = null, dataAt = -1, dataLen = 0, o = 12;
  while (o + 8 <= buf.length) {
    const id = tag(o), size = buf.readUInt32LE(o + 4), body = o + 8;
    if (id === 'fmt ') {
      if (size < 16 || body + 16 > buf.length) throw new Error('Truncated WAV: incomplete fmt chunk');
      let tagValue = buf.readUInt16LE(body);
      if (tagValue === 0xfffe) {
        if (size < 40 || body + 26 > buf.length) throw new Error('Truncated WAV: incomplete extensible fmt chunk');
        tagValue = buf.readUInt16LE(body + 24);
      }
      fmt = { tag: tagValue, channels: buf.readUInt16LE(body + 2), sampleRate: buf.readUInt32LE(body + 4), align: buf.readUInt16LE(body + 12), bits: buf.readUInt16LE(body + 14) };
    } else if (id === 'data') {
      if (body + size > buf.length) throw new Error(`Truncated WAV: data chunk declares ${size} bytes but only ${buf.length - body} are present`);
      dataAt = body; dataLen = size; break;
    }
    o = body + size + (size % 2);
  }
  if (!fmt) throw new Error('Not a usable WAV: no fmt chunk');
  if (dataAt < 0) throw new Error('Not a usable WAV: no data chunk');
  const isFloat = fmt.tag === 3;
  if (fmt.tag !== 1 && !isFloat) throw new Error(`Unsupported WAV encoding (format tag ${fmt.tag}); only PCM and float WAV are supported. The editor converts other formats.`);
  if (!(isFloat ? fmt.bits === 32 : [16, 24, 32].includes(fmt.bits))) throw new Error(`Unsupported WAV bit depth ${fmt.bits}${isFloat ? ' (float)' : ''}; use 16/24/32-bit PCM or 32-bit float`);
  if (fmt.channels < 1 || fmt.channels > 8) throw new Error(`Unsupported channel count ${fmt.channels}`);
  if (fmt.sampleRate < 1000 || fmt.sampleRate > 384000) throw new Error(`Unsupported sample rate ${fmt.sampleRate}`);
  const bytes = fmt.bits / 8, frameBytes = bytes * fmt.channels;
  if (fmt.align !== frameBytes) throw new Error('Corrupt WAV: block align does not match the format');
  const frames = Math.floor(dataLen / frameBytes);
  const result = { sampleRate: fmt.sampleRate, channels: fmt.channels, bitsPerSample: fmt.bits, format: isFloat ? 'float' : 'int', frames, durationSec: frames / fmt.sampleRate, data: null };
  if (headerOnly) return result;
  const data = Array.from({ length: fmt.channels }, () => new Float32Array(frames));
  let p = dataAt;
  for (let i = 0; i < frames; i++) for (let c = 0; c < fmt.channels; c++) {
    let v;
    if (isFloat) v = buf.readFloatLE(p);
    else if (fmt.bits === 16) v = buf.readInt16LE(p) / 32768;
    else if (fmt.bits === 24) v = buf.readIntLE(p, 3) / 8388608;
    else v = buf.readInt32LE(p) / 2147483648;
    data[c][i] = Number.isFinite(v) ? v : 0;
    p += bytes;
  }
  result.data = data;
  return result;
}

export const silence = (seconds, sampleRate) => new Float32Array(Math.round(seconds * sampleRate));
export function concatChannels(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0), out = new Float32Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
