import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { FrameQueue, encoderSettings } from '../scripts/lib/record/frame-queue.mjs';
import { localRunId, freshBenchmark, scaledViewport, emptyEvents,
  blockedSummary } from '../scripts/lib/record/timing.mjs';
import { parseRecordOptions } from '../scripts/lib/record/commands.mjs';
import { demoMoves, cursorDemoHtml } from '../scripts/lib/record/cursor-demo.mjs';
import { validateEvents } from '../scripts/lib/record/schemas.mjs';
import { recommendScale, layoutDrift } from '../scripts/lib/capture-benchmark.mjs';
import { writeChunk } from '../scripts/lib/record/chunk-writer.mjs';
import { startScreencast } from '../scripts/lib/record/screencast.mjs';
import { RecordingSession } from '../scripts/lib/record/session.mjs';
import { DEFAULTS } from '../scripts/lib/config.mjs';

test('frame queue bounds JPEG retention, rebases accepted timestamps and drains on finish', async () => {
  const queue = new FrameQueue(2);
  const bytes = Buffer.from('jpeg');
  assert.equal(queue.push(bytes, 100), true);
  assert.equal(queue.push(bytes, 100.5), true);
  assert.equal(queue.push(bytes, 101), true);
  assert.equal(queue.push(bytes, 101.5), false);
  assert.equal(queue.dropped, 1);
  assert.equal(queue.maxBacklog, 3);
  assert.deepEqual(await queue.next(), { data: bytes, ts: 0 });
  assert.equal(queue.push(bytes, 102), true);
  queue.end(103);
  assert.equal(queue.endTs, 3);
  assert.equal((await queue.next()).ts, 0.5);
  assert.equal((await queue.next()).ts, 1);
  assert.equal((await queue.next()).ts, 2);
  assert.equal(await queue.next(), null);
  assert.equal(queue.frames, 4);
  assert.equal(queue.firstTs, 100);
  assert.equal(queue.lastTs, 102);
  assert.throws(() => queue.push(bytes, 104), /finished/);
});

test('long poll wakes for a frame and for end of stream; invalid inputs refuse', async () => {
  const queue = new FrameQueue();
  const pending = queue.next();
  await assert.rejects(queue.next(), /one encoder consumer/);
  queue.push(Buffer.alloc(1), 5);
  assert.equal((await pending).ts, 0);
  for (const ts of [NaN, Infinity, 5, 4]) assert.throws(() => queue.push(Buffer.alloc(1), ts), /timestamps/);
  const end = queue.next();
  queue.end();
  assert.equal(await end, null);
  for (const limit of [0, -1, 1.5, NaN]) assert.throws(() => new FrameQueue(limit));
  assert.throws(() => encoderSettings(0, 100));
  assert.deepEqual(encoderSettings(1920, 1080), { width: 1920, height: 1080, bitrate: 12441600 });
  assert.equal(encoderSettings(3840, 2160).bitrate, 49766400);
  assert.equal(encoderSettings(7680, 4320).bitrate, 60000000);
});

test('MP4 writes honor earlier positions and partial writes without truncating the tail', async () => {
  const disk = Buffer.alloc(12);
  const file = { async write(data, offset, length, position) {
    const bytesWritten = Math.min(2, length);
    data.copy(disk, position, offset, offset + bytesWritten);
    return { bytesWritten };
  } };
  assert.equal(await writeChunk(file, Buffer.from('abcdefgh'), 4), 12);
  assert.equal(await writeChunk(file, Buffer.from('HEAD'), 0), 4);
  assert.equal(await writeChunk(file, Buffer.from('PATCH'), 4), 9);
  assert.equal(disk.toString(), 'HEADPATCHfgh');
  await assert.rejects(writeChunk({ async write() { return { bytesWritten: 0 }; } },
    Buffer.alloc(1), 0), /no progress/);
  await assert.rejects(writeChunk(file, Buffer.alloc(1), -1), /position/);
});

