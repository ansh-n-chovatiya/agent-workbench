import { Input, UrlSource, ALL_FORMATS, CanvasSink, Output, Mp4OutputFormat,
  StreamTarget, CanvasSource, canEncodeVideo } from 'mediabunny';
import { stateAt } from './plan.mjs';
import { loadFonts, loadAssets, drawFrame as draw, canvasFor } from './draw.js';
import { outputBitrate } from './composition.mjs';

const defaults = () => ({ source: new URL('raw.mp4', location.href).href,
  fonts: { regular: new URL('fonts/Inter-Regular.woff2', location.href).href,
    semibold: new URL('fonts/Inter-SemiBold.woff2', location.href).href }, audio: null });
let stillOptions;
async function openVideo(url) {
  const input = new Input({ source: new UrlSource(url, { getRetryDelay: () => null }), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !await track.canDecode()) throw new Error('Source has no decodable video track');
    return { input, track, sink: new CanvasSink(track, { poolSize: 2 }) };
  } catch (error) { input.dispose(); throw error; }
}
window.probeRenderSource = async (url = defaults().source) => {
  const { input, track } = await openVideo(url);
  try { return { width: await track.getDisplayWidth(), height: await track.getDisplayHeight(), duration: await track.computeDuration() }; }
  finally { input.dispose(); }
};
window.renderStill = async (plan, tOut, overrides = {}) => {
  const options = { ...(stillOptions ?? defaults()), ...overrides };
  await loadFonts(options.fonts);
  await loadAssets(plan, options);
  const { input, sink } = await openVideo(options.source);
  try {
    const frame = await sink.getCanvas(stateAt(plan, tOut).sourceT);
    return draw(canvasFor(plan), plan, tOut, frame?.canvas).toDataURL('image/png');
  } finally { input.dispose(); }
};
window.renderComposition = async (plan, options = {}) => {
  options = { ...defaults(), ...options };
  if (options.audio !== null) throw new Error('Audio is not supported yet; pass audio: null');
  stillOptions = options;
  await loadFonts(options.fonts);
  await loadAssets(plan, options);
  const { width, height, fps } = plan.output, canvas = canvasFor(plan);
  const bitrate = outputBitrate(plan.output);
  let codec;
  for (const candidate of ['avc', 'vp9']) {
    if (await canEncodeVideo(candidate, { width, height, bitrate, frameRate: fps })) { codec = candidate; break; }
  }
  if (!codec) throw new Error('Neither H.264 nor VP9 encoding is supported');
  let bytes = 0, finalized = false, source, output, video;
  const post = async (route, body, headers) => {
    const response = await fetch(new URL(route, location.href), { method: 'POST', body, headers });
    if (!response.ok) throw new Error(`Render transport failed: ${route} (${response.status})`);
  };
  try {
    video = await openVideo(options.source);
    const target = new StreamTarget(new WritableStream({ async write({ data, position }) {
      await post('chunk', data, { 'x-pos': String(position) }); bytes = Math.max(bytes, position + data.byteLength);
    } }), { chunked: true, chunkSize: 1024 * 1024 });
    output = new Output({ format: new Mp4OutputFormat({ fastStart: false }), target });
    source = new CanvasSource(canvas, { codec, bitrate, keyFrameInterval: 2 });
    output.addVideoTrack(source, { frameRate: fps }); await output.start();
    const total = Math.round(plan.timemap.outputDuration * fps);
    if (total < 1) throw new Error('Composition has no output frames');
    function* timestamps() { for (let k = 0; k < total; k++) yield stateAt(plan, k / fps).sourceT; }
    let frame = 0, lastProgress = -Infinity;
    for await (const decoded of video.sink.canvasesAtTimestamps(timestamps())) {
      if (window.__renderAbort || options.signal?.aborted) throw new Error('Render aborted');
      if (!decoded) throw new Error(`No source frame for output frame ${frame}`);
      draw(canvas, plan, frame / fps, decoded.canvas); await source.add(frame / fps, 1 / fps); frame++;
      if (performance.now() - lastProgress >= 250 || frame === total) {
        await post('progress', JSON.stringify({ frame, total }), { 'content-type': 'application/json' });
        lastProgress = performance.now();
      }
    }
    if (frame !== total) throw new Error('Decoder ended before the composition');
    source.close(); await output.finalize(); finalized = true;
    return { frames: frame, codec, bytes, warnings: plan.warnings };
  } finally {
    try { if (output && !finalized) await output.cancel(); }
    finally { video?.input.dispose(); }
  }
};
