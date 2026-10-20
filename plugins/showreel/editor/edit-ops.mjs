import { validateComposition, zoomOptions } from '../scripts/lib/compose/composition.mjs';
import { suggestZoomRegions } from '../scripts/lib/compose/zoom.mjs';
import { keptParts } from '../scripts/lib/audio/retime.mjs';
import { MAX_HOLD_SEC } from '../scripts/lib/compose/timemap.mjs';

export const snapFrame = t => Math.round(t * 60) / 60;
const clone = c => structuredClone(c);
const overlap = (a, b) => a.start < b.end && b.start < a.end;
// Recording duration and generated source-time cues live in the render plan, not composition.json.
function range(start, end, { duration = Infinity } = {}) {
  start = snapFrame(start); end = end === duration ? duration : Math.min(duration, snapFrame(end));
  if (!Number.isFinite(start + end) || start < 0 || end > duration || end - start < 1 / 60 - 1e-9) throw new Error('Choose a valid range inside the recording.');
  return { start, end };
}
function finish(c, { duration } = {}) {
  const result = validateComposition(c, duration === undefined ? {} : { duration });
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return c;
}
function merge(ranges, speed = false) {
  return ranges.sort((a,b) => a.start - b.start).reduce((out,r) => {
    const last = out.at(-1);
    if (last && r.start <= last.end + 1e-9 && (!speed || last.rate === r.rate)) last.end = Math.max(last.end,r.end);
    else out.push({ ...r });
    return out;
  }, []);
}
const subtract = (ranges, cut) => ranges.flatMap(r => !overlap(r,cut) ? [r] : [
  ...(r.start < cut.start ? [{ ...r, end: cut.start }] : []),
  ...(r.end > cut.end ? [{ ...r, start: cut.end }] : []),
]);
// Persist a boundary and preserve each speed fragment on either side.
export function splitAt(c, t, context = {}) {
  t = snapFrame(t);
  const duration = context.duration ?? Infinity, splits = c.edits.splits ?? [];
  if (!Number.isFinite(t) || t < 0.1 - 1e-9 || duration-t < 0.1 - 1e-9) throw new Error('Split at least 0.1 seconds from a clip edge.');
  if (splits.some(p => Math.abs(p-t) < 0.1 - 1e-9) || c.edits.trims.some(r => t >= r.start && t <= r.end)) return c;
  const next = clone(c);
  next.edits.splits = [...splits,t].sort((a,b) => a-b);
  next.edits.speeds = next.edits.speeds.flatMap(r => r.start < t && r.end > t ? [{...r,end:t},{...r,start:t}] : [r]);
  return finish(next,context);
}
function splitSpeeds(c) {
  c.edits.speeds = c.edits.speeds.flatMap(r => {
    const points = [r.start,...(c.edits.splits ?? []).filter(t => t > r.start && t < r.end),r.end];
    return points.slice(0,-1).map((start,i) => ({start,end:points[i+1],rate:r.rate}));
  });
}
export function cutRange(c, start, end, context = {}) {
  const r = range(start,end,context), next = clone(c);
  if (r.end - r.start < 0.1 - 1e-9) throw new Error('A cut must be at least 0.1 seconds.');
  next.edits.trims = merge([...next.edits.trims,r]);
  if (next.edits.trims.some(t => t.start === 0 && t.end >= context.duration)) throw new Error('Keep at least one frame of the recording.');
  next.edits.speeds = subtract(next.edits.speeds,r);
  next.edits.splits = (next.edits.splits ?? []).filter(t => !next.edits.trims.some(cut => t > cut.start && t < cut.end));
  // A frozen frame inside a removed range goes with it.
  if (next.edits.holds) next.edits.holds = next.edits.holds.filter(h => !(h.t >= r.start && h.t < r.end));
  return finish(next,context);
}
export function restoreRange(c, index, context) {
  if (!c.edits.trims[index]) throw new Error('Removed range no longer exists.');
  const next = clone(c); next.edits.trims.splice(index,1); return finish(next,context);
}
export function setSpeed(c, start, end, rate, context = {}) {
  const r = range(start,end,context);
  if (!Number.isFinite(rate) || rate < 0.25 || rate > 30) throw new Error('Speed must be between 0.25 and 30.');
  if (c.edits.trims.some(t => overlap(t,r))) throw new Error('Restore the removed range before changing its speed.');
  const next = clone(c);
  next.edits.speeds = merge([...subtract(next.edits.speeds,r), ...(rate === 1 ? [] : [{ ...r,rate }])],true);
  splitSpeeds(next);
  return finish(next,context);
}
export function clearSpeed(c,index,context) {
  if (!c.edits.speeds[index]) throw new Error('Speed range no longer exists.');
  const next = clone(c); next.edits.speeds.splice(index,1); return finish(next,context);
}
const uniqueId = (items,prefix) => { let n = 1; while (items.some(r => r.id === `${prefix}${n}`)) n++; return `${prefix}${n}`; };
export function addZoomRegion(c,{ tStart,tEnd,x,y,depth },context = {}) {
  const r = range(tStart,tEnd,context), next = clone(c);
  if (next.zoom.regions.some(z => overlap({start:z.tStart,end:z.tEnd},r))) throw new Error('Zoom regions cannot overlap; choose an empty range.');
  next.zoom.regions.push({id:uniqueId(next.zoom.regions,'manual-'),tStart:r.start,tEnd:r.end,depth,keyframes:[{t:r.start,x,y}],stepIds:[],source:'manual'});
  next.zoom.regions.sort((a,b) => a.tStart-b.tStart); return finish(next,context);
}
export function updateZoomRegion(c,id,patch,context = {}) {
  const next = clone(c), z = next.zoom.regions.find(z => z.id === id);
  if (!z) throw new Error('Zoom region no longer exists.');
  for (const k of Object.keys(patch)) if (!['tStart','tEnd','depth','keyframes'].includes(k)) throw new Error(`Cannot edit zoom ${k}.`);
  const oldStart = z.tStart;
  Object.assign(z,clone(patch),{source:'manual'});
  const r = range(z.tStart,z.tEnd,context); z.tStart = r.start; z.tEnd = r.end;
  if (!patch.keyframes) z.keyframes = z.keyframes.map(k => ({...k,t:Math.max(z.tStart,Math.min(z.tEnd,k.t + z.tStart-oldStart))}));
  z.keyframes.sort((a,b) => a.t-b.t);
  if (z.keyframes.length) z.keyframes[0].t = z.tStart;
  next.zoom.regions.sort((a,b) => a.tStart-b.tStart);
  return finish(next,context);
}
export function deleteZoomRegion(c,id,context) {
  const next = clone(c); next.zoom.regions = next.zoom.regions.filter(z => z.id !== id); next.zoom.autoSuggest = false; return finish(next,context);
}
export function setZoomFocus(c,id,t,x,y,context = {}) {
  const z = c.zoom.regions.find(z => z.id === id);
  if (!z) throw new Error('Zoom region no longer exists.');
  t = Math.max(z.tStart,Math.min(z.tEnd,snapFrame(t)));
  const keyframes = z.keyframes.filter(k => Math.abs(k.t-t) > 1e-9);
  keyframes.push({t,x,y}); return updateZoomRegion(c,id,{keyframes},context);
}
function withCues(c,context = {}) {
  const next = clone(c); next.captions.cues ??= clone(context.plan?.cues ?? context.cues ?? []); return next;
}
export function setCaption(c,id,patch,context = {}) {
  const next = withCues(c,context), cue = next.captions.cues.find(cue => cue.id === id);
  if (!cue) throw new Error('Caption no longer exists.');
  for (const key of Object.keys(patch)) if (!['text','start','end'].includes(key)) throw new Error(`Cannot edit caption ${key}.`);
  Object.assign(cue,patch);
  Object.assign(cue,range(cue.start,cue.end,context));
  next.captions.cues.sort((a,b) => a.start-b.start); return finish(next,context);
}
export function addCaption(c,{text,start,end},context = {}) {
  const next = withCues(c,context), r = range(start,end,context);
  next.captions.cues.push({id:uniqueId(next.captions.cues,'caption-'),text,...r});
  next.captions.cues.sort((a,b) => a.start-b.start); return finish(next,context);
}
export function deleteCaption(c,id,context = {}) {
  const next = withCues(c,context); next.captions.cues = next.captions.cues.filter(cue => cue.id !== id); return finish(next,context);
}
export function autoZoomRegenerate(c,events,record) {
  const next = clone(c), manual = next.zoom.regions.filter(z => z.source === 'manual');
  const auto = suggestZoomRegions({events,record,options:zoomOptions(next.zoom)}).filter(z => !manual.some(m => z.tStart < m.tEnd && z.tEnd > m.tStart));
  auto.forEach((z,i) => { z.id = uniqueId([...manual,...auto.slice(0,i)],'auto-'); });
  next.zoom.regions = [...manual,...auto].sort((a,b) => a.tStart-b.tStart);
  return finish(next,{duration:record.durationSec});
}

