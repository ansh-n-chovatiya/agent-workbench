// Local text-to-speech: Voicebox when its app is running, else macOS `say`,
// else espeak-ng / espeak. Nothing leaves the machine.
// `say` writes AIFF and the others WAV; synth converts to whatever extension
// outFile has, but .aiff for `say` and .wav otherwise needs no conversion.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { which, run, ffprobeDuration, warn } from './env.mjs';
// No config import here: this file is also loaded inside the Playwright
// worker, where config.mjs's own imports fail to resolve. Keep in step with
// config.mjs's voice.rate default.
const DEFAULT_RATE = 160;
const DEFAULT_VOICEBOX_URL = 'http://127.0.0.1:17493';
// fixture.mjs guards globalThis.fetch against writes while recording; Voicebox is
// the skill's own, local, and has to be reached by its POST.
const send = (...args) => (globalThis[Symbol.for('demo-video.realFetch')] ?? globalThis.fetch)(...args);
const PROBE_MS = 1000; // a Voicebox that is not running costs this once per run
const GENERATE_MS = 120000; // one clip; the fixture itself gives up on a step sooner

const PREFERRED = ['Samantha', 'Daniel', 'Karen', 'Moira', 'Alex'];

// Picks a voice from `say -v '?'` output: a Premium/Enhanced English voice,
// else the first of PREFERRED installed, else the first English voice.
export function pickSayVoice(listing) {
  const voices = [];
  for (const line of listing.split('\n')) {
    const m = line.match(/^(.+?)\s+([a-z]{2,3}_[A-Za-z0-9]+)\s+#/);
    if (m && m[2].startsWith('en_')) voices.push(m[1].trim());
  }
  return voices.find((v) => /\((Premium|Enhanced)\)/.test(v))
    ?? PREFERRED.find((p) => voices.includes(p))
    ?? voices[0]
    ?? null;
}

const detected = new Map(); // memoized per settings: synth runs once per step and the answer never changes mid-run

async function detectSystem(engine) {
  if (engine !== 'espeak' && await which('say')) {
    const { stdout } = await run('say', ['-v', '?']);
    return { tool: 'say', voice: pickSayVoice(stdout) };
  }
  if (engine === 'say') return null;
  for (const tool of ['espeak-ng', 'espeak']) {
    if (await which(tool)) return { tool, voice: 'en-us' };
  }
  return null;
}

const baseOf = (url) => (url || DEFAULT_VOICEBOX_URL).replace(/\/+$/, '');

// The Voicebox profiles at `url`, or null when nothing answers.
async function voiceboxProfiles(url) {
  try {
    const res = await send(`${baseOf(url)}/profiles`, { signal: AbortSignal.timeout(PROBE_MS) });
    if (!res.ok) return null;
    const list = await res.json();
    return Array.isArray(list) ? list : null;
  } catch { return null; }
}

async function detect({ engine, voiceboxUrl, voice }) {
  if (engine === 'auto' || engine === 'voicebox') {
    const profiles = await voiceboxProfiles(voiceboxUrl);
    if (!profiles && engine === 'voicebox') {
      throw new Error(`Voicebox is not running at ${baseOf(voiceboxUrl)}: open the Voicebox app, or set voice.engine to "auto" to fall back to the system voice`);
    }
    if (profiles) {
      const names = profiles.map((p) => p.name).join(', ') || 'none';
      if (!profiles.length && engine === 'voicebox') {
        throw new Error('Voicebox has no voice profiles: create one in the Voicebox app (Voices tab)');
      }
      const wanted = voice ? profiles.find((p) => p.name.toLowerCase() === voice.toLowerCase() || p.id === voice) : profiles[0];
      if (wanted) return { tool: 'voicebox', voice: wanted.name, profileId: wanted.id, profile: wanted };
      // Under "auto" a name that is no profile is taken as a system voice (the
      // meaning it always had), so existing configs keep their voice.
      if (voice && engine === 'voicebox') throw new Error(`Voicebox has no voice profile "${voice}"; available: ${names}`);
    }
  }
  return detectSystem(engine);
}

// {tool, voice} for the TTS in use, or null when there is none. `tool` is
// 'voicebox' (plus profileId), 'say', 'espeak-ng' or 'espeak'. `engine` is
// "auto" (Voicebox if it answers, else the system voice), "voicebox" (throws
// when it is not running), "say" or "espeak" (never contact Voicebox).
// `voice` is a Voicebox profile name or id, else a system voice.
export function ttsAvailable({ engine = 'auto', voiceboxUrl, voice } = {}) {
  const key = JSON.stringify([engine, baseOf(voiceboxUrl), voice || null]);
  if (!detected.has(key)) detected.set(key, detect({ engine, voiceboxUrl, voice }));
  return detected.get(key);
}

export async function bestVoice() {
  return (await ttsAvailable())?.voice ?? null;
}

// Asks Voicebox for `text` and writes its WAV to `file`.
async function voiceboxSpeak(tts, text, file, voiceboxUrl) {
  const base = baseOf(voiceboxUrl);
  const body = { profile_id: tts.profileId, text, language: tts.profile.language || 'en' };
  if (tts.profile.default_engine) body.engine = tts.profile.default_engine;
  const res = await send(`${base}/generate`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(GENERATE_MS),
  });
  if (!res.ok) throw new Error(`Voicebox /generate failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  // /generate answers at once with a record that is still "generating"; the
  // audio exists when /history/<id> says "completed".
  const { id } = await res.json();
  for (const deadline = Date.now() + GENERATE_MS; ; await new Promise((r) => setTimeout(r, 200))) {
    const h = await send(`${base}/history/${id}`, { signal: AbortSignal.timeout(GENERATE_MS) });
    if (!h.ok) throw new Error(`Voicebox /history failed: HTTP ${h.status}`);
    const rec = await h.json();
    if (rec.status === 'completed') break;
    if (rec.status === 'failed' || rec.status === 'error') throw new Error(`Voicebox could not speak the caption: ${rec.error || rec.status}`);
    if (Date.now() > deadline) throw new Error('Voicebox took too long to speak the caption');
  }
  const audio = await send(`${base}/audio/${id}`, { signal: AbortSignal.timeout(GENERATE_MS) });
  if (!audio.ok) throw new Error(`Voicebox /audio failed: HTTP ${audio.status}`);
  // Engines pad each clip with about half a second of silence at both ends.
  // That would count as speech in the step holds and caption timing, so trim it
  // and leave a short natural margin.
  const raw = file.replace(/(\.\w+)?$/, '.raw$1');
  await writeFile(raw, Buffer.from(await audio.arrayBuffer()));
  const edge = (pad) => `silenceremove=start_periods=1:start_threshold=-45dB:start_silence=${pad}`;
  const trim = await run('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-af', `${edge(0.05)},areverse,${edge(0.1)},areverse`, file]);
  await rm(raw, { force: true });
  if (trim.code !== 0) throw new Error(`could not read Voicebox's audio: ${trim.stderr.trim().split('\n').pop()}`);
}

let warnedFallback = false;

// Speaks a short phrase to load Voicebox's model before recording starts: the
// first request can take longer than a step waits for its narration.
export async function warmUp(opts = {}) {
  const tts = await ttsAvailable(opts);
  if (tts?.tool !== 'voicebox') return;
  const file = path.join(await mkdtemp(path.join(tmpdir(), 'demo-voice-')), 'warm.wav');
  try { await voiceboxSpeak(tts, 'Ready.', file, opts.voiceboxUrl); } finally { await rm(path.dirname(file), { recursive: true, force: true }); }
}

// Speaks `text` into outFile and returns the spoken duration in seconds.
// `rate` is words per minute (config `voice.rate`) for say/espeak; Voicebox
// speaks at its natural pace. `voice` overrides the detected best voice
// (config `voice.name`). `leadMs` of silence is put in front of the speech, so
// wherever the clip is placed (at its caption's start) the voice follows the
// caption instead of starting with it; the returned duration leaves that lead
// out. `engine` and `voiceboxUrl` are config voice.engine / voice.voiceboxUrl.
// Under "auto", a Voicebox that fails on a clip lets that clip be spoken by
// the system voice, so outFile can have any extension.
export async function synth(text, outFile, { voice, rate = DEFAULT_RATE, leadMs = 0, engine = 'auto', voiceboxUrl } = {}) {
  let tts = await ttsAvailable({ engine, voiceboxUrl, voice });
  if (!tts) throw new Error('no text-to-speech tool installed (say, espeak-ng or espeak)');
  const ext = path.extname(outFile);
  const native = () => (tts.tool === 'say' ? '.aiff' : '.wav');
  const speechFile = () => (leadMs > 0 || ext !== native() ? outFile.slice(0, -ext.length || undefined) + '.speech' + native() : outFile);
  let speech = speechFile();
  if (tts.tool === 'voicebox') {
    try {
      await voiceboxSpeak(tts, text, speech, voiceboxUrl);
    } catch (err) {
      if (engine !== 'auto') throw err;
      const system = await detectSystem('auto');
      if (!system) throw err;
      if (!warnedFallback) { warnedFallback = true; warn(`${err.message.split('\n')[0]}; speaking with ${system.tool} instead`); }
      await rm(speech, { force: true });
      tts = system;
      speech = speechFile();
      voice = undefined; // a Voicebox profile name means nothing to say/espeak
    }
  }
  if (tts.tool !== 'voicebox') {
    const v = voice || tts.voice;
    const wpm = String(Math.round(rate));
    // Text goes through stdin so a caption starting with "-" is never read as a flag.
    const args = tts.tool === 'say'
      ? [...(v ? ['-v', v] : []), '-r', wpm, '-o', speech, '-f', '-']
      : ['-v', v || 'en-us', '-s', wpm, '-w', speech, '--stdin'];
    const { code, stderr } = await run(tts.tool, args, { input: text });
    if (code !== 0) throw new Error(`${tts.tool} failed: ${stderr.trim().split('\n').pop() || `exit ${code}`}`);
  }
  const duration = await ffprobeDuration(speech);
  if (speech !== outFile) {
    const pad = await run('ffmpeg', ['-y', '-v', 'error', '-i', speech, ...(leadMs > 0 ? ['-af', `adelay=delays=${Math.round(leadMs)}:all=1`] : []), outFile]);
    await rm(speech, { force: true });
    if (pad.code !== 0) throw new Error(`narration lead failed: ${pad.stderr.trim().split('\n').pop()}`);
  }
  return duration;
}
