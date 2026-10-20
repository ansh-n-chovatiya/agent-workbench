import { cutRange, setSpeed, splitAt } from './edit-ops.mjs';

const idOf = t => String(Math.round(t * 1000) / 1000);
const covers = (r,start,end) => r.start <= start + 1e-9 && r.end >= end - 1e-9;
// Include old range edges so existing projects keep an honest speed/mute label per clip.
export function clipsOf(c, duration) {
  if (!(duration > 0)) return [];
  const { splits = [], trims = [], speeds = [], mutes = [] } = c.edits;
  const points = [...new Set([0,duration,...splits,...[trims,speeds,mutes].flatMap(rs => rs.flatMap(r => [r.start,r.end]))])]
    .filter(t => t >= 0 && t <= duration).sort((a,b) => a-b);
  return points.slice(0,-1).map((start,i) => {
    const end = points[i+1];
    return {id:idOf(start),start,end,rate:speeds.find(r => covers(r,start,end))?.rate ?? 1,
      deleted:trims.some(r => covers(r,start,end)),muted:mutes.some(r => covers(r,start,end))};
  });
}
export const splitClipAt = (c,t,context = {}) => splitAt(c,t,context);
export const setClipSpeed = (c,clip,rate,context = {}) => setSpeed(c,clip.start,clip.end,rate,context);
export const deleteClip = (c,clip,context = {}) => cutRange(c,clip.start,clip.end,context);
function subtract(ranges,clip) {
  return ranges.flatMap(r => r.end <= clip.start || r.start >= clip.end ? [r] : [
    ...(r.start < clip.start ? [{start:r.start,end:clip.start}] : []),
    ...(r.end > clip.end ? [{start:clip.end,end:r.end}] : []),
  ]);
}
export function restoreClip(c,clip) {
  const next = structuredClone(c);
  next.edits.trims = subtract(next.edits.trims,clip);
  return next;
}
export function setClipMuted(c,clip,muted) {
  const next = structuredClone(c), ranges = subtract(next.edits.mutes ?? [],clip);
  if (muted) ranges.push({start:clip.start,end:clip.end});
  next.edits.mutes = ranges.sort((a,b) => a.start-b.start).reduce((out,r) => {
    const last = out.at(-1);
    if (last && last.end >= r.start) last.end = Math.max(last.end,r.end); else out.push(r);
    return out;
  },[]);
  return next;
}
