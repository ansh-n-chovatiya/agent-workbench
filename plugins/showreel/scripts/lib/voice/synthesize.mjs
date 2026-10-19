import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { prepareText, clampSpeed } from './prepare.mjs';
import { parseWav, encodeWav, silence, concatChannels } from './wav.mjs';
import { atomicWrite } from './atomic.mjs';
import { SAMPLE_RATE } from './pins.mjs';

// Synthesizes prepared segments through `engine.generate` and writes ONE wav (24 kHz mono 16-bit unless the engine says otherwise).
export async function synthesizeToFile({ engine, text, voice, speed = 1, pronunciations = {}, out }) {
  const prepared = prepareText(text, { pronunciations });
  if (!prepared.segments.some((s) => s.type === 'speech')) throw new Error('Nothing to speak after text preparation');
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'showreel-voice-'));
  const parts = [];
  let rate = null, rtfTotal = 0, rtfCount = 0, i = 0;
  try {
    for (const seg of prepared.segments) {
      if (seg.type === 'speech') {
        const file = path.join(tmp, `chunk-${i++}.wav`);
        const r = await engine.generate({ text: seg.text, voice, speed: clampSpeed(speed), out: file });
        const wav = parseWav(await readFile(file));
        rate ??= wav.sampleRate;
        if (wav.sampleRate !== rate) throw new Error('Engine returned inconsistent sample rates');
        parts.push(wav.data[0]);
        if (Number.isFinite(r.rtf)) { rtfTotal += r.rtf; rtfCount++; }
      } else parts.push({ silence: seg.seconds });
    }
  } finally { await rm(tmp, { recursive: true, force: true }); }
  const rateOut = rate ?? SAMPLE_RATE;
  const pcm = concatChannels(parts.map((p) => (p.silence != null ? silence(p.silence, rateOut) : p)));
  await atomicWrite(out, encodeWav(pcm, rateOut));
  return { durationSec: pcm.length / rateOut, sampleRate: rateOut, rtf: rtfCount ? rtfTotal / rtfCount : 0, preparedText: prepared.preparedText, warnings: prepared.warnings };
}
