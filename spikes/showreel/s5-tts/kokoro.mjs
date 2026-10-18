import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import * as ort from 'onnxruntime-node';

const threads = process.env.THREADS ? Number(process.env.THREADS) : null;
if (threads) { // cap ONNX Runtime threads for the weak-PC run
  const orig = ort.InferenceSession.create.bind(ort.InferenceSession);
  ort.InferenceSession.create = (a, b) => orig(a, { ...(b || {}), intraOpNumThreads: threads, interOpNumThreads: 1 });
}
const { KokoroTTS } = await import('kokoro-js');
const { env } = await import('@huggingface/transformers');

const text = 'This dashboard shows every deployment at a glance. Click a service to see its latest build, its owner, and whether anything needs your attention today.';
mkdirSync('../scratch/s5', { recursive: true });
const t0 = Date.now();
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const loadSeconds = (Date.now() - t0) / 1000;
let peak = process.memoryUsage().rss; const iv = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 100);
const runs = [];
for (let i = 0; i < 4; i++) {            // run 0 is the warm-up
  const t1 = Date.now(); const audio = await tts.generate(text, { voice: 'af_heart' }); const genS = (Date.now() - t1) / 1000;
  const seconds = audio.audio.length / audio.sampling_rate; runs.push({ genS, seconds, rtf: genS / seconds });
  if (i === 3 && !threads) audio.save('../scratch/s5/kokoro.wav');
}
clearInterval(iv);
const timed = runs.slice(1).map((r) => r.rtf).sort((a, b) => a - b);
const cacheKb = Number(execSync(`du -sk "${env.cacheDir}"`).toString().split('\t')[0]);
const res = { threads: threads ?? 'default', rtfFirstWarmup: +runs[0].rtf.toFixed(3), rtfMedian: +timed[1].toFixed(3), rtfBest: +timed[0].toFixed(3), loadSeconds: +loadSeconds.toFixed(1), peakRssMb: Math.round(peak / 1048576), audioSeconds: +runs[1].seconds.toFixed(1), textWords: text.split(' ').length, modelCacheMb: Math.round(cacheKb / 1024) };
console.log(res);
const f = '../results/s5-tts.json'; const prev = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
writeFileSync(f, JSON.stringify({ ...prev, [`kokoro_threads_${res.threads}`]: res }, null, 2));
process.exit(0);
