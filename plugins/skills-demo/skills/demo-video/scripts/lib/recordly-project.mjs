// Reads trims and speed regions from a saved Recordly project (.recordly).
//
// Recordly 1.4 saves `JSON.stringify({version: 2, projectId, videoPath,
// editor}, null, 2)`, where `editor` holds `trimRegions` and `speedRegions`
// ([{id, startMs, endMs}] and [{id, startMs, endMs, speed}], source-time
// milliseconds) and `clipRegions` ([{id, startMs, endMs, speed}]). Its
// exporter uses `trimRegions` (kept in step with the clips by the editor) and
// the speed regions plus a region for every clip whose speed is not 1, taken
// from the clip's startMs to startMs + (endMs - startMs) * speed and skipped
// where it overlaps an explicit speed region. Nothing here assumes the
// envelope: the arrays are found by key wherever they sit.
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export const PROJECT_EXT = '.recordly';

// First object (breadth first) carrying any of the region arrays.
function findRegions(root) {
  const queue = [root];
  while (queue.length) {
    const o = queue.shift();
    if (!o || typeof o !== 'object') continue;
    if (!Array.isArray(o) && ['trimRegions', 'speedRegions', 'clipRegions'].some((k) => Array.isArray(o[k]))) return o;
    queue.push(...Object.values(o));
  }
  return null;
}

function* strings(o) {
  if (typeof o === 'string') yield o;
  else if (o && typeof o === 'object') for (const v of Object.values(o)) yield* strings(v);
}

// The project names the clip when any path in it ends in that file name.
function mentions(root, clipName) {
  if (!clipName) return false;
  for (const s of strings(root)) {
    let p = s;
    try { if (p.startsWith('file:')) p = decodeURIComponent(new URL(p).pathname); } catch {}
    if (path.basename(p.replace(/\\/g, '/')) === clipName) return true;
  }
  return false;
}

// [{start, end(, speed)}] in seconds from [{startMs, endMs(, speed)}], or a
// reason string.
function regions(list, name, withSpeed) {
  if (list === undefined) return [];
  if (!Array.isArray(list)) return `${name} is not a list`;
  const out = [];
  for (const [i, r] of list.entries()) {
    const { startMs, endMs, speed } = r ?? {};
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < 0 || endMs <= startMs) {
      return `${name}[${i}] has no valid startMs/endMs`;
    }
    if (withSpeed && !(Number.isFinite(speed) && speed > 0 && speed <= 100)) return `${name}[${i}] has no valid speed`;
    out.push(withSpeed ? { start: startMs / 1000, end: endMs / 1000, speed } : { start: startMs / 1000, end: endMs / 1000 });
  }
  return out;
}

// What else the editor state changes in the export, for the render summary
// and the caption choice. Recordly 1.4 burns its auto-captions only when the
// cue list is non-empty and autoCaptionSettings.enabled is set (the check its
// compositor makes before drawing them); a crop is any cropRegion other than
// the whole frame {x: 0, y: 0, width: 1, height: 1}.
function extras(editor, clips) {
  const count = (k) => (Array.isArray(editor[k]) ? editor[k].length : 0);
  const c = editor.cropRegion;
  return {
    clipSpeeds: [...new Set(clips.map((r) => r.speed).filter((v) => v !== 1))],
    crop: Boolean(c && typeof c === 'object' && (c.x > 0 || c.y > 0 || c.width < 1 || c.height < 1)),
    autoCaptions: count('autoCaptions') > 0 && Boolean(editor.autoCaptionSettings?.enabled),
    annotations: count('annotationRegions'),
    webcam: Boolean(editor.webcam?.enabled),
  };
}

// json: the file's text or the parsed value. Returns {trims, speeds,
// references, ...extras} (times in seconds), or {error} with a one-line
// reason.
export function parseProject(json, { clipName } = {}) {
  let root = json;
  if (typeof json === 'string' || Buffer.isBuffer(json)) {
    try { root = JSON.parse(String(json)); } catch (e) { return { error: `project is not JSON (${e.message})` }; }
  }
  const editor = findRegions(root);
  if (!editor) return { error: 'project has no trimRegions or speedRegions' };
  const trims = regions(editor.trimRegions, 'trimRegions', false);
  if (typeof trims === 'string') return { error: trims };
  const explicit = regions(editor.speedRegions, 'speedRegions', true);
  if (typeof explicit === 'string') return { error: explicit };
  const clips = regions(editor.clipRegions, 'clipRegions', true);
  if (typeof clips === 'string') return { error: clips };
  const fromClips = clips
    .filter((c) => c.speed !== 1)
    .map((c) => ({ start: c.start, end: Math.round((c.start + (c.end - c.start) * c.speed) * 1000) / 1000, speed: c.speed }))
    .filter((c) => !explicit.some((s) => s.end > c.start && s.start < c.end));
  return { trims, speeds: [...explicit, ...fromClips], references: mentions(root, clipName), ...extras(editor, clips) };
}

async function projectFiles(p) {
  const st = await stat(p).catch(() => null);
  if (!st) return [];
  if (st.isFile()) return [p];
  const names = await readdir(p).catch(() => []);
  return names.filter((n) => n.toLowerCase().endsWith(PROJECT_EXT)).map((n) => path.join(p, n));
}

// Newest project in `dirs` (folders or files) or in Recordly's
// recent-projects.json ({paths: [...]}) that was modified after `since` (ms
// or Date), parses, and names `clipName`; null when there is none.
export async function findProject({ dirs = [], since = 0, clipName, recentFile } = {}) {
  const candidates = new Set();
  for (const d of dirs) for (const f of await projectFiles(d)) candidates.add(path.resolve(f));
  if (recentFile) {
    const recent = await readFile(recentFile, 'utf8').then(JSON.parse).catch(() => null);
    for (const p of Array.isArray(recent?.paths) ? recent.paths : []) if (typeof p === 'string') candidates.add(path.resolve(p));
  }
  let best = null;
  for (const f of candidates) {
    const st = await stat(f).catch(() => null);
    if (!st?.isFile() || st.mtimeMs <= Number(since)) continue;
    const text = await readFile(f, 'utf8').catch(() => null);
    const parsed = text === null ? { error: 'unreadable' } : parseProject(text, { clipName });
    if (parsed.error || !parsed.references) continue;
    if (!best || st.mtimeMs > best.mtime) best = { file: f, mtime: st.mtimeMs };
  }
  return best ? best.file : null;
}
