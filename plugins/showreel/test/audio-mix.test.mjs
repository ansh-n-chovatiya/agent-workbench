import test from 'node:test';
import assert from 'node:assert/strict';
import { mixAudio } from '../scripts/lib/audio/mix.mjs';
import { measureLoudness } from '../scripts/lib/audio/loudness.mjs';
import { SR, sine, speechLike, noise, rms, dbOf } from './audio-helpers.mjs';

const loud = { enabled: true, targetLufs: -16, truePeakDb: -1 };
const mix = (extra) => mixAudio({ durationSec: 10, loudness: { enabled: false }, duck: { enabled: false }, ...extra });

test('clips are placed sample-accurately, clipped to the length and mono is centred', () => {
  const clip = Float32Array.of(1, 0.5, -0.5, -1).map((v) => v * 0.25);
  const { channels } = mix({ clips: [{ channels: [clip], start: 1.5, gainDb: 0 }, { channels: [clip], start: 9.99998, gainDb: -6.0206 }, { channels: [clip], start: -0.00005, gainDb: 0 }] });
  const at = 1.5 * SR;
  assert.deepEqual([...channels[0].slice(at - 1, at + 5)], [0, 0.25, 0.125, -0.125, -0.25, 0]);
  assert.deepEqual(channels[0], channels[1]);
  assert.equal(channels[0].length, 10 * SR);
  assert.ok(Math.abs(channels[0][10 * SR - 1] - 0.125) < 1e-4);
  const stereoMix = mix({ clips: [{ channels: [clip, clip.map((v) => -v)], start: 0 }] });
  assert.equal(stereoMix.channels[0][0], 0.25); assert.equal(stereoMix.channels[1][0], -0.25);
});
test('music loops without a seam jump, cuts at endSec and fades in and out', () => {
  const tone = sine(440, -12, 1.7);
  const { channels } = mix({ music: { channels: [tone], gainDb: 0, loop: true, fadeInSec: 1, fadeOutSec: 2, startSec: 1, endSec: 9 } });
  const m = channels[0];
  assert.equal(m[0.5 * SR], 0); assert.equal(m[Math.round(9.1 * SR)], 0);
  assert.ok(Math.abs(m[Math.round(1 * SR) + 10]) < 1e-3);
  const early = rms(m, SR, 1.1 * SR), settled = rms(m, 4 * SR, 4.1 * SR), late = rms(m, Math.round(8.8 * SR), Math.round(8.9 * SR));
  assert.ok(early < settled * 0.1 && late < settled * 0.2, `${early} ${settled} ${late}`);
  assert.ok(Math.abs(dbOf(settled) - dbOf(rms(tone))) < 0.3);
  // The loop point (1.7 s after start) has no click larger than the tone's own slope.
  const seam = Math.round(2.7 * SR); let worst = 0;
  for (let i = seam - 50; i < seam + 50; i++) worst = Math.max(worst, Math.abs(m[i + 1] - m[i]));
  assert.ok(worst < 0.12, String(worst));
  const once = mix({ music: { channels: [tone], gainDb: 0, loop: false, fadeInSec: 0, fadeOutSec: 0 } }).channels[0];
  assert.ok(rms(once, 0, SR) > 0.1 && once[Math.round(1.8 * SR)] === 0 && once[Math.round(5 * SR)] === 0);
});
test('music ducks by the configured depth under narration and recovers after it', () => {
  const voice = sine(300, -20, 2), music = sine(1000, -20, 10);
  const { channels } = mix({ clips: [{ channels: [voice], start: 4 }], music: { channels: [music], gainDb: 0, loop: true, fadeInSec: 0, fadeOutSec: 0 }, duck: { enabled: true, depthDb: 12, attackMs: 150, releaseMs: 400 } });
  // Measure the music alone by subtracting the voice.
  const alone = (from, to) => { const x = new Float32Array(to - from); for (let i = from; i < to; i++) x[i - from] = channels[0][i] - (i >= 4 * SR && i < 6 * SR ? voice[i - 4 * SR] : 0); return rms(x); };
  const outside = alone(1 * SR, 2 * SR), under = alone(4.5 * SR, 5.5 * SR), after = alone(8 * SR, 9 * SR);
  assert.ok(Math.abs(dbOf(outside / under) - 12) < 0.1, String(dbOf(outside / under)));
  assert.ok(Math.abs(dbOf(after / outside)) < 0.1);
});
test('final loudness lands on the target for speech, tone and noise-bed signals', () => {
  const cases = {
    speech: { clips: [{ channels: [speechLike(8, 11, 0.2)], start: 0.5 }] },
    tone: { clips: [{ channels: [sine(500, -40, 6)], start: 1 }] },
    voiceAndMusic: { clips: [{ channels: [speechLike(6, 5, 0.5)], start: 2 }], music: { channels: [noise(4, -30)], gainDb: -6, loop: true, fadeInSec: 1, fadeOutSec: 1 }, duck: { enabled: true, depthDb: 12, attackMs: 150, releaseMs: 400 } },
    musicOnly: { music: { channels: [noise(3, -45), noise(3, -45, 9)], gainDb: 0, loop: true, fadeInSec: 0, fadeOutSec: 0 } },
  };
  for (const [name, input] of Object.entries(cases)) {
    for (const target of [-16, -23]) {
      const result = mixAudio({ durationSec: 10, loudness: { ...loud, targetLufs: target }, duck: { enabled: false }, ...input });
      const m = measureLoudness(result.channels);
      assert.ok(Math.abs(m.integratedLufs - target) <= 0.2, `${name}@${target}: ${m.integratedLufs}`);
      assert.ok(m.truePeakDb <= -0.9, `${name}: ${m.truePeakDb}`);
      assert.ok(Math.abs(result.measured.integratedLufs - m.integratedLufs) < 1e-9);
      assert.ok(Math.abs(result.measured.truePeakDb - m.truePeakDb) < 1e-9);
      assert.ok(Number.isFinite(result.appliedGainDb) && Number.isFinite(result.measured.preGainLufs));
    }
  }
});
test('the peak ceiling holds when loudness levelling is off and for a high ceiling request', () => {
  const hot = sine(1000, 3, 2).map((v) => Math.max(-4, Math.min(4, v)));
  const result = mixAudio({ durationSec: 2, clips: [{ channels: [hot], start: 0 }], loudness: { enabled: false, truePeakDb: -2 } });
  assert.ok(result.measured.truePeakDb <= -1.9, String(result.measured.truePeakDb));
  assert.ok(result.limiterReductionDb > 4);
  const low = mixAudio({ durationSec: 2, clips: [{ channels: [sine(1000, -30, 2)], start: 0 }], loudness: { enabled: false } });
  assert.equal(low.appliedGainDb, 0); assert.equal(low.limiterReductionDb, 0);
});
test('silence stays silent, results are deterministic and bad input is rejected', () => {
  const silent = mixAudio({ durationSec: 1, loudness: loud });
  assert.ok(silent.channels.every((c) => c.every((v) => v === 0)));
  assert.equal(silent.measured.integratedLufs, -Infinity);
  const input = { durationSec: 4, clips: [{ channels: [speechLike(2, 1, 0.4)], start: 1 }], loudness: loud };
  assert.deepEqual(mixAudio(input).channels, mixAudio(input).channels);
  assert.throws(() => mixAudio({ durationSec: 0 }), /durationSec/);
  assert.throws(() => mixAudio({ durationSec: 1, sampleRate: 44100 }), /48 kHz/);
  assert.throws(() => mixAudio({ durationSec: 1, clips: [{ channels: [[0, 1]], start: 0 }] }), /Float32Array/);
});
