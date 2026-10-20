import { outputAt } from '../scripts/lib/compose/timemap.mjs';
export const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
export const clock = t => `${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')}`;
// Short labels for pills and ruler ticks: 0:05, 1:30; tenths only when the step is finer than a second.
export function shortClock(t,{tenths = false} = {}) {
  const m = Math.floor(t/60), s = t-m*60;
  return tenths ? `${m}:${s.toFixed(1).padStart(4,'0')}` : `${m}:${String(Math.round(s)).padStart(2,'0')}`;
}
export function displayTime(map,t,output) {
  if (!output || !map) return t;
  return outputAt(map,t) ?? map.segments.find(s => s.start >= t)?.outputStart ?? map.mainEnd;
}
export function snapTime(t,{points = [],px = t => t,alt = false,duration,fps = 60}) {
  t = clamp(t,0,duration);
  if (!alt) {
    const nearest = points.reduce((best,p) => best === null || Math.abs(px(p)-px(t)) < Math.abs(px(best)-px(t)) ? p : best,null);
    if (nearest !== null && Math.abs(px(nearest)-px(t)) < 8) t = nearest;
  }
  return clamp(Math.round(t*fps)/fps,0,duration);
}
export function itemRange(c,selection,cues = []) {
  if (selection?.type === 'zoom') {
    const z = c.zoom.regions.find(z => z.id === selection.id);
    return z && {start:z.tStart,end:z.tEnd};
  }
  if (selection?.type === 'caption') return (c.captions.cues ?? cues).find(q => q.id === selection.id);
  return null;
}

// Layers. Clip and Zoom are always shown; the others appear when they have content or were added from Add Layer.
export const LAYERS = Object.freeze([
  {id:'clip',label:'Clip',always:true},
  {id:'zoom',label:'Zoom',always:true},
  {id:'captions',label:'Captions',hint:'Double-click to add a caption (C)'},
  {id:'voice',label:'Voice',hint:'Voice-overs appear here once they are generated in Audio'},
  {id:'music',label:'Music',hint:'Add background music in Audio'},
]);
export function layerRows({cues = 0,voice = 0,music = false,added = {}} = {}) {
  const present = {clip:true,zoom:true,captions:cues > 0 || !!added.captions,voice:voice > 0 || !!added.voice,music:!!music || !!added.music};
  return LAYERS.filter(l => present[l.id]).map(l => l.id);
}
export const missingLayers = rows => LAYERS.filter(l => !l.always && !rows.includes(l.id));

// Row heights fill the available height: every row grows from its minimum towards its maximum, the Clip track fastest.
export const ROW_SIZES = Object.freeze({clip:{min:44,max:96,weight:1.6},zoom:{min:44,max:72,weight:1},captions:{min:28,max:56,weight:1},voice:{min:28,max:56,weight:1},music:{min:28,max:56,weight:1}});
export function rowHeights(available,rows) {
  const heights = Object.fromEntries(rows.map(id => [id,ROW_SIZES[id].min]));
  let spare = available-rows.reduce((sum,id) => sum+ROW_SIZES[id].min,0);
  let open = rows.filter(id => heights[id] < ROW_SIZES[id].max);
  while (spare > 0.5 && open.length) {
    const weights = open.reduce((sum,id) => sum+ROW_SIZES[id].weight,0);
    let used = 0;
    for (const id of open) {
      const grow = Math.min(ROW_SIZES[id].max-heights[id],spare*ROW_SIZES[id].weight/weights);
      heights[id] += grow; used += grow;
    }
    spare -= used; open = open.filter(id => heights[id] < ROW_SIZES[id].max-1e-6);
    if (used < 1e-6) break;
  }
  // Past every maximum the rows keep growing by weight: the timeline never shows dead space under the tracks.
  if (spare > 0.5 && rows.length) {
    const weights = rows.reduce((sum,id) => sum+ROW_SIZES[id].weight,0);
    for (const id of rows) heights[id] += spare*ROW_SIZES[id].weight/weights;
  }
  for (const id of rows) heights[id] = Math.round(heights[id]);
  // Rounding each row can leave a pixel short of the target; the Clip row absorbs it.
  const target = Math.round(Math.max(available,rows.reduce((sum,id) => sum+ROW_SIZES[id].min,0))), total = rows.reduce((sum,id) => sum+heights[id],0);
  if (heights.clip !== undefined && Math.abs(target-total) <= rows.length && heights.clip+target-total >= ROW_SIZES.clip.min) heights.clip += target-total;
  return heights;
}

// Ruler ticks: the major step is the smallest one that keeps labels at least 72 px apart; minor ticks subdivide it.
const STEPS = [[0.1,2],[0.2,2],[0.5,5],[1,4],[2,4],[5,5],[10,5],[15,3],[30,3],[60,4],[120,4],[300,5],[600,5],[1800,3],[3600,4]];
export function tickPlan(scale,minLabelPx = 72) {
  const [major,divisions] = STEPS.find(([step]) => step*scale >= minLabelPx) ?? STEPS.at(-1);
  return {major,minor:major/divisions,tenths:major < 1};
}
export function ticks(extent,scale,minLabelPx) {
  const plan = tickPlan(scale,minLabelPx), out = [];
  const count = Math.floor(extent/plan.minor+1e-6);
  for (let i=0;i<=count;i++) {
    const t = +(i*plan.minor).toFixed(6), isMajor = Math.abs(t/plan.major-Math.round(t/plan.major)) < 1e-6;
    out.push({t,major:isMajor,label:isMajor ? shortClock(t,{tenths:plan.tenths}) : null});
  }
  return out;
}

// Timeline zoom: pixels per second between "whole recording fits" and 800 px/s, mapped to a 0..100 slider on a log scale.
export const MAX_SCALE = 800;
export function fitScale(widthPx,extent) {
  if (!(extent > 0) || !(widthPx > 0)) return 80;
  return clamp((widthPx-2)/extent,2,MAX_SCALE);
}
export function sliderFromScale(scale,min,max = MAX_SCALE) {
  if (!(max > min)) return 0;
  return clamp(Math.round(100*Math.log(clamp(scale,min,max)/min)/Math.log(max/min)),0,100);
}
export function scaleFromSlider(value,min,max = MAX_SCALE) {
  if (!(max > min)) return min;
  return clamp(min*Math.pow(max/min,clamp(value,0,100)/100),min,max);
}
// Whether the user has edited anything (the legend hides as soon as they have).
export function hasUserEdits(c) {
  if (!c) return false;
  const e = c.edits ?? {};
  return [e.splits,e.trims,e.speeds,e.mutes,e.holds].some(list => list?.length > 0) || (c.zoom?.regions ?? []).some(z => z.source === 'manual') || (c.captions?.cues?.length ?? 0) > 0;
}
