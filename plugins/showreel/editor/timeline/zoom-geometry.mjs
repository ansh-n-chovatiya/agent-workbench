// Pure geometry for zoom regions on the timeline: regions never overlap, so every create, move or resize is
// clamped against its neighbours and reports the edge it was clamped to (drawn as a snap guide).
const EPS = 1e-6;
export const MIN_ZOOM_SEC = 0.2;
export const DEFAULT_ZOOM_SEC = 2;
const frame = t => Math.round(t*60)/60;

export const regionAt = (regions,t,excludeId = null) => regions.find(z => z.id !== excludeId && z.tStart <= t+EPS && t < z.tEnd-EPS) ?? null;

// The free interval around t (or around a region when its id is excluded). null when t sits inside another region.
export function freeGap(regions,t,{excludeId = null,duration = Infinity} = {}) {
  if (regionAt(regions,t,excludeId)) return null;
  let lo = 0, hi = duration;
  for (const z of regions) {
    if (z.id === excludeId) continue;
    if (z.tEnd <= t+EPS) lo = Math.max(lo,z.tEnd);
    if (z.tStart >= t-EPS) hi = Math.min(hi,z.tStart);
  }
  return {lo,hi};
}

// Clamp a moved or resized range into the gap its original position occupies. `mode` is move|start|end.
export function clampZoomRange(regions,range,{excludeId = null,duration = Infinity,mode = 'move',original = range} = {}) {
  const gap = freeGap(regions,(original.start+original.end)/2,{excludeId,duration}) ?? {lo:original.start,hi:original.end};
  const min = Math.min(MIN_ZOOM_SEC,original.end-original.start);
  let {start,end} = range, guide = null;
  if (mode === 'move') {
    const length = original.end-original.start;
    const lo = gap.lo, hi = Math.max(lo,gap.hi-length);
    const clamped = Math.max(lo,Math.min(hi,start));
    if (clamped !== start) guide = clamped === lo ? lo : gap.hi;
    start = clamped; end = start+length;
  } else if (mode === 'start') {
    const clamped = Math.max(gap.lo,Math.min(original.end-min,start));
    if (clamped !== start && clamped === gap.lo) guide = gap.lo;
    start = clamped; end = original.end;
  } else {
    const clamped = Math.min(gap.hi,Math.max(original.start+min,end));
    if (clamped !== end && clamped === gap.hi) guide = gap.hi;
    end = clamped; start = original.start;
  }
  if (guide !== null && (guide <= EPS || guide >= duration-EPS)) guide = null;
  return {start:frame(start),end:frame(end),guide};
}

// Dragging on empty track space from t0 to t1 proposes a region inside the gap around t0. null when t0 is inside a region.
export function dragCreateRange(regions,t0,t1,{duration = Infinity} = {}) {
  const gap = freeGap(regions,t0,{duration});
  if (!gap) return null;
  let start = Math.max(gap.lo,Math.min(t0,t1)), end = Math.min(gap.hi,Math.max(t0,t1)), guide = null;
  if (t1 < gap.lo && gap.lo > EPS) guide = gap.lo;
  if (t1 > gap.hi && gap.hi < duration-EPS) guide = gap.hi;
  start = frame(start); end = frame(end);
  return {start,end,guide,valid:end-start >= MIN_ZOOM_SEC-EPS};
}

// Where a new zoom goes when added at t: the existing region there, or the longest range up to `length` that fits.
export function zoomPlacement(regions,t,{duration = Infinity,length = DEFAULT_ZOOM_SEC} = {}) {
  const existing = regionAt(regions,t);
  if (existing) return {existing};
  const gap = freeGap(regions,t,{duration});
  const start = frame(Math.max(gap.lo,t)), end = frame(Math.min(gap.hi,start+length,duration));
  if (end-start < MIN_ZOOM_SEC-EPS) return null;
  return {start,end};
}

// A copy placed right after the region, shortened to the room before the next region.
export function duplicateRange(regions,region,{duration = Infinity} = {}) {
  const length = region.tEnd-region.tStart, next = regions.filter(z => z.tStart >= region.tEnd-EPS).sort((a,b) => a.tStart-b.tStart)[0];
  const start = frame(region.tEnd), end = frame(Math.min(duration,next?.tStart ?? duration,start+length));
  if (end-start < MIN_ZOOM_SEC-EPS) return null;
  return {start,end};
}
