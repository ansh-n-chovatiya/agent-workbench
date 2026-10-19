import { readFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { projectDir } from '../paths.mjs';
import { readProjectFile } from '../project.mjs';
import { sampleDir, clipFile, pronunciationsFile } from './paths.mjs';
import { atomicWriteJson } from './atomic.mjs';
import { DEFAULT_VOICE, SAMPLE_TEXT } from './pins.mjs';
import { FALLBACK_VOICES, formatVoices, normalizeVoices } from './voices.mjs';
import { prepareText, clampSpeed } from './prepare.mjs';
import { clipKey, readIndex, writeIndex, setClip, computeStatuses, cleanClips } from './clips.mjs';
import { currentModelHash, currentEngineName, NOT_INSTALLED } from './engine-state.mjs';
import { getClient, stop } from './client.mjs';
import { synthesizeToFile } from './synthesize.mjs';
import { importWavFile } from './import.mjs';
import { checkInstall, formatCheck, installEngine } from './install.mjs';

const USAGE = 'Usage: showreel voice <install|list|samples|generate|status|import|clean> [options]';
const SPECS = {
  install: { flags: ['--yes', '--check'], switches: ['--yes', '--check'] },
  list: { flags: ['--json'], switches: ['--json'] },
  samples: { flags: ['--voice', '--all'], switches: ['--all'] },
  generate: { flags: ['--name', '--step', '--voice', '--speed', '--force'], switches: ['--force'], needsName: true },
  status: { flags: ['--name', '--json'], switches: ['--json'], needsName: true },
  import: { flags: ['--name', '--step', '--file', '--as'], switches: [], needsName: true },
  clean: { flags: ['--name'], switches: [], needsName: true },
};
export function parseVoiceArgs(sub, flags) {
  const spec = SPECS[sub];
  const options = {};
  for (let i = 0; i < flags.length; i++) {
    const f = flags[i];
    if (!spec.flags.includes(f) || Object.hasOwn(options, f)) throw new Error(`Invalid option: ${f}`);
    if (spec.switches.includes(f)) options[f] = true;
    else { if (flags[i + 1] === undefined || flags[i + 1].startsWith('--')) throw new Error(`Missing value for ${f}`); options[f] = flags[++i]; }
  }
  if (spec.needsName) { if (!options['--name']) throw new Error('--name is required'); projectDir(options['--name']); }
  return options;
}
const f2 = (n) => (Number.isFinite(n) ? n.toFixed(2) : '-');
const checkVoiceId = (id) => { if (!/^[a-z]{2}_[a-z0-9]+$/i.test(id)) throw new Error(`Invalid voice id "${id}". Run: showreel voice list`); return id; };
const parseSpeed = (raw) => { if (raw === undefined) return 1; const n = Number(raw); if (!Number.isFinite(n) || n <= 0) throw new Error('--speed must be a positive number'); return clampSpeed(n); };
const exists = (p) => access(p).then(() => true, () => false);

export async function readPronunciations(name) {
  try { const data = JSON.parse(await readFile(pronunciationsFile(name), 'utf8')); return data && typeof data === 'object' && !Array.isArray(data) ? data : {}; }
  catch (err) { if (err.code === 'ENOENT') return {}; throw new Error(`${pronunciationsFile(name)} is not valid JSON: ${err.message}`); }
}
async function readMuted(name) {
  try {
    const comp = JSON.parse(await readFile(path.join(projectDir(name), 'composition.json'), 'utf8'));
    const steps = comp?.audio?.narration?.steps ?? {};
    return Object.entries(steps).filter(([, v]) => v?.muted).map(([k]) => k);
  } catch { return []; }
}
async function liveVoices() {
  try { return normalizeVoices(await getClient().voices()); } catch (err) { if (err.message === NOT_INSTALLED) return FALLBACK_VOICES.slice(); throw err; }
}

// Wanted clip description per step from storyboard narration. Pure given its inputs.
export function wantedClips({ storyboard, pronunciations, voice, speed, engine, modelHash }) {
  const wanted = {};
  for (const step of storyboard.steps) {
    if (step.narration == null) continue;
    const { preparedText, segments, warnings } = prepareText(step.narration, { pronunciations });
    if (!segments.some((s) => s.type === 'speech')) continue;
    wanted[step.id] = { voice, speed, preparedText, warnings, key: clipKey({ engine, modelHash, voice, speed, preparedText }) };
  }
  return wanted;
}

async function statusRows(name, { voice, speed }) {
  const storyboard = await readProjectFile(name, 'storyboard');
  const index = await readIndex(name);
  const pronunciations = await readPronunciations(name);
  const wanted = wantedClips({ storyboard, pronunciations, voice, speed, engine: currentEngineName(), modelHash: await currentModelHash() });
  const rows = computeStatuses({ index, steps: storyboard.steps, wantedByStep: wanted, muted: await readMuted(name) });
  return { storyboard, index, pronunciations, wanted, rows };
}
function table(rows, headers) {
  const all = [headers, ...rows.map((r) => r.map((c) => String(c ?? '-')))];
  const w = headers.map((_, i) => Math.max(...all.map((r) => r[i].length)));
  return all.map((r) => r.map((c, i) => c.padEnd(w[i])).join('  ').trimEnd()).join('\n');
}

async function generateCommand(o) {
  const name = o['--name'], voice = checkVoiceId(o['--voice'] ?? DEFAULT_VOICE), speed = parseSpeed(o['--speed']), force = Boolean(o['--force']);
  const { storyboard, index: initial, pronunciations, wanted } = await statusRows(name, { voice, speed });
  const only = o['--step'];
  if (only && !storyboard.steps.some((s) => s.id === only)) throw new Error(`Unknown step "${only}"`);
  let index = initial;
  const out = [];
  const warnings = [];
  try {
    for (const step of storyboard.steps) {
      if (only && step.id !== only) continue;
      const w = wanted[step.id];
      const current = index.steps[step.id] ? index.clips[index.steps[step.id]] : null;
      if (current && (current.source === 'own' || current.source === 'file') && !force) { out.push([step.id, current.source, f2(current.durationSec), 'kept', '-']); continue; }
      if (!w) { out.push([step.id, step.narration == null ? 'none' : 'empty', '-', '-', '-']); continue; }
      warnings.push(...w.warnings.map((x) => `${step.id}: ${x}`));
      const file = clipFile(name, w.key);
      const known = index.clips[w.key];
      if (!force && known && known.source === 'tts' && await exists(file)) {
        if (index.steps[step.id] !== w.key) index = setClip(index, { ...known, stepId: step.id });
        out.push([step.id, 'fresh', f2(known.durationSec), 'cache', '-']); continue;
      }
      const prior = current ? 'stale' : 'missing';
      const r = await synthesizeToFile({ engine: getClient(), text: step.narration, voice, speed, pronunciations, out: file });
      index = setClip(index, { key: w.key, stepId: step.id, text: step.narration, voice, speed, engine: currentEngineName(), durationSec: r.durationSec, sampleRate: r.sampleRate, source: 'tts', createdAt: new Date().toISOString() });
      await writeIndex(name, index);   // persist after each clip so an interruption keeps finished work
      warnings.push(...r.warnings.map((x) => `${step.id}: ${x}`));
      out.push([step.id, `${prior} -> fresh`, f2(r.durationSec), 'generated', f2(r.rtf)]);
    }
  } finally { await writeIndex(name, index); await stop(); }
  console.log(table(out, ['step', 'status', 'seconds', 'source', 'rtf']));
  for (const x of warnings) console.error(`warning: ${x}`);
}

async function statusCommand(o) {
  const name = o['--name'];
  // Status compares against the voice and speed the current clips were made with, so a plain `status` does not call everything stale.
  const index = await readIndex(name);
  const clips = Object.values(index.clips).filter((c) => c.source === 'tts');
  const voice = clips.at(-1)?.voice ?? DEFAULT_VOICE, speed = clips.at(-1)?.speed ?? 1;
  const { rows } = await statusRows(name, { voice, speed });
  if (o['--json']) { console.log(JSON.stringify({ voice, speed, steps: rows }, null, 2)); return; }
  console.log(table(rows.map((r) => [r.stepId, r.status, r.durationSec == null ? '-' : f2(r.durationSec), r.source ?? '-']), ['step', 'status', 'seconds', 'source']));
}

async function samplesCommand(o) {
  if (o['--all'] && o['--voice']) throw new Error('Use either --voice or --all');
  const ids = o['--all'] ? (await liveVoices()).map((v) => v.id) : [checkVoiceId(o['--voice'] ?? DEFAULT_VOICE)];
  await mkdir(sampleDir(), { recursive: true });
  const modelHash = await currentModelHash(), engine = currentEngineName();
  const { preparedText } = prepareText(SAMPLE_TEXT);
  try {
    for (const voice of ids) {
      const key = clipKey({ engine, modelHash, voice, speed: 1, preparedText });
      const wav = path.join(sampleDir(), `${voice}.wav`), meta = path.join(sampleDir(), `${voice}.json`);
      let cached = false;
      try { cached = JSON.parse(await readFile(meta, 'utf8')).key === key && await exists(wav); } catch { /* regenerate */ }
      if (!cached) {
        const r = await synthesizeToFile({ engine: getClient(), text: SAMPLE_TEXT, voice, speed: 1, out: wav });
        await atomicWriteJson(meta, { key, voice, engine, durationSec: r.durationSec, sampleRate: r.sampleRate, text: SAMPLE_TEXT });
      }
      console.log(`${wav}${cached ? ' (cached)' : ''}`);
    }
  } finally { await stop(); }
}

async function importCommand(o) {
  const name = o['--name'], step = o['--step'], file = o['--file'], as = o['--as'] ?? 'file';
  if (!step || !file) throw new Error('Usage: showreel voice import --name <name> --step <sN> --file <F.wav> [--as own|file]');
  if (!['own', 'file'].includes(as)) throw new Error('--as must be own or file');
  const storyboard = await readProjectFile(name, 'storyboard');
  const s = storyboard.steps.find((x) => x.id === step);
  if (!s) throw new Error(`Unknown step "${step}"`);
  const r = await importWavFile(name, path.resolve(file));
  const index = setClip(await readIndex(name), { key: r.key, stepId: step, text: s.narration ?? '', voice: null, speed: 1, engine: null, durationSec: r.durationSec, sampleRate: r.sampleRate, source: as, createdAt: new Date().toISOString() });
  await writeIndex(name, index);
  console.log(`${step}: imported ${f2(r.durationSec)} s at ${r.sampleRate} Hz as ${as}`);
}

export async function voiceCommand(flags) {
  try { await runVoiceCommand(flags); } finally { await stop(); }   // never leave the worker running after an error
}
async function runVoiceCommand(flags) {
  const [sub, ...rest] = flags;
  if (!Object.hasOwn(SPECS, sub ?? '')) { console.log(USAGE); process.exitCode = 2; return; }
  const o = parseVoiceArgs(sub, rest);
  if (sub === 'install') {
    if (o['--check']) { const s = await checkInstall(); console.log(formatCheck(s)); process.exitCode = s.installed ? 0 : 1; return; }
    await installEngine({ yes: Boolean(o['--yes']) });
    return;
  }
  if (sub === 'list') {
    let list;
    try { list = await liveVoices(); } finally { await stop(); }
    console.log(o['--json'] ? JSON.stringify(list, null, 2) : formatVoices(list));
    return;
  }
  if (sub === 'samples') return samplesCommand(o);
  if (sub === 'generate') return generateCommand(o);
  if (sub === 'status') return statusCommand(o);
  if (sub === 'import') return importCommand(o);
  const { removed, bytes } = await cleanClips(o['--name']);
  console.log(`removed ${removed.length} clip(s), ${(bytes / 1024).toFixed(0)} KB`);
}
