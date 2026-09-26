// Local text-to-speech: macOS `say`, else espeak-ng / espeak. No network.
// `say` writes AIFF and espeak writes WAV, so pass an outFile ending in
// .aiff when ttsAvailable().tool === 'say' and .wav otherwise.
import { rm } from 'node:fs/promises';
import { which, run, ffprobeDuration } from './env.mjs';
// No config import here: this file is also loaded inside the Playwright
// worker, where config.mjs's own imports fail to resolve. Keep in step with
// config.mjs's voice.rate default.
const DEFAULT_RATE = 160;

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

let detected; // memoized: synth runs once per step and the answer never changes mid-run

async function detect() {
  if (await which('say')) {
    const { stdout } = await run('say', ['-v', '?']);
    return { tool: 'say', voice: pickSayVoice(stdout) };
  }
  for (const tool of ['espeak-ng', 'espeak']) {
    if (await which(tool)) return { tool, voice: 'en-us' };
  }
  return null;
}

// {tool, voice} for the installed TTS, or null when there is none.
export function ttsAvailable() {
  detected ??= detect();
  return detected;
}

export async function bestVoice() {
  return (await ttsAvailable())?.voice ?? null;
}

// Speaks `text` into outFile at `rate` words per minute (config
// `voice.rate`) and returns the spoken duration in seconds. `voice` overrides
// the detected best voice (config `voice.name`). `leadMs` of silence is put in
// front of the speech, so wherever the clip is placed (at its caption's
// start) the voice follows the caption instead of starting with it; the
// returned duration leaves that lead out.
export async function synth(text, outFile, { voice, rate = DEFAULT_RATE, leadMs = 0 } = {}) {
  const tts = await ttsAvailable();
  if (!tts) throw new Error('no text-to-speech tool installed (say, espeak-ng or espeak)');
  const v = voice || tts.voice;
  const speech = leadMs > 0 ? outFile.replace(/(\.\w+)$/, '.speech$1') : outFile;
  const wpm = String(Math.round(rate));
  // Text goes through stdin so a caption starting with "-" is never read as a flag.
  const args = tts.tool === 'say'
    ? [...(v ? ['-v', v] : []), '-r', wpm, '-o', speech, '-f', '-']
    : ['-v', v || 'en-us', '-s', wpm, '-w', speech, '--stdin'];
  const { code, stderr } = await run(tts.tool, args, { input: text });
  if (code !== 0) throw new Error(`${tts.tool} failed: ${stderr.trim().split('\n').pop() || `exit ${code}`}`);
  const duration = await ffprobeDuration(speech);
  if (speech !== outFile) {
    const pad = await run('ffmpeg', ['-y', '-v', 'error', '-i', speech, '-af', `adelay=delays=${Math.round(leadMs)}:all=1`, outFile]);
    await rm(speech, { force: true });
    if (pad.code !== 0) throw new Error(`narration lead failed: ${pad.stderr.trim().split('\n').pop()}`);
  }
  return duration;
}
