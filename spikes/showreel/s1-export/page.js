import { Output, Mp4OutputFormat, BufferTarget, CanvasSource, canEncodeVideo } from 'mediabunny';

window.runExport = async () => {
  const res = { avc: false, vp9: false, av1: false, mp4Bytes: null, error: null };
  try {
    res.avc = await canEncodeVideo('avc');
    res.vp9 = await canEncodeVideo('vp9');
    res.av1 = await canEncodeVideo('av1');
    if (!res.avc) return res;
    const canvas = new OffscreenCanvas(1280, 720);
    const ctx = canvas.getContext('2d');
    const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
    const source = new CanvasSource(canvas, { codec: 'avc', bitrate: 8_000_000 });
    output.addVideoTrack(source);
    await output.start();
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `hsl(${i * 4}, 70%, 50%)`;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#fff'; ctx.font = '64px sans-serif';
      ctx.fillText(`frame ${i}`, 80 + i * 6, 360);
      await source.add(i / 30, 1 / 30);
    }
    await output.finalize();
    res.mp4Bytes = output.target.buffer.byteLength;
    window.__mp4 = new Uint8Array(output.target.buffer);
  } catch (e) { res.error = String(e && e.message || e); }
  return res;
};
