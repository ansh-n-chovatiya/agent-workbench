// Preview audio: the whole mix for the edited timeline is built once (the same pure mixer the export uses), then played through
// one AudioContext. While it plays, the context clock is the preview clock and the video follows it (see playback.mjs).
import { loadAudio } from '../scripts/lib/audio/decode.js';
import { mixAudio } from '../scripts/lib/audio/mix.mjs';
import { audioClock, outputLatencySec, audioSignature } from './playback.mjs';

const CACHE_LIMIT = 24;

export function createAudioPreview({ load = loadAudio, ContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext } = {}) {
  const decoded = new Map(); // url -> Promise of decoded channels; clip and music URLs never change their content
  let context = null, gain = null, buffer = null, signature = '', source = null, started = null, volume = 1, muted = false, disposed = false, ticket = 0;

  const decode = url => {
    let entry = decoded.get(url);
    if (!entry) {
      entry = load(url); decoded.set(url, entry);
      entry.catch(() => decoded.delete(url));
      while (decoded.size > CACHE_LIMIT) decoded.delete(decoded.keys().next().value);
    }
    return entry;
  };
  function ensureContext() {
    if (!ContextClass) throw new Error('This browser cannot play audio.');
    if (!context) {
      context = new ContextClass(); gain = context.createGain(); gain.gain.value = muted ? 0 : volume; gain.connect(context.destination);
    }
    return context;
  }
  const api = {
    // True when the mix currently held was built from exactly this audio plan.
    has: audio => !!buffer && signature === audioSignature(audio),
    get signature() { return signature; },
    // Decodes clips and music (cached by URL) and mixes the whole timeline. Resolves 'none' when the plan has no audio.
    async prepare(audio) {
      const next = audioSignature(audio), mine = ++ticket;
      if (!next) { buffer = null; signature = ''; return 'none'; }
      if (buffer && next === signature) return 'ready';
      const clips = await Promise.all(audio.narration.map(async n => ({ channels: await decode(n.clipUrl), start: n.outStart, gainDb: n.gainDb })));
      const music = audio.music ? { ...audio.music, channels: await decode(audio.music.url) } : null;
      await new Promise(resolve => setTimeout(resolve, 0)); // let the page paint before the long synchronous mix
      if (disposed) return 'none';
      if (mine !== ticket) return 'stale'; // a newer plan arrived while this one was decoding
      const mix = mixAudio({ durationSec: audio.durationSec, sampleRate: audio.sampleRate, clips, music, mutes: audio.mutes, duck: audio.duck, loudness: audio.loudness });
      const made = new AudioBuffer({ length: mix.channels[0].length, numberOfChannels: 2, sampleRate: audio.sampleRate });
      made.copyToChannel(mix.channels[0], 0); made.copyToChannel(mix.channels[1], 1);
      buffer = made; signature = next;
      return 'ready';
    },
    // Creates the context from a user gesture so the browser lets it run; harmless to call again.
    unlock() { try { const ctx = ensureContext(); if (ctx.state === 'suspended') ctx.resume().catch(() => {}); } catch { /* no audio support */ } },
    // Starts the mix at the output time returned by getOffset() at the moment sound really starts. Resolves false when it cannot play.
    async start(getOffset, { loop = false } = {}) {
      if (!buffer || disposed) return false;
      try {
        const ctx = ensureContext();
        if (ctx.state !== 'running') await ctx.resume();
        if (ctx.state !== 'running' || disposed) return false;
        api.stop();
        const node = ctx.createBufferSource();
        node.buffer = buffer; node.loop = loop; node.connect(gain);
        const duration = buffer.duration, offset = Math.min(Math.max(0, getOffset()), Math.max(0, duration - 0.001)), when = ctx.currentTime;
        node.start(when, offset);
        source = node; started = { contextTime: when, offsetSec: offset, loop, duration };
        return true;
      } catch { return false; }
    },
    // Output time heard right now (accounts for device latency), or null when nothing is playing.
    position() {
      if (!source || !context) return null;
      return audioClock({ contextTime: context.currentTime, startContextTime: started.contextTime, offsetSec: started.offsetSec,
        latencySec: outputLatencySec(context), duration: started.duration, loop: started.loop });
    },
    stop() { if (source) { try { source.stop(); } catch { /* already stopped */ } source.disconnect(); source = null; started = null; } },
    setVolume(value) { volume = Math.min(1, Math.max(0, value)); if (gain) gain.gain.value = muted ? 0 : volume; },
    setMuted(value) { muted = !!value; if (gain) gain.gain.value = muted ? 0 : volume; },
    dispose() { disposed = true; api.stop(); context?.close?.().catch(() => {}); context = null; decoded.clear(); buffer = null; },
  };
  return api;
}
