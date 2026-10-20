// A lazy filmstrip for the Clip track: small frames decoded once on a fixed time grid, cached for the session.
// Decoding never blocks the UI (each frame is awaited) and any failure leaves the strip on its gradient fallback.
import { Input, UrlSource, MP4, CanvasSink } from 'mediabunny';

export const THUMB_HEIGHT = 72;
// At most ~120 frames per recording, never closer than half a second.
export function thumbnailStep(duration) {
  if (!(duration > 0)) return 0.5;
  return Math.max(0.5,Math.ceil(duration/120*2)/2);
}
export function thumbnailTimes(duration,step = thumbnailStep(duration)) {
  const out = [];
  for (let t=step/2;t<duration;t+=step) out.push(+t.toFixed(3));
  return out.length ? out : [Math.max(0,duration/2)];
}
// Which cached frame to draw for a time: the nearest grid frame, or null when it is not decoded yet.
export function nearestThumb(frames,times,t) {
  if (!times.length) return null;
  let best = 0;
  for (let i=1;i<times.length;i++) if (Math.abs(times[i]-t) < Math.abs(times[best]-t)) best = i;
  return frames[best] ?? null;
}
// Slots across a block of `widthPx`: each slot is one frame wide, mapped linearly onto the block's own time span.
export function stripSlots(widthPx,heightPx,start,end,aspect = 16/9) {
  const slot = Math.max(16,Math.round(heightPx*aspect));
  const out = [];
  for (let x=0;x<widthPx;x+=slot) {
    const t = start+(end-start)*Math.min(1,(x+slot/2)/widthPx);
    out.push({x,width:slot,t});
  }
  return out;
}

export function createThumbnailStrip({url = '/media/raw.mp4',duration,height = THUMB_HEIGHT,onUpdate = () => {},open = openSink} = {}) {
  const times = thumbnailTimes(duration), frames = new Array(times.length).fill(null);
  let status = 'idle', closed = false, started = false, input = null, aspect = 16/9, pending = false;
  const notify = () => { if (pending || closed) return; pending = true; (globalThis.requestAnimationFrame ?? setTimeout)(() => { pending = false; if (!closed) onUpdate(); }); };
  async function start() {
    if (started || closed) return; started = true; status = 'loading'; notify();
    try {
      const sink = await open(url,height);
      input = sink.input; aspect = sink.aspect;
      for await (const frame of sink.frames(times)) {
        if (closed) break;
        if (frame) { frames[frame.index] = frame.canvas; notify(); }
      }
      status = closed ? status : 'ready';
    } catch { status = 'error'; }
    notify();
  }
  return {
    times, frames, get status() { return status; }, get aspect() { return aspect; },
    start, at: t => nearestThumb(frames,times,t),
    close() { closed = true; try { input?.dispose(); } catch { /* already disposed */ } },
  };
}
async function openSink(url,height) {
  const input = new Input({ source: new UrlSource(url,{ requestInit: { credentials: 'same-origin' }, maxCacheSize: 8*1024*1024, getRetryDelay: () => null }), formats: [MP4] });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !await track.canDecode()) throw new Error('No decodable video');
    const width = await track.getDisplayWidth(), h = await track.getDisplayHeight();
    const sink = new CanvasSink(track,{ poolSize: 0, height });
    return { input, aspect: width/h, frames: async function* (times) {
      let index = 0;
      for await (const wrapped of sink.canvasesAtTimestamps(times)) { yield wrapped ? {index,canvas:wrapped.canvas} : null; index++; }
    } };
  } catch (error) { input.dispose(); throw error; }
}
