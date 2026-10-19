import test from 'node:test';
import assert from 'node:assert/strict';
import { reducer, initialState, createEditorStore } from '../editor/state.js';
import { sourceCrop } from '../scripts/lib/compose/draw.js';
import { resolveComposition } from '../scripts/lib/compose/composition.mjs';

const project = () => ({ name: 'Demo', runId: 'r1', composition: resolveComposition({ run: { id: 'r1' }, cards: { title: { enabled: false } } }),
  brief: {}, storyboard: { steps: [] }, record: { durationSec: 4, scale: { used: 2 } },
  events: { viewport: { width: 640, height: 360 }, cursor: [], clicks: [], steps: [], keys: [], targets: [] } });
function edit(state, path, value, now) {
  const composition = structuredClone(state.composition);
  composition.frame.radiusPx = value;
  return reducer(state, { type: 'change', composition, path, now });
}
test('snapshot history coalesces adjacent changes to the same path only within 600 ms', () => {
  const loaded = reducer(initialState(), { type: 'load', project: project() });
  let state = edit(loaded, 'frame.radiusPx', 15, 0);
  state = edit(state, 'frame.radiusPx', 20, 599);
  assert.equal(state.past.length, 1);
  state = edit(state, 'frame.radiusPx', 25, 1199);
  assert.equal(state.past.length, 2);
  state = edit(state, 'other', 30, 1200);
  assert.equal(state.past.length, 3);
  state = reducer(state, { type: 'undo' }); assert.equal(state.composition.frame.radiusPx, 25);
  state = reducer(state, { type: 'undo' }); assert.equal(state.composition.frame.radiusPx, 20);
  state = reducer(state, { type: 'redo' }); assert.equal(state.composition.frame.radiusPx, 25);
  assert.equal(loaded.composition.frame.radiusPx, 14);
});
test('new edits discard redo, snapshots do not alias, history is capped at 100', () => {
  let state = reducer(initialState(), { type: 'load', project: project() });
  for (let i = 0; i < 110; i++) state = edit(state, 'radius', i, i * 700);
  assert.equal(state.past.length, 100);
  state = reducer(state, { type: 'undo' });
  state = edit(state, 'radius', 200, 77001);
  assert.equal(state.future.length, 0);
  const action = { type: 'change', composition: structuredClone(state.composition), path: 'radius', now: 80000 };
  action.composition.frame.radiusPx = 201;
  state = reducer(state, action); action.composition.frame.radiusPx = 1;
  assert.equal(state.composition.frame.radiusPx, 201);
  const unchanged = reducer(state, { type: 'change', composition: structuredClone(state.composition) });
  assert.equal(unchanged, state);
});
test('store builds plans with actual source size, reports invalid paths, and recovers after undo', async () => {
  const store = createEditorStore({ api: async () => project(), debounce: 100000 });
  try {
    store.setSourceSize({ width: 1280, height: 720 }); await store.load();
    assert.deepEqual(store.getState().plan.sourceSize, { width: 1280, height: 720 });
    store.change('output.fps', 12);
    assert.equal(store.getState().plan, null);
    assert.match(store.getState().errors.join(), /output.fps/);
    store.undo(); assert.equal(store.getState().plan.output.fps, 60);
  } finally { store.dispose(); }
});
test('autosave debounces changes, forwards validator errors and retry clears the error', async () => {
  let saves = 0, reject = true;
  const store = createEditorStore({ debounce: 5, api: async (url, options) => {
    if (!options) return project();
    saves++;
    if (reject) throw Object.assign(new Error('Invalid radius'), { errors: ['composition.json: "frame.radiusPx" invalid'] });
    return { ok: true };
  } });
  try {
    await store.load(); store.change('frame.radiusPx', 20); store.change('frame.radiusPx', 21);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(saves, 1); assert.equal(store.getState().dirty, true);
    assert.match(store.getState().errors[0], /frame.radiusPx/);
    reject = false; await store.save();
    assert.equal(store.getState().dirty, false); assert.equal(store.getState().error, null);
  } finally { store.dispose(); }
});
test('saves are serialized and edits during a request remain dirty until their own save completes', async () => {
  const writes = [], gates = [];
  const store = createEditorStore({ debounce: 100000, api: async (url, options) => {
    if (!options) return project();
    writes.push(JSON.parse(options.body));
    await new Promise(resolve => gates.push(resolve));
  } });
  try {
    await store.load(); store.change('frame.radiusPx', 20);
    const saved = store.save();
    store.change('frame.radiusPx', 22);
    const flush = store.save();
    assert.equal(writes.length, 1); assert.equal(store.getState().dirty, true);
    gates.shift()();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(writes.length, 2); assert.equal(store.getState().dirty, true);
    gates.shift()(); await Promise.all([saved, flush]);
    assert.deepEqual(writes.map(c => c.frame.radiusPx), [20, 22]);
    assert.equal(store.getState().dirty, false); assert.equal(store.getState().saving, false);
  } finally { store.dispose(); }
});

