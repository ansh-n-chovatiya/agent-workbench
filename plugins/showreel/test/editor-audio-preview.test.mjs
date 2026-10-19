import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioPreview } from '../editor/audio-preview.js';
import { createVoiceController } from '../editor/voice-controller.js';

class FakeBuffer { constructor({ length, numberOfChannels, sampleRate }) { this.length = length; this.sampleRate = sampleRate; this.duration = length / sampleRate; this.data = Array.from({ length: numberOfChannels }, () => new Float32Array(length)); }
  copyToChannel(data, channel) { this.data[channel].set(data); } }
globalThis.AudioBuffer = FakeBuffer;
function fakeContext() {
  const log = { starts: [], stops: 0 };
  class Context {
    constructor() { this.state = 'suspended'; this.currentTime = 10; this.baseLatency = 0.01; this.outputLatency = 0.03; this.destination = {}; this.gainNode = { gain: { value: 1 }, connect() {} }; Context.last = this; }
    async resume() { this.state = 'running'; } createGain() { return this.gainNode; } async close() {}
    createBufferSource() { return { connect() {}, disconnect() {}, start: (when, offset) => log.starts.push({ when, offset }), stop: () => { log.stops++; } }; }
  }
  return { Context, log };
}
const audio = (over = {}) => ({ enabled: true, durationSec: 4, sampleRate: 48000, narration: [{ clipUrl: '/media/voice/a.wav', outStart: 1, durationSec: 1, gainDb: 0 }], music: null, duck: { enabled: false }, loudness: { enabled: false }, ...over });
const tone = seconds => [Float32Array.from({ length: Math.round(seconds * 48000) }, (_, i) => 0.3 * Math.sin(i / 15))];

test('the preview mixes the whole timeline once per audio plan and caches decoded clips by URL', async () => {
  const { Context } = fakeContext(), loads = [];
  const engine = createAudioPreview({ load: async url => { loads.push(url); return tone(1); }, ContextClass: Context });
  assert.equal(await engine.prepare({ enabled: false }), 'none');
  assert.equal(engine.has(audio()), false);
  assert.equal(await engine.prepare(audio()), 'ready'); assert.equal(engine.has(audio()), true);
  assert.equal(await engine.prepare(audio()), 'ready'); assert.deepEqual(loads, ['/media/voice/a.wav']);
  // A changed placement re-mixes but does not decode the same clip again.
  const moved = audio({ narration: [{ clipUrl: '/media/voice/a.wav', outStart: 2, durationSec: 1, gainDb: 0 }] });
  assert.equal(engine.has(moved), false); assert.equal(await engine.prepare(moved), 'ready'); assert.deepEqual(loads, ['/media/voice/a.wav']);
  assert.equal(engine.has(moved), true); assert.equal(engine.has(audio()), false);
  const music = audio({ music: { url: '/media/music/music/m.mp3', gainDb: -18, loop: true, fadeInSec: 0, fadeOutSec: 0, startSec: 0, endSec: 4 } });
  assert.equal(await engine.prepare(music), 'ready'); assert.deepEqual(loads, ['/media/voice/a.wav', '/media/music/music/m.mp3']);
  engine.dispose();
});
test('a failed decode is reported and retried next time; an outdated mix never replaces a newer one', async () => {
  const { Context } = fakeContext();
  let fail = true;
  const engine = createAudioPreview({ load: async () => { if (fail) throw new Error('Cannot load audio /x (404)'); return tone(1); }, ContextClass: Context });
  await assert.rejects(engine.prepare(audio()), /404/);
  fail = false; assert.equal(await engine.prepare(audio()), 'ready');
  const gates = []; const slow = createAudioPreview({ load: url => new Promise(resolve => gates.push(() => resolve(tone(1)))), ContextClass: Context });
  const first = slow.prepare(audio()), second = slow.prepare(audio({ narration: [{ clipUrl: '/media/voice/b.wav', outStart: 0, durationSec: 1, gainDb: 0 }] }));
  gates.forEach(open => open());
  assert.equal(await first, 'stale'); assert.equal(await second, 'ready');
  assert.equal(slow.has(audio()), false);
});
test('playback starts at the requested offset and the clock subtracts the output latency', async () => {
  const { Context, log } = fakeContext();
  const engine = createAudioPreview({ load: async () => tone(1), ContextClass: Context });
  assert.equal(await engine.start(() => 0), false, 'nothing to play before the mix exists');
  await engine.prepare(audio());
  assert.equal(engine.position(), null);
  let offset = 1.25;
  assert.equal(await engine.start(() => offset, { loop: false }), true);
  assert.deepEqual(log.starts, [{ when: 10, offset: 1.25 }]);
  const context = Context.last;
  context.currentTime = 10.02; assert.equal(engine.position(), 1.25); // sound has not reached the speakers yet
  context.currentTime = 11.04; assert.ok(Math.abs(engine.position() - 2.25) < 1e-9);
  engine.stop(); assert.equal(engine.position(), null); assert.equal(log.stops, 1);
  offset = 99; assert.equal(await engine.start(() => offset, { loop: true }), true);
  assert.ok(log.starts.at(-1).offset < 4);
  context.currentTime = 11.04 + 5.04; assert.ok(Math.abs(engine.position() - ((log.starts.at(-1).offset + 5) % 4)) < 1e-9, 'a looping mix wraps');
  engine.setMuted(true); assert.equal(context.gainNode.gain.value, 0); engine.setMuted(false); engine.setVolume(0.5); assert.equal(context.gainNode.gain.value, 0.5);
  engine.dispose();
});
test('without Web Audio the engine reports it cannot play instead of throwing', async () => {
  const engine = createAudioPreview({ load: async () => tone(1), ContextClass: null });
  await engine.prepare(audio()); assert.equal(await engine.start(() => 0), false); engine.unlock();
});

