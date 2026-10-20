import { buildTimeMap, sourceAt, outputAt } from './timemap.mjs';

export const TRANSITIONS = ['cut', 'crossfade', 'slide', 'zoom-through'];
export function sceneOutputAt(map, sceneId, tSrc) {
  const scene = map.scenes.find(s => s.id === sceneId);
  if (!scene) return null;
  const t = outputAt(scene.timemap, tSrc);
  return t === null ? null : scene.outputStart + t;
}
export function sceneSourceAt(map, tOut) {
  const t = Math.max(0, Math.min(map.outputDuration, tOut));
  const cards = sourceAt(map.cardsMap, t);
  const active = map.scenes.findLast(s => t >= s.outputStart) ?? map.scenes[0];
  const local = sourceAt(active.timemap, t - active.outputStart);
  const overlap = cards.section === 'main' && map.transitions.find(x => t >= x.outputStart && t < x.outputEnd);
  const point = id => {
    const s = map.scenes.find(s => s.id === id);
    return { sceneId: id, t: sourceAt(s.timemap, t - s.outputStart).t };
  };
  return { section: cards.section, sceneId: active.id, t: local.t, rate: local.rate,
    alphaTitle: cards.alphaTitle, alphaOutro: cards.alphaOutro,
    transition: overlap ? { type: overlap.type, from: point(overlap.from), to: point(overlap.to),
      progress: (t - overlap.outputStart) / (overlap.outputEnd - overlap.outputStart) } : null };
}

// Each scene retains its original map; this layer only places those maps on a sequence clock.
// Reject triple overlaps rather than silently shortening the requested transition.
export function buildSceneTimeMap({ scenes, lead = 0, tail = 0, fade = 0 }) {
  if (!Array.isArray(scenes) || !scenes.length || scenes.length > 20) throw new Error('scenes must contain 1 to 20 scenes');
  const ids = new Set();
  const entries = scenes.map(s => {
    if (typeof s.id !== 'string' || !s.id || ids.has(s.id)) throw new Error('Scene ids must be unique nonempty strings');
    ids.add(s.id);
    const timemap = buildTimeMap({ duration:s.duration, trims:s.trims, speeds:s.speeds, holds:s.holds });
    if (timemap.outputDuration <= 0) throw new Error(`Scene ${s.id} has no remaining video`);
    return { id:s.id, timemap, transition:s.transition ?? {type:'cut'} };
  });
  const overlaps = entries.map((s,i) => {
    if (i === entries.length-1) return 0;
    const {type, durationSec = 0.5} = s.transition;
    if (!TRANSITIONS.includes(type)) throw new Error(`Scene ${s.id}: invalid transition`);
    if (type === 'cut') return 0;
    if (!Number.isFinite(durationSec) || durationSec < 0.2 || durationSec > 1.5) throw new Error(`Scene ${s.id}: transition duration must be 0.2 to 1.5 seconds`);
    return durationSec;
  });
  entries.forEach((s,i) => {
    if ((overlaps[i-1] ?? 0) + overlaps[i] > s.timemap.outputDuration) throw new Error(`Scene ${s.id} is too short for its transitions`);
  });
  const duration = entries.reduce((sum,s,i) => sum+s.timemap.outputDuration-overlaps[i],0);
  const cardsMap = buildTimeMap({duration,lead,tail,fade});
  let next = cardsMap.mainStart;
  const transitions = [];
  const placed = entries.map((s,i) => {
    const outputStart = next, outputEnd = outputStart+s.timemap.outputDuration;
    next = outputEnd-overlaps[i];
    if (overlaps[i]) transitions.push({type:s.transition.type, from:s.id, to:entries[i+1].id, outputStart:next, outputEnd});
    return {...s, outputStart, outputEnd, segments:s.timemap.segments.map(x => ({...x,sceneId:s.id,outputStart:x.outputStart+outputStart,outputEnd:x.outputEnd+outputStart}))};
  });
  const map = {scenes:placed, segments:placed, transitions, cardsMap, duration,
    mainStart:cardsMap.mainStart, mainEnd:cardsMap.mainEnd, titleEnd:cardsMap.titleEnd,
    outroStart:cardsMap.outroStart, outputDuration:cardsMap.outputDuration};
  return {...map,toSource:t=>sceneSourceAt(map,t),toOutput:(id,t)=>sceneOutputAt(map,id,t)};
}
