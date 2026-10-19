// voice.enabled is null until the user answers the intake question (null counts as off downstream), so intake can tell
// "not asked yet" from "answered: captions only".
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function freeze(value) {
  if (object(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export const DEFAULT_BRIEF = freeze({ version: 1, brand: null, themeSource: null, topic: null, audience: null, targetSeconds: 60, baseURL: null, flowMode: null, theme: 'clean', titleCard: { enabled: true, title: null, subtitle: null }, outroCard: { enabled: true, text: 'Thank you' }, captions: { enabled: true, mode: 'band' }, voice: { enabled: null, tier: 'auto', name: null, language: 'en' }, music: { mode: 'none', file: null }, outputs: { landscape: true, vertical: false, gif: false }, notes: null });
export function validateBrief(brief) {
  const errors = [];
  const fail = (key, message) => errors.push(`brief.json: "${key}" ${message}`);
  function walk(value, defaults, prefix = '') {
    if (!object(value)) { fail(prefix.replace(/\.$/, '') || 'brief', 'must be an object'); return; }
    for (const key of Object.keys(value)) if (!Object.hasOwn(defaults, key)) fail(prefix + key, 'is an unknown key');
    for (const [key, def] of Object.entries(defaults)) {
      const dotted = prefix + key, v = value[key];
      if (['brand','themeSource'].includes(dotted) && v === undefined) continue;
      if (object(def)) walk(v, def, dotted + '.');
      else if (dotted === 'voice.enabled') { if (v !== null && typeof v !== 'boolean') fail(dotted, 'must be true, false or null'); }
      else if (typeof def === 'boolean' && typeof v !== 'boolean') fail(dotted, 'must be true or false');
      else if (def === null && v !== null && (typeof v !== 'string' || !v.trim())) fail(dotted, 'must be a non-empty string or null');
      else if (typeof def === 'string' && (typeof v !== 'string' || !v.trim())) fail(dotted, 'must be a non-empty string');
    }
  }
  walk(brief, DEFAULT_BRIEF);
  if (!object(brief)) return { ok: false, errors };
  if (brief.brand != null && (typeof brief.brand !== 'string' || !/^[a-z0-9][a-z0-9-]{0,40}$/.test(brief.brand))) fail('brand','is invalid');
  if (brief.themeSource != null && !['user','default'].includes(brief.themeSource)) fail('themeSource','must be user|default');
  if (brief.version !== 1) fail('version', 'must be 1');
  if (!Number.isFinite(brief.targetSeconds) || brief.targetSeconds < 10 || brief.targetSeconds > 600) fail('targetSeconds', 'must be a number from 10 to 600');
  for (const [key, v, max] of [['topic', brief.topic, 200], ['titleCard.title', brief.titleCard?.title, 80], ['titleCard.subtitle', brief.titleCard?.subtitle, 80]]) {
    if (typeof v === 'string' && v.length > max) fail(key, `must be at most ${max} characters`);
  }
  if (brief.baseURL !== null) {
    try { if (typeof brief.baseURL !== 'string' || /\s/.test(brief.baseURL) || !['http:', 'https:'].includes(new URL(brief.baseURL).protocol)) throw new Error(); }
    catch { fail('baseURL', 'must be an http(s) URL or null'); }
  }
  for (const [key, v, allowed] of [['flowMode', brief.flowMode, [null, 'guide', 'auto']], ['theme', brief.theme, ['clean', 'dark', 'bold']], ['captions.mode', brief.captions?.mode, ['band', 'overlay']], ['voice.tier', brief.voice?.tier, ['auto', 'kokoro', 'kitten']], ['music.mode', brief.music?.mode, ['none', 'file', 'bundled']]]) {
    if (!allowed.includes(v)) fail(key, `must be one of ${allowed.map(String).join('|')}`);
  }
  if (brief.music?.mode === 'file' && (typeof brief.music.file !== 'string' || !brief.music.file.trim())) fail('music.file', 'is required when music.mode is file');
  return { ok: errors.length === 0, errors };
}
export function setPath(brief, dottedKey, rawValue) {
  const keys = dottedKey.split('.');
  let def = DEFAULT_BRIEF;
  for (const key of keys) {
    if (!object(def) || !Object.hasOwn(def, key)) throw new Error(`Unknown brief key "${dottedKey}"`);
    def = def[key];
  }
  if (object(def)) throw new Error(`Unknown brief key "${dottedKey}"`);
  let value = rawValue;
  if (rawValue === 'null') value = null;
  else if (typeof def === 'boolean' || dottedKey === 'voice.enabled') value = rawValue === 'true' ? true : rawValue === 'false' ? false : rawValue;
  else if (typeof def === 'number') value = typeof rawValue === 'string' && rawValue.trim() ? Number(rawValue) : NaN;
  const out = structuredClone(brief);
  if (dottedKey === 'theme') out.themeSource = 'user';
  let parent = out;
  for (const key of keys.slice(0, -1)) parent = parent[key];
  parent[keys.at(-1)] = value;
  return out;
}
export function isReady(brief) {
  const missing = ['topic', 'baseURL', 'flowMode'].filter((key) => brief?.[key] == null || brief[key] === '');
  return { ready: missing.length === 0, missing };
}
export function questions(brief) {
  const missing = isReady(brief).missing;
  const result = [
    { key: 'topic', header: 'Topic', question: 'What should this demo show?', options: null, freeText: true },
    { key: 'baseURL', header: 'App URL', question: 'What is the app URL?', options: null, freeText: true },
    { key: 'flowMode', header: 'Flow mode', question: 'How should the flow be captured?', options: [{ label: 'Guide mode (Recommended)', description: 'You click through the flow once in a browser window; Claude reads the result instead of exploring' }, { label: 'Auto mode', description: 'Claude explores the app itself; slower and costs more tokens' }], freeText: false },
  ].filter(({ key }) => missing.includes(key));
  if (brief?.voice?.enabled == null) result.push({ key: 'voice.enabled', header: 'Voice', question: 'Would you like voice-over or captions only?', options: [{ label: 'Voice-over', description: 'Add spoken narration' }, { label: 'Captions only', description: 'Use captions without narration' }], freeText: false });
  return result;
}