test('run ids are local; benchmarks expire at 30 days and reject future/invalid data', () => {
  assert.equal(localRunId(new Date(2026, 0, 2, 3, 4, 5)), '20260102-030405');
  const now = Date.parse('2026-10-18T00:00:00Z');
  const at = new Date(now - 30 * 86400000).toISOString();
  assert.equal(freshBenchmark({ scale: 1.67, at }, now), 1.67);
  assert.equal(freshBenchmark({ scale: 1.67, at }, now + 1), undefined);
  for (const value of [undefined, {}, { scale: 3, at }, { scale: 1, at: 'bad' },
    { scale: 1, at: new Date(now + 1).toISOString() }]) {
    assert.equal(freshBenchmark(value, now), undefined);
  }
  assert.deepEqual(scaledViewport({ width: 1920, height: 1080 }, 1.33), { width: 2554, height: 1436 });
  assert.equal(validateEvents(emptyEvents({ width: 1920, height: 1080 }, 1)).ok, true);
  assert.equal(blockedSummary([
    { method: 'POST', url: 'https://example.test/x?q=a' },
    { method: 'POST', url: 'https://example.test/x?q=b' },
  ]), 'POST /x x2');
});

test('record CLI parses flags and rejects typos, duplicates and invalid numbers', () => {
  assert.deepEqual(parseRecordOptions('record', ['--name', 'demo', '--headed',
    '--no-rehearsal', '--scale', '1.33', '--fps', '30']), {
    '--name': 'demo', '--headed': true, '--no-rehearsal': true, '--scale': 1.33, '--fps': 30,
  });
  assert.equal(parseRecordOptions('record', ['--name', 'demo', '--scale', 'auto'])['--scale'], 'auto');
  assert.deepEqual(parseRecordOptions('cursor-demo', []), {});
  for (const flags of [[], ['--name'], ['--name', 'demo', '--scale', '1.5'],
    ['--name', 'demo', '--fps', '0'], ['--name', 'a', '--name', 'b'],
    ['--name', 'demo', '--headless'], ['--name', '../escape']]) {
    assert.throws(() => parseRecordOptions('record', flags));
  }
});

test('pipeline fps overrides capture fps without changing the drift guard', () => {
  const base = { scale: 1, fps: 60, pipelineFps: 60, layoutDrift: 0.05 };
  assert.equal(recommendScale([base, { ...base, scale: 2, pipelineFps: 49 }]), 1);
  assert.equal(recommendScale([base, { ...base, scale: 2, fps: 49, pipelineFps: 50 }]), 2);
  assert.equal(recommendScale([base, { ...base, scale: 2, layoutDrift: 0.08 }]), 1);
  assert.equal(layoutDrift([[0, 20, 10, 10]], [[0, 20, 10, 10]]), 0);
  assert.equal(layoutDrift([[0, 20, 10, 10]], [null]), 1);
});

test('cursor comparison has eight continuous seeded paths including overshoot', () => {
  const moves = demoMoves();
  assert.equal(moves.length, 8);
  assert.deepEqual(moves, demoMoves());
  assert.ok(moves.some((move) => move.samples.some((p) => p.x > move.to.x + 5)));
  for (let i = 1; i < moves.length; i++) assert.deepEqual(moves[i].from, moves[i - 1].to);
  assert.match(cursorDemoHtml(), /<h2>planned<\/h2>/);
  assert.match(cursorDemoHtml(), /<h2>linear<\/h2>/);
});

test('screencast acknowledges frames immediately and detaches even when stopping fails', async () => {
  const cdp = new EventEmitter();
  const calls = [];
  cdp.send = async (method, args) => {
    calls.push({ method, args });
    if (method === 'Page.stopScreencast') throw new Error('target closed');
  };
  cdp.detach = async () => { calls.push({ method: 'detach' }); };
  const page = {
    context: () => ({ newCDPSession: async () => cdp }),
    viewportSize: () => ({ width: 320, height: 180 }),
  };
  const frames = [];
  const stop = await startScreencast(page, (jpeg, ts) => frames.push({ jpeg, ts }));
  cdp.emit('Page.screencastFrame', {
    data: Buffer.from('jpeg').toString('base64'), metadata: { timestamp: 10 }, sessionId: 7,
  });
  assert.equal(calls[1].method, 'Page.screencastFrameAck');
  assert.equal(calls[1].args.sessionId, 7);
  assert.equal(frames[0].jpeg.toString(), 'jpeg');
  assert.equal(frames[0].ts, 10);
  await assert.rejects(stop(), /target closed/);
  assert.equal(calls.at(-1).method, 'detach');
  assert.equal(cdp.listenerCount('Page.screencastFrame'), 0);
});

