// Voicebox narration against a stand-in server that answers like the real one
// (verified against Voicebox 0.5.0): /profiles, then /generate answering at
// once with a "generating" record, /history/<id> to poll, /audio/<id> for the WAV.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { run, ffprobeDuration } from '../scripts/lib/env.mjs';
import { ttsAvailable, synth, warmUp } from '../scripts/lib/tts.mjs';
import { mergeConfig, DEFAULTS } from '../scripts/lib/config.mjs';

const PROFILES = [
  { id: 'p-1', name: 'Heart', language: 'en', default_engine: 'kokoro' },
  { id: 'p-2', name: 'Morgan', language: 'en', default_engine: null },
];

// One second of sine wave, padded with silence at both ends like a real engine.
async function makeWav(dir) {
  const file = path.join(dir, 'server.wav');
  const r = await run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=300:duration=1', '-af', 'adelay=300:all=1,apad=pad_dur=0.4', file]);
  assert.equal(r.code, 0, r.stderr);
  return readFile(file);
}

// `failGenerate`: /generate answers 500. Returns {url, requests, close}.
async function fakeVoicebox(wav, { failGenerate = false } = {}) {
  const requests = [];
  const polls = new Map();
  const server = http.createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    const json = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (req.url === '/profiles') return json(200, PROFILES);
    if (req.method === 'POST' && req.url === '/generate') {
      if (failGenerate) return json(500, { detail: 'model crashed' });
      req.resume();
      return req.on('end', () => json(200, { id: 'gen-1', status: 'generating', audio_path: '', duration: 0 }));
    }
    if (req.url === '/history/gen-1') {
      const n = (polls.get('gen-1') ?? 0) + 1; // completes on the second poll, like a short wait
      polls.set('gen-1', n);
      return json(200, { id: 'gen-1', status: n > 1 ? 'completed' : 'generating', duration: 1, error: null });
    }
    if (req.url === '/audio/gen-1') { res.writeHead(200, { 'content-type': 'audio/x-wav' }); return res.end(wav); }
    return json(404, {});
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, requests, close: () => new Promise((r) => server.close(r)) };
}

// An address nothing listens on.
async function deadUrl() {
  const s = http.createServer();
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${s.address().port}`;
  await new Promise((r) => s.close(r));
  return url;
}

async function setup(t, opts) {
  const dir = await mkdtemp(path.join(tmpdir(), 'voicebox-'));
  const fake = await fakeVoicebox(await makeWav(dir), opts);
  t.after(async () => { await fake.close(); await rm(dir, { recursive: true, force: true }); });
  return { dir, fake };
}

test('voicebox: "auto" uses a running Voicebox and its first profile, or the named one', async (t) => {
  const { fake } = await setup(t);
  const first = await ttsAvailable({ engine: 'auto', voiceboxUrl: fake.url });
  assert.deepEqual([first.tool, first.voice, first.profileId], ['voicebox', 'Heart', 'p-1']);
  const named = await ttsAvailable({ engine: 'auto', voiceboxUrl: fake.url, voice: 'morgan' });
  assert.deepEqual([named.tool, named.voice], ['voicebox', 'Morgan']);
});

test('voicebox: "auto" without a Voicebox is exactly the system voice, quickly', async (t) => {
  const url = await deadUrl();
  const started = Date.now();
  const tts = await ttsAvailable({ engine: 'auto', voiceboxUrl: url });
  assert.ok(Date.now() - started < 6000, 'a closed Voicebox must cost about its 1 s probe, not hang');
  assert.notEqual(tts?.tool, 'voicebox');
  assert.deepEqual(await ttsAvailable({ voiceboxUrl: url }), tts, 'no engine given behaves like "auto"');
});

test('voicebox: engines "say" and "espeak" never contact Voicebox', async (t) => {
  const { fake } = await setup(t);
  await ttsAvailable({ engine: 'say', voiceboxUrl: fake.url });
  await ttsAvailable({ engine: 'espeak', voiceboxUrl: fake.url });
  assert.deepEqual(fake.requests, []);
});

test('voicebox: synth returns the trimmed speech duration and puts leadMs in front of it', async (t) => {
  const { dir, fake } = await setup(t);
  const opts = { engine: 'voicebox', voiceboxUrl: fake.url };
  const plain = path.join(dir, 'plain.wav');
  const d = await synth('Open the orders page', plain, opts);
  assert.ok(d > 0.9 && d < 1.2, `speech is 1 s of sine once the engine's padding is trimmed, got ${d}`);
  assert.ok(Math.abs(await ffprobeDuration(plain) - d) < 0.02);
  const led = path.join(dir, 'led.wav');
  const d2 = await synth('Open the orders page', led, { ...opts, leadMs: 250 });
  assert.ok(Math.abs(d2 - d) < 0.05, 'the lead is not part of the returned duration');
  assert.ok(Math.abs(await ffprobeDuration(led) - (d2 + 0.25)) < 0.05, 'but is in the file');
  assert.ok(fake.requests.includes('POST /generate'));
});

