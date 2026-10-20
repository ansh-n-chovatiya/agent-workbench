import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Real sockets and the deterministic fake voice engine (a child process); no model, no network, no browser.
const home = await mkdtemp(path.join(os.tmpdir(), 'showreel-editor-voice-'));
process.env.SHOWREEL_HOME = home;
process.env.SHOWREEL_VOICE_ENGINE = 'fake';
const { startEditorServer } = await import('../scripts/lib/editor/server.mjs');
const { musicFileName, parseGenerateRequest, isVoiceId } = await import('../scripts/lib/editor/voice-api.mjs');
const { createExportJob } = await import('../scripts/lib/editor/export-job.mjs');
const { resolveComposition } = await import('../scripts/lib/compose/composition.mjs');
const { encodeWav } = await import('../scripts/lib/voice/wav.mjs');
const { createSSEParser } = await import('../editor/helpers.mjs');

const storyboard = { version: 1, steps: [
  { id: 's1', caption: 'Open the report', narration: 'Open the report and look at the totals.' },
  { id: 's2', caption: 'Share it', narration: 'Share it with the team.' },
  { id: 's3', caption: 'Muted step', narration: 'This step stays silent.' },
  { id: 's4', caption: 'Nothing to say' } ] };
const LIMIT = 1024 * 1024;
async function makeProject(name = 'voicetest') {
  const dir = path.join(home, 'projects', name), runDir = path.join(dir, 'runs', 'run1'); await mkdir(runDir, { recursive: true });
  const composition = resolveComposition({ run: { id: 'run1' }, cards: { title: { enabled: false } }, audio: { narration: { steps: { s3: { muted: true } } } } });
  for (const [file, data] of Object.entries({ 'brief.json': {}, 'storyboard.json': storyboard, 'composition.json': composition,
    'runs/run1/events.json': { viewport: { width: 100, height: 100 }, cursor: [], clicks: [], steps: [], targets: [], keys: [] },
    'runs/run1/record.json': { runId: 'run1', durationSec: 5, scale: { used: 1 } } })) await writeFile(path.join(dir, file), JSON.stringify(data));
  await writeFile(path.join(runDir, 'raw.mp4'), '0123456789');
  return { dir, composition };
}
const sine = (seconds, rate = 48000) => encodeWav(Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => 0.4 * Math.sin(i / 20)), rate);
async function collect(response, until, ms = 20000) {
  const events = [], reader = response.body.getReader(), decoder = new TextDecoder();
  let replayed = false; // A new listener first receives the last event again; only what follows is news.
  const parse = createSSEParser(message => { if (replayed) events.push(message); else replayed = true; });
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const { value, done } = await Promise.race([reader.read(), new Promise(r => setTimeout(() => r({ timeout: true }), 500))]);
    if (value) parse(decoder.decode(value, { stream: true }));
    if (done || events.some(until)) break;
  }
  await reader.cancel().catch(() => {});
  return events;
}

test('pure helpers: music file names, generate requests and voice ids', () => {
  assert.equal(musicFileName('My Song!.MP3', 'abcd1234'), 'my-song-abcd1234.mp3');
  assert.equal(musicFileName('../../etc/evil.wav', 'ab'), 'evil-ab.wav');
  assert.equal(musicFileName('C:\\temp\\loop.ogg', 'ab'), 'loop-ab.ogg');
  assert.equal(musicFileName('.mp3', 'ab'), 'music-ab.mp3');
  assert.equal(musicFileName('Ünïcode café.m4a', 'ab'), 'unicode-cafe-ab.m4a');
  assert.match(musicFileName('a.wav'), /^a-[0-9a-f]{8}\.wav$/);
  for (const bad of ['song.exe', 'song', 'song.mp3.exe', '', null, 'song.WAV.txt', 'music/']) assert.throws(() => musicFileName(bad), /WAV, MP3, M4A, OGG|Choose/, String(bad));
  assert.deepEqual(parseGenerateRequest({}, ['s1']), {});
  assert.deepEqual(parseGenerateRequest({ stepIds: ['s1', 's1'], voice: 'af_heart', speed: 5, force: true }, ['s1']), { stepIds: ['s1'], voice: 'af_heart', speed: 1.3, force: true });
  for (const body of [{ stepIds: 's1' }, { stepIds: ['nope'] }, { stepIds: ['../x'] }, { voice: '../x' }, { voice: 5 }, { speed: 'fast' }, { speed: -1 }, { force: 'yes' }]) {
    assert.throws(() => parseGenerateRequest(body, ['s1']), /./, JSON.stringify(body));
  }
  assert.equal(isVoiceId('af_heart'), true); assert.equal(isVoiceId('../etc'), false); assert.equal(isVoiceId('af heart'), false);
});