test('the voice controller follows a generation job over SSE, refreshes clips as steps finish and reports the result', async () => {
  const sent = [], projectPatches = [];
  const store = { save: async () => {}, setProject: patch => projectPatches.push(patch) };
  const api = async (url, options) => {
    sent.push([options?.method ?? 'GET', url]);
    if (url === '/api/voice/status') return { voice: { installed: true, status: [] }, clips: { version: 1, clips: {}, steps: {} } };
    if (url === '/api/voice/samples') return { samples: ['af_heart'] };
    return { ok: true };
  };
  const encoder = new TextEncoder(); let push;
  const body = new ReadableStream({ start(controller) { push = (event, data) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); push('complete', { done: 1 }); } });
  const controller = createVoiceController({ store, api, fetchImpl: async () => ({ ok: true, body }) });
  controller.start();
  await new Promise(r => setTimeout(r, 20));
  assert.deepEqual([...controller.getState().samples], ['af_heart']);
  assert.equal(controller.getState().job.result, null, 'an old result replayed on connect is ignored');
  assert.equal(await controller.generate({ stepIds: ['s1', 's2'] }), true);
  assert.deepEqual(sent.find(([method]) => method === 'POST'), ['POST', '/api/voice/generate']);
  assert.equal(controller.getState().job.running, true);
  push('started', { total: 2 }); push('step', { stepId: 's1', state: 'started', index: 0, total: 2 }); await new Promise(r => setTimeout(r, 10));
  assert.equal(controller.getState().job.current, 's1');
  push('step', { stepId: 's1', state: 'done', index: 0, total: 2 }); push('step', { stepId: 's2', state: 'error', message: 'No audio', index: 1, total: 2 });
  push('complete', { done: 1, failed: 1, cached: 0, total: 2, clips: { big: true } }); await new Promise(r => setTimeout(r, 20));
  const job = controller.getState().job;
  assert.equal(job.running, false); assert.equal(job.done, 1); assert.equal(job.failed, 1); assert.equal(job.errors.s2, 'No audio');
  assert.deepEqual(job.result, { kind: 'complete', done: 1, failed: 1, cached: 0, total: 2, clips: undefined });
  assert.ok(projectPatches.length >= 2 && projectPatches.every(p => p.voice && p.clips), 'clips are refreshed into the project');
  controller.dispose();
});
test('the voice controller surfaces API errors and never starts a job when saving fails', async () => {
  const store = { save: async () => { throw new Error('Cannot save'); }, setProject() {} };
  const controller = createVoiceController({ store, api: async () => { throw new Error('nope'); }, fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal(await controller.generate({}), false); assert.equal(controller.getState().error, 'Cannot save');
  await controller.refresh(); assert.equal(controller.getState().error, 'nope');
  controller.clearError(); assert.equal(controller.getState().error, '');
  controller.dispose();
});
