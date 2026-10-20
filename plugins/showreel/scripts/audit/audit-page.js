import { Input, UrlSource, ALL_FORMATS, MP4, CanvasSink, EncodedPacketSink } from 'mediabunny';
import { measureLoudness } from '../lib/audio/loudness.mjs';
import { meanDifference, monoRmsEnvelope } from './checks.mjs';
import '../lib/compose/render-page.js';

const open = url => new Input({ source: new UrlSource(url, { getRetryDelay: () => null }), formats: ALL_FORMATS });
function rgb(canvas, width, height) {
  const scaled = new OffscreenCanvas(width, height), ctx = scaled.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, width, height);
  const rgba = ctx.getImageData(0, 0, width, height).data, data = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4) { data[j++] = rgba[i]; data[j++] = rgba[i + 1]; data[j++] = rgba[i + 2]; }
  return data;
}
window.inspectAudit = async url => {
  const input = open(url);
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('Export has no video track');
    const frames = [];
    // Packet metadata avoids decoding pixels for the full cadence scan, including B-frame presentation timestamps.
    for await (const packet of new EncodedPacketSink(track).packets(undefined, undefined, { metadataOnly: true })) {
      frames.push({ timestamp: packet.timestamp, duration: packet.duration });
    }
    const duration = await track.computeDuration({ metadataOnly: true });
    const audio = await input.getPrimaryAudioTrack();
    const samples = [], sink = new CanvasSink(track, { width: 160, height: 90, fit: 'fill', poolSize: 2 });
    function* times() { for (let k = 0; k / 10 < duration; k++) yield k / 10; }
    let previous, k = 0;
    for await (const frame of sink.canvasesAtTimestamps(times())) {
      if (!frame) throw new Error(`Missing export frame at ${k / 10}`);
      const pixels = rgb(frame.canvas, 160, 90);
      samples.push({ time: k++ / 10, difference: previous ? meanDifference(previous, pixels).reduce((a, b) => a + b) / 3 : null });
      previous = pixels;
    }
    let loudness = null, envelope = null;
    if (audio) {
      // Same 48 kHz decoder and pure BS.1770 meter as the audio export regression test.
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Cannot read export audio (${response.status})`);
      const decoded = await new OfflineAudioContext(2, 1, 48000).decodeAudioData(await response.arrayBuffer());
      if (decoded.numberOfChannels > 2) throw new Error('Audit loudness supports mono/stereo exports only');
      const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i));
      loudness = measureLoudness(channels);
      envelope = monoRmsEnvelope(channels, decoded.sampleRate);
    }
    return { frames, samples, loudness, envelope, duration,
      containerDuration: await input.getDurationFromMetadata() ?? await input.computeDuration(undefined, { metadataOnly: true }),
      audioDuration: audio ? await audio.computeDuration({ metadataOnly: true }) - await audio.getFirstTimestamp() : null,
      videoDuration: duration - await track.getFirstTimestamp(),
      format: await input.getFormat() === MP4 ? 'mp4' : (await input.getFormat()).name,
      codec: await track.getCodec(), width: await track.getDisplayWidth(), height: await track.getDisplayHeight() };
  } finally { input.dispose(); }
};
window.auditParity = async ({ url, plan, options }) => {
  const input = open(url);
  try {
    const track = await input.getPrimaryVideoTrack(), sink = new CanvasSink(track, { poolSize: 2 });
    const height = Math.round(plan.output.height / plan.output.width * 480), values = [];
    await window.loadBrandFonts(plan);
    for (const fraction of [0.2, 0.5, 0.8]) {
      // Compare the same presentation instant (floor to an export frame), avoiding animation phase differences.
      const time = Math.floor((plan.timemap.mainStart + fraction * (plan.timemap.mainEnd - plan.timemap.mainStart)) * plan.output.fps + 1e-7) / plan.output.fps;
      const still = await window.renderStill(plan, time, options);
      const image = new Image(); image.src = still; await image.decode();
      const exported = await sink.getCanvas(time);
      if (!exported) throw new Error(`No export frame at ${time}`);
      values.push({ time, difference: meanDifference(rgb(image, 480, height), rgb(exported.canvas, 480, height)) });
    }
    return values;
  } finally { input.dispose(); }
};
