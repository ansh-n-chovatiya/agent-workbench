// The config file: defaults, loading, validation, and the init template.
import { readFile, copyFile, mkdir, constants } from 'node:fs/promises';
import path from 'node:path';
import { SKILL_ROOT, warn } from './env.mjs';
import { resolveProject } from './paths.mjs';
import { RULE_HEADER, ACTION_NAME } from './timeline.mjs';

export const CONFIG_FILE = 'demo.config.json';

// Every key the config accepts. reference/config.md documents each one and
// templates/demo.config.json mirrors these values; keep all three in step.
export const DEFAULTS = Object.freeze({
  baseURL: null, // required
  project: null, // null = the project folder's name
  storageState: null, // null = <home>/auth/<project>.json
  outDir: null, // null = <home>/runs/<project>
  deliverDir: null, // null = ~/Desktop/Demo Videos
  laptop: { width: 1920, height: 1080 },
  phone: { enabled: false, width: 390, height: 844 },
  busySelector: '[aria-busy="true"]',
  maxWaitMs: 1200,
  allowWrites: [],
  allowWebSockets: false,
  blur: [],
  caption: { position: 'bottom', background: '#111827e6', color: '#ffffff', font: 'Inter, system-ui, sans-serif', mode: 'band', bandHeight: 120 },
  title: { text: null, subtitle: null },
  end: { text: 'Thank you' },
  voice: { name: null, rate: 160 }, // rate: spoken words per minute, calm rather than brisk
  // breathMs: least silence after each spoken sentence; voiceLeadMs: caption-to-voice lead.
  pace: { msPerChar: 55, minStepMs: 1800, captionLeadMs: 300, settleMs: 400, typeCps: 14, breathMs: 450, voiceLeadMs: 250 },
  recordly: 'auto',
  recordlyTimeoutMin: 10,
  timeoutMin: 10,
  actionTimeoutSec: 60, // one action or expect while recording
  rehearsalActionTimeoutMs: 5000, // one action or expect in the rehearsal
  stopOn: [], // texts that fail the run the moment one shows on the page
  nextBuildDir: null, // null = the nearest .next folder above the scenario
  allowDevSockets: true,
});

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
let warnedHeight = false; // the config is merged more than once per command