test('session ignores duplicate tab snapshots and closes its context after encoder failure', async () => {
  const session = new RecordingSession({}, DEFAULTS, 1);
  const stamps = [];
  session.encoder = {
    push(data, ts) { stamps.push(ts); return true; },
    async finish() { throw new Error('disk full'); },
  };
  session.receiveFrame(Buffer.alloc(1), 100);
  session.receiveFrame(Buffer.alloc(1), 100);
  session.receiveFrame(Buffer.alloc(1), 99);
  session.receiveFrame(Buffer.alloc(1), 101);
  assert.deepEqual(stamps, [100, 101]);
  assert.equal(session.firstTs, 100);
  let closed = false;
  session.context = { async close() { closed = true; } };
  await session.close();
  assert.equal(closed, true);
});

async function runEncoder(supported, failChunk = false) {
  const source = (await readFile(new URL('../scripts/lib/record/encoder-page.js', import.meta.url), 'utf8'))
    .replace(/^import[\s\S]*?from 'mediabunny';/, '');
  const samples = [], closed = [], positions = [], codecs = [];
  let finalize = false, cancel = false, target;
  const frames = [
    { status: 200, ts: 0 }, { status: 200, ts: 0.1 }, { status: 204, end: 0.5 },
  ];
  const window = { __config: encoderSettings(320, 180) };
  const context = {
    window, Blob, WritableStream,
    canEncodeVideo: async (codec) => { codecs.push(codec); return supported.includes(codec); },
    Output: class {
      constructor(options) { target = options.target; }
      addVideoTrack() {}
      async start() {}
      async finalize() { finalize = true; await target.writable.getWriter().write({
        data: new Uint8Array([1, 2]), position: 12,
      }); }
      async cancel() { cancel = true; }
    },
    Mp4OutputFormat: class {},
    StreamTarget: class { constructor(writable) { this.writable = writable; } },
    VideoSampleSource: class {
      async add(sample) { samples.push(sample.frame.options); }
      close() { closed.push('source'); }
    },
    VideoSample: class {
      constructor(frame) { this.frame = frame; }
      close() { closed.push('sample'); }
    },
    VideoFrame: class {
      constructor(bitmap, options) { this.options = options; }
      close() { closed.push('frame'); }
    },
    createImageBitmap: async () => ({ close() { closed.push('bitmap'); } }),
    fetch: async (url, options) => {
      if (url === 'chunk') {
        positions.push(options.headers['x-pos']);
        return { ok: !failChunk };
      }
      const next = frames.shift();
      return { status: next.status, ok: true, arrayBuffer: async () => new ArrayBuffer(1),
        headers: { get: (key) => String(key === 'x-ts' ? next.ts : next.end) } };
    },
  };
  vm.runInNewContext(source, context);
  for (let i = 0; !window.__done && i < 100; i++) await new Promise(setImmediate);
  assert.equal(window.__done, true);
  return { window, samples, closed, positions, codecs, finalize, cancel };
}

test('encoder uses explicit VFR timestamps, positional chunks and closes every bitmap/frame/sample', async () => {
  const result = await runEncoder(['avc']);
  assert.deepEqual(result.samples.map((s) => s.timestamp), [0, 100000]);
  assert.deepEqual(result.samples.map((s) => s.duration), [100000, 400000]);
  assert.deepEqual(result.positions, ['12']);
  assert.equal(result.window.__result.codec, 'avc');
  assert.equal(result.window.__result.durationSec, 0.5);
  for (const kind of ['sample', 'bitmap', 'frame']) {
    assert.equal(result.closed.filter((s) => s === kind).length, 2);
  }
  assert.equal(result.cancel, false);
});

test('encoder falls back to VP9 and exposes unsupported-codec and disk transport errors', async () => {
  const fallback = await runEncoder(['vp9']);
  assert.deepEqual(fallback.codecs, ['avc', 'vp9']);
  assert.equal(fallback.window.__result.codec, 'vp9');
  const unsupported = await runEncoder([]);
  assert.equal(unsupported.window.__error, 'Cannot encode video in this browser');
  const failed = await runEncoder(['avc'], true);
  assert.match(failed.window.__error, /Cannot write encoder chunk/);
  assert.equal(failed.cancel, true);
});

test('boxesClose accepts sub-pixel differences and rejects a moving or missing box', async () => {
  const { boxesClose } = await import('../scripts/lib/record/actions.mjs');
  const box = { x: 10, y: 20, width: 100, height: 40 };
  assert.equal(boxesClose(box, { ...box, y: 20.4 }), true);
  assert.equal(boxesClose(box, { ...box, y: 22 }), false);   // still scrolling
  assert.equal(boxesClose(box, null), false);
  assert.equal(boxesClose(null, null), false);
});
