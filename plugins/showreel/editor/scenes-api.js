import { buildTimeMap } from '../scripts/lib/compose/timemap.mjs';
// Task D boundary: preserve every unknown field and send the complete scenes document.
export const TRANSITIONS = ['cut','crossfade','slide','zoom-through'];
export function sceneRows(document,project={},plan=null) {
  if(!Array.isArray(document?.scenes))return [];
  return document.scenes.filter(s=>s&&typeof s==='object').map((scene,index)=>{
    const planned=plan?.scenes?.find?.(s=>s.id===scene.id), run=(project.runs??[]).find(r=>typeof r==='object'&&(r.id===scene.run||r.runId===scene.run));
    let seconds=planned?.plan?.timemap?.outputDuration??planned?.timemap?.outputDuration??planned?.durationSec??scene.durationSec??run?.durationSec??(scene.run===project.runId?project.record?.durationSec:null);
    if(!planned&&Number.isFinite(seconds)){try{seconds=buildTimeMap({duration:seconds,trims:scene.trims??[],speeds:scene.speeds??[]}).outputDuration;}catch{/* Incomplete metadata is shown without guessing edits. */}}
    return {scene,index,title:scene.title||`Scene ${index+1}`,duration:seconds,transition:scene.transition?.type??'cut'};
  });
}
export function patchScene(document,index,patch) {
  if(!document?.scenes?.[index])throw new Error('Scene no longer exists.');
  const next=structuredClone(document);Object.assign(next.scenes[index],patch);return next;
}
export function reorderScenes(document,from,to) {
  if(!document?.scenes?.[from]||!document.scenes[to])throw new Error('Scene no longer exists.');
  const next=structuredClone(document),[scene]=next.scenes.splice(from,1);next.scenes.splice(to,0,scene);return next;
}
export async function saveScenes(api,document){return api('/api/scenes',{method:'PUT',body:JSON.stringify(document)});}
// Selection is intentionally gated on both data and an actual switching capability.
export function canActivateScene(plan,store){return Array.isArray(plan?.scenes)&&typeof store?.activateScene==='function';}
