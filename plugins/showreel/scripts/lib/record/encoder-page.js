import { Output, Mp4OutputFormat, StreamTarget, VideoSampleSource, VideoSample,
  canEncodeVideo } from 'mediabunny';

async function nextFrame() {
  const response = await fetch('next');
  if (response.status === 204) return { end: Number(response.headers.get('x-end-ts')) };
  if (!response.ok) throw new Error('Cannot fetch encoder frame');
  return { bytes: await response.arrayBuffer(), ts: Number(response.headers.get('x-ts')) };
}

async function encode() {
  const config = window.__config;
  const encoding = { ...config, latencyMode: 'realtime' };
  let codec;
  // canEncodeVideo probes VideoEncoder.isConfigSupported with the actual dimensions.
  for (const candidate of ['avc', 'vp9']) {
    if (await canEncodeVideo(candidate, encoding)) { codec = candidate; break; }
  }
  if (!codec) throw new Error('Cannot encode video in this browser');
  const target = new StreamTarget(new WritableStream({
    async write({ data, position }) {
      const response = await fetch('chunk', {
        method: 'POST', headers: { 'x-pos': String(position) }, body: data,
      });
      if (!response.ok) throw new Error('Cannot write encoder chunk');
    },
  }), { chunked: true, chunkSize: 1024 * 1024 });
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: false }), target });
  const source = new VideoSampleSource({
    codec, bitrate: config.bitrate, latencyMode: 'realtime', keyFrameInterval: 2,
  });
  output.addVideoTrack(source);
  let finalized = false;
  try {
    await output.start();
    window.__ready = true;
    let current = await nextFrame();
    let frames = 0;
    let durationSec = 0;
    while (current.bytes) {
      // One-frame lookahead preserves VFR duration across dropped frames and still holds.
      const next = await nextFrame();
      const end = next.bytes ? next.ts : Math.max(next.end, current.ts + 1 / 60);
      const bitmap = await createImageBitmap(new Blob([current.bytes], { type: 'image/jpeg' }));
      let frame;
      let sample;
      try {
        frame = new VideoFrame(bitmap, {
          timestamp: Math.round(current.ts * 1e6),
          duration: Math.max(1, Math.round((end - current.ts) * 1e6)),
        });
        sample = new VideoSample(frame);
        await source.add(sample);
      } finally {
        sample?.close();
        frame?.close();
        bitmap.close();
      }
      frames++;
      durationSec = end;
      current = next;
    }
    source.close();
    await output.finalize();
    finalized = true;
    window.__result = { codec, frames, durationSec };
  } finally {
    if (!finalized) await output.cancel();
  }
}

encode().catch((error) => { window.__error = error.message; })
  .finally(() => { window.__done = true; });
