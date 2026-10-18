// Subtitle files from captions: times are seconds on the final video's
// timeline, i.e. the caption's clip time plus the offset of its clip in the
// composed video (the title card, or the phone segment's start).

const stamp = (sec, sep) => {
  const ms = Math.max(0, Math.round(sec * 1000));
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}${sep}${p(ms % 1000, 3)}`;
};

const cues = (captions, offset) => captions.map((c) => ({ text: c.text, start: c.start + offset, end: c.end + offset }));

export function toSrt(captions, offset = 0) {
  return cues(captions, offset).map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.text}\n`).join('\n');
}

export function toVtt(captions, offset = 0) {
  return 'WEBVTT\n\n' + cues(captions, offset).map((c) => `${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${c.text}\n`).join('\n');
}

// Cue start/end seconds from an .srt or .vtt text.
export function parseCues(text) {
  const out = [];
  const re = /(\d+):(\d\d):(\d\d)[,.](\d{3})\s*-->\s*(\d+):(\d\d):(\d\d)[,.](\d{3})/g;
  const sec = (h, m, s, ms) => +h * 3600 + +m * 60 + +s + +ms / 1000;
  for (const m of text.matchAll(re)) out.push({ start: sec(m[1], m[2], m[3], m[4]), end: sec(m[5], m[6], m[7], m[8]) });
  return out;
}
