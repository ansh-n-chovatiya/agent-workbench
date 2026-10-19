import { readFile, stat, readdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { engineDir, modelDir } from './paths.mjs';
import { KOKORO_JS_VERSION, KOKORO_MODEL_FILE, KOKORO_Q8_SHA256, isFakeEngine } from './pins.mjs';

export const NOT_INSTALLED = 'Voice engine is not installed. Run: showreel voice install';
const readJson = async (file) => { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; } };

export async function sha256File(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
export async function findModelFile(dir = modelDir()) {
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = path.join(current, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name === KOKORO_MODEL_FILE) return p;
    }
  }
  return null;
}
export async function readEngineInfo() { return readJson(path.join(engineDir(), 'engine.json')); }

// Cheap state check (no hashing): installed means package present and engine.json written by a completed install.
export async function engineStatus() {
  const info = await readEngineInfo();
  const pkg = await readJson(path.join(engineDir(), 'node_modules', 'kokoro-js', 'package.json'));
  const model = await findModelFile();
  const modelBytes = model ? (await stat(model)).size : 0;
  const fake = isFakeEngine();
  return {
    fake,
    installed: fake || Boolean(pkg && info && model),
    kokoroJs: pkg?.version ?? null, pinnedKokoroJs: KOKORO_JS_VERSION,
    modelPresent: Boolean(model), modelFile: model, modelBytes,
    modelHash: info?.modelHash ?? null, hashPinned: KOKORO_Q8_SHA256 !== null, hashVerified: Boolean(info?.hashVerified),
  };
}
// The model hash that goes into cache keys. Fake engine has a fixed one so keys are deterministic in tests.
export async function currentModelHash() {
  if (isFakeEngine()) return 'fake-model';
  return (await readEngineInfo())?.modelHash ?? KOKORO_Q8_SHA256 ?? 'unknown';
}
export const currentEngineName = () => (isFakeEngine() ? 'fake' : 'kokoro');