test('the export job complete event carries the measured loudness', async () => {
  const events = [];
  const job = createExportJob({ render: async () => ({ finalFile: 'f.mp4', renderDir: 'd', audio: { measured: { integratedLufs: -16.02, truePeakDb: -1.4 }, codec: 'aac', warnings: ['w'] } }), onEvent: (event, data) => events.push({ event, data }) });
  job.start({}); while (!events.some(e => ['complete', 'error', 'cancelled'].includes(e.event))) await new Promise(r => setTimeout(r, 5));
  assert.deepEqual(events.find(e => e.event === 'complete').data.audio, { integratedLufs: -16.02, truePeakDb: -1.4, codec: 'aac', warnings: ['w'] });
  const silent = []; const quiet = createExportJob({ render: async () => ({ finalFile: 'f.mp4', renderDir: 'd' }), onEvent: (event, data) => silent.push({ event, data }) });
  quiet.start({}); while (!silent.some(e => ['complete', 'error', 'cancelled'].includes(e.event))) await new Promise(r => setTimeout(r, 5));
  assert.equal(silent.find(e => e.event === 'complete').data.audio, null);
});

test('voice routes: auth, status, samples, generation job, clips, music and path safety', { timeout: 120000 }, async () => {
  const { dir, composition } = await makeProject();
  const server = await startEditorServer({ name: 'voicetest', runId: 'run1', uploadLimit: LIMIT });
  try {
    const base = `http://127.0.0.1:${server.port}`, bearer = { Authorization: `Bearer ${server.token}` };
    const request = (route, options = {}) => fetch(base + route, { ...options, headers: { ...bearer, ...options.headers }, redirect: 'manual' });
    const json = async (route, options) => { const r = await request(route, options); return { status: r.status, body: await r.json() }; };
    const post = (route, body) => json(route, { method: 'POST', body: JSON.stringify(body) });

    await t_auth(base, server);
    // Status and /api/project
    const status = await json('/api/voice/status');
    assert.equal(status.status, 200);
    assert.equal(status.body.voice.installed, true); assert.equal(status.body.voice.fake, true);
    assert.equal(status.body.voice.installCommand, 'showreel voice install --yes');
    assert.equal(status.body.voice.voices.length, 28); assert.equal(status.body.voice.voices[0].id, 'af_heart');
    assert.deepEqual(status.body.voice.status.map(r => [r.stepId, r.status]), [['s1', 'missing'], ['s2', 'missing'], ['s3', 'muted'], ['s4', 'none']]);
    assert.deepEqual(status.body.clips, { version: 1, clips: {}, steps: {} });
    const project = await json('/api/project');
    assert.equal(project.body.voice.installed, true); assert.equal(project.body.voice.voices.length, 28); assert.deepEqual(project.body.clips.steps, {}); assert.equal(project.body.lastExport, null);

    // Voice samples: generated on demand, served with ranges, one at a time
    assert.deepEqual((await json('/api/voice/samples')).body, { samples: [] });
    const sample = await post('/api/voice/sample', { voice: 'af_heart' });
    assert.equal(sample.status, 200); assert.equal(sample.body.url, '/media/voice-sample/af_heart.wav'); assert.equal(sample.body.cached, false);
    assert.equal((await post('/api/voice/sample', { voice: 'af_heart' })).body.cached, true);
    const parallel = await Promise.all(['am_adam', 'bf_emma'].map(voice => post('/api/voice/sample', { voice })));
    assert.deepEqual(parallel.map(r => r.status), [200, 200]);
    assert.deepEqual((await json('/api/voice/samples')).body.samples, ['af_heart', 'am_adam', 'bf_emma']);
    const wav = await request('/media/voice-sample/af_heart.wav');
    assert.equal(wav.status, 200); assert.equal(wav.headers.get('content-type'), 'audio/wav'); assert.equal(wav.headers.get('accept-ranges'), 'bytes');
    const bytes = Buffer.from(await wav.arrayBuffer()); assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    const part = await request('/media/voice-sample/af_heart.wav', { headers: { Range: 'bytes=0-11' } });
    assert.equal(part.status, 206); assert.equal(part.headers.get('content-range'), `bytes 0-11/${bytes.length}`); assert.equal((await part.text()).slice(8, 12), 'WAVE');
    assert.equal((await request('/media/voice-sample/af_heart.wav', { headers: { Range: 'bytes=99999999-' } })).status, 416);
    for (const bad of [{ voice: 'zz_nobody' }, { voice: '../../etc/passwd' }, { voice: 7 }, {}]) assert.equal((await post('/api/voice/sample', bad)).status, 400, JSON.stringify(bad));
    for (const route of ['/media/voice-sample/..%2f..%2fprojects%2fvoicetest%2fbrief.json', '/media/voice-sample/af_heart.json', '/media/voice-sample/nope.wav', '/media/voice-sample/zz_missing.wav']) assert.ok((await request(route)).status >= 400, route);

    // Generation job with progress over SSE
    assert.equal((await post('/api/voice/generate', { stepIds: ['nope'] })).status, 400);
    assert.equal((await post('/api/voice/generate', { voice: '../x' })).status, 400);
    assert.equal((await post('/api/voice/generate', { stepIds: ['s3'] })).status, 400, 'muted steps are not generated');
    assert.equal((await post('/api/voice/generate', { stepIds: ['s4'] })).status, 400, 'steps without narration are not generated');
    const events = await request('/api/voice/events');
    assert.match(events.headers.get('content-type'), /text\/event-stream/);
    const started = post('/api/voice/generate', {});
    const seen = await collect(events, e => ['complete', 'error', 'cancelled'].includes(e.event));
    assert.equal((await started).status, 202);
    const names = seen.map(e => e.event);
    assert.ok(names[0] === 'started' && names.at(-1) === 'complete', names.join(','));
    assert.deepEqual(seen.filter(e => e.event === 'step' && e.data.state === 'done').map(e => e.data.stepId), ['s1', 's2']);
    assert.deepEqual(seen.at(-1).data.done, 2); assert.equal(seen.at(-1).data.failed, 0);
    assert.deepEqual(Object.keys(seen.at(-1).data.clips.steps).sort(), ['s1', 's2']);
    const after = await json('/api/voice/status');
    assert.deepEqual(after.body.voice.status.map(r => r.status), ['fresh', 'fresh', 'muted', 'none']);
    const key = after.body.clips.steps.s1, clip = after.body.clips.clips[key];
    assert.equal(clip.source, 'tts'); assert.equal(clip.voice, 'af_heart'); assert.ok(clip.durationSec > 0.5); assert.equal(clip.text, storyboard.steps[0].narration);
    const clipWav = await request(`/media/voice/${key}.wav`, { headers: { Range: 'bytes=0-3' } });
    assert.equal(clipWav.status, 206); assert.equal(await clipWav.text(), 'RIFF');
    for (const route of ['/media/voice/..%2fclips.json', '/media/voice/nothere.wav', '/media/voice/%2e%2e%2f%2e%2e%2fbrief.json', '/media/voice/abc.json']) assert.ok((await request(route)).status >= 400, route);
    // Running it again re-uses the cache; force makes new audio again.
    let again = request('/api/voice/events'); const cachedRun = collect(await again, e => e.event === 'complete');
    await post('/api/voice/generate', {});
    const cachedEvents = await cachedRun;
    assert.deepEqual(cachedEvents.filter(e => e.event === 'step' && e.data.state === 'done').map(e => e.data.cached), [true, true]);
    again = request('/api/voice/events'); const forcedRun = collect(await again, e => e.event === 'complete');
    await post('/api/voice/generate', { force: true, stepIds: ['s2'] });
    assert.deepEqual((await forcedRun).filter(e => e.event === 'step' && e.data.state === 'done').map(e => [e.data.stepId, e.data.cached]), [['s2', false]]);
    assert.equal((await json('/api/voice/cancel', { method: 'POST' })).body.running, false);

    // Editing the words (saved through the normal composition route) makes a clip stale without touching the server's job code.
    const edited = structuredClone(composition); edited.audio.narration.steps.s1 = { text: 'A brand new sentence.' };
    assert.equal((await json('/api/composition', { method: 'PUT', body: JSON.stringify(edited) })).status, 200);
    assert.equal((await json('/api/voice/status')).body.voice.status[0].status, 'stale');
    // A different voice generates a different clip and leaves the old audio cached.
    const events2 = await request('/api/voice/events'); const swapped = collect(events2, e => e.event === 'complete');
    assert.equal((await post('/api/voice/generate', { voice: 'am_adam', stepIds: ['s1'] })).status, 202);
    await swapped;
    const afterVoice = (await json('/api/voice/status')).body;
    assert.equal(afterVoice.clips.clips[afterVoice.clips.steps.s1].voice, 'am_adam'); assert.equal(afterVoice.clips.clips[afterVoice.clips.steps.s1].text, 'A brand new sentence.');

    // Own recording and imported file: validated WAV only
    const own = await request('/api/voice/clip?step=s2&source=own', { method: 'POST', body: sine(1.5) });
    assert.equal(own.status, 200); const ownBody = await own.json();
    assert.equal(ownBody.source, 'own'); assert.ok(Math.abs(ownBody.durationSec - 1.5) < 0.01); assert.equal(ownBody.clips.clips[ownBody.clips.steps.s2].source, 'own');
    assert.equal((await json('/api/voice/status')).body.voice.status[1].status, 'own');
    const imported = await request('/api/voice/clip?step=s1&source=file', { method: 'POST', body: sine(0.8, 44100) });
    assert.equal(imported.status, 200); assert.equal((await imported.json()).source, 'file');
    assert.equal((await request('/api/voice/clip?step=s2&source=own', { method: 'POST', body: Buffer.from('this is not a wav file at all') })).status, 400);
    const badWav = await request('/api/voice/clip?step=s2&source=own', { method: 'POST', body: Buffer.from('this is not a wav file at all') });
    assert.match((await badWav.json()).error, /WAV/);
    assert.equal((await request('/api/voice/clip?step=s2&source=own', { method: 'POST', body: Buffer.alloc(0) })).status, 400);
    assert.equal((await request('/api/voice/clip?step=s2&source=own', { method: 'POST', body: Buffer.alloc(LIMIT + 1) })).status, 413);
    assert.equal((await request('/api/voice/clip?step=s2&source=own', { method: 'POST', body: sine(30) })).status, 413, 'a valid WAV over the limit is refused');
    for (const query of ['step=s2&source=robot', 'step=nope&source=own', 'step=../x&source=own', 'source=own', 'step=s2']) {
      assert.equal((await request(`/api/voice/clip?${query}`, { method: 'POST', body: sine(0.2) })).status, 400, query);
    }
    // The generator never replaces a person's own audio unless asked to.
    assert.equal((await post('/api/voice/generate', { stepIds: ['s2'] })).status, 400);
    // Removing a clip only drops the reference.
    const removed = await json('/api/voice/clip?step=s2', { method: 'DELETE' });
    assert.equal(removed.status, 200); assert.equal('s2' in removed.body.clips.steps, false);
    assert.equal((await json('/api/voice/status')).body.voice.status[1].status, 'missing');
    assert.equal((await json('/api/voice/clip?step=s2', { method: 'DELETE' })).status, 200, 'removing twice is harmless');
    assert.equal((await json('/api/voice/clip?step=../x', { method: 'DELETE' })).status, 400);

    // Music upload and serving
    const music = Buffer.from('ID3-not-really-an-mp3-but-bytes');
    const upload = await json('/api/music?filename=' + encodeURIComponent('Summer Loop!.MP3'), { method: 'POST', body: music });
    assert.equal(upload.status, 200); assert.match(upload.body.file, /^music\/summer-loop-[0-9a-f]{8}\.mp3$/);
    assert.deepEqual(await readFile(path.join(dir, upload.body.file)), music);
    const served = await request('/media/music/' + upload.body.file.split('/').map(encodeURIComponent).join('/'), { headers: { Range: 'bytes=0-2' } });
    assert.equal(served.status, 206); assert.equal(served.headers.get('content-type'), 'audio/mpeg'); assert.equal(await served.text(), 'ID3');
    const second = await json('/api/music?filename=' + encodeURIComponent('Summer Loop!.MP3'), { method: 'POST', body: music });
    assert.notEqual(second.body.file, upload.body.file, 'names are unique');
    for (const filename of ['song.exe', 'song', 'notes.txt', 'archive.mp3.zip']) assert.equal((await request('/api/music?filename=' + encodeURIComponent(filename), { method: 'POST', body: music })).status, 400, filename);
    assert.equal((await request('/api/music', { method: 'POST', body: music })).status, 400, 'a file name is required');
    assert.equal((await request('/api/music?filename=a.wav', { method: 'POST', body: Buffer.alloc(0) })).status, 400);
    assert.equal((await request('/api/music?filename=a.wav', { method: 'POST', body: Buffer.alloc(LIMIT + 1) })).status, 413);
    const traversal = await json('/api/music?filename=' + encodeURIComponent('../../../escape.wav'), { method: 'POST', body: music });
    assert.equal(traversal.status, 200); assert.match(traversal.body.file, /^music\/escape-[0-9a-f]{8}\.wav$/);
    const files = await readdir(dir); assert.ok(!files.some(f => f.startsWith('escape')), 'nothing was written outside music/');
    assert.ok(!(await readdir(home)).some(f => f.startsWith('escape')));
    for (const route of ['/media/music/..%2fbrief.json', '/media/music/music%2f..%2f..%2fbrief.json', '/media/music/music/nothere.mp3', '/media/music/brief.json', '/media/music/%2e%2e/%2e%2e/brief.json', '/media/music/music/summer.txt']) {
      assert.ok((await request(route)).status >= 400, route);
    }
    // Saving a composition that points at the upload is accepted, so the editor can use it.
    const withMusic = structuredClone(edited); withMusic.audio.music = { ...withMusic.audio.music, enabled: true, file: upload.body.file };
    assert.equal((await json('/api/composition', { method: 'PUT', body: JSON.stringify(withMusic) })).status, 200);
  } finally { await server.close(); }
});