// Validates `user` against DEFAULTS and returns a merged copy. Throws a
// one-line Error naming the offending key. Exported for tests.
export function mergeConfig(user, name = CONFIG_FILE) {
  if (!isPlainObject(user)) throw new Error(`${name} must contain a JSON object`);
  const out = structuredClone(DEFAULTS);
  for (const [key, value] of Object.entries(user)) {
    if (!(key in DEFAULTS)) throw new Error(`${name}: unknown key "${key}"`);
    const def = DEFAULTS[key];
    if (isPlainObject(def)) {
      if (!isPlainObject(value)) throw new Error(`${name}: "${key}" must be an object`);
      for (const [sub, v] of Object.entries(value)) {
        if (!(sub in def)) throw new Error(`${name}: unknown key "${key}.${sub}"`);
        out[key][sub] = v;
      }
    } else if (Array.isArray(def)) {
      if (!Array.isArray(value)) throw new Error(`${name}: "${key}" must be an array`);
      out[key] = value;
    } else {
      out[key] = value;
    }
  }
  if (typeof out.baseURL !== 'string' || !out.baseURL) throw new Error(`${name}: "baseURL" is required (e.g. "http://localhost:3000")`);
  if (!['auto', true, false].includes(out.recordly)) throw new Error(`${name}: "recordly" must be "auto", true or false`);
  for (const key of ['allowWebSockets', 'allowDevSockets']) {
    if (typeof out[key] !== 'boolean') throw new Error(`${name}: "${key}" must be true or false`);
  }
  for (const key of ['project', 'storageState', 'outDir', 'deliverDir', 'nextBuildDir']) {
    if (out[key] !== null && (typeof out[key] !== 'string' || !out[key])) throw new Error(`${name}: "${key}" must be a non-empty string or null`);
  }
  if (out.project !== null && /[\\/]|^\.\.?$/.test(out.project)) throw new Error(`${name}: "project" must be a plain name, not a path`);
  if (!['band', 'overlay', 'off'].includes(out.caption.mode)) throw new Error(`${name}: "caption.mode" must be "band", "overlay" or "off"`);
  for (const key of ['pace.breathMs', 'pace.voiceLeadMs']) {
    const v = key.split('.').reduce((o, k) => o[k], out);
    if (typeof v !== 'number' || !(v >= 0) || !Number.isFinite(v)) throw new Error(`${name}: "${key}" must be a number of milliseconds, 0 or more`);
  }
  for (const key of ['voice.rate', 'caption.bandHeight', 'recordlyTimeoutMin', 'timeoutMin', 'actionTimeoutSec', 'rehearsalActionTimeoutMs']) {
    const v = key.split('.').reduce((o, k) => o[k], out);
    if (typeof v !== 'number' || !(v > 0) || !Number.isFinite(v)) throw new Error(`${name}: "${key}" must be a positive number`);
  }
  if (out.stopOn.some((s) => typeof s !== 'string' || !s)) throw new Error(`${name}: "stopOn" entries must be non-empty strings`);
  // The recording takes the video area's shape (paths.mjs laptopViewport), so
  // only the width is used; a height that implies another shape is ignored.
  const { width, height } = out.laptop;
  if (user.laptop?.height !== undefined && Math.round(height / 2) !== Math.round((width * 1080) / 1920 / 2) && !warnedHeight) {
    warnedHeight = true;
    warn(`${name}: laptop.height ${height} is not used; the recording keeps the video's shape, so its height follows laptop.width (${width})`);
  }
  // A bad rule must stop the run here: during recording it would throw inside
  // the save guard on the first write. A misspelt header condition would
  // otherwise be read as part of the path and silently allow nothing.
  for (const rule of out.allowWrites) {
    if (typeof rule !== 'string' || !rule) throw new Error(`${name}: allowWrites entry ${JSON.stringify(rule)} must be a non-empty string`);
    const m = rule.match(RULE_HEADER) ?? rule.match(ACTION_NAME);
    const target = m ? rule.slice(0, m.index) : rule;
    if (!m && /\s\[[^\]=]*=[^\]]*\]$/.test(rule)) throw new Error(`${name}: allowWrites entry ${JSON.stringify(rule)} must end in " [Next-Action=<id>]", " [Next-Action-Name=<name>]" or " [header:<name>=<value>]" after the path`);
    if (!target) throw new Error(`${name}: allowWrites entry ${JSON.stringify(rule)} needs a path before its header condition`);
    if (target.startsWith('re:')) {
      try { new RegExp(target.slice(3)); } catch (err) { throw new Error(`${name}: allowWrites entry ${JSON.stringify(rule)} is not a valid regex: ${err.message}`); }
    }
  }
  return out;
}

// Reads one config file and returns the merged, validated config.
export async function readConfigFile(file) {
  let text;
  try { text = await readFile(file, 'utf8'); } catch (err) {
    if (err.code === 'ENOENT') throw new Error(`config file not found: ${file}`);
    throw err;
  }
  let parsed;
  try { parsed = JSON.parse(text); } catch (err) {
    throw new Error(`${file} is not valid JSON: ${err.message}`);
  }
  return mergeConfig(parsed, file);
}

// For stages that still take the config alone: finds it the same way as
// resolveProject, and keeps unset outDir/storageState at the in-project paths
// those stages resolve against cwd. Stages moved to resolveProject get the
// HOME_DIR locations instead.
export async function loadConfig(cwd) {
  const { config } = await resolveProject({ cwd });
  return { ...config, outDir: config.outDir ?? 'demo-videos', storageState: config.storageState ?? '.demo/auth.json' };
}

// Copies the template to `file` (creating its folder). Returns false, and
// leaves the file alone, when it already exists.
export async function writeTemplate(file) {
  await mkdir(path.dirname(file), { recursive: true });
  try {
    await copyFile(path.join(SKILL_ROOT, 'templates', CONFIG_FILE), file, constants.COPYFILE_EXCL);
    return true;
  } catch (err) {
    if (err.code === 'EEXIST') return false;
    throw err;
  }
}
