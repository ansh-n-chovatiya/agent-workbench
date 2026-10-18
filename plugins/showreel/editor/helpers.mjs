export function timecode(seconds, fps = 30) {
  const frames = Math.max(0, Math.floor((Number.isFinite(seconds) ? seconds : 0) * fps + 1e-7));
  return [Math.floor(frames / fps / 3600), Math.floor(frames / fps / 60) % 60,
    Math.floor(frames / fps) % 60, frames % fps].map(n => String(n).padStart(2, '0')).join(':');
}
export function groupSettings(settings, query = '') {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const groups = {};
  for (const setting of settings) {
    if (words.every(word => setting.label.toLowerCase().includes(word))) (groups[setting.group] ??= []).push(setting);
  }
  return groups;
}
export function errorsForPath(errors, path) {
  return errors.filter(error => {
    const setting = /"([^"]+)"/.exec(error)?.[1];
    return setting && (setting === path || setting.startsWith(`${path}.`) || path.startsWith(`${setting}.`));
  });
}
export function parseSSE(block) {
  let event = 'message'; const data = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'event') event = value;
    if (field === 'data') data.push(value);
  }
  if (!data.length) return null;
  return { event, data: JSON.parse(data.join('\n')) };
}
export function createSSEParser(onEvent) {
  let buffer = '';
  return chunk => {
    buffer += chunk;
    let match;
    while ((match = /\r?\n\r?\n/.exec(buffer))) {
      const parsed = parseSSE(buffer.slice(0, match.index));
      buffer = buffer.slice(match.index + match[0].length);
      if (parsed) onEvent(parsed);
    }
  };
}
export const isTyping = target => !!target?.closest?.('input, textarea, select, [contenteditable="true"]');
