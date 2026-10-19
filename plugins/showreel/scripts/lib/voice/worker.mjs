// Voice worker: JSON lines on stdin/stdout. Run with cwd = the engine directory (real engine) by the client.
// Requests: {id, op:'generate', text, voice, speed, out} | {id, op:'voices'} | {id, op:'ping'} | {id, op:'warmup'} | {id, op:'quit'}
// Replies:  {id, ok:true, ...} | {id, ok:false, error} | progress events {id, event:'progress', ...}
import readline from 'node:readline';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { writeFile, rename, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { encodeWav } from './wav.mjs';
import { FALLBACK_VOICES, normalizeVoices } from './voices.mjs';
import { KOKORO_MODEL_ID, KOKORO_DTYPE, SAMPLE_RATE } from './pins.mjs';

// Stdout carries protocol lines only: keep the original writer for replies and send everything else to stderr.
const writeOut = process.stdout.write.bind(process.stdout);
process.stdout.write = (...args) => process.stderr.write(...args);
for (const m of ['log', 'info', 'debug', 'warn']) console[m] = (...a) => console.error(...a);
const send = (obj) => new Promise((resolve) => writeOut(JSON.stringify(obj) + '\n', () => resolve()));

const fake = process.env.SHOWREEL_VOICE_ENGINE === 'fake';

function hashString(s) { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
const countWords = (t) => (String(t).trim().match(/\S+/g) ?? []).length;

function fakeSamples(text, voice) {
  const seconds = 0.32 * countWords(text) + 0.4, n = Math.round(seconds * SAMPLE_RATE);
  const freq = 180 + (hashString(String(voice)) % 400), out = new Float32Array(n), fade = Math.round(0.02 * SAMPLE_RATE);
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / fade, (n - 1 - i) / fade);
    out[i] = 0.3 * env * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
  }
  return { samples: out, sampleRate: SAMPLE_RATE };
}

// Resolve a package's ESM entry from node_modules directories without ever looking at the plugin's own node_modules.
function resolveEntry(name, roots) {
  for (const root of roots) {
    const dir = path.join(root, 'node_modules', ...name.split('/'));
    const pkgFile = path.join(dir, 'package.json');
    if (!existsSync(pkgFile)) continue;
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
    let rel = pkg.module ?? pkg.main ?? 'index.js';
    const dot = pkg.exports && typeof pkg.exports === 'object' ? (pkg.exports['.'] ?? pkg.exports) : pkg.exports;
    const pick = (x) => (typeof x === 'string' ? x : x && typeof x === 'object' ? pick(x.import ?? x.node ?? x.default ?? x.require) : undefined);
    rel = pick(dot) ?? rel;
    return path.join(dir, rel);
  }
  throw new Error(`Voice engine is not installed. Run: showreel voice install (cannot find ${name} under ${roots[0]})`);
}

let tts = null, loading = null;
async function loadEngine(onProgress) {
  if (tts) return tts;
  loading ??= (async () => {
    const engineDir = process.cwd();
    const roots = [engineDir];
    const transformersUrl = pathToFileURL(resolveEntry('@huggingface/transformers', roots)).href;
    const { env } = await import(transformersUrl);
    if (process.env.SHOWREEL_VOICE_MODEL_DIR) env.cacheDir = process.env.SHOWREEL_VOICE_MODEL_DIR;
    const { KokoroTTS } = await import(pathToFileURL(resolveEntry('kokoro-js', roots)).href);
    tts = await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, { dtype: KOKORO_DTYPE, device: 'cpu', progress_callback: (p) => onProgress?.(p) });
    return tts;
  })().finally(() => { loading = null; });
  return loading;
}

async function writeAtomic(file, buf) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  try { await writeFile(temp, buf, { flag: 'wx' }); await rename(temp, file); } finally { await unlink(temp).catch(() => {}); }
}

async function handle(msg) {
  const { id, op } = msg;
  if (op === 'ping') return { id, ok: true, engine: fake ? 'fake' : 'kokoro' };
  if (op === 'voices') {
    if (fake) return { id, ok: true, voices: FALLBACK_VOICES };
    const engine = await loadEngine();
    return { id, ok: true, voices: normalizeVoices(engine.voices) };
  }
  if (op === 'warmup') {
    if (fake) return { id, ok: true };
    const started = Date.now();
    await loadEngine((p) => { send({ id, event: 'progress', status: p?.status, file: p?.file, progress: p?.progress, loaded: p?.loaded, total: p?.total }); });
    return { id, ok: true, loadSec: (Date.now() - started) / 1000 };
  }
  if (op === 'generate') {
    if (typeof msg.text !== 'string' || !msg.text.trim()) throw new Error('text is required');
    if (typeof msg.out !== 'string' || !msg.out) throw new Error('out is required');
    const voice = msg.voice ?? 'af_heart', speed = Number(msg.speed ?? 1);
    if (typeof msg.text === 'string' && msg.text.includes('__crash__') && fake) process.exit(3);
    if (msg.text.includes('__hang__') && fake) return new Promise(() => {});
    const started = performance.now();
    let samples, sampleRate;
    if (fake) ({ samples, sampleRate } = fakeSamples(msg.text, voice));
    else {
      const audio = await (await loadEngine()).generate(msg.text, { voice, speed });
      samples = Float32Array.from(audio.audio); sampleRate = audio.sampling_rate;
    }
    const elapsed = (performance.now() - started) / 1000, durationSec = samples.length / sampleRate;
    await writeAtomic(msg.out, encodeWav(samples, sampleRate));
    return { id, ok: true, durationSec, sampleRate, rtf: durationSec > 0 ? elapsed / durationSec : 0 };
  }
  throw new Error(`unknown op "${op}"`);
}

let chain = Promise.resolve();
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  if (!line.trim()) return;
  chain = chain.then(async () => {
    let msg;
    try { msg = JSON.parse(line); } catch { return send({ id: null, ok: false, error: 'invalid JSON line' }); }
    if (msg.op === 'quit') { await send({ id: msg.id, ok: true }); process.exit(0); }
    try { await send(await handle(msg)); }
    catch (err) { await send({ id: msg.id, ok: false, error: String(err?.message ?? err) }); }
  });
});
// Parent gone or stdin closed: finish the current reply but never wait forever on a stuck request.
rl.on('close', () => { setTimeout(() => process.exit(0), 2000).unref(); chain.then(() => process.exit(0)); });
