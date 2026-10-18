import test from 'node:test';
import assert from 'node:assert/strict';
import { integratedLufs, gainToTarget } from './lufs.mjs';

const sine = (hz, dbfs, seconds, sr = 48000) => {
  const a = 10 ** (dbfs / 20), out = new Float32Array(seconds * sr);
  for (let i = 0; i < out.length; i++) out[i] = a * Math.sin((2 * Math.PI * hz * i) / sr);
  return out;
};

test('stereo 1 kHz sine at -23 dBFS reads about -23 LUFS (EBU Tech 3341 reference)', () => {
  const ch = sine(1000, -23, 20);
  assert.ok(Math.abs(integratedLufs([ch, ch], 48000) - -23) < 0.15);
});
test('a quieter signal reads lower', () => {
  const a = sine(1000, -23, 20), b = sine(1000, -33, 20);
  assert.ok(integratedLufs([a, a], 48000) - integratedLufs([b, b], 48000) > 9.5);
});
test('silence is below the absolute gate', () => {
  const z = new Float32Array(48000 * 5);
  assert.equal(integratedLufs([z, z], 48000), -Infinity);
});
test('gainToTarget scales to -16 LUFS', () => {
  assert.ok(Math.abs(20 * Math.log10(gainToTarget(-23, -16)) - 7) < 1e-9);
});

test('a 6 dB louder signal reads about 6 LU louder', () => {
  const a = sine(1000, -23, 20), b = sine(1000, -17, 20);
  const difference = integratedLufs([b, b], 48000) - integratedLufs([a, a], 48000);
  assert.ok(Math.abs(difference - 6) < 0.1);
});
test('one silent stereo channel reads about 3.01 LU lower than both active', () => {
  const ch = sine(1000, -23, 20), z = new Float32Array(ch.length);
  const difference = integratedLufs([ch, ch], 48000) - integratedLufs([ch, z], 48000);
  assert.ok(Math.abs(difference - 3.01) < 0.15);
});
