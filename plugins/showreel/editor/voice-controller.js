// Client side of the voice routes: one object shared by the Voice panel, the Music panel and the export dialog, so they agree about
// the engine, the clips on disk, the running generation job and whichever sample or clip is playing.
import { request, upload } from './state.js';
import { createSSEParser } from './helpers.mjs';

const idle = () => ({ running: false, cancelling: false, total: 0, index: 0, done: 0, failed: 0, current: null, errors: {}, result: null });
export const sampleUrl = voice => `/media/voice-sample/${encodeURIComponent(voice)}.wav`;
export const clipUrl = key => `/media/voice/${encodeURIComponent(key)}.wav`;

export function createVoiceController({ store, api = request, send = upload, fetchImpl = (...args) => fetch(...args), createAudio = () => new Audio() }) {
  // `notice` says which button an error belongs to ({kind:'sample'|'clip'|'music', id, message}) so it can be shown right there.
  let state = { job: idle(), samples: new Set(), sampleBusy: null, playing: null, error: '', notice: null, cancelled: false };
  const listeners = new Set();
  let stream = null, disposed = false, retry = null, audio = null, announced = false;
  const publish = patch => { state = { ...state, ...patch }; listeners.forEach(fn => fn(state)); };
  const fail = (error, notice = null) => { const message = error?.message ?? String(error); publish({ error: message, notice: notice ? { ...notice, message } : state.notice }); return null; };

  async function refresh() {
    try { const { voice, clips } = await api('/api/voice/status'); store.setProject({ voice, clips }); publish({ error: '' }); return voice; }
    catch (error) { return fail(error); }
  }
  async function loadSamples() {
    try { publish({ samples: new Set((await api('/api/voice/samples')).samples) }); } catch (error) { fail(error); }
  }
  function onEvent({ event, data }, first) {
    if (event === 'idle') return;
    if (first && ['complete', 'cancelled', 'error'].includes(event) && !announced) return; // an old result replayed on connect is not news
    const job = state.job;
    if (event === 'started') { announced = true; publish({ job: { ...idle(), running: true, total: data.total } }); }
    else if (event === 'step') {
      const next = { ...job, running: true, current: data.stepId, index: data.index ?? job.index, total: data.total ?? job.total };
      if (data.state === 'done') { next.done = job.done + 1; next.current = null; refresh(); }
      if (data.state === 'error') { next.failed = job.failed + 1; next.errors = { ...job.errors, [data.stepId]: data.message }; next.current = null; }
      publish({ job: next });
    } else if (['complete', 'cancelled', 'error'].includes(event)) {
      announced = true;
      publish({ job: { ...job, running: false, cancelling: false, current: null, result: event === 'error' ? { error: data.message } : { kind: event, ...data, clips: undefined } } });
      refresh();
    }
  }
  async function watch() {
    if (disposed || stream) return;
    const controller = new AbortController(); stream = controller;
    let first = true;
    try {
      const response = await fetchImpl('/api/voice/events', { credentials: 'same-origin', signal: controller.signal });
      if (!response.ok || !response.body) throw new Error('Cannot connect to voice progress');
      const reader = response.body.getReader(), decoder = new TextDecoder();
      const parse = createSSEParser(message => { onEvent(message, first); first = false; });
      for (;;) { const { value, done } = await reader.read(); if (done) break; parse(decoder.decode(value, { stream: true })); }
    } catch (error) { if (!controller.signal.aborted && !disposed) fail(error); }
    stream = null;
    if (!disposed) retry = setTimeout(watch, 2000);
  }
  function player() { return audio ??= createAudio(); }
  function stopPlayback() { if (audio) { audio.pause(); audio.removeAttribute?.('src'); } publish({ playing: null }); }
  // Plays one URL through the shared element. Resolves true once the browser has started playing, false when it could not
  // (the error is published beside the button that asked, never silently).
  async function play(kind, id, url) {
    if (state.playing?.kind === kind && state.playing.id === id) { stopPlayback(); return false; }
    const element = player();
    element.pause(); element.src = url;
    element.onended = () => { if (state.playing?.kind === kind && state.playing.id === id) publish({ playing: null }); };
    element.onerror = () => { if (state.playing?.kind === kind && state.playing.id === id) { publish({ playing: null }); fail(new Error('This audio could not be played. Try again.'), { kind, id }); } };
    publish({ playing: { kind, id }, notice: state.notice?.kind === kind && state.notice.id === id ? null : state.notice });
    try { await element.play(); return true; }
    catch (error) { if (error?.name !== 'AbortError') { publish({ playing: null }); fail(error, { kind, id }); } return false; }
  }
  return {
    getState: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    start() { watch(); loadSamples(); },
    refresh,
    async generate(options = {}) {
      publish({ error: '' });
      try {
        await store.save();
        // Mark the job running BEFORE the request: with every clip cached the server can finish (and announce 'complete')
        // before this POST returns, and only the server's events may clear the flag afterwards.
        announced = true;
        publish({ job: { ...idle(), running: true, total: options.stepIds?.length ?? 0 } });
        watch();
        // Own recordings stay unless the person says otherwise, so the caller sets force only for an explicit "use generated voice".
        await api('/api/voice/generate', { method: 'POST', body: JSON.stringify(options) });
        return true;
      } catch (error) { publish({ job: idle() }); fail(error); return false; }
    },
    async cancel() { publish({ job: { ...state.job, cancelling: true } }); try { await api('/api/voice/cancel', { method: 'POST' }); } catch (error) { fail(error); } },
    // Plays a voice's sample: from disk when it exists, otherwise it is made first (spinner on that button) and plays when ready.
    async playSample(voice, { retry = true } = {}) {
      if (state.playing?.kind === 'sample' && state.playing.id === voice) { stopPlayback(); return false; }
      if (!state.samples.has(voice)) {
        publish({ sampleBusy: voice, error: '', notice: null });
        try { await api('/api/voice/sample', { method: 'POST', body: JSON.stringify({ voice }) }); publish({ samples: new Set([...state.samples, voice]) }); }
        catch (error) { publish({ sampleBusy: null }); fail(error, { kind: 'sample', id: voice }); return false; }
        publish({ sampleBusy: null });
      }
      const started = await play('sample', voice, sampleUrl(voice));
      // A sample listed on disk that cannot load any more is made again once.
      if (!started && retry && state.notice?.kind === 'sample' && state.notice.id === voice && state.samples.has(voice)) {
        const samples = new Set(state.samples); samples.delete(voice); publish({ samples });
        return this.playSample(voice, { retry: false });
      }
      return started;
    },
    playClip: (stepId, key) => play('clip', stepId, clipUrl(key)),
    playMusic: url => play('music', 'music', url),
    stopPlayback,
    async saveClip(stepId, wav, source) {
      publish({ error: '' });
      try {
        const result = await send(`/api/voice/clip?step=${encodeURIComponent(stepId)}&source=${source}`, wav, 'audio/wav');
        store.setProject({ clips: result.clips }); await refresh(); return result;
      } catch (error) { fail(error); throw error; }
    },
    async removeClip(stepId) {
      try { const result = await api(`/api/voice/clip?step=${encodeURIComponent(stepId)}`, { method: 'DELETE' }); store.setProject({ clips: result.clips }); await refresh(); }
      catch (error) { fail(error); }
    },
    async saveMusic(file) {
      return send(`/api/music?filename=${encodeURIComponent(file.name)}`, file, file.type || 'application/octet-stream');
    },
    clearError() { publish({ error: '', notice: null }); },
    dispose() { disposed = true; clearTimeout(retry); stream?.abort(); audio?.pause(); listeners.clear(); },
  };
}
