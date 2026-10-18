import { Output, Mp4OutputFormat, BufferTarget, CanvasSource, canEncodeVideo } from 'mediabunny';

window.runExport = async () => {
  const result = { avc: false, vp9: false, av1: false, mp4Bytes: null, error: null };
  try {
    // Probe independently so one unsupported codec does not hide the other results.
    for (const codec of ['avc', 'vp9', 'av1']) {
      try { result[codec] = await canEncodeVideo(codec); }
      catch (error) { result.error ??= `${codec}: ${error.message}`; }
    }
    if (!result.avc) throw new Error('H.264 encoding is unavailable');
    const canvas = new OffscreenCanvas(1280, 720);
    const context = canvas.getContext('2d');
    const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
    const source = new CanvasSource(canvas, { codec: 'avc', bitrate: 8_000_000 });
    output.addVideoTrack(source);
    await output.start();
    for (let frame = 0; frame < 90; frame++) {
      context.fillStyle = `hsl(${frame * 4}, 70%, 50%)`;
      context.fillRect(0, 0, 1280, 720);
      context.fillStyle = '#fff';
      context.font = '64px sans-serif';
      context.fillText(`frame ${frame}`, 80 + frame * 6, 360);
      // Awaiting each frame applies encoder backpressure instead of queuing the movie.
      await source.add(frame / 30, 1 / 30);
    }
    await output.finalize();
    result.mp4Bytes = output.target.buffer.byteLength;
  } catch (error) { result.error = String(error.message || error); }
  return result;
};
