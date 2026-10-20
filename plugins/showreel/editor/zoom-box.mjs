import { zoomDepth, zoomOptions, validateComposition } from '../scripts/lib/compose/composition.mjs';
import { suggestZoomRegions } from '../scripts/lib/compose/zoom.mjs';
export const DEPTH_PRESETS = Object.freeze([1.25,1.5,1.8,2.2,3.5,5]);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export function snapDepth(d) {
  d = clamp(d,1.05,5);
  const nearest = DEPTH_PRESETS.reduce((a,b) => Math.abs(b-d) < Math.abs(a-d) ? b : a);
  return Math.abs(nearest-d)/nearest <= .03 + 1e-9 ? nearest : d;
}
function size(viewport) {
  const width = viewport.width ?? viewport.w, height = viewport.height ?? viewport.h;
  if (!(width > 0 && height > 0) || !Number.isFinite(width+height)) throw new Error('Viewport must have a positive width and height.');
  return {width,height};
}
export function zoomBox(region,viewport) {
  const {width:W,height:H} = size(viewport), d = clamp(zoomDepth(region.depth),1.05,5);
  const w = W/d, h = H/d, focus = region.keyframes?.[0] ?? {x:W/2,y:H/2};
  return {x:clamp(focus.x-w/2,0,W-w),y:clamp(focus.y-h/2,0,H-h),w,h};
}
function patch(region,box,depth = region.depth) {
  return {depth,keyframes:[{t:region.tStart,x:box.x+box.w/2,y:box.y+box.h/2}]};
}
export function moveZoomBox(region,dx,dy,viewport) {
  const {width:W,height:H} = size(viewport), b = zoomBox(region,viewport);
  return patch(region,{...b,x:clamp(b.x+dx,0,W-b.w),y:clamp(b.y+dy,0,H-b.h)});
}
// Opposite corner stays fixed. Project the pointer onto the aspect-ratio diagonal.
export function resizeZoomBox(region,corner,point,viewport) {
  const {width:W,height:H} = size(viewport), b = zoomBox(region,viewport);
  const left = /^(?:nw|sw|tl|bl|top-left|bottom-left)$/.test(corner), top = /^(?:nw|ne|tl|tr|top-left|top-right)$/.test(corner);
  const ax = left ? b.x+b.w : b.x, ay = top ? b.y+b.h : b.y;
  const sx = left ? -1 : 1, sy = top ? -1 : 1, aspect = H/W;
  const projected = ((point.x-ax)*sx + (point.y-ay)*sy*aspect)/(1+aspect*aspect);
  const maxWidth = Math.min(left ? ax : W-ax,(top ? ay : H-ay)/aspect,W/1.05);
  let depth = snapDepth(W/clamp(projected,W/5,Math.max(W/5,maxWidth)));
  // A snapped preset may extend beyond the viewport: contain it around the same corner.
  const w = W/depth,h = H/depth;
  return patch(region,{x:clamp(left ? ax-w : ax,0,W-w),y:clamp(top ? ay-h : ay,0,H-h),w,h},depth);
}
export function setZoomMode(c,regionId,mode,context = {}) {
  if (!['auto','manual'].includes(mode)) throw new Error('Choose Auto or Manual.');
  const next = structuredClone(c), region = next.zoom.regions.find(z => z.id === regionId);
  if (!region) throw new Error('Zoom region no longer exists.');
  if (mode === 'manual') {
    const t = context.sourceT ?? context.time ?? region.tStart;
    const focus = context.focus ?? region.keyframes.findLast(k => k.t <= t) ?? region.keyframes[0];
    region.keyframes = [{t:region.tStart,x:focus.x,y:focus.y}];
  } else {
    const events = context.events ?? context.project?.events, record = context.record ?? context.project?.record;
    if (!events || !record) throw new Error('Recording targets are required for Auto zoom.');
    const candidates = suggestZoomRegions({events,record,options:zoomOptions(next.zoom)});
    const match = candidates.find(z => z.tStart < region.tEnd && z.tEnd > region.tStart);
    if (match) region.keyframes = [{...match.keyframes[0],t:region.tStart},...match.keyframes.slice(1).filter(k => k.t > region.tStart && k.t <= region.tEnd)];
  }
  region.source = mode;
  // Persist this choice: global suggestion must not replace the selected region on rebuild.
  next.zoom.autoSuggest = false;
  const result = validateComposition(next,{duration:context.duration ?? context.record?.durationSec});
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return next;
}
