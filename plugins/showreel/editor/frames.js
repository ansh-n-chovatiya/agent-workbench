import { Input, UrlSource, MP4, CanvasSink } from 'mediabunny';

export async function openFrames(url = '/media/raw.mp4') {
  const input = new Input({ source: new UrlSource(url, {
    requestInit: { credentials: 'same-origin' }, maxCacheSize: 16 * 1024 * 1024, getRetryDelay: () => null,
  }), formats: [MP4] });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !await track.canDecode()) throw new Error('Recording has no decodable video track');
    const sourceSize = { width: await track.getDisplayWidth(), height: await track.getDisplayHeight() };
    const duration = await track.computeDuration();
    const { averagePacketRate } = await track.computePacketStats();
    // No ring pool: cached canvases must never be overwritten by later decoder output.
    const sink = new CanvasSink(track, { poolSize: 0, width: Math.min(sourceSize.width, 1600) });
    const cache = new Map();
    let closed = false, generation = 0, ahead = null, aheadStart = -Infinity, aheadEnd = -Infinity;
    const remember = frame => {
      if (!frame || closed) return;
      cache.delete(frame.timestamp); cache.set(frame.timestamp, frame);
      while (cache.size > 40) cache.delete(cache.keys().next().value);
    };
    const lookup = t => {
      const frame = [...cache.values()].find(f => f.timestamp <= t && t < f.timestamp + f.duration);
      if (frame) { cache.delete(frame.timestamp); cache.set(frame.timestamp, frame); }
      return frame;
    };
    function stopAhead() {
      generation++; ahead?.return().catch(() => {}); ahead = null;
      aheadStart = aheadEnd = -Infinity;
    }
    return {
      sourceSize, duration, averageFrameRate: averagePacketRate,
      async getFrame(sourceT) {
        if (closed) throw new Error('Frame provider is closed');
        const t = Math.max(0, Math.min(sourceT, duration));
        const cached = lookup(t);
        if (cached) return cached.canvas;
        stopAhead();
        const frame = await sink.getCanvas(t);
        remember(frame);
        return frame?.canvas ?? null;
      },
      prefetch(sourceT, playbackRate = 1) {
        const horizon = 0.75 * Math.max(0.25, Math.abs(playbackRate));
        if (closed || ahead) return;
        const continuing = sourceT >= aheadStart && sourceT <= aheadEnd;
        if (continuing && sourceT < aheadEnd - 0.2) return;
        const start = continuing ? aheadEnd : sourceT;
        aheadStart = sourceT; aheadEnd = Math.min(duration, start + horizon);
        const token = generation;
        const iterator = sink.canvases(start, aheadEnd);
        ahead = iterator;
        (async () => {
          try { for await (const frame of iterator) { if (closed || token !== generation) break; remember(frame); } }
          catch { /* Foreground retrieval reports decode failures. */ }
          finally { if (ahead === iterator) ahead = null; }
        })();
      },
      pause: stopAhead,
      close() { closed = true; stopAhead(); cache.clear(); input.dispose(); },
    };
  } catch (error) { input.dispose(); throw error; }
}
