// Global settings search: index, ranking and match highlighting. Pure: no DOM.
import { SETTINGS } from '../scripts/lib/compose/settings-schema.mjs';
import { RAIL_TOPICS } from './rail-model.mjs';
import { ABSORBED, LABELS, TOPIC_CARDS, VIRTUAL_ENTRIES, locate } from './panel-model.mjs';

// Extra words people type that the labels do not contain.
const KEYWORDS = {
  'zoom.onlyKinds': 'clicks typing keyboard triggers', 'zoom.depth': 'magnification closer', 'zoom.speed': 'smooth camera motion fast slow',
  'cursor.sizePct': 'pointer mouse big small', 'cursor.fill': 'pointer colour', 'cursor.stroke': 'pointer border outline',
  'cursor.clickEffect.style': 'ripple pulse highlight', 'frame.background.type': 'gradient solid image colour backdrop',
  'frame.radiusPx': 'rounded corners', 'captions.fontSizePct': 'font size', 'captions.mode': 'band overlay on video',
  'output.fps': 'frames per second 30 60 smooth', 'output.quality': 'bitrate file size', 'output.width': 'resolution custom size', 'output.height': 'resolution custom size',
  'audio.music.file': 'song track mp3 wav upload', 'audio.voice.voiceId': 'narrator speaker', 'audio.loudness.enabled': 'normalise volume level',
};
const normalise = text => String(text ?? '').toLowerCase().replace(/colour/g, 'color').replace(/centre/g, 'center');
const topicLabel = id => RAIL_TOPICS.find(t => t.id === id)?.label ?? id;
export function buildSearchIndex(settings = SETTINGS) {
  const entries = [];
  for (const s of settings) {
    if (s.path === 'theme') continue;
    const where = locate(s.path);
    if (!where) continue;
    entries.push({ path: s.path, host: where.host, label: LABELS[s.path] ?? s.label, schemaLabel: s.label, help: s.help, keywords: KEYWORDS[s.path] ?? '',
      topic: where.topic, topicLabel: topicLabel(where.topic), card: where.card.id, cardTitle: where.card.title, tab: where.card.tab ?? null, advanced: where.advanced, renderable: !ABSORBED[s.path] });
  }
  for (const v of VIRTUAL_ENTRIES) {
    const card = TOPIC_CARDS[v.topic].find(c => c.id === v.card);
    entries.push({ ...v, host: v.path, schemaLabel: v.label, topicLabel: topicLabel(v.topic), cardTitle: card?.title ?? v.card, tab: card?.tab ?? null, advanced: false, renderable: false });
  }
  return entries;
}
export const tokenize = query => normalise(query).split(/\s+/).filter(Boolean);
function scoreWord(entry, word) {
  const label = normalise(entry.label), schema = normalise(entry.schemaLabel), card = normalise(entry.cardTitle);
  if (label.startsWith(word) || schema.startsWith(word)) return 10;
  if (new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(`${label} ${schema}`)) return 8;
  if (label.includes(word) || schema.includes(word)) return 6;
  if (card.includes(word)) return 5;
  if (normalise(entry.keywords).includes(word)) return 4;
  if (normalise(entry.help).includes(word)) return 2;
  if (normalise(entry.topicLabel).includes(word)) return 1;
  return 0;
}
// Ranked results grouped by topic in rail order. Absorbed paths collapse onto their host so one row appears per control.
export function searchSettings(index, query, { limit = 40 } = {}) {
  const words = tokenize(query);
  if (!words.length) return { groups: [], total: 0, words };
  const best = new Map();
  for (const entry of index) {
    let score = 0;
    for (const word of words) { const s = scoreWord(entry, word); if (!s) { score = 0; break; } score += s; }
    if (!score) continue;
    const key = `${entry.topic}:${entry.host}`, current = best.get(key);
    if (!current || score > current.score || (score === current.score && entry.renderable && !current.entry.renderable)) best.set(key, { entry, score });
  }
  const order = RAIL_TOPICS.map(t => t.id);
  const ranked = [...best.values()].sort((a, b) => b.score - a.score || order.indexOf(a.entry.topic) - order.indexOf(b.entry.topic)).slice(0, limit);
  const groups = [];
  for (const topic of order) {
    const items = ranked.filter(r => r.entry.topic === topic);
    if (items.length) groups.push({ topic, label: topicLabel(topic), items });
  }
  return { groups, total: ranked.length, words };
}
// Splits text into {text, match} segments so the matched words can be highlighted.
export function highlightSegments(text, words) {
  const source = String(text ?? ''), lower = source.toLowerCase();
  if (!words?.length) return [{ text: source, match: false }];
  const marks = new Array(source.length).fill(false);
  // Words are normalised (colour -> color); try both spellings against the original text.
  const variants = words.flatMap(word => [...new Set([word, word.replace(/color/g, 'colour'), word.replace(/center/g, 'centre')])]);
  for (const word of variants) { let from = 0; while (word) { const at = lower.indexOf(word, from); if (at < 0) break; for (let i = at; i < at + word.length; i++) marks[i] = true; from = at + word.length; } }
  const segments = [];
  for (let i = 0; i < source.length; i++) {
    const last = segments.at(-1);
    if (last && last.match === marks[i]) last.text += source[i]; else segments.push({ text: source[i], match: marks[i] });
  }
  return segments;
}
