import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import * as ort from 'onnxruntime-node';
// Workaround for a bug in kitten-tts-js 0.1.2: it requests the 'wasm' provider whenever ort.env.wasm exists, which is also true in Node.
const create = ort.InferenceSession.create.bind(ort.InferenceSession);
ort.InferenceSession.create = (a, b) => create(a, { ...(b || {}), executionProviders: ['cpu'] });
const { KittenTTS } = await import('kitten-tts-js');

const text = 'This dashboard shows every deployment at a glance. Click a service to see its latest build, its owner, and whether anything needs your attention today.';
mkdirSync('../scratch/s5', { recursive: true });
const models = process.argv.slice(2).length ? process.argv.slice(2) : ['KittenML/kitten-tts-nano-0.8', 'KittenML/kitten-tts-micro-0.8', 'KittenML/kitten-tts-mini-0.8'];
const out = {};
for (const id of models) {
  const short = id.split('/')[1];
  try {
    const t0 = Date.now();
    const tts = await KittenTTS.from_pretrained(id);
    const loadSeconds = (Date.now() - t0) / 1000;
    let peak = process.memoryUsage().rss; const iv = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 100);
    const runs = [];
    for (let i = 0; i < 4; i++) {
      const t1 = Date.now(); const audio = await tts.generate(text, { voice: 'Jasper' }); const genS = (Date.now() - t1) / 1000;
      const wav = `../scratch/s5/kitten-${short}.wav`;
      await audio.save(wav);                                   // the WAV header gives the true duration
      const seconds = (statSync(wav).size - 44) / 2 / 24000;   // 16-bit mono at 24 kHz
      runs.push({ genS, seconds, rtf: genS / seconds });
    }
    clearInterval(iv);
    const timed = runs.slice(1).map((r) => r.rtf).sort((a, b) => a - b);
    let cacheMb = null; try { cacheMb = Math.round(Number(execSync(`du -sk "${homedir()}/.cache/kitten-tts"`).toString().split('\t')[0]) / 1024); } catch {}
    out[short] = { rtfFirstWarmup: +runs[0].rtf.toFixed(3), rtfMedian: +timed[1].toFixed(3), loadSeconds: +loadSeconds.toFixed(1), peakRssMb: Math.round(peak / 1048576), audioSeconds: +runs[1].seconds.toFixed(1), cacheMbAfterThisModel: cacheMb, voices: tts.list_voices() };
  } catch (e) { out[short] = { works: false, error: String(e && e.message || e).split('\n').slice(0, 3).join(' | ') }; }
  console.log(short, out[short]);
}
const f = '../results/s5-tts.json'; const prev = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
writeFileSync(f, JSON.stringify({ ...prev, kitten: out }, null, 2));
process.exit(0);
