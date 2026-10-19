import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, statfs, stat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { HOME_DIR } from '../paths.mjs';
import { engineDir, modelDir } from './paths.mjs';
import { atomicWriteJson } from './atomic.mjs';
import { KOKORO_JS_VERSION, KOKORO_Q8_SHA256, REQUIRED_DISK_BYTES, isFakeEngine } from './pins.mjs';
import { engineStatus, findModelFile, sha256File } from './engine-state.mjs';
import { VoiceClient } from './client.mjs';

const MB = 1024 * 1024;
export const npmExecutable = (platform = process.platform) => (platform === 'win32' ? 'npm.cmd' : 'npm');
export const NPM_ARGS = Object.freeze(['install', '--omit=dev', '--no-audit', '--no-fund']);
export const enginePackageJson = () => ({ name: 'showreel-kokoro-engine', private: true, version: '0.0.0', type: 'module', dependencies: { 'kokoro-js': KOKORO_JS_VERSION } });

async function dirBytes(dir) {
  let total = 0;
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return 0; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    try { total += e.isDirectory() ? await dirBytes(p) : (await stat(p)).size; } catch { /* vanished file */ }
  }
  return total;
}
export async function checkVoiceDisk(dir = HOME_DIR, required = REQUIRED_DISK_BYTES) {
  await mkdir(dir, { recursive: true });
  const s = await statfs(dir), free = Number(s.bavail) * Number(s.bsize);
  return { ok: free >= required, freeBytes: free, requiredBytes: required };
}
// Windows: npm is npm.cmd, which Node 20.12+ refuses to spawn without a shell. Run npm-cli.js through node instead (still no shell);
// fall back to npm.cmd (shell:false) only if the bundled npm-cli.js is not beside node.exe.
export function npmCommand({ platform = process.platform, execPath = process.execPath, exists = existsSync } = {}) {
  if (platform === 'win32') {
    const cli = path.win32.join(path.win32.dirname(execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
    if (exists(cli)) return { file: execPath, args: [cli, ...NPM_ARGS] };
  }
  return { file: npmExecutable(platform), args: [...NPM_ARGS] };
}
function runNpm(cwd, say) {
  const { file, args } = npmCommand();
  say?.('running npm install (this can take a minute)');
  return new Promise((resolve, reject) => {
    execFile(file, args, { cwd, shell: false, windowsHide: true, maxBuffer: 16 * MB }, (err, stdout, stderr) => (err ? reject(new Error(`npm install failed: ${String(stderr || err.message).trim().split('\n').slice(-5).join(' | ')}`)) : resolve(stdout)));
  });
}

export async function checkInstall() {
  const status = await engineStatus();
  return { ...status, engineDir: engineDir(), modelDir: modelDir() };
}
export function formatCheck(s) {
  const lines = [`Voice engine: ${s.installed ? 'installed' : 'not installed'}${s.fake ? ' (fake test engine)' : ''}`];
  lines.push(`  kokoro-js: ${s.kokoroJs ?? 'missing'} (pinned ${s.pinnedKokoroJs})`);
  lines.push(`  model: ${s.modelPresent ? `${(s.modelBytes / MB).toFixed(0)} MB at ${s.modelFile}` : 'missing'}`);
  lines.push(`  model hash: ${s.modelHash ? s.modelHash : 'not recorded'}${s.hashPinned ? (s.hashVerified ? ' (verified against pin)' : ' (NOT verified)') : ' (not pinned yet)'}`);
  if (!s.installed) lines.push('Run: showreel voice install --yes');
  return lines.join('\n');
}

export async function installEngine({ yes = false, say = (m) => console.log(m) } = {}) {
  const before = await engineStatus();
  if (before.installed && !before.fake) {
    say('Voice engine is already installed.');
    // Re-check the model against the pin when an older install only recorded its hash.
    if (before.hashPinned && !before.hashVerified && before.modelHash === KOKORO_Q8_SHA256) {
      const modelFile = await findModelFile();
      if (modelFile && await sha256File(modelFile) === KOKORO_Q8_SHA256) {
        const info = JSON.parse(await readFile(path.join(engineDir(), 'engine.json'), 'utf8'));
        await atomicWriteJson(path.join(engineDir(), 'engine.json'), { ...info, hashVerified: true });
        say('model hash verified');
        return { alreadyInstalled: true, ...(await engineStatus()) };
      }
    }
    say(formatCheck(before)); return { alreadyInstalled: true, ...before };
  }
  const disk = await checkVoiceDisk();
  say(`Disk: ${(disk.freeBytes / MB / 1024).toFixed(1)} GB free, about ${(disk.requiredBytes / MB).toFixed(0)} MB needed (kokoro-js ${KOKORO_JS_VERSION} plus the Kokoro-82M q8 model, about 100 MB download).`);
  if (!disk.ok) throw new Error(`Not enough free disk space for the voice engine (need ${(disk.requiredBytes / MB).toFixed(0)} MB)`);
  if (!yes && !isFakeEngine()) throw new Error(`This downloads kokoro-js and the Kokoro model into ${engineDir()} and ${modelDir()}. Re-run with --yes to continue.`);
  await mkdir(engineDir(), { recursive: true });
  await mkdir(modelDir(), { recursive: true });
  await atomicWriteJson(path.join(engineDir(), 'package.json'), enginePackageJson());
  say(`[1/4] wrote ${path.join(engineDir(), 'package.json')} (kokoro-js@${KOKORO_JS_VERSION})`);
  if (isFakeEngine()) { say('Fake engine selected: skipped npm install and model download.'); return { fake: true, ...(await engineStatus()) }; }
  say('[2/4] installing kokoro-js');
  await runNpm(engineDir(), say);
  say('[3/4] downloading and loading the model (first run only)');
  const client = new VoiceClient();
  let lastPct = -1;
  try {
    await client.warmup((p) => {
      if (p.status === 'progress' && Number.isFinite(p.progress)) { const pct = Math.floor(p.progress / 10) * 10; if (pct !== lastPct) { lastPct = pct; say(`  ${p.file ?? 'model'}: ${pct}%`); } }
    });
  } finally { await client.stop(); }
  say('[4/4] verifying the model');
  const modelFile = await findModelFile();
  if (!modelFile) throw new Error(`Model file not found under ${modelDir()} after download`);
  const hash = await sha256File(modelFile);
  if (KOKORO_Q8_SHA256 !== null && hash !== KOKORO_Q8_SHA256) throw new Error(`Model SHA-256 mismatch: expected ${KOKORO_Q8_SHA256}, got ${hash}. Delete ${modelDir()} and retry.`);
  await atomicWriteJson(path.join(engineDir(), 'engine.json'), { kokoroJs: KOKORO_JS_VERSION, modelFile, modelHash: hash, hashVerified: KOKORO_Q8_SHA256 !== null, installedAt: new Date().toISOString() });
  if (KOKORO_Q8_SHA256 === null) say(`model hash not pinned yet (recorded ${hash})`);
  else say('model hash verified');
  const size = (await dirBytes(engineDir())) + (await dirBytes(modelDir()));
  say(`Installed. Disk used: ${(size / MB).toFixed(0)} MB`);
  return { alreadyInstalled: false, ...(await engineStatus()) };
}
