import { suggestZoomRegions, validateRegions } from './zoom.mjs';
import { buildTimeMap } from './timemap.mjs';
import { THEMES } from './themes.mjs';
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const cursorImageModel = { image: null, hotspot: { x: 0, y: 0 } };
const customCursorModel = { arrow: cursorImageModel, hand: cursorImageModel, text: cursorImageModel, heightPct: null };
const background = { type: 'theme', colors: ['#eef2f7', '#dbe4f0'], angle: 135, image: null };
const cardDefaults = { align: 'center', titleSizePct: 7, subtitleSizePct: 3.6,
  titleColor: '#111827', subtitleColor: '#4b5563', background,
  accent: { enabled: true, color: '#0f766e', shape: 'bar', widthPct: 12 }, logo: null };
export const DEFAULT_COMPOSITION = freeze({
  version: 1, run: { id: null }, output: { width: 1920, height: 1080, fps: 60, quality: 'standard' }, theme: 'clean',
  frame: { paddingXPct: 8, paddingYPct: 5, radiusPx: 14,
    shadow: { enabled: true, blurPx: 40, offsetYPx: 16, opacity: 0.25 },
    border: { enabled: false, color: '#ffffff', widthPx: 1 }, background },
  cursor: { visible: true, style: 'arrow', custom: null, sizePct: 3.4, fill: '#ffffff', stroke: '#111827', shadow: true,
    scaleWithZoom: true, hideWhenIdleSec: 1.8, pressScale: 0.86,
    autoShape: true, followThrough: { enabled: true, distancePx: 140, durationSec: 0.8, startAfterClickSec: 0.35 }, microCorrection: true, entrance: true,
    clickEffect: { style: 'none', color: null, sizeMult: 1, durationSec: 0.55 } },
  zoom: { enabled: true, depth: 'medium', autoSuggest: true, speed: 'normal', holdAfterClickSec: 0.9,
    leadInSec: 0.1, onlyKinds: ['click', 'fill'], regions: [] },
  captions: { enabled: true, mode: 'band', position: 'bottom', bandHeightPct: 13, fontSizePct: 3.4,
    fontWeight: 600, color: '#ffffff', background: 'rgba(17,24,39,0.86)', maxLines: 2, align: 'center' },
  cards: { title: { ...cardDefaults, enabled: true, title: null, subtitle: null, durationSec: 2.2 },
    outro: { ...cardDefaults, enabled: true, text: 'Thank you', subtitle: null, durationSec: 2 }, fade: 0.4, transition: 'crossfade' },
  edits: { trims: [], speeds: [] },
});
export const COMPOSITION_RANGES = [
    ['output.width',2,7680,true],['output.height',2,4320,true],['frame.paddingXPct',0,25],['frame.paddingYPct',0,25],
    ['frame.radiusPx',0,300],['frame.shadow.blurPx',0,300],['frame.shadow.offsetYPx',-300,300],['frame.shadow.opacity',0,1],['frame.border.widthPx',0,30],
    ['cursor.followThrough.distancePx',0,500],['cursor.followThrough.durationSec',0.1,5],['cursor.followThrough.startAfterClickSec',0,5],
    ['cursor.sizePct',1,8],['cursor.hideWhenIdleSec',0,60],['cursor.pressScale',0.1,1],['cursor.clickEffect.sizeMult',0.1,10],['cursor.clickEffect.durationSec',0.05,5],
    ['zoom.holdAfterClickSec',0,30],['zoom.leadInSec',0,5],['captions.bandHeightPct',6,25],['captions.fontSizePct',1,10],['cards.fade',0,1.5],
  ];
export const COMPOSITION_ENUMS = { 'cursor.style':['arrow','pointer','dot','ring','crosshair','custom'], 'cursor.clickEffect.style':['ripple','pulse','none'],
    'zoom.speed':['slow','normal','fast'], 'captions.mode':['band','overlay'], 'captions.position':['top','bottom'],
    'captions.fontWeight':[400,600,700], 'captions.maxLines':[1,2,3], 'captions.align':['center','left'], 'cards.transition':['crossfade','cut'] };