test('a failed obsolete save cannot prevent a waiting newer revision from saving', async () => {
  let rejectFirst, calls = 0;
  const store = createEditorStore({ debounce: 100000, api: async (url, options) => {
    if (!options) return project();
    if (++calls === 1) await new Promise((resolve, reject) => { rejectFirst = reject; });
    return { ok: true };
  } });
  try {
    await store.load(); store.change('frame.radiusPx', 20);
    const first = store.save();
    store.change('frame.radiusPx', 22);
    const second = store.save();
    rejectFirst(new Error('Old request failed'));
    await assert.rejects(first, /Old request failed/); await second;
    assert.equal(calls, 2); assert.equal(store.getState().dirty, false);
    assert.equal(store.getState().error, null);
  } finally { store.dispose(); }
});

test('timeline gesture commits one snapshot, then undo and redo restore edits and planned output', async () => {
  const { setSpeed, cutRange, addZoomRegion, setZoomFocus, setCaption } = await import('../editor/edit-ops.mjs');
  const source = project(); source.storyboard.steps = [{id:'s1',caption:'Original'}]; source.events.steps = [{id:'s1',tStart:0,tEnd:4}];
  const store = createEditorStore({ api: async () => source, debounce:100000 });
  try {
    store.setSourceSize({width:1280,height:720}); await store.load();
    const original = store.getState().composition, originalDuration = store.getState().plan.timemap.outputDuration;
    const context = {duration:4,plan:store.getState().plan};
    // Pointer motion computes drafts; only the final draft reaches the store.
    let final;
    for (const end of [2,2.5,3]) final = setSpeed(original,1,end,2,context);
    assert.equal(store.getState().past.length,0);
    store.setComposition(final); assert.equal(store.getState().past.length,1);
    assert.equal(store.getState().plan.timemap.outputDuration,originalDuration-1);
    store.undo(); assert.deepEqual(store.getState().composition,original);
    store.redo(); assert.deepEqual(store.getState().composition,final);
    const cut = cutRange(final,0,0.5,context); store.setComposition(cut);
    assert.equal(store.getState().past.length,2);
    let zoom = addZoomRegion(cut,{tStart:1,tEnd:3,x:100,y:100,depth:2},context);
    zoom = setZoomFocus(zoom,zoom.zoom.regions[0].id,2,300,200,context); store.setComposition(zoom);
    const caption = setCaption(zoom,'s1',{text:'Edited'},context); store.setComposition(caption);
    assert.equal(store.getState().plan.cues[0].text,'Edited');
    store.undo(); assert.equal(store.getState().plan.cues[0].text,'Original');
    store.undo(); assert.deepEqual(store.getState().composition,cut);
  } finally { store.dispose(); }
});

test('large real source dimensions reach the plan independently of reduced preview pixels', async () => {
  const store = createEditorStore({ api: async () => project(), debounce: 100000 });
  try {
    const realSize = { width: 3206, height: 1804 };
    store.setSourceSize(realSize); await store.load();
    const plan = store.getState().plan;
    assert.deepEqual(plan.sourceSize, realSize);
    assert.equal(plan.scale, 2);
    const camera = { cx: 900, cy: 500, z: 2 };
    const full = sourceCrop(plan, camera, realSize);
    const preview = sourceCrop(plan, camera, { width: 1600, height: 900 });
    assert.equal(preview.x / 1600, full.x / realSize.width);
    assert.equal(preview.y / 900, full.y / realSize.height);
    assert.deepEqual(plan.sourceSize, realSize);
  } finally { store.dispose(); }
});

test('voice clips and music reach the plan through the editor URL builders, and setProject refreshes the plan without touching history', async () => {
  const withSteps = () => ({ ...project(), storyboard: { steps: [{ id: 's1', narration: 'Hello there' }] },
    events: { ...project().events, steps: [{ id: 's1', tStart: 0.5, holdStart: 1, tEnd: 3 }] } });
  const store = createEditorStore({ api: async () => withSteps(), debounce: 100000 });
  try {
    store.setSourceSize({ width: 1280, height: 720 }); await store.load();
    assert.equal(store.getState().plan.audio.enabled, false);
    store.change('audio.voice.enabled', true);
    assert.equal(store.getState().plan.audio.narration.length, 0, 'no clip yet');
    const past = store.getState().past.length;
    store.setProject({ clips: { version: 1, steps: { s1: 'abc123' }, clips: { abc123: { durationSec: 1.5, source: 'tts', text: 'Hello there', voice: 'af_heart', speed: 1 } } } });
    const audio = store.getState().plan.audio;
    assert.deepEqual(audio.narration.map(n => n.clipUrl), ['/media/voice/abc123.wav']);
    assert.equal(store.getState().past.length, past); assert.equal(store.getState().dirty, true);
    store.change('audio.music.file', 'music/my song-1.mp3'); store.change('audio.music.enabled', true);
    assert.equal(store.getState().plan.audio.music.url, '/media/music/music/my%20song-1.mp3');
    store.setProject({ lastExport: { integratedLufs: -16 } });
    assert.equal(store.getState().project.lastExport.integratedLufs, -16); assert.ok(store.getState().plan);
  } finally { store.dispose(); }
});
