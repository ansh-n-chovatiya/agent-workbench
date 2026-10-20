// Pure helpers shared by the export dialog and filename generation in the renderer.
export function shortPath(dir, home) {
  if (!dir) return '';
  const clean = home?.replace(/[\\/]+$/, '');
  const insensitive = /^[a-z]:/i.test(dir);
  const left = insensitive ? dir.toLowerCase() : dir, right = insensitive ? clean?.toLowerCase() : clean;
  if (right && (left === right || (left.startsWith(right) && /[\\/]/.test(dir[right.length])))) return '~' + dir.slice(clean.length);
  return dir;
}
export function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Size unavailable';
  return `${(bytes / 1000000).toFixed(1)} MB`;
}
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'Duration unavailable';
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
export function exportFileName({ projectName, date = new Date(), format, size }) {
  let name = String(projectName ?? 'Video').replace(/[/\\:*?"<>|\x00-\x1f\x7f]/g, '').replace(/\s+/g, ' ').trim().replace(/[. ]+$/g, '') || 'Video';
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) name = `_${name}`;
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}.${pad(date.getMinutes())}`;
  const suffix = ` ${stamp}${format === 'vertical' ? ' (vertical)' : ''}${String(size).toLowerCase() === '4k' ? ' 4K' : ''}`;
  return `${name.slice(0, 80 - suffix.length - 4).trimEnd().replace(/[. ]+$/g, '')}${suffix}.mp4`;
}

// The guessed destination is display-only; an older server still chooses the real folder.
export async function loadExportSettings(request, platform = globalThis.navigator?.platform ?? '') {
  try { return await request('/api/export/settings'); }
  catch {
    return { exportDir: `~/${/mac/i.test(platform) ? 'Movies' : 'Videos'}/Showreel`, canChoose: false, fallback: true };
  }
}
export function exportRequestBody(settings) {
  return settings.fallback ? {} : { dir: settings.exportDir };
}