export const SETTING_RANGES = Object.fromEntries([
  ...COMPOSITION_RANGES, ['frame.paddingPct',0,25], ['zoom.depth',1.05,4], ['cursor.custom.heightPct',1,8],
  ...['arrow','hand','text'].flatMap(s => ['x','y'].map(k => [`cursor.custom.${s}.hotspot.${k}`,0,1])),
  ...['title','outro'].flatMap(k => [['durationSec',0,30],['titleSizePct',1,20],['subtitleSizePct',1,12],['accent.widthPct',0,100],['logo.heightPct',1,40]].map(([p,a,b]) => [`cards.${k}.${p}`,a,b])),
  ...['frame.background','cards.title.background','cards.outro.background'].map(p => [`${p}.angle`,0,360]),
].map(([p,min,max,integer=false]) => [p,{min,max,step:integer ? 1 : 0.01}]));
export const SETTING_ENUMS = { ...COMPOSITION_ENUMS, theme:Object.keys(THEMES), 'output.fps':[30,60], 'output.quality':['standard','high'],
  ...Object.fromEntries(['title','outro'].flatMap(k => [[`cards.${k}.align`,['center','left']],[`cards.${k}.accent.shape`,['bar','underline','none']]])),
  ...Object.fromEntries(['frame.background','cards.title.background','cards.outro.background'].map(p => [`${p}.type`,['theme','gradient','solid','image']])),
};
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
// Lexical containment is portable to the editor; realpath containment is checked by the server too.
export const safeImagePath = (v) => typeof v === 'string' && !!v.trim() && !/^(?:[\\/]|[a-z][a-z0-9+.-]*:)/i.test(v)
  && !v.split(/[\\/]/).some((part) => part === '..' || part === '') && !/[?#%\x00-\x1f]/.test(v);
export function resolveComposition(input) {
  const theme = typeof input.theme === 'string' && Object.hasOwn(THEMES, input.theme) ? THEMES[input.theme] : THEMES.clean;
  const themed = merge(DEFAULT_COMPOSITION, { frame: { background: { colors: theme.background.colors, angle: theme.background.angle }, radiusPx: theme.frame.radiusPx, shadow: { blurPx: theme.frame.shadow.blurPx, offsetYPx: theme.frame.shadow.offsetYPx } }, cursor: theme.cursor, captions: theme.caption,
    cards: Object.fromEntries(['title', 'outro'].map((key) => [key, { titleColor: theme.card.titleColor,
      subtitleColor: theme.card.subtitleColor, background: { colors: theme.card.background.colors, angle: theme.card.background.angle ?? 135 }, accent: { color: theme.card.accent } }])) });
  const patch = copy(input);
  if (patch.frame?.paddingPct !== undefined) {
    patch.frame.paddingXPct ??= patch.frame.paddingPct; patch.frame.paddingYPct ??= patch.frame.paddingPct;
    delete patch.frame.paddingPct;
  }
  for (const key of ['title', 'outro']) if (patch.cards?.[key]?.duration !== undefined) { patch.cards[key].durationSec ??= patch.cards[key].duration; delete patch.cards[key].duration; }
  for (const key of ['title', 'outro']) if (object(patch.cards?.[key]?.logo)) patch.cards[key].logo = merge({ image: null, heightPct: 10 }, patch.cards[key].logo);
  if (object(patch.cursor?.custom)) for (const shape of ['arrow', 'hand', 'text']) {
    if (object(patch.cursor.custom[shape])) patch.cursor.custom[shape] = merge(cursorImageModel, patch.cursor.custom[shape]);
  }
  if (typeof patch.cursor?.clickEffect === 'boolean') patch.cursor.clickEffect = { ...DEFAULT_COMPOSITION.cursor.clickEffect, style: patch.cursor.clickEffect ? 'ripple' : 'none' };
  return merge(themed, patch);
}
export function validateComposition(c, { duration = Number.MAX_VALUE } = {}) {
  const errors = [], warnings = [];
  const fail = (p, m) => errors.push(`composition.json: "${p}" ${m}`);
  const range = (p, v, min, max, integer = false) => {
    if (!Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) fail(p, `must be ${integer ? 'an integer' : 'a number'} from ${min} to ${max}`);
  };
  const namedColors = new Set(('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato transparent turquoise violet wheat white whitesmoke yellow yellowgreen').split(' '));
  const color = (p, v, nullable = false) => {
    if (nullable && v === null) return;
    if (typeof v !== 'string' || (!namedColors.has(v.toLowerCase()) && !/^(#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8}|(?:rgb|hsl)a?\([\d.,% +/\-]+\))$/i.test(v))) fail(p, 'must be a CSS color');
  };
  function walk(v, model, p = '') {
    if (!object(v)) { fail(p || 'composition', 'must be an object'); return; }
    for (const [k, x] of Object.entries(v)) {
      const key = p ? `${p}.${k}` : k;
      if ((p === 'frame' && k === 'paddingPct') || (/^cards\.(title|outro)$/.test(p) && k === 'duration')) { range(key, x, 0, k === 'duration' ? 30 : 25); continue; }
      if (key === 'captions.cues') continue;
      if (!Object.hasOwn(model, k)) { fail(key, 'is an unknown key'); continue; }
      if (key === 'cursor.clickEffect' && typeof x === 'boolean') continue;
      if (key === 'cursor.custom') {
        if (x !== null) walk(x, customCursorModel, key);
      } else if (k === 'logo') {
        if (x !== null) walk(x, { image: null, heightPct: 10 }, key);
      } else if (object(model[k])) walk(x, model[k], key);
      else if (Array.isArray(model[k])) { if (!Array.isArray(x)) fail(key, 'must be an array'); }
      else if (typeof model[k] === 'boolean' && typeof x !== 'boolean') fail(key, 'must be boolean');
      if (k === 'heightPct' && p.endsWith('.logo')) range(key, x, 1, 40);
      if (k === 'image' && x !== null && !safeImagePath(x)) fail(key, 'must be a local path inside the project');
    }
  }
  walk(c, DEFAULT_COMPOSITION);
  if (!object(c)) return { ok: false, errors, warnings };
  // These original v1 fields remain required. All newly introduced settings are optional.
  for (const p of ['version','run.id','output.width','output.height','output.fps','theme','frame','cursor.visible','cursor.sizePct','cursor.clickEffect','zoom.enabled','zoom.depth','zoom.autoSuggest','zoom.regions','captions.enabled','captions.mode','cards.title.enabled','cards.outro.enabled','cards.fade','edits.trims','edits.speeds']) {
    if (p.split('.').reduce((v,k) => v?.[k], c) === undefined) fail(p, 'is required');
  }
  const d = resolveComposition(c);
  const get = (p) => p.split('.').reduce((v,k) => v?.[k], d);
  const enumAt = (p, values) => { if (!values.includes(get(p))) fail(p, `must be ${values.join('|')}`); };
  enumAt('version',[1]); enumAt('theme',Object.keys(THEMES)); enumAt('output.fps',[30,60]); enumAt('output.quality',['standard','high']);
  if (typeof c.run?.id !== 'string' || !c.run.id.trim()) fail('run.id','must be nonempty');
  for (const [p,min,max,int] of COMPOSITION_RANGES) range(p,get(p),min,max,int);
  range('zoom.depth',zoomDepth(d.zoom?.depth),1.05,4);
  for (const [p,values] of Object.entries(COMPOSITION_ENUMS)) enumAt(p,values);
  const custom = d.cursor?.custom;
  if (d.cursor?.style === 'custom' && !safeImagePath(custom?.arrow?.image)) fail('cursor.custom.arrow.image', 'is required for custom style');
  if (object(custom)) {
    if (!safeImagePath(custom.arrow?.image)) fail('cursor.custom.arrow.image', 'must be a local PNG, SVG or WebP path');
    if (custom.heightPct !== undefined) range('cursor.custom.heightPct', custom.heightPct, 1, 8);
    for (const shape of ['arrow', 'hand', 'text']) {
      const spec = custom[shape], p = `cursor.custom.${shape}`;
      if (spec === undefined) continue;
      if (!safeImagePath(spec?.image) || !/\.(png|svg|webp)$/i.test(spec.image)) fail(`${p}.image`, 'must be a local PNG, SVG or WebP path');
      range(`${p}.hotspot.x`, spec?.hotspot?.x, 0, 1);
      range(`${p}.hotspot.y`, spec?.hotspot?.y, 0, 1);
    }
  }
  if (!Array.isArray(d.zoom?.onlyKinds) || d.zoom.onlyKinds.some((k) => !['click','fill'].includes(k))) fail('zoom.onlyKinds','must contain click|fill');
  for (const p of ['frame.border.color','cursor.fill','cursor.stroke','captions.color','captions.background']) color(p,get(p));
  color('cursor.clickEffect.color',get('cursor.clickEffect.color'),true);
  for (const key of ['title','outro']) {
    const p = `cards.${key}`;
    enumAt(`${p}.align`,['center','left']); enumAt(`${p}.accent.shape`,['bar','underline','none']);
    for (const [k,min,max] of [['durationSec',0,30],['titleSizePct',1,20],['subtitleSizePct',1,12],['accent.widthPct',0,100]]) range(`${p}.${k}`,get(`${p}.${k}`),min,max);
    for (const k of ['titleColor','subtitleColor','accent.color']) color(`${p}.${k}`,get(`${p}.${k}`));
    for (const k of [key === 'title' ? 'title' : 'text','subtitle']) {
      const v = get(`${p}.${k}`);
      if (v !== null && (typeof v !== 'string' || !v.trim())) fail(`${p}.${k}`,'must be nonempty text or null');
    }
    if (get(`${p}.enabled`) && !get(`${p}.${key === 'title' ? 'title' : 'text'}`)) fail(p,'requires text when enabled');
    const logo = get(`${p}.logo`);
    if (object(logo)) range(`${p}.logo.heightPct`,logo.heightPct,1,40);
    if (object(logo) && !safeImagePath(logo.image)) fail(`${p}.logo.image`,'must be a local path inside the project');
  }
  for (const p of ['frame.background','cards.title.background','cards.outro.background']) {
    enumAt(`${p}.type`,['theme','gradient','solid','image']); range(`${p}.angle`,get(`${p}.angle`),0,360);
    const colors = get(`${p}.colors`);
    if (!Array.isArray(colors) || colors.length < 1 || colors.length > 16 || (get(`${p}.type`) === 'gradient' && colors.length < 2)) fail(`${p}.colors`,'must contain 1 to 16 colors (at least 2 for a gradient)');
    else colors.forEach((v,i) => color(`${p}.colors.${i}`,v));
    if (get(`${p}.type`) === 'image' && !safeImagePath(get(`${p}.image`))) fail(`${p}.image`,'must be a local path inside the project');
  }
  if (c.captions?.cues !== undefined) {
    const cues = c.captions.cues;
    if (!Array.isArray(cues) || cues.length > 200) fail('captions.cues','must be an array of at most 200 cues');
    else cues.forEach((cue,i) => {
      const p = `captions.cues.${i}`;
      walk(cue,{ id:'', text:'', start:0, end:0 },p);
      if (typeof cue?.id !== 'string' || !cue.id.trim()) fail(`${p}.id`,'must be nonempty text');
      if (typeof cue?.text !== 'string' || !cue.text.trim() || cue.text.length > 140) fail(`${p}.text`,'must contain 1 to 140 characters');
      if (!Number.isFinite(cue?.start) || !Number.isFinite(cue?.end) || cue.start < 0 || cue.start >= cue.end || cue.end > duration) fail(p,'has out of range source times');
      if (i && cue?.start < cues[i-1]?.end) fail(p,'overlaps the previous cue or is unsorted');
    });
  }
  const regions = validateRegions(c.zoom?.regions); errors.push(...regions.errors); warnings.push(...regions.warnings);
  for (const [k,model] of [['trims',{start:0,end:0}],['speeds',{start:0,end:0,rate:1}]]) if (Array.isArray(c.edits?.[k])) c.edits[k].forEach((v,i) => {
    walk(v,model,`edits.${k}.${i}`);
    try { buildTimeMap({ duration: Number.MAX_VALUE, [k]: [v] }); } catch (e) { fail(`edits.${k}.${i}`,e.message); }
  });
  try { buildTimeMap({ duration: Number.MAX_VALUE, trims: c.edits?.trims, speeds: c.edits?.speeds }); } catch (e) { fail('edits',e.message); }
  return { ok: !errors.length, errors, warnings };
}
export function compositionPaths(c) {
  const value = resolveComposition(c), result = {};
  function visit(v,p = '') {
    for (const [k,x] of Object.entries(v)) {
      const key = p ? `${p}.${k}` : k;
      if (object(x)) visit(x,key); else result[key] = x;
    }
  }
  visit(value);
  result['captions.cues'] = value.captions.cues;
  result['frame.paddingPct'] = value.frame.paddingPct ?? null;
  for (const k of ['title','outro']) {
    result[`cards.${k}.logo.image`] = value.cards[k].logo?.image ?? null;
    result[`cards.${k}.logo.heightPct`] = value.cards[k].logo?.heightPct ?? 10;
  }
  result['cursor.custom'] = value.cursor.custom;
  for (const shape of ['arrow', 'hand', 'text']) {
    const spec = value.cursor.custom?.[shape];
    result[`cursor.custom.${shape}.image`] = spec?.image ?? null;
    result[`cursor.custom.${shape}.hotspot.x`] = spec?.hotspot?.x ?? 0;
    result[`cursor.custom.${shape}.hotspot.y`] = spec?.hotspot?.y ?? 0;
    result[`cursor.custom.${shape}.hotspot`] = spec?.hotspot ?? { x: 0, y: 0 };
    result[`cursor.custom.${shape}`] = spec ?? null;
  }
  result['cursor.custom.heightPct'] = value.cursor.custom?.heightPct ?? value.cursor.sizePct;
  return result;
}
export function changeComposition(c, path, value, { reset = false } = {}) {
  const paths = compositionPaths(c);
  if (!Object.hasOwn(paths,path) && !object(path.split('.').reduce((v,k) => v?.[k],DEFAULT_COMPOSITION))) throw new Error(`Unknown composition path: ${path}`);
  const keys = path.split('.');
  if (keys.some((k) => ['__proto__','constructor','prototype'].includes(k))) throw new Error('Invalid composition path');
  const next = copy(c), last = keys.pop();
  if (path === 'frame.paddingPct') {
    next.frame = { ...next.frame, paddingXPct: reset ? DEFAULT_COMPOSITION.frame.paddingXPct : value,
      paddingYPct: reset ? DEFAULT_COMPOSITION.frame.paddingYPct : value };
    delete next.frame.paddingPct;
    return next;
  }
  if (/^cards\.(title|outro)\.durationSec$/.test(path)) delete next.cards[keys[1]].duration;
  if (reset && /^cards\.(title|outro)\.logo.image$/.test(path)) { next.cards[keys[1]].logo = null; return next; }
  let node = next;
  for (const k of keys) { if (!object(node[k])) node[k] = k === 'logo' ? { image: null, heightPct: 10 } : {}; node = node[k]; }
  if (reset) {
    delete node[last];
    // Resolve missing settings against the active theme, preserving original run and text fields.
    const defaults = resolveComposition({ theme: c.theme });
    const def = path.endsWith('.logo.heightPct') ? 10 : [...keys,last].reduce((v,k) => v?.[k],defaults);
    if (def !== undefined) node[last] = copy(def);
  } else node[last] = copy(value);
  if (/^zoom\.(depth|holdAfterClickSec|leadInSec|onlyKinds)$/.test(path) && next.zoom.regions?.every((r) => r.source === 'auto')) next.zoom.regions = [];
  return next;
}
export function zoomOptions(zoom) {
  return { depth: zoomDepth(zoom.depth), kinds: zoom.onlyKinds, leadIn: zoom.leadInSec, holdAfterClick: zoom.holdAfterClickSec };
}
export const outputBitrate = ({ width, height, fps, quality }) => Math.min(60e6, Math.round(width * height * fps * (quality === 'high' ? 0.12 : 0.07)));
export function buildComposition({ brief, storyboard, events, record, edits = {}, overrides = {} }) {
  // Storyboard captions are resolved later, against recorded step IDs rather than guideSteps.
  void storyboard;
  const c = resolveComposition(merge({
    run: { id: record.runId }, theme: brief.theme,
    captions: brief.captions,
    cards: { title: { ...brief.titleCard, title: brief.titleCard.title ?? brief.topic }, outro: brief.outroCard }, edits,
  }, overrides));
  const schema = validateComposition(c, { duration: record.durationSec });
  if (!schema.ok) throw new Error(schema.errors.join('\n'));
  if (c.zoom?.autoSuggest && Array.isArray(c.zoom.regions) && !c.zoom.regions.length) {
    c.zoom.regions = suggestZoomRegions({ events, record, options: zoomOptions(c.zoom) });
  }
  const result = validateComposition(c);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  // Validate edit/region bounds against this run, not just the standalone schema.
  buildTimeMap({ duration: record.durationSec, ...c.edits });
  const regions = validateRegions(c.zoom.regions, { duration: record.durationSec });
  if (!regions.ok) throw new Error(regions.errors.join('\n'));
  return c;
}
