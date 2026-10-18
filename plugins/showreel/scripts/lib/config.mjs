import { readFile } from 'node:fs/promises';
import { validateAllowWrites } from './write-rules.mjs';

const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

export const DEFAULTS = freeze({
  baseURL: null,
  project: null,
  viewport: { width: 1920, height: 1080 },
  captureScale: 'auto',
  fps: 60,
  allowWrites: [],
  allowWebSockets: false,
  allowDevSockets: true,
  blur: [],
  readyTimeoutMs: 30000,
  settleMs: 2000,
  hygiene: { hideDevOverlays: true, hideScrollbars: true, dismissCookieBanners: true },
  stopOn: [],
});

const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function mergeConfig(user, name = 'config.json') {
  if (!object(user)) throw new Error(`${name} must contain a JSON object`);
  const fail = (key, message) => { throw new Error(`${name}: "${key}" ${message}`); };
  const out = structuredClone(DEFAULTS);
  for (const [key, value] of Object.entries(user)) {
    if (!Object.hasOwn(DEFAULTS, key)) throw new Error(`${name}: unknown key "${key}"`);
    const def = DEFAULTS[key];
    if (object(def)) {
      if (!object(value)) fail(key, 'must be an object');
      for (const [sub, v] of Object.entries(value)) {
        if (!Object.hasOwn(def, sub)) throw new Error(`${name}: unknown key "${key}.${sub}"`);
        out[key][sub] = v;
      }
    } else {
      if (Array.isArray(def) && !Array.isArray(value)) fail(key, 'must be an array');
      out[key] = structuredClone(value);
    }
  }
  if (typeof out.baseURL !== 'string' || !out.baseURL) fail('baseURL', 'is required (e.g. "http://localhost:3000")');
  try {
    const url = new URL(out.baseURL);
    if (!['http:', 'https:'].includes(url.protocol) || /\s/.test(out.baseURL)) throw new Error();
  } catch { fail('baseURL', 'must be an http(s) URL'); }
  if (out.project !== null && (typeof out.project !== 'string' || !out.project.trim())) fail('project', 'must be a non-empty string or null');
  if (out.project !== null && /[\\/]|^\.\.?$/.test(out.project)) fail('project', 'must be a plain name, not a path');
  if (!['auto', 1, 1.33, 1.67, 2].includes(out.captureScale)) fail('captureScale', 'must be "auto", 1, 1.33, 1.67 or 2');
  if (![30, 60].includes(out.fps)) fail('fps', 'must be 30 or 60');
  for (const key of ['viewport.width', 'viewport.height', 'readyTimeoutMs', 'settleMs']) {
    const v = key.split('.').reduce((o, k) => o[k], out);
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) fail(key, 'must be a positive number');
  }
  for (const key of ['allowWebSockets', 'allowDevSockets', 'hygiene.hideDevOverlays', 'hygiene.hideScrollbars', 'hygiene.dismissCookieBanners']) {
    const v = key.split('.').reduce((o, k) => o[k], out);
    if (typeof v !== 'boolean') fail(key, 'must be true or false');
  }
  for (const key of ['blur', 'stopOn']) {
    if (out[key].some((v) => typeof v !== 'string' || !v.trim())) fail(key, 'entries must be non-empty strings');
  }
  validateAllowWrites(out.allowWrites, name);
  return out;
}

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

export const configTemplate = () => JSON.stringify({ ...DEFAULTS, baseURL: 'http://localhost:3000' }, null, 2) + '\n';
