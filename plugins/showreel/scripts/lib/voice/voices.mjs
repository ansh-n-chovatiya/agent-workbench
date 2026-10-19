import { DEFAULT_VOICE } from './pins.mjs';

// Fallback table of Kokoro v1.0 voices. The worker reads the live table from the library; this only serves tests and ordering.
const v = (id, name, language, gender, grade) => ({ id, name, language, gender, grade });
export const FALLBACK_VOICES = Object.freeze([
  v('af_heart', 'Heart', 'en-us', 'Female', 'A'), v('af_alloy', 'Alloy', 'en-us', 'Female', 'C'), v('af_aoede', 'Aoede', 'en-us', 'Female', 'C+'),
  v('af_bella', 'Bella', 'en-us', 'Female', 'A-'), v('af_jessica', 'Jessica', 'en-us', 'Female', 'D'), v('af_kore', 'Kore', 'en-us', 'Female', 'C+'),
  v('af_nicole', 'Nicole', 'en-us', 'Female', 'B-'), v('af_nova', 'Nova', 'en-us', 'Female', 'C'), v('af_river', 'River', 'en-us', 'Female', 'D'),
  v('af_sarah', 'Sarah', 'en-us', 'Female', 'C+'), v('af_sky', 'Sky', 'en-us', 'Female', 'C-'),
  v('am_adam', 'Adam', 'en-us', 'Male', 'F+'), v('am_echo', 'Echo', 'en-us', 'Male', 'D'), v('am_eric', 'Eric', 'en-us', 'Male', 'D'),
  v('am_fenrir', 'Fenrir', 'en-us', 'Male', 'C+'), v('am_liam', 'Liam', 'en-us', 'Male', 'D'), v('am_michael', 'Michael', 'en-us', 'Male', 'C+'),
  v('am_onyx', 'Onyx', 'en-us', 'Male', 'D'), v('am_puck', 'Puck', 'en-us', 'Male', 'C+'), v('am_santa', 'Santa', 'en-us', 'Male', 'D-'),
  v('bf_alice', 'Alice', 'en-gb', 'Female', 'D'), v('bf_emma', 'Emma', 'en-gb', 'Female', 'B-'), v('bf_isabella', 'Isabella', 'en-gb', 'Female', 'C'),
  v('bf_lily', 'Lily', 'en-gb', 'Female', 'D'), v('bm_daniel', 'Daniel', 'en-gb', 'Male', 'D'), v('bm_fable', 'Fable', 'en-gb', 'Male', 'C'),
  v('bm_george', 'George', 'en-gb', 'Male', 'C'), v('bm_lewis', 'Lewis', 'en-gb', 'Male', 'D+'),
]);

const LANG_ORDER = ['en-us', 'en-gb'];
// American English first, then British, then everything else alphabetically by id.
export function orderVoices(list) {
  const rank = (x) => { const i = LANG_ORDER.indexOf(x.language); return i < 0 ? LANG_ORDER.length : i; };
  return [...list].sort((a, b) => rank(a) - rank(b) || (a.id === DEFAULT_VOICE ? -1 : b.id === DEFAULT_VOICE ? 1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
// Accepts the library's { id: { name, language, gender, overallGrade } } object or an array of voice entries.
export function normalizeVoices(raw) {
  const entries = Array.isArray(raw) ? raw : Object.entries(raw ?? {}).map(([id, x]) => ({ id, ...x }));
  return orderVoices(entries.filter((x) => x && typeof x.id === 'string').map((x) => ({ id: x.id, name: x.name ?? x.id, language: x.language ?? 'unknown', gender: x.gender ?? 'unknown', grade: x.grade ?? x.overallGrade ?? null })));
}
export const isKnownVoice = (id, list = FALLBACK_VOICES) => list.some((x) => x.id === id);
export function formatVoices(list) {
  const rows = [['id', 'name', 'language', 'gender', 'grade'], ...list.map((x) => [x.id + (x.id === DEFAULT_VOICE ? ' *' : ''), x.name, x.language, x.gender, x.grade ?? '-'])];
  const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => String(r[c]).length)));
  return rows.map((r) => r.map((cell, c) => String(cell).padEnd(widths[c])).join('  ').trimEnd()).join('\n') + `\n* recommended default (${DEFAULT_VOICE})`;
}
