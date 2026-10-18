import { Output, Mp4OutputFormat, StreamTarget, CanvasSource, canEncodeVideo } from 'mediabunny';

window.runMemory = async () => {
  const result = { completed: false, encodeFps: null, error: null };
  try {
    if (!await canEncodeVideo('avc', { width: 3840, height: 2160 })) {
      throw new Error('4K H.264 encoding is unavailable');
    }
    const canvas = new OffscreenCanvas(3840, 2160);
    const context = canvas.getContext('2d');
    // Discard chunks as they arrive; the smoke measures encoding, not file retention.
    const target = new StreamTarget(new WritableStream({ write() {} }));
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: false }), target });
    const source = new CanvasSource(canvas, { codec: 'avc', bitrate: 40_000_000 });
    output.addVideoTrack(source);
    await output.start();
    const start = performance.now();
    for (let frame = 0; frame < 240; frame++) {
      const gradient = context.createLinearGradient(0, 0, 3840, 2160);
      gradient.addColorStop(0, `hsl(${frame * 3 % 360}, 70%, 45%)`);
      gradient.addColorStop(1, `hsl(${(frame * 3 + 120) % 360}, 70%, 25%)`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, 3840, 2160);
      context.fillStyle = '#fff';
      context.font = '160px sans-serif';
      context.fillText(`showreel 4K frame ${frame}`, 200 + frame, 1080);
      await source.add(frame / 60, 1 / 60);
    }
    await output.finalize();
    result.completed = true;
    result.encodeFps = Number((240000 / (performance.now() - start)).toFixed(1));
  } catch (error) { result.error = String(error.message || error); }
  return result;
};
