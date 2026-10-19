import test from 'node:test';
import assert from 'node:assert/strict';
import { integratedLufs, measureLoudness, gainToTarget, applyGainDb, truePeakLimiter, truePeakLinear, resample48k } from '../scripts/lib/audio/loudness.mjs';
import { SR, sine, speechLike, rms, dbOf } from './audio-helpers.mjs';

test('EBU reference: a 1 kHz stereo sine at -23 dBFS reads -23.0 LUFS', () => {
  const ch = sine(1000, -23, 20), m = measureLoudness([ch, ch]);
  assert.ok(Math.abs(m.integratedLufs + 23) < 0.05, String(m.integratedLufs));
  assert.ok(Math.abs(m.samplePeakDb + 23) < 0.01);
  assert.ok(Math.abs(m.truePeakDb + 23) < 0.1);
});
test('level offsets, a silent channel and mono behave', () => {
  const a = sine(1000, -23, 10), b = sine(1000, -17, 10), z = new Float32Array(a.length);
  assert.ok(Math.abs(integratedLufs([b, b]) - integratedLufs([a, a]) - 6) < 0.05);
  assert.ok(Math.abs(integratedLufs([a, a]) - integratedLufs([a, z]) - 3.01) < 0.05);
  assert.ok(Math.abs(integratedLufs([a]) - integratedLufs([a, z])) < 0.001);
  assert.equal(integratedLufs([z, z]), -Infinity);
  assert.equal(integratedLufs([new Float32Array(100)]), -Infinity);
  assert.throws(() => integratedLufs([]), /channels/);
});
test('relative gating ignores material more than 10 LU below the programme', () => {
  const loud = sine(1000, -20, 10), quiet = sine(1000, -45, 10);
  const both = Float32Array.from([...loud, ...quiet]);
  assert.ok(Math.abs(integratedLufs([both, both]) - integratedLufs([loud, loud])) < 0.2);
  const mid = sine(1000, -26, 10), close = Float32Array.from([...loud, ...mid]);
  const gated = integratedLufs([close, close]);
  assert.ok(gated < integratedLufs([loud, loud]) - 0.5 && gated > integratedLufs([mid, mid]));
});
test('gain helpers', () => {
  assert.equal(gainToTarget(-23, -16), 7);
  assert.equal(gainToTarget({ integratedLufs: -20 }, -16), 4);
  assert.equal(gainToTarget(-Infinity, -16), 0);
  const [out] = applyGainDb([Float32Array.of(0.5, -0.25)], 6.0206);
  assert.ok(Math.abs(out[0] - 1) < 1e-4 && Math.abs(out[1] + 0.5) < 1e-4);
});
test('true peak sees inter-sample peaks that the sample peak misses', () => {
  const x = new Float32Array(2000); for (let i = 0; i < x.length; i++) x[i] = Math.sin(2 * Math.PI * 12000 * i / SR + Math.PI / 4);
  const m = measureLoudness([x]);
  assert.ok(m.samplePeakDb < -2.9 && m.truePeakDb > -0.3, JSON.stringify(m));
});
test('limiter keeps the oversampled peak under the ceiling on a loud speech-like signal', () => {
  const x = speechLike(20, 7, 1.0), boosted = applyGainDb([x, x], 9);
  assert.ok(dbOf(truePeakLinear(boosted)) > 5);
  for (const ceilingDb of [-1, -3]) {
    const { channels, reductionDb } = truePeakLimiter(boosted, { ceilingDb });
    const tp = dbOf(truePeakLinear(channels));
    assert.ok(tp <= ceilingDb + 0.1, `${tp} > ${ceilingDb}`);
    assert.ok(reductionDb > 5);
    assert.ok(channels.every((c) => c.every(Number.isFinite)));
    for (const c of channels) for (const v of c) assert.ok(Math.abs(v) <= 1);
  }
});
test('limiter is deterministic, linked across channels and smooth', () => {
  const l = speechLike(5, 3, 2.5), r = speechLike(5, 4, 0.3);
  const one = truePeakLimiter([l, r]), two = truePeakLimiter([l, r]);
  assert.deepEqual(one.channels, two.channels);
  // Linked gain: the quiet channel is reduced by the same ratio wherever it is non-zero.
  const ratio = (i) => one.channels[1][i] / r[i];
  const i = r.findIndex((v, k) => Math.abs(v) > 0.2 && ratio(k) < 0.99);
  assert.ok(i >= 0 && ratio(i) === one.channels[0][i] / l[i] || Math.abs(ratio(i) - one.channels[0][i] / l[i]) < 1e-4);
  // Gain between neighbouring loud samples never jumps.
  let worst = 0; for (let k = 1; k < l.length; k++) if (Math.abs(l[k]) > 0.05 && Math.abs(l[k - 1]) > 0.05) worst = Math.max(worst, Math.abs(one.channels[0][k] / l[k] - one.channels[0][k - 1] / l[k - 1]));
  assert.ok(worst < 0.05, String(worst));
});
test('quiet audio is returned unchanged', () => {
  const x = sine(440, -20, 2), { channels, reductionDb } = truePeakLimiter([x, x]);
  assert.equal(reductionDb, 0); assert.deepEqual(channels[0], x); assert.notEqual(channels[0], x);
  assert.deepEqual(truePeakLimiter([new Float32Array(0)]).channels[0], new Float32Array(0));
  assert.deepEqual(truePeakLimiter([new Float32Array(100)]).channels[0], new Float32Array(100));
});
test('resample48k converts 24, 44.1 and 96 kHz without changing a tone', () => {
  for (const rate of [24000, 44100, 96000, 22050]) {
    const x = sine(1000, -12, 1, rate), [y] = resample48k([x], rate);
    assert.equal(y.length, SR);
    const ref = sine(1000, -12, 1);
    let worst = 0; for (let i = 2000; i < y.length - 2000; i++) worst = Math.max(worst, Math.abs(y[i] - ref[i]));
    assert.ok(worst < 0.01, `${rate}: ${worst}`);
  }
  const same = Float32Array.of(1, 2, 3), [copy] = resample48k([same], 48000);
  assert.deepEqual(copy, same); assert.notEqual(copy, same);
  // Content above the target Nyquist is removed rather than aliased.
  const [high] = resample48k([sine(30000, -6, 1, 96000)], 96000);
  assert.ok(rms(high, 3000, 40000) < 0.01);
  assert.throws(() => resample48k([same], 0), /rate/);
});
