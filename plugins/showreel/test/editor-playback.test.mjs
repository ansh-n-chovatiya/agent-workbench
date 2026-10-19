import test from 'node:test';
import assert from 'node:assert/strict';
import { playbackSync, previewBelowRate } from '../editor/playback.mjs';
import { sourceSize, sourceCrop } from '../scripts/lib/compose/draw.js';

test('native sync combines rates, clamps the product, and seeks only beyond drift tolerance', () => {
  assert.deepEqual(playbackSync(10, 10.1, 2, 2), { action: 'none', playbackRate: 4 });
  assert.deepEqual(playbackSync(10, 9.8, 8, 2), { action: 'seek', playbackRate: 8 });
  assert.deepEqual(playbackSync(1, 20, 0.25, 0.5), { action: 'seek', playbackRate: 0.25 });
  assert.deepEqual(playbackSync(0, 0.12, 1, 1), { action: 'none', playbackRate: 1 });
  assert.equal(playbackSync(0, 0.121, 1, 1).action, 'seek');
  assert.equal(playbackSync(25, 5, 1, 1).action, 'seek'); // trim jump
  assert.equal(playbackSync(0, 25, 1, 1).action, 'seek'); // loop restart
  assert.deepEqual(playbackSync(5, 5, 4, 2), { action: 'none', playbackRate: 8 }); // speed boundary
});

test('source dimensions use intrinsic video/image sizes, including unloaded video', () => {
  assert.deepEqual(sourceSize({ width: 0, height: 0, videoWidth: 3206, videoHeight: 1804 }), { width: 3206, height: 1804 });
  assert.deepEqual(sourceSize({ width: 3206, height: 1804, videoWidth: 0, videoHeight: 0 }), { width: 0, height: 0 });
  assert.deepEqual(sourceSize({ width: 100, height: 50 }), { width: 100, height: 50 });
  assert.deepEqual(sourceSize({ naturalWidth: 80, naturalHeight: 40, width: 10, height: 5 }), { width: 80, height: 40 });
});

test('downscaled preview crop preserves real capture coordinates and export crop pixels', () => {
  const plan = { sourceSize: { width: 3206, height: 1804 }, scale: 2 };
  const before = structuredClone(plan), camera = { cx: 900, cy: 500, z: 2 };
  const full = sourceCrop(plan, camera, plan.sourceSize);
  assert.deepEqual(full, { x: 998.5, y: 549, width: 1603, height: 902 });
  assert.deepEqual(sourceCrop(plan, camera, { videoWidth: 3206, videoHeight: 1804 }), full);
  const small = { width: 1600, height: 900 }, preview = sourceCrop(plan, camera, small);
  assert.equal(preview.x / small.width, full.x / plan.sourceSize.width);
  assert.equal(preview.y / small.height, full.y / plan.sourceSize.height);
  assert.equal(preview.width, 800); assert.equal(preview.height, 450);
  assert.deepEqual(plan, before);
});

test('warning uses a two second window, available VFR frames, and 70 percent threshold', () => {
  const window = (expected, presented) => [{ now: 0 }, { now: 2000, expected, presented }];
  assert.equal(previewBelowRate(window(60, 40), 30), true);
  assert.equal(previewBelowRate(window(60, 42), 30), false);
  assert.equal(previewBelowRate(window(6, 6), 30), false); // sparse VFR
  assert.equal(previewBelowRate(window(0, 0), 30), false); // held source frame
  assert.equal(previewBelowRate(window(60, 0), 0), false); // unavailable track statistics
  assert.equal(previewBelowRate([{ now: 0 }, { now: 500, expected: 30, presented: 1 }], 30), false);
  assert.equal(previewBelowRate(window(120, 50), 60), false); // above 24 fps
});

import { audioClock, outputLatencySec, audioMutedAtRate, audioSignature } from '../editor/playback.mjs';
test('audio clock follows the context time minus latency, holds before sound arrives and clamps or wraps at the end', () => {
  const base = { startContextTime: 10, offsetSec: 2, latencySec: 0.04, duration: 20 };
  assert.equal(audioClock({ ...base, contextTime: 10 }), 2);
  assert.equal(audioClock({ ...base, contextTime: 10.03 }), 2); // sound has not reached the speakers yet
  assert.ok(Math.abs(audioClock({ ...base, contextTime: 11.04 }) - 3) < 1e-9);
  assert.equal(audioClock({ ...base, contextTime: 100 }), 20);
  assert.ok(Math.abs(audioClock({ ...base, loop: true, contextTime: 10 + 19 + 0.04 }) - 1) < 1e-9);
  assert.equal(audioClock({ startContextTime: 0, offsetSec: 1, contextTime: 3 }), 4);
  assert.equal(audioClock({ ...base, offsetSec: -5, contextTime: 10 }), 0);
});
test('output latency adds the base and device latency and ignores unusable values', () => {
  assert.equal(outputLatencySec({ baseLatency: 0.01, outputLatency: 0.03 }), 0.04);
  assert.equal(outputLatencySec({ baseLatency: 0.01 }), 0.01);
  assert.equal(outputLatencySec({ baseLatency: NaN, outputLatency: -1 }), 0);
  assert.equal(outputLatencySec({ baseLatency: 5, outputLatency: 5 }), 1);
  assert.equal(outputLatencySec(null), 0);
});
test('audio is muted at any playback rate other than one and the signature ignores unrelated changes', () => {
  assert.equal(audioMutedAtRate(1), false); assert.equal(audioMutedAtRate(0.5), true); assert.equal(audioMutedAtRate(2), true);
  const audio = { enabled: true, durationSec: 5, sampleRate: 48000, narration: [{ clipUrl: '/media/voice/a.wav', outStart: 1, durationSec: 2, gainDb: 0, stepId: 's1', source: 'tts' }],
    music: null, duck: { enabled: true }, loudness: { enabled: true }, warnings: [], captionSpans: [] };
  const sig = audioSignature(audio);
  assert.equal(audioSignature({ ...audio, warnings: [{ stepId: 's1' }], captionSpans: [1] }), sig);
  assert.notEqual(audioSignature({ ...audio, narration: [{ ...audio.narration[0], outStart: 1.5 }] }), sig);
  assert.notEqual(audioSignature({ ...audio, loudness: { enabled: false } }), sig);
  assert.equal(audioSignature({ enabled: false }), ''); assert.equal(audioSignature(undefined), '');
});
