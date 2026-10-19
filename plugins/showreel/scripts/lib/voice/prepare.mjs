// Pure text preparation for speech: markdown stripping, pronunciations, pause markers, chunking.
export const MAX_CHUNK = 350;
export const CHUNK_GAP_SEC = 0.12;
export const PAUSE_MIN = 0.1;
export const PAUSE_MAX = 3;
export const SPEED_MIN = 0.7;
export const SPEED_MAX = 1.3;

export const clampSpeed = (speed) => {
  const n = Number(speed);
  return Number.isFinite(n) ? Math.min(SPEED_MAX, Math.max(SPEED_MIN, n)) : 1;
};

export function stripMarkdown(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/```[^\n]*\n([\s\S]*?)```/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,!?;:]|$)/g, '$1$2')
    .replace(/<[^>\n]+>/g, '');
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-word, case-insensitive, longest key first, single pass (a replacement is never re-scanned).
export function applyPronunciations(text, map) {
  const entries = Object.entries(map ?? {}).filter(([k, v]) => typeof k === 'string' && k.trim() && typeof v === 'string');
  if (!entries.length) return text;
  const lookup = new Map(entries.map(([k, v]) => [k.trim().toLowerCase(), v]));
  const keys = [...lookup.keys()].sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${keys.map(escapeRegex).join('|')})(?![\\p{L}\\p{N}_])`, 'giu');
  return text.replace(re, (m) => lookup.get(m.toLowerCase()) ?? m);
}

function splitLong(sentence, max) {
  if (sentence.length <= max) return [sentence];
  const out = [];
  let rest = sentence;
  while (rest.length > max) {
    const window = rest.slice(0, max + 1);
    let at = Math.max(window.lastIndexOf(', '), window.lastIndexOf('; '), window.lastIndexOf(': '));
    if (at > 0) at += 1;
    else at = window.lastIndexOf(' ');
    if (at <= 0) at = max;
    out.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) out.push(rest);
  return out.filter(Boolean);
}

export function chunkText(text, max = MAX_CHUNK) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?…]+(?:[.!?…]+["')\]”’]*|$)\s*/g) ?? [clean];
  const chunks = [];
  let current = '';
  for (const raw of sentences) {
    for (const piece of splitLong(raw.trim(), max)) {
      if (!piece) continue;
      if (current && current.length + 1 + piece.length > max) { chunks.push(current); current = piece; }
      else current = current ? `${current} ${piece}` : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

const MARKER = /\[\s*pause\s+(\d+(?:\.\d+)?|\.\d+)\s*(?:s|sec|seconds)?\s*\]/gi;

// Returns { segments, preparedText, warnings }. Segments: { type:'speech', text } | { type:'silence', seconds, explicit }.
export function prepareText(text, { pronunciations = {}, maxChunk = MAX_CHUNK } = {}) {
  const warnings = [];
  const stripped = stripMarkdown(text);
  const segments = [];
  const pushSpeech = (part) => {
    const spoken = applyPronunciations(part.replace(/\s+/g, ' ').trim(), pronunciations).replace(/\s+/g, ' ').trim();
    const chunks = chunkText(spoken, maxChunk);
    chunks.forEach((chunk, i) => {
      if (i > 0) segments.push({ type: 'silence', seconds: CHUNK_GAP_SEC, explicit: false });
      segments.push({ type: 'speech', text: chunk });
    });
  };
  let last = 0;
  for (const m of stripped.matchAll(MARKER)) {
    pushSpeech(stripped.slice(last, m.index));
    let seconds = Number(m[1]);
    if (seconds < PAUSE_MIN || seconds > PAUSE_MAX) {
      const clamped = Math.min(PAUSE_MAX, Math.max(PAUSE_MIN, seconds));
      warnings.push(`pause ${m[1]} is outside ${PAUSE_MIN} to ${PAUSE_MAX} seconds and was set to ${clamped}`);
      seconds = clamped;
    }
    segments.push({ type: 'silence', seconds, explicit: true });
    last = m.index + m[0].length;
  }
  pushSpeech(stripped.slice(last));
  // The 120 ms chunk gap is pointless next to an explicit pause.
  const cleaned = segments.filter((s, i) => !(s.type === 'silence' && !s.explicit && (segments[i - 1]?.type !== 'speech' || segments[i + 1]?.type !== 'speech')));
  const preparedText = cleaned.map((s) => (s.type === 'speech' ? s.text : s.explicit ? `[pause ${s.seconds}]` : '')).filter(Boolean).join(' ');
  return { segments: cleaned, preparedText, warnings };
}

export const speechChunks = (segments) => segments.filter((s) => s.type === 'speech');
