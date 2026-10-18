import { Output, Mp4OutputFormat, BufferTarget, StreamTarget, CanvasSource } from 'mediabunny';

// window.run4k(seconds, target) where target is 'buffer' (whole file in memory) or 'stream' (chunks discarded)
window.run4k = async (seconds, target) => {
  const W = 3840, H = 2160, FPS = 60;
  const canvas = new OffscreenCanvas(W, H); const ctx = canvas.getContext('2d');
  let streamed = 0;
  const t = target === 'stream'
    ? new StreamTarget(new WritableStream({ write(chunk) { streamed += chunk.data.byteLength; } }))
    : new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target: t });
  const source = new CanvasSource(canvas, { codec: 'avc', bitrate: 40_000_000 });
  output.addVideoTrack(source);
  await output.start();
  const frames = seconds * FPS; const t0 = performance.now();
  for (let i = 0; i < frames; i++) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, `hsl(${(i * 3) % 360}, 70%, 45%)`); g.addColorStop(1, `hsl(${(i * 3 + 120) % 360}, 70%, 25%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.font = '160px sans-serif'; ctx.fillText(`showreel 4K frame ${i}`, 200 + (i % 600), 1080);
    await source.add(i / FPS, 1 / FPS);   // awaiting is the backpressure
  }
  await output.finalize();
  const wallSeconds = (performance.now() - t0) / 1000;
  const bytes = target === 'stream' ? streamed : t.buffer.byteLength;
  if (target !== 'stream') window.__mp4 = new Uint8Array(t.buffer);
  return { encodedBytes: bytes, completed: true, frames, wallSeconds, encodeFps: +(frames / wallSeconds).toFixed(1) };
};
