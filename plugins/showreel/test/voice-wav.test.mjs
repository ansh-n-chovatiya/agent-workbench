import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav, parseWav, silence } from '../scripts/lib/voice/wav.mjs';
import { convertImport } from '../scripts/lib/voice/import.mjs';

const sine = (n, f = 440, rate = 24000) => Float32Array.from({ length: n }, (_, i) => 0.5 * Math.sin((2 * Math.PI * f * i) / rate));
function rawWav({ tag = 1, channels = 1, rate = 8000, bits = 16, frames = 10, valueFn = (i) => i }) {
  const bytes = bits / 8, dataLen = frames * channels * bytes, b = Buffer.alloc(44 + dataLen);
  b.write('RIFF', 0); b.writeUInt32LE(36 + dataLen, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(tag, 20); b.writeUInt16LE(channels, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * channels * bytes, 28);
  b.writeUInt16LE(channels * bytes, 32); b.writeUInt16LE(bits, 34); b.write('data', 36); b.writeUInt32LE(dataLen, 40);
  let o = 44;
  for (let i = 0; i < frames * channels; i++) {
    const x = Math.max(-1, Math.min(1, valueFn(i) / 20));
    if (tag === 3) b.writeFloatLE(x, o); else if (bits === 8) b.writeUInt8(128, o); else if (bits === 16) b.writeInt16LE(Math.round(x * 32767), o); else if (bits === 24) b.writeIntLE(Math.round(x * 8388607), o, 3); else b.writeInt32LE(Math.round(x * 2147483647), o);
    o += bytes;
  }
  return b;
}

test('wav writer and reader round trip mono and stereo', () => {
  const mono = sine(2400), back = parseWav(encodeWav(mono, 24000));
  assert.equal(back.sampleRate, 24000); assert.equal(back.channels, 1); assert.equal(back.frames, 2400); assert.equal(back.durationSec, 0.1);
  for (let i = 0; i < mono.length; i += 97) assert.ok(Math.abs(back.data[0][i] - mono[i]) < 1 / 16000);
  const st = parseWav(encodeWav([sine(100), sine(100, 220)], 48000));
  assert.equal(st.channels, 2); assert.equal(st.sampleRate, 48000);
});
test('wav writer clamps and zeroes non-finite samples; header is 44 bytes of canonical RIFF', () => {
  const buf = encodeWav(Float32Array.from([2, -2, NaN, Infinity]), 24000);
  assert.equal(buf.length, 44 + 8); assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
  assert.deepEqual([0, 1, 2, 3].map((i) => buf.readInt16LE(44 + i * 2)), [32767, -32768, 0, 0]);
  assert.throws(() => encodeWav(new Float32Array(1), 5), /sampleRate/);
  assert.throws(() => encodeWav([new Float32Array(2), new Float32Array(3)], 24000), /equal-length/);
});
test('reader accepts 16/24/32-bit int and 32-bit float at any rate', () => {
  for (const [tag, bits] of [[1, 16], [1, 24], [1, 32], [3, 32]]) {
    const p = parseWav(rawWav({ tag, bits, rate: 22050, frames: 5, valueFn: (i) => i - 2 }));
    assert.equal(p.sampleRate, 22050); assert.equal(p.frames, 5);
    assert.ok(Math.abs(p.data[0][4] - 0.1) < 1e-3, `${tag}/${bits}`);
  }
});
test('reader rejects bad input: wrong container, truncation, unsupported formats, size', () => {
  assert.throws(() => parseWav(Buffer.from('nope')), /truncated|Not a WAV/);
  assert.throws(() => parseWav(Buffer.alloc(100)), /RIFF/);
  const good = rawWav({ frames: 10 });
  assert.throws(() => parseWav(good.subarray(0, 30)), /fmt|data/);
  assert.throws(() => parseWav(good.subarray(0, 50)), /Truncated/);
  assert.throws(() => parseWav(rawWav({ tag: 85 })), /Unsupported WAV encoding/);
  assert.throws(() => parseWav(rawWav({ bits: 8 })), /bit depth/);
  assert.throws(() => parseWav(rawWav({ channels: 0 })), /channel/);
  assert.throws(() => parseWav(good, { maxBytes: 10 }), /too large/);
});
test('convertImport rejects formats with an editor hint, >2 channels, empty audio; converts others to 16-bit', () => {
  assert.throws(() => convertImport(Buffer.from('ID3\u0003MP3DATA'.repeat(10))), /editor converts/);
  assert.throws(() => convertImport(rawWav({ channels: 3 })), /mono or stereo/);
  assert.throws(() => convertImport(rawWav({ frames: 0 })), /no audio/);
  assert.throws(() => convertImport(rawWav({ frames: 100 }), { maxBytes: 100 }), /too large/);
  const r = convertImport(rawWav({ tag: 3, bits: 32, rate: 44100, channels: 2, frames: 441 }));
  assert.equal(r.sampleRate, 44100); assert.equal(r.channels, 2); assert.equal(r.durationSec, 0.01);
  assert.equal(parseWav(r.wav).bitsPerSample, 16); assert.match(r.key, /^[0-9a-f]{64}$/);
});
test('silence length rounds to samples', () => assert.equal(silence(0.12, 24000).length, 2880));