test('voicebox: an unknown voice.name lists the profiles; "auto" keeps it as a system voice', async (t) => {
  const { fake } = await setup(t);
  await assert.rejects(ttsAvailable({ engine: 'voicebox', voiceboxUrl: fake.url, voice: 'Nobody' }), /no voice profile "Nobody"; available: Heart, Morgan/);
  assert.notEqual((await ttsAvailable({ engine: 'auto', voiceboxUrl: fake.url, voice: 'Nobody' }))?.tool, 'voicebox');
});

test('voicebox: engine "voicebox" with no Voicebox running fails with what to do', async () => {
  await assert.rejects(ttsAvailable({ engine: 'voicebox', voiceboxUrl: await deadUrl() }), /Voicebox is not running at http:\/\/127\.0\.0\.1:\d+: open the Voicebox app, or set voice\.engine to "auto"/);
});

test('voicebox: a failing /generate under "auto" speaks that clip with the system voice', async (t) => {
  const url = await deadUrl();
  const system = await ttsAvailable({ engine: 'auto', voiceboxUrl: url });
  if (!system) return t.skip('no system TTS installed');
  const { dir, fake } = await setup(t, { failGenerate: true });
  const out = path.join(dir, 'fallback.wav'); // .wav even if the system voice writes AIFF
  const d = await synth('Open the orders page', out, { engine: 'auto', voiceboxUrl: fake.url, leadMs: 250 });
  assert.ok(d > 0.3, `spoken by ${system.tool}`);
  assert.ok(await ffprobeDuration(out) > d, 'a real, readable WAV with its lead');
  await assert.rejects(synth('x', path.join(dir, 'strict.wav'), { engine: 'voicebox', voiceboxUrl: fake.url }), /Voicebox \/generate failed: HTTP 500/);
});

test('voicebox: warmUp speaks once through Voicebox and leaves nothing behind', async (t) => {
  const { fake } = await setup(t);
  await warmUp({ engine: 'voicebox', voiceboxUrl: fake.url });
  assert.ok(fake.requests.includes('POST /generate'));
});

test('voicebox: config defaults to auto on the standard port and rejects bad values', () => {
  assert.deepEqual([DEFAULTS.voice.engine, DEFAULTS.voice.voiceboxUrl], ['auto', 'http://127.0.0.1:17493']);
  assert.equal(mergeConfig({ baseURL: 'http://x', voice: { engine: 'voicebox', voiceboxUrl: 'http://127.0.0.1:9999' } }).voice.engine, 'voicebox');
  assert.throws(() => mergeConfig({ baseURL: 'http://x', voice: { engine: 'piper' } }), /"voice.engine" must be/);
  assert.throws(() => mergeConfig({ baseURL: 'http://x', voice: { voiceboxUrl: 'localhost' } }), /"voice.voiceboxUrl" must be an http/);
});

test('voicebox: narration still reaches Voicebox while the recorder blocks every POST', async (t) => {
  const { dir, fake } = await setup(t);
  const real = globalThis.fetch;
  // What fixture.mjs guardNode does: stash the real fetch, then refuse writes.
  globalThis[Symbol.for('demo-video.realFetch')] = real;
  globalThis.fetch = () => Promise.reject(new Error('demo-video blocked POST'));
  t.after(() => { globalThis.fetch = real; delete globalThis[Symbol.for('demo-video.realFetch')]; });
  const d = await synth('Open the orders page', path.join(dir, 'guarded.wav'), { engine: 'voicebox', voiceboxUrl: fake.url });
  assert.ok(d > 0.9);
});
