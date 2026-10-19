import { Input, UrlSource, ALL_FORMATS, CanvasSink, Output, Mp4OutputFormat,
  StreamTarget, CanvasSource, canEncodeVideo, AudioBufferSource, canEncodeAudio } from 'mediabunny';
import { stateAt } from './plan.mjs';
import { loadFonts, loadAssets, drawFrame as draw, canvasFor } from './draw.js';
import { outputBitrate } from './composition.mjs';
import { loadAudio } from '../audio/decode.js';
import { mixAudio } from '../audio/mix.mjs';

const AUDIO_BITRATE = 192000;
// Decodes the narration and music named by the plan, mixes them offline (pure code, same as the editor preview) and picks
// an audio codec: AAC when this browser can encode it, otherwise Opus inside the MP4 with a warning.
async function prepareAudio(plan) {
  const a = plan.audio, warnings = [];
  const clips = await Promise.all(a.narration.map(async (n) => ({ channels: await loadAudio(n.clipUrl), start: n.outStart, gainDb: n.gainDb })));
  const music = a.music ? { ...a.music, channels: await loadAudio(a.music.url) } : null;
  const mix = mixAudio({ durationSec: a.durationSec ?? plan.timemap.outputDuration, sampleRate: a.sampleRate, clips, music, duck: a.duck, loudness: a.loudness });
  const config = { numberOfChannels: 2, sampleRate: a.sampleRate, bitrate: AUDIO_BITRATE };
  let codec = null;
  for (const candidate of ['aac', 'opus']) if (await canEncodeAudio(candidate, config)) { codec = candidate; break; }
  if (!codec) throw new Error('Neither AAC nor Opus audio encoding is supported');
  if (codec === 'opus') warnings.push('AAC audio unavailable; encoded Opus audio inside MP4');
  return { ...mix, codec, warnings, sampleRate: a.sampleRate };
}
function audioSlice(mix, from, to) {
  const buffer = new AudioBuffer({ length: to - from, numberOfChannels: 2, sampleRate: mix.sampleRate });
  for (let c = 0; c < 2; c++) buffer.copyToChannel(mix.channels[c].subarray(from, to), c);
  return buffer;
}

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
  let bytes = 0, finalized = false, source, output, video, audioSource;
  const mix = options.audio && plan.audio?.enabled ? await prepareAudio(plan) : null;
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
    output.addVideoTrack(source, { frameRate: fps });
    if (mix) { audioSource = new AudioBufferSource({ codec: mix.codec, bitrate: AUDIO_BITRATE }); output.addAudioTrack(audioSource); }
    await output.start();
    // Audio goes in one second at a time, just ahead of the video, so the muxer can interleave both tracks.
    let audioAt = 0;
    const feedAudio = async (untilSec) => {
      const end = mix ? Math.min(mix.channels[0].length, Math.ceil(untilSec * mix.sampleRate)) : 0;
      while (audioAt < end) {
        const to = Math.min(mix.channels[0].length, audioAt + mix.sampleRate);
        await audioSource.add(audioSlice(mix, audioAt, to)); audioAt = to;
      }
    };
    const total = Math.round(plan.timemap.outputDuration * fps);
    if (total < 1) throw new Error('Composition has no output frames');
    function* timestamps() { for (let k = 0; k < total; k++) yield stateAt(plan, k / fps).sourceT; }
    let frame = 0, lastProgress = -Infinity;
    for await (const decoded of video.sink.canvasesAtTimestamps(timestamps())) {
      if (window.__renderAbort || options.signal?.aborted) throw new Error('Render aborted');
      if (!decoded) throw new Error(`No source frame for output frame ${frame}`);
      if (mix) await feedAudio(frame / fps + 1);
      draw(canvas, plan, frame / fps, decoded.canvas); await source.add(frame / fps, 1 / fps); frame++;
      if (performance.now() - lastProgress >= 250 || frame === total) {
        await post('progress', JSON.stringify({ frame, total }), { 'content-type': 'application/json' });
        lastProgress = performance.now();
      }
    }
    if (frame !== total) throw new Error('Decoder ended before the composition');
    if (mix) { await feedAudio(Infinity); audioSource.close(); }
    source.close(); await output.finalize(); finalized = true;
    return { frames: frame, codec, bytes, warnings: plan.warnings,
      ...(mix ? { audio: { codec: mix.codec, measured: mix.measured, appliedGainDb: mix.appliedGainDb, limiterReductionDb: mix.limiterReductionDb, warnings: mix.warnings } } : {}) };
  } finally {
    try { if (output && !finalized) await output.cancel(); }
    finally { video?.input.dispose(); }
  }
};
