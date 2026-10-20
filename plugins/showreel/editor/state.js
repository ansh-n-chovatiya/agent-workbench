import { changeComposition } from '../scripts/lib/compose/composition.mjs';
import { planRender } from '../scripts/lib/compose/plan.mjs';

// Where the editor fetches narration clips and music from (the export page uses relative voice/ and music/ routes instead).
export const editorAudioUrls = {
  clip: key => `/media/voice/${key}.wav`,
  music: file => `/media/music/${file.split('/').map(encodeURIComponent).join('/')}`,
};

export const initialState = () => ({ project: null, composition: null, plan: null, dirty: false,
  saving: false, error: null, errors: [], past: [], future: [], lastChange: null });
const clone = value => structuredClone(value);
export function reducer(state, action) {
  switch (action.type) {
    case 'load': return { ...initialState(), project: action.project, composition: clone(action.project.composition) };
    case 'change': {
      if (JSON.stringify(action.composition) === JSON.stringify(state.composition)) return state;
      const coalesce = action.path && !state.future.length && state.lastChange?.path === action.path
        && action.now >= state.lastChange.now && action.now - state.lastChange.now < 600;
      return { ...state, composition: clone(action.composition), dirty: true, error: null, errors: [], future: [],
        past: coalesce ? state.past : [...state.past, clone(state.composition)].slice(-100),
        lastChange: { path: action.path, now: action.now } };
    }
    case 'undo':
    case 'redo': {
      const undo = action.type === 'undo', from = undo ? 'past' : 'future', to = undo ? 'future' : 'past';
      if (!state[from].length) return state;
      return { ...state, composition: clone(state[from].at(-1)), [from]: state[from].slice(0, -1),
        [to]: [...state[to], clone(state.composition)].slice(-100), lastChange: null, dirty: true, error: null, errors: [] };
    }
    default: return state;
  }
}
export async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options,
    headers: { 'content-type': 'application/json', ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error ?? data.errors?.join('\n') ?? `Request failed (${response.status})`), { errors: data.errors ?? [] });
  return data;
}
// Sends raw bytes (an audio file) and reads the JSON answer, with the same error shape as request().
export async function upload(url, body, type = 'application/octet-stream', options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', method: 'POST', body, headers: { 'content-type': type }, ...options });
  let data = {};
  try { data = await response.json(); } catch { /* an empty or non-JSON error body */ }
  if (!response.ok) throw Object.assign(new Error(data.error ?? data.errors?.join('\n') ?? `Upload failed (${response.status})`), { errors: data.errors ?? [], status: response.status });
  return data;
}
export function createEditorStore({ api = request, debounce = 800 } = {}) {
  let state = initialState(), sourceSize, timer, pending, disposed = false;
  const listeners = new Set();
  const publish = patch => { if (!disposed) { state = { ...state, ...patch }; listeners.forEach(fn => fn(state)); } };
  function rebuild() {
    if (!state.project || !sourceSize) return;
    try { publish({ plan: planRender({ ...state.project, scenes: undefined, composition: state.composition, sourceSize, voiceClips: state.project.clips ?? null, audioUrls: editorAudioUrls, brandBase: '/media/brand/' }), error: null, errors: [] }); }
    catch (error) { publish({ plan: null, error: error.message, errors: error.message.split('\n') }); }
  }
  function dispatch(action) {
    const next = reducer(state, action);
    if (next === state) return;
    publish(next); rebuild(); clearTimeout(timer);
    if (state.dirty) timer = setTimeout(() => { save().catch(() => {}); }, debounce);
  }
  async function save() {
    clearTimeout(timer);
    if (pending) {
      try { await pending; }
      catch (error) { if (state.error) throw error; }
      return save();
    }
    if (!state.dirty) return;
    const snapshot = state.composition;
    publish({ saving: true });
    pending = (async () => {
      try {
        await api('/api/composition', { method: 'PUT', body: JSON.stringify(snapshot) });
        if (state.composition === snapshot) publish({ dirty: false, error: null, errors: [] });
      } catch (error) {
        if (state.composition === snapshot) publish({ error: error.message, errors: error.errors ?? [] });
        throw error;
      } finally { pending = null; publish({ saving: false }); }
    })();
    await pending;
    if (state.dirty && state.composition !== snapshot) return save();
  }
  return {
    getState: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async load() {
      try { dispatch({ type: 'load', project: await api('/api/project') }); }
      catch (error) { publish({ error: error.message }); }
    },
    setSourceSize(size) { sourceSize = size; rebuild(); },
    // Server-side facts that are not part of the composition (voice clips, engine state, last export). Not undoable.
    setProject(patch) { if (!state.project) return; publish({ project: { ...state.project, ...patch } }); rebuild(); },
    setComposition(composition, path = null) { dispatch({ type: 'change', composition, path, now: Date.now() }); },
    change(path, value, options) { this.setComposition(changeComposition(state.composition, path, value, options), path); },
    undo: () => dispatch({ type: 'undo' }), redo: () => dispatch({ type: 'redo' }), save,
    dispose() { disposed = true; clearTimeout(timer); listeners.clear(); },
  };
}