async function t_auth(base, server) {
  const routes = [['GET', '/api/voice/status'], ['GET', '/api/voice/samples'], ['GET', '/api/voice/events'], ['POST', '/api/voice/sample'], ['POST', '/api/voice/generate'], ['POST', '/api/voice/cancel'],
    ['POST', '/api/voice/clip?step=s1&source=own'], ['DELETE', '/api/voice/clip?step=s1'], ['POST', '/api/music?filename=a.mp3'], ['GET', '/media/voice/abc.wav'], ['GET', '/media/voice-sample/af_heart.wav'], ['GET', '/media/music/music/a.mp3']];
  for (const [method, route] of routes) {
    assert.equal((await fetch(base + route, { method, body: method === 'POST' ? '{}' : undefined })).status, 401, `${method} ${route} needs the session token`);
    assert.equal((await fetch(base + route, { method, headers: { Authorization: `Bearer ${server.token}`, Origin: 'https://example.com' }, body: method === 'POST' ? '{}' : undefined })).status === 403 || method === 'GET', true, `${method} ${route} rejects a foreign origin`);
  }
  const wrongHost = await new Promise((resolve, reject) => {
    import('node:http').then(({ default: http }) => {
      const req = http.get(base + '/api/voice/status', { headers: { Authorization: `Bearer ${server.token}`, Host: `example.com:${server.port}` } }, res => { res.resume(); resolve(res.statusCode); }); req.on('error', reject);
    });
  });
  assert.equal(wrongHost, 403);
  assert.equal((await fetch(base + '/api/voice/status', { headers: { Authorization: 'Bearer ' + 'f'.repeat(48) } })).status, 401);
}

test.after(async () => { await rm(home, { recursive: true, force: true }); });