// Narration fixes (docs/40 section 7). `context` carries { duration, steps: events.steps, timemap: plan.timemap }.
function lastPart(context, stepId) {
  const step = context.steps?.find(s => s.id === stepId);
  if (!step) throw new Error('That step no longer exists.');
  const part = keptParts(context.timemap,step.tStart,step.tEnd).filter(p => !p.hold).at(-1);
  if (!part) throw new Error('That step was cut, so there is nothing to adjust.');
  return part;
}
// Adds (or lengthens) a hold on the last frame the step shows, so the picture waits for the voice.
export function fixFreeze(c, stepId, overrunSec, context = {}) {
  if (!Number.isFinite(overrunSec) || overrunSec <= 0) throw new Error('There is no overrun to fix.');
  const part = lastPart(context,stepId), t = Math.max(part.srcStart,part.srcEnd - 1/60), extra = Math.ceil(overrunSec*100)/100;
  const next = clone(c); next.edits.holds ??= [];
  const existing = next.edits.holds.find(h => Math.abs(h.t-t) < 1e-9);
  if (existing) existing.duration = +(existing.duration + extra).toFixed(3); else next.edits.holds.push({t,duration:extra});
  next.edits.holds.sort((a,b) => a.t-b.t);
  if (next.edits.holds.some(h => h.duration > MAX_HOLD_SEC)) throw new Error(`A frozen frame can last at most ${MAX_HOLD_SEC} seconds.`);
  return finish(next,context);
}
export const MIN_FIT_RATE = 0.5;
// Slows the end of the step's last visible part just enough that the video lasts as long as the narration.
export function fixSlow(c, stepId, overrunSec, context = {}) {
  if (!Number.isFinite(overrunSec) || overrunSec <= 0) throw new Error('There is no overrun to fix.');
  // Slowing video before the narration begins would also push the narration later, so the slowed span starts at or after it.
  const part = lastPart(context,stepId), base = part.rate, need = overrunSec + 0.02;
  const floor = Math.min(part.srcEnd,Math.max(part.srcStart,Number.isFinite(context.narrationStartSrc) ? Math.ceil(context.narrationStartSrc*60-1e-9)/60 : part.srcStart));
  const rateFor = length => length / (length / base + need);
  let start = part.srcEnd - Math.min(part.srcEnd - floor,Math.max(need*3*base,1));
  if (rateFor(part.srcEnd-snapFrame(start)) < MIN_FIT_RATE) start = floor;
  start = Math.max(floor,snapFrame(start));
  const end = Math.min(part.srcEnd,snapFrame(part.srcEnd)), rate = +rateFor(end-start).toFixed(3);
  if (!(end > start) || rate < MIN_FIT_RATE) throw new Error(`Slowing this step enough would go below ${MIN_FIT_RATE}x. Freeze the last frame instead.`);
  return setSpeed(c,start,end,rate,context);
}

