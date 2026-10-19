import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav16, levelFromBytes, MAX_UPLOAD_BYTES } from '../editor/audio-wav.js';
import { parseWav } from '../scripts/lib/voice/wav.mjs';
import { convertImport } from '../scripts/lib/voice/import.mjs';

test('the encoder writes a canonical 16-bit PCM WAV that the server parses back', () => {
  const samples = Float32Array.from({ length: 4800 }, (_, i) => 0.5 * Math.sin(i / 10));
  const bytes = encodeWav16([samples], 48000);
  assert.equal(bytes.length, 44 + 4800 * 2);
  assert.equal(String.fromCharCode(...bytes.subarray(0, 4)), 'RIFF'); assert.equal(String.fromCharCode(...bytes.subarray(8, 12)), 'WAVE');
  const parsed = parseWav(Buffer.from(bytes));
  assert.equal(parsed.sampleRate, 48000); assert.equal(parsed.channels, 1); assert.equal(parsed.bitsPerSample, 16); assert.equal(parsed.frames, 4800);
  for (let i = 0; i < 4800; i += 97) assert.ok(Math.abs(parsed.data[0][i] - samples[i]) < 1 / 16384, String(i));
  const imported = convertImport(Buffer.from(bytes), { maxBytes: MAX_UPLOAD_BYTES });
  assert.ok(Math.abs(imported.durationSec - 0.1) < 1e-9); assert.equal(imported.channels, 1);
});
test('the encoder clips, replaces non-finite samples with silence and supports stereo', () => {
  const left = Float32Array.from([2, -2, NaN, 0.5]), right = Float32Array.from([0, 0, Infinity, -0.5]);
  const parsed = parseWav(Buffer.from(encodeWav16([left, right], 44100)));
  assert.equal(parsed.channels, 2); assert.equal(parsed.sampleRate, 44100);
  assert.deepEqual(Array.from(parsed.data[0], v => Math.round(v * 32768)), [32767, -32768, 0, 16384]);
  assert.deepEqual(Array.from(parsed.data[1], v => Math.round(v * 32768)), [0, 0, 0, -16384]);
});
test('the encoder rejects unusable input', () => {
  assert.throws(() => encodeWav16([], 48000), /one or two/);
  assert.throws(() => encodeWav16([new Float32Array(1), new Float32Array(2)], 48000), /equal length/);
  assert.throws(() => encodeWav16([new Float32Array(3), new Float32Array(3), new Float32Array(3)], 48000), /one or two/);
  assert.throws(() => encodeWav16([Float64Array.from([0])], 48000), /Float32Array/);
  assert.throws(() => encodeWav16([new Float32Array(0)], 48000), /no audio/);
  assert.throws(() => encodeWav16([new Float32Array(2)], 12.5), /sample rate/);
});
test('the level meter reads the loudest sample of a time-domain block', () => {
  assert.equal(levelFromBytes(new Uint8Array([128, 128, 128])), 0);
  assert.equal(levelFromBytes(new Uint8Array([128, 255, 0])), 1);
  assert.equal(levelFromBytes(new Uint8Array([128, 192, 100])), 0.5);
  assert.equal(levelFromBytes(new Uint8Array(0)), 0);
});
