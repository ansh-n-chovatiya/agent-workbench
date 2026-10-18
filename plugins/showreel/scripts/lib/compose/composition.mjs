import { suggestZoomRegions, validateRegions } from './zoom.mjs';
import { buildTimeMap } from './timemap.mjs';
import { THEMES } from './themes.mjs';
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export const DEFAULT_COMPOSITION = freeze({
  version: 1, run: { id: null }, output: { width: 1920, height: 1080, fps: 60 }, theme: 'clean',
  frame: { paddingPct: 5 }, cursor: { visible: true, sizePct: 1.35, clickEffect: true },
  zoom: { enabled: true, depth: 'medium', autoSuggest: true, regions: [] },
  captions: { enabled: true, mode: 'band' },
  cards: { title: { enabled: true, title: null, subtitle: null, duration: 2.2 }, outro: { enabled: true, text: 'Thank you', duration: 2 }, fade: 0.4 },
  edits: { trims: [], speeds: [] },
});
export const zoomDepth = (depth) => ({ subtle: 1.35, medium: 1.7, strong: 2.1 })[depth] ?? depth;
function merge(base, patch) {
  if (!object(base) || !object(patch)) return copy(patch);
  const result = copy(base);
  for (const [key, value] of Object.entries(patch)) Object.defineProperty(result, key, { value: object(value) && object(base[key]) ? merge(base[key], value) : copy(value), enumerable: true, writable: true, configurable: true });
  return result;
}
function copy(value) {
  if (Array.isArray(value)) return value.map(copy);
  if (object(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, copy(v)]));
  return value;
}
export function validateComposition(c) {
  const errors = [], warnings = [];
  const fail = (path, message) => errors.push(`composition.json: "${path}" ${message}`);
  function walk(value, model, prefix = '') {
    if (!object(value)) { fail(prefix || 'composition', 'must be an object'); return; }
    for (const key of Object.keys(value)) if (!Object.hasOwn(model, key)) fail(prefix + key, 'is an unknown key');
    for (const [key, def] of Object.entries(model)) {
      const path = prefix + key, v = value[key];
      if (object(def)) walk(v, def, path + '.');
      else if (Array.isArray(def)) { if (!Array.isArray(v)) fail(path, 'must be an array'); }
      else if (typeof def === 'boolean' && typeof v !== 'boolean') fail(path, 'must be boolean');
      else if (v === undefined) fail(path, 'is required');
    }
  }
  walk(c, DEFAULT_COMPOSITION);
  if (!object(c)) return { ok: false, errors, warnings };
  const range = (path, value, min, max, integer = false) => {
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(path, `must be ${integer ? 'an integer' : 'a number'} from ${min} to ${max}`);
  };
  if (c.version !== 1) fail('version', 'must be 1');
  if (typeof c.run?.id !== 'string' || !c.run.id.trim()) fail('run.id', 'must be nonempty');
  range('output.width', c.output?.width, 2, 7680, true);
  range('output.height', c.output?.height, 2, 4320, true);
  if (![30, 60].includes(c.output?.fps)) fail('output.fps', 'must be 30|60');
  if (!Object.hasOwn(THEMES, c.theme ?? '')) fail('theme', 'must be clean|dark');
  range('frame.paddingPct', c.frame?.paddingPct, 0, 25);
  range('cursor.sizePct', c.cursor?.sizePct, 0.1, 10);
  const depth = zoomDepth(c.zoom?.depth);
  range('zoom.depth', depth, 1.05, 4);
  if (!['band', 'overlay'].includes(c.captions?.mode)) fail('captions.mode', 'must be band|overlay');
  for (const [path, value] of [['cards.title.title', c.cards?.title?.title], ['cards.title.subtitle', c.cards?.title?.subtitle], ['cards.outro.text', c.cards?.outro?.text]]) {
    if (value !== null && (typeof value !== 'string' || !value.trim())) fail(path, 'must be nonempty text or null');
  }
  if (c.cards?.title?.enabled && !(typeof c.cards.title.title === 'string' && c.cards.title.title.trim())) fail('cards.title.title', 'is required for an enabled title card');
  if (c.cards?.outro?.enabled && !(typeof c.cards.outro.text === 'string' && c.cards.outro.text.trim())) fail('cards.outro.text', 'is required for an enabled outro card');
  range('cards.title.duration', c.cards?.title?.duration, 0, 30);
  range('cards.outro.duration', c.cards?.outro?.duration, 0, 30);
  range('cards.fade', c.cards?.fade, 0, 5);
  const regions = validateRegions(c.zoom?.regions);
  errors.push(...regions.errors); warnings.push(...regions.warnings);
  for (const [key, allowed] of [['trims', ['start', 'end']], ['speeds', ['start', 'end', 'rate']]]) {
    if (Array.isArray(c.edits?.[key])) c.edits[key].forEach((r, i) => {
      if (!object(r)) { fail(`edits.${key}.${i}`, 'must be an object'); return; }
      for (const name of Object.keys(r)) if (!allowed.includes(name)) fail(`edits.${key}.${i}.${name}`, 'is an unknown key');
    });
  }
  try { buildTimeMap({ duration: Number.MAX_VALUE, trims: c.edits?.trims, speeds: c.edits?.speeds }); }
  catch (error) { fail('edits', error.message); }
  return { ok: !errors.length, errors, warnings };
}
export function buildComposition({ brief, storyboard, events, record, edits = {}, overrides = {} }) {
  // Storyboard captions are resolved later, against recorded step IDs rather than guideSteps.
  void storyboard;
  const c = merge(merge(DEFAULT_COMPOSITION, {
    run: { id: record.runId }, theme: brief.theme,
    captions: brief.captions,
    cards: { title: { ...brief.titleCard, title: brief.titleCard.title ?? brief.topic }, outro: brief.outroCard }, edits,
  }), overrides);
  if (c.zoom?.autoSuggest && Array.isArray(c.zoom.regions) && !c.zoom.regions.length) {
    c.zoom.regions = suggestZoomRegions({ events, record, options: { depth: zoomDepth(c.zoom.depth) } });
  }
  const result = validateComposition(c);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  // Validate edit/region bounds against this run, not just the standalone schema.
  buildTimeMap({ duration: record.durationSec, ...c.edits });
  const regions = validateRegions(c.zoom.regions, { duration: record.durationSec });
  if (!regions.ok) throw new Error(regions.errors.join('\n'));
  return c;
}
