import { engineStatus } from './engine-state.mjs';
import { getClient, stop } from './client.mjs';
import { synthesizeToFile } from './synthesize.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_VOICE } from './pins.mjs';

const MB = 1024 * 1024;
export const BENCHMARK_TEXT = 'This dashboard shows every deployment at a glance, and you can click any service to see its latest build, its owner and whether anything needs attention.';
export const rtfAdvice = (rtf) => (rtf > 1
  ? { level: 'warn', fix: 'This machine generates speech slower than real time; expect long waits for voice-over, or use captions only' }
  : { level: 'ok' });

// Items use the doctor shape { id, level, detail, fix? }. Voice problems never fail the doctor: voice-over is optional.
export async function voiceDoctor({ benchmark = false } = {}) {
  const s = await engineStatus();
  const items = [
    { id: 'voice-engine', level: s.installed ? 'ok' : 'warn', detail: s.installed ? `${s.fake ? 'fake test engine' : `kokoro-js ${s.kokoroJs}`}` : 'Voice engine is not installed', ...(!s.installed && { fix: 'showreel voice install --yes' }) },
    { id: 'voice-model', level: s.modelPresent || s.fake ? 'ok' : 'warn', detail: s.modelPresent ? `${(s.modelBytes / MB).toFixed(0)} MB` : s.fake ? 'not needed for the fake engine' : 'model not downloaded' },
    { id: 'voice-hash', level: s.hashPinned || !s.modelPresent ? 'ok' : 'warn', detail: s.hashPinned ? (s.hashVerified ? 'model hash pinned and verified' : 'model hash pinned, not verified') : 'model hash not pinned yet' },
  ];
  if (benchmark) {
    if (!s.installed) items.push({ id: 'voice-benchmark', level: 'warn', detail: 'skipped: engine not installed', fix: 'showreel voice install --yes' });
    else {
      const dir = await mkdtemp(path.join(os.tmpdir(), 'showreel-voice-bench-'));
      try {
        const words = BENCHMARK_TEXT.split(/\s+/).length;
        await getClient().generate({ text: 'Warm up.', voice: DEFAULT_VOICE, speed: 1, out: path.join(dir, 'warm.wav') });   // exclude model load from the timing
        const started = performance.now();
        const r = await synthesizeToFile({ engine: getClient(), text: BENCHMARK_TEXT, voice: DEFAULT_VOICE, out: path.join(dir, 'bench.wav') });
        const rtf = (performance.now() - started) / 1000 / r.durationSec;
        items.push({ id: 'voice-benchmark', ...rtfAdvice(rtf), detail: `${words} words, ${r.durationSec.toFixed(1)} s of audio, RTF ${rtf.toFixed(2)}` });
      } catch (err) { items.push({ id: 'voice-benchmark', level: 'warn', detail: `failed: ${err.message}` }); }
      finally { await stop(); await rm(dir, { recursive: true, force: true }); }
    }
  }
  return items;
}
