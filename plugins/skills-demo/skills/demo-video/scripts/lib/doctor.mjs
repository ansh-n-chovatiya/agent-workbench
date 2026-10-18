// Environment check run before every command: what is installed, what is
// missing, and the one-line fix for each missing piece.
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { SKILL_ROOT, run, which } from './env.mjs';
import { ttsAvailable } from './tts.mjs';
import { recordlyStatus } from './recordly.mjs';

// Every filter render uses (compose, voice, checks, edit).
const FILTERS = ['overlay', 'xfade', 'amix', 'freezedetect', 'perspective', 'alphamerge', 'loudnorm', 'crop', 'scale', 'fade'];
const mac = process.platform === 'darwin';
const pkgFix = (name) => (mac ? `brew install ${name}` : `sudo apt install ${name}`);
const inSkill = (cmd) => `cd "${SKILL_ROOT}" && ${cmd}`;
const VOICEBOX_HINT = 'Voicebox (https://github.com/jamiepine/voicebox, then open the app) for natural voices';
const BETTER_VOICES = 'System Settings > Accessibility > Spoken Content > System voice > Manage voices';

function item(name, required, ok, detail, fix) {
  return { name, ok, required, detail, fix: ok ? '' : fix };
}

// Playwright 1.63 needs Node 20, and the scenario require()s the ES-module
// fixture, which Node allows without a flag from 20.19 and 22.12 (not 21).
export const NODE_RANGE = '^20.19.0 || >=22.12.0';
export function nodeOk(version) {
  const [major, minor] = version.split('.').map(Number);
  return major === 20 ? minor >= 19 : major === 22 ? minor >= 12 : major > 22;
}
function checkNode() {
  return item(`Node ${NODE_RANGE}`, true, nodeOk(process.versions.node), `v${process.versions.node}`, 'install Node 22.12 or newer from https://nodejs.org');
}

async function checkFfmpeg() {
  const bin = await which('ffmpeg');
  if (!bin) return item('ffmpeg', true, false, 'not found on PATH', pkgFix('ffmpeg'));
  const { stdout } = await run('ffmpeg', ['-hide_banner', '-filters']);
  // Filter lines look like " TSC overlay  VV->V  Overlay a video ..."; the name is the second column.
  const have = new Set(stdout.split('\n').map((l) => l.trim().split(/\s+/)[1]).filter(Boolean));
  const missing = FILTERS.filter((f) => !have.has(f));
  const version = (await run('ffmpeg', ['-hide_banner', '-version'])).stdout.split('\n')[0].replace(/^ffmpeg version\s*/, '').split(' ')[0];
  return missing.length
    ? item('ffmpeg', true, false, `${version} lacks filters: ${missing.join(', ')}`, `${pkgFix('ffmpeg')} (a full build with ${missing.join(', ')})`)
    : item('ffmpeg', true, true, `${version} (${FILTERS.join(', ')})`);
}

async function checkFfprobe() {
  const bin = await which('ffprobe');
  return item('ffprobe', true, !!bin, bin || 'not found on PATH', `${pkgFix('ffmpeg')} (ffprobe ships with ffmpeg)`);
}

// Resolves @playwright/test from the skill root, not the user's project, so
// the skill's pinned version and its browsers are the ones used.
// edit reads the Playwright trace with unzip.
async function checkUnzip() {
  const bin = await which('unzip');
  return item('unzip', true, !!bin, bin || 'not found on PATH', pkgFix('unzip'));
}

async function checkPlaywright() {
  const req = createRequire(path.join(SKILL_ROOT, 'package.json'));
  try { req.resolve('@playwright/test'); } catch {
    return [
      item('Playwright', true, false, 'not installed in the skill folder', inSkill('npm install')),
      item('Chromium', true, false, 'needs Playwright first', inSkill('npx playwright install chromium')),
    ];
  }
  const version = req('@playwright/test/package.json').version;
  let exe = null;
  try { exe = req('@playwright/test').chromium.executablePath(); } catch {}
  const chromiumOk = !!exe && existsSync(exe);
  return [
    item('Playwright', true, true, version),
    item('Chromium', true, chromiumOk, chromiumOk ? 'installed' : 'browser not downloaded', inSkill('npx playwright install chromium')),
  ];
}

async function checkRecordly() {
  if (!mac) return item('Recordly', false, false, 'macOS only', 'not available on this platform');
  const { installed, appPath } = await recordlyStatus();
  return item('Recordly', false, installed, appPath || 'not installed', 'install from https://recordly.dev');
}

async function checkTts() {
  const tts = await ttsAvailable();
  if (!tts) return item('TTS', false, false, 'no Voicebox, say, espeak-ng or espeak', pkgFix('espeak-ng'));
  if (tts.tool === 'voicebox') return item('TTS', false, true, `voicebox, profile ${tts.voice}`);
  const premium = /\((Premium|Enhanced)\)/.test(tts.voice || '');
  const hint = tts.tool === 'say' && !premium ? `; better free voices: ${VOICEBOX_HINT}, or ${BETTER_VOICES}` : '';
  return item('TTS', false, true, `${tts.tool}, voice ${tts.voice ?? 'default'}${hint}`);
}

export async function doctor() {
  const items = [
    checkNode(),
    await checkFfmpeg(),
    await checkFfprobe(),
    await checkUnzip(),
    ...(await checkPlaywright()),
    await checkRecordly(),
    await checkTts(),
  ];
  return { ok: items.every((i) => i.ok || !i.required), items };
}

export function printDoctor({ ok, items }) {
  const width = Math.max(...items.map((i) => i.name.length));
  for (const i of items) {
    const status = i.ok ? 'ok      ' : i.required ? 'MISSING ' : 'optional';
    console.log(`  ${status}  ${i.name.padEnd(width)}  ${i.detail}${i.fix ? `  -> ${i.fix}` : ''}`);
  }
  console.log(ok ? 'Ready.' : 'Not ready: install the MISSING items above.');
}

// Stops the process with the full list when a required item is missing.
export async function requireReady() {
  const result = await doctor();
  if (!result.ok) {
    printDoctor(result);
    process.exit(1);
  }
  return result;
}
