// Editor server routes for voice-over, voice samples, own recordings, imported clips and background music.
// Everything here runs behind the server's token, Host and Origin checks; paths are confined to the project (or SHOWREEL_HOME/voice-samples).
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { mkdir, readdir, readFile, realpath, access } from 'node:fs/promises';
import { loadRunComposition, loadVoiceClips, resolveAudioRoute } from '../compose/render.mjs';
import { resolveComposition, MUSIC_EXTENSIONS } from '../compose/composition.mjs';
import { readBody } from './body.mjs';
import { contained, safeFile } from './files.mjs';
import { formatSSE } from './http.mjs';
import { serveRanged } from './serve.mjs';
import { sampleDir, clipFile } from '../voice/paths.mjs';
import { atomicWrite, atomicWriteJson } from '../voice/atomic.mjs';
import { DEFAULT_VOICE, SAMPLE_TEXT } from '../voice/pins.mjs';
import { FALLBACK_VOICES, normalizeVoices, isKnownVoice } from '../voice/voices.mjs';
import { prepareText, clampSpeed } from '../voice/prepare.mjs';
import { clipKey, readIndex, writeIndex, setClip, computeStatuses, emptyIndex } from '../voice/clips.mjs';
import { engineStatus, currentModelHash, currentEngineName, NOT_INSTALLED } from '../voice/engine-state.mjs';
import { getClient, stop as stopVoiceEngine } from '../voice/client.mjs';
import { synthesizeToFile } from '../voice/synthesize.mjs';
import { convertImport } from '../voice/import.mjs';
import { wantedClips, readPronunciations } from '../voice/commands.mjs';
import { effectiveStoryboard, effectiveNarration } from '../voice/narration.mjs';

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
export const INSTALL_COMMAND = 'showreel voice install --yes';
export const MUSIC_TYPES = { wav: 'audio/wav', mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg' };
const VOICE_ID = /^[a-z]{2}_[a-z0-9]+$/i;
const STEP_ID = /^[A-Za-z0-9_-]{1,64}$/;
const IDLE_STOP_MS = 60_000;

const fail = (statusCode, message, extra = {}) => Object.assign(new Error(message), { statusCode, ...extra });
export const isVoiceId = value => typeof value === 'string' && VOICE_ID.test(value);

// Pure: turns an uploaded file name into a safe, unique name under music/. Directory parts and odd characters are dropped.
export function musicFileName(filename, suffix = randomBytes(4).toString('hex')) {
  const leaf = String(filename ?? '').replace(/[\x00-\x1f]/g, '').split(/[\\/]/).pop().trim();
  const dot = leaf.lastIndexOf('.'), ext = dot > 0 || (dot === 0 && leaf.length > 1) ? leaf.slice(dot + 1).toLowerCase() : '';
  if (!MUSIC_EXTENSIONS.includes(ext)) throw fail(400, `Choose a ${MUSIC_EXTENSIONS.map(e => e.toUpperCase()).join(', ')} file.`);
  const stem = (dot > 0 ? leaf.slice(0, dot) : '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'music';
  return `${stem}-${suffix}.${ext}`;
}
const jsonBody = async (request, limit = 64 * 1024) => {
  const raw = await readBody(request, limit, 'Request');
  if (!raw.length) return {};
  try { const value = JSON.parse(raw.toString('utf8')); if (value && typeof value === 'object' && !Array.isArray(value)) return value; }
  catch { /* falls through */ }
  throw fail(400, 'The request must be a JSON object.');
};
export function parseGenerateRequest(body, stepIdsInProject) {
  const out = {};
  if (body.stepIds !== undefined) {
    if (!Array.isArray(body.stepIds) || body.stepIds.length > 200 || !body.stepIds.every(id => typeof id === 'string' && STEP_ID.test(id))) throw fail(400, 'stepIds must be a list of step ids.');
    const unknown = body.stepIds.find(id => !stepIdsInProject.includes(id));
    if (unknown) throw fail(400, `Unknown step "${unknown}".`);
    out.stepIds = [...new Set(body.stepIds)];
  }
  if (body.voice !== undefined) { if (!isVoiceId(body.voice)) throw fail(400, 'That is not a voice id.'); out.voice = body.voice; }
  if (body.speed !== undefined) { if (typeof body.speed !== 'number' || !Number.isFinite(body.speed) || body.speed <= 0) throw fail(400, 'Speed must be a positive number.'); out.speed = clampSpeed(body.speed); }
  if (body.force !== undefined) { if (typeof body.force !== 'boolean') throw fail(400, 'force must be true or false.'); out.force = body.force; }
  return out;
}

export function createVoiceApi({ name, runId, dir, uploadLimit = MAX_UPLOAD_BYTES }) {
  const clients = new Set();
  let lastEvent = { event: 'idle', data: {} }, job = null, closing = false, liveVoices = null, stopTimer = null, indexChain = Promise.resolve(), sampleChain = Promise.resolve(), sampleBusy = 0;
  const emit = (event, data) => {
    lastEvent = { event, data };
    for (const response of clients) { if (!response.write(formatSSE(event, data))) { clients.delete(response); response.end(); } }
  };
  const exists = file => access(file).then(() => true, () => false);
  // Index writers take turns, and each starts from what is on disk, so a clip upload never loses a clip made by a running job (or the reverse).
  const withIndex = fn => {
    const run = indexChain.then(async () => { const next = await fn(await readIndex(name)); if (next) await writeIndex(name, next); return next; });
    indexChain = run.catch(() => {});
    return run;
  };
  const scheduleStop = () => {
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => { if (!job && !sampleBusy && !closing) stopVoiceEngine().catch(() => {}); }, IDLE_STOP_MS);
    stopTimer.unref?.();
  };
  async function voiceList() {
    // Asking a cold engine for its voices would load the whole model, so the built-in table serves until a worker is already running.
    if (!liveVoices && getClient().child) { try { liveVoices = normalizeVoices(await getClient().voices()); } catch { /* keep the table */ } }
    return liveVoices ?? FALLBACK_VOICES.slice();
  }
  async function clientClips() {
    const { voiceClips } = await loadVoiceClips(dir);
    return voiceClips ?? emptyIndex();
  }
  async function loadCurrent() {
    const current = await loadRunComposition({ name, runId });
    return { ...current, resolved: resolveComposition(current.composition) };
  }
  // The snapshot behind GET /api/voice/status and the voice part of GET /api/project.
  async function snapshot() {
    const [engine, current, clips] = await Promise.all([engineStatus(), loadCurrent(), clientClips()]);
    const { voiceId, speed } = current.resolved.audio.voice, storyboard = effectiveStoryboard(current.storyboard, current.resolved);
    const wanted = wantedClips({ storyboard, pronunciations: await readPronunciations(name).catch(() => ({})), voice: voiceId, speed: clampSpeed(speed), engine: currentEngineName(), modelHash: await currentModelHash() });
    const muted = Object.entries(current.resolved.audio.narration.steps).filter(([, v]) => v?.muted).map(([id]) => id);
    const status = computeStatuses({ index: clips, steps: storyboard.steps, wantedByStep: wanted, muted });
    return { voice: { installed: engine.installed, fake: engine.fake, modelPresent: engine.modelPresent, installCommand: INSTALL_COMMAND, defaultVoice: DEFAULT_VOICE,
      voiceId, speed: clampSpeed(speed), voices: await voiceList(), status, job: { running: !!job, last: lastEvent } }, clips };
  }
  const requireEngine = async () => {
    const engine = await engineStatus();
    if (!engine.installed) throw fail(409, `${NOT_INSTALLED.replace(/ Run: .*/, '')}. Run "${INSTALL_COMMAND}" in a terminal, then reload the editor.`, { installCommand: INSTALL_COMMAND });
  };

  async function startJob(body) {
    if (job || closing) throw fail(409, 'A voice-over job is already running.');
    await requireEngine();
    const current = await loadCurrent(), storyboard = effectiveStoryboard(current.storyboard, current.resolved);
    const request = parseGenerateRequest(body, storyboard.steps.map(s => s.id));
    const voice = request.voice ?? current.resolved.audio.voice.voiceId, speed = request.speed ?? clampSpeed(current.resolved.audio.voice.speed), force = request.force === true;
    const pronunciations = await readPronunciations(name).catch(() => ({}));
    const wanted = wantedClips({ storyboard, pronunciations, voice, speed, engine: currentEngineName(), modelHash: await currentModelHash() });
    const index = await readIndex(name), work = [];
    for (const step of storyboard.steps) {
      if (request.stepIds && !request.stepIds.includes(step.id)) continue;
      if (current.resolved.audio.narration.steps[step.id]?.muted || !wanted[step.id]) continue;
      const have = index.steps[step.id] ? index.clips[index.steps[step.id]] : null;
      if (have && (have.source === 'own' || have.source === 'file') && !force) continue; // never replace a person's own audio unless asked
      work.push({ id: step.id, text: step.narration, wanted: wanted[step.id] });
    }
    if (!work.length) throw fail(400, 'No steps have narration to generate, or every selected step is muted or uses your own audio.');
    const controller = new AbortController(), mine = { controller };
    job = mine; clearTimeout(stopTimer);
    emit('started', { total: work.length, stepIds: work.map(w => w.id), voice, speed });
    mine.promise = (async () => {
      let done = 0, failed = 0, cached = 0;
      try {
        for (const [i, item] of work.entries()) {
          if (controller.signal.aborted || closing) break;
          emit('step', { stepId: item.id, state: 'started', index: i, total: work.length });
          try {
            const file = clipFile(name, item.wanted.key), known = (await readIndex(name)).clips[item.wanted.key];
            if (!force && known?.source === 'tts' && await exists(file)) {
              await withIndex(ix => setClip(ix, { ...known, stepId: item.id }));
              done++; cached++; emit('step', { stepId: item.id, state: 'done', cached: true, durationSec: known.durationSec, index: i, total: work.length });
            } else {
              const made = await synthesizeToFile({ engine: getClient(), text: item.text, voice, speed, pronunciations, out: file });
              await withIndex(ix => setClip(ix, { key: item.wanted.key, stepId: item.id, text: item.text, voice, speed, engine: currentEngineName(), durationSec: made.durationSec,
                sampleRate: made.sampleRate, source: 'tts', createdAt: new Date().toISOString() }));
              done++; emit('step', { stepId: item.id, state: 'done', cached: false, durationSec: made.durationSec, warnings: made.warnings, index: i, total: work.length });
            }
          } catch (error) {
            failed++; emit('step', { stepId: item.id, state: 'error', message: error.message, index: i, total: work.length });
            if (error.message === NOT_INSTALLED) break;
          }
        }
        const clips = await clientClips().catch(() => null);
        emit(controller.signal.aborted ? 'cancelled' : 'complete', { done, failed, cached, total: work.length, clips });
      } catch (error) {
        emit('error', { message: error.message });
      } finally { if (job === mine) job = null; scheduleStop(); }
    })();
    return { total: work.length, stepIds: work.map(w => w.id) };
  }

  async function ensureSample(voice) {
    const modelHash = await currentModelHash(), engine = currentEngineName(), { preparedText } = prepareText(SAMPLE_TEXT);
    const key = clipKey({ engine, modelHash, voice, speed: 1, preparedText }), wav = path.join(sampleDir(), `${voice}.wav`), meta = path.join(sampleDir(), `${voice}.json`);
    let cached = false;
    try { cached = JSON.parse(await readFile(meta, 'utf8')).key === key && await exists(wav); } catch { /* generate it */ }
    if (!cached) {
      await mkdir(sampleDir(), { recursive: true });
      const made = await synthesizeToFile({ engine: getClient(), text: SAMPLE_TEXT, voice, speed: 1, out: wav });
      await atomicWriteJson(meta, { key, voice, engine, durationSec: made.durationSec, sampleRate: made.sampleRate, text: SAMPLE_TEXT });
    }
    return { voice, cached, url: `/media/voice-sample/${voice}.wav` };
  }
  async function listSamples() {
    let files = [];
    try { files = await readdir(sampleDir()); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    return files.filter(f => f.endsWith('.wav') && files.includes(f.replace(/\.wav$/, '.json')) && VOICE_ID.test(f.slice(0, -4))).map(f => f.slice(0, -4)).sort();
  }

  async function saveMusic(request, filename) {
    const base = await realpath(dir), musicDir = path.join(base, 'music');
    const stored = musicFileName(filename);
    const body = await readBody(request, uploadLimit, 'Music file');
    if (!body.length) throw fail(400, 'The music file is empty.');
    await mkdir(musicDir, { recursive: true });
    const realMusic = await realpath(musicDir);
    if (!contained(base, realMusic) || realMusic === base) throw fail(400, 'The music folder must be inside the project.');
    await atomicWrite(path.join(realMusic, stored), body);
    return { file: `music/${stored}`, name: stored, bytes: body.length };
  }
  async function saveClip(request, url) {
    const stepId = url.searchParams.get('step'), source = url.searchParams.get('source');
    if (!stepId || !STEP_ID.test(stepId)) throw fail(400, 'A valid step is required.');
    if (!['own', 'file'].includes(source)) throw fail(400, 'source must be own or file.');
    const current = await loadCurrent(), step = current.storyboard.steps.find(s => s.id === stepId);
    if (!step) throw fail(400, `Unknown step "${stepId}".`);
    const body = await readBody(request, uploadLimit, 'Audio');
    let converted;
    try { converted = convertImport(body, { maxBytes: uploadLimit }); }
    catch (error) { throw fail(400, error.message); }
    await atomicWrite(clipFile(name, converted.key), converted.wav);
    await withIndex(ix => setClip(ix, { key: converted.key, stepId, text: effectiveNarration(step, current.resolved) ?? '', voice: null, speed: 1, engine: null,
      durationSec: converted.durationSec, sampleRate: converted.sampleRate, source, createdAt: new Date().toISOString() }));
    return { ok: true, stepId, key: converted.key, durationSec: converted.durationSec, source, clips: await clientClips() };
  }

  return {
    snapshot, clips: clientClips,
    // Resolves true when the route belonged to this module.
    async handle({ request, response, route, url, method, send }) {
      if (!(route.startsWith('/api/voice/') || route === '/api/music' || route.startsWith('/media/voice/') || route.startsWith('/media/voice-sample/') || route.startsWith('/media/music/'))) return false;
      if (['GET', 'HEAD'].includes(method) && route.startsWith('/media/')) {
        let found;
        if (route.startsWith('/media/voice/')) {
          const leaf = route.slice('/media/voice/'.length);
          found = /^[A-Za-z0-9_-]{1,128}\.wav$/.test(leaf) ? await resolveAudioRoute(dir, `voice/${leaf}`) : null;
        } else if (route.startsWith('/media/voice-sample/')) {
          const leaf = route.slice('/media/voice-sample/'.length);
          if (VOICE_ID.test(leaf.replace(/\.wav$/, '')) && leaf.endsWith('.wav')) found = { file: await safeFile(sampleDir(), leaf), type: 'audio/wav' };
        } else found = await resolveAudioRoute(dir, `music/${route.slice('/media/music/'.length)}`);
        if (!found) { send(404, { error: 'Audio not found' }); return true; }
        await serveRanged(request, response, found.file, found.type ?? 'application/octet-stream');
        return true;
      }
      if (method === 'GET' && route === '/api/voice/status') { send(200, await snapshot()); return true; }
      if (method === 'GET' && route === '/api/voice/samples') { send(200, { samples: await listSamples() }); return true; }
      if (method === 'GET' && route === '/api/voice/events') {
        response.writeHead(200, { 'content-type': 'text/event-stream', 'connection': 'keep-alive' });
        response.write(formatSSE(lastEvent.event, lastEvent.data)); clients.add(response);
        request.on('close', () => clients.delete(response)); return true;
      }
      if (method === 'POST' && route === '/api/voice/sample') {
        const { voice } = await jsonBody(request);
        if (!isVoiceId(voice) || !isKnownVoice(voice, await voiceList())) throw fail(400, 'Choose one of the listed voices.');
        await requireEngine();
        sampleBusy++; clearTimeout(stopTimer);
        const run = sampleChain.then(() => ensureSample(voice));
        sampleChain = run.catch(() => {});
        try { send(200, await run); } finally { sampleBusy--; scheduleStop(); }
        return true;
      }
      if (method === 'POST' && route === '/api/voice/generate') { send(202, { ok: true, ...(await startJob(await jsonBody(request))) }); return true; }
      if (method === 'POST' && route === '/api/voice/cancel') { const running = !!job; job?.controller.abort(); send(200, { ok: true, running }); return true; }
      if (method === 'POST' && route === '/api/voice/clip') { send(200, await saveClip(request, url)); return true; }
      if (method === 'DELETE' && route === '/api/voice/clip') {
        const stepId = url.searchParams.get('step');
        if (!stepId || !STEP_ID.test(stepId)) throw fail(400, 'A valid step is required.');
        await withIndex(ix => { if (!(stepId in ix.steps)) return null; const steps = { ...ix.steps }; delete steps[stepId]; return { ...ix, steps }; });
        send(200, { ok: true, clips: await clientClips() }); return true;
      }
      if (method === 'POST' && route === '/api/music') { send(200, await saveMusic(request, url.searchParams.get('filename'))); return true; }
      send(404, { error: 'Not found' }); return true;
    },
    async close() {
      closing = true; clearTimeout(stopTimer);
      job?.controller.abort();
      for (const response of clients) response.end();
      clients.clear();
      await job?.promise; await sampleChain; await indexChain.catch(() => {});
      await stopVoiceEngine().catch(() => {});
    },
  };
}
