import os from 'node:os';
import path from 'node:path';
import { mkdir, readFile, writeFile, rename, rm, stat, realpath, lstat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { HOME_DIR } from './paths.mjs';

export function defaultExportDir(platform = process.platform, home = os.homedir()) {
  // When SHOWREEL_HOME is overridden (tests, CI, sandboxes) exports stay inside it and never touch the person's real folders.
  if (process.env.SHOWREEL_HOME && home === os.homedir()) return path.join(HOME_DIR, 'exports');
  return path.join(home, platform === 'darwin' ? 'Movies' : 'Videos', 'Showreel');
}
const within = (root, file) => { const rel = path.relative(root, file); return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel)); };
// Resolve existing ancestors as well as the leaf: a non-existent folder under a symlink must be checked too.
async function physical(file) {
  try { return await realpath(file); }
  catch (error) { if (error.code !== 'ENOENT') throw error; const parent = path.dirname(file); if (parent === file) return file; return path.join(await physical(parent), path.basename(file)); }
}
export async function validateExportDir(dir, { create = false } = {}) {
  if (typeof dir !== 'string' || !dir.trim() || dir.includes('\0') || !path.isAbsolute(dir)) throw new Error('Choose an absolute folder path');
  const normalized = path.normalize(dir);
  const resolved = await physical(normalized), projects = await physical(path.join(HOME_DIR, 'projects'));
  if (within(projects, resolved)) throw new Error('Choose a folder outside Showreel projects');
  const forbidden = process.platform === 'win32' ? ['C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)'] : ['/System', '/bin', '/sbin', '/usr', '/etc', '/dev', '/proc', '/sys'];
  if (resolved === path.parse(resolved).root || forbidden.some(root => within(root, resolved))) throw new Error('Choose a personal folder, not a system folder');
  try { if (!(await stat(normalized)).isDirectory()) throw new Error('Export destination must be a folder'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (create) { await mkdir(normalized, { recursive: true }); return validateExportDir(normalized); }
  return normalized;
}
export async function getExportDir() {
  let preferences;
  try { preferences = JSON.parse(await readFile(path.join(HOME_DIR, 'preferences.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return validateExportDir(preferences?.exportDir ?? defaultExportDir());
}
export async function setExportDir(dir) {
  const exportDir = await validateExportDir(dir), file = path.join(HOME_DIR, 'preferences.json');
  await mkdir(HOME_DIR, { recursive: true });
  let preferences = {};
  try { preferences = JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const temp = `${file}.${randomUUID()}.tmp`;
  try { await writeFile(temp, JSON.stringify({ ...preferences, exportDir }, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); await rename(temp, file); }
  finally { await rm(temp, { force: true }); }
  return exportDir;
}
export { exportFileName } from '../../editor/export-model.mjs';
export async function uniqueName(dir, base, ext = '.mp4') {
  for (let n = 1; ; n++) {
    const file = path.join(dir, `${base}${n === 1 ? '' : ` (${n})`}${ext}`);
    try { await lstat(file); } catch (error) { if (error.code === 'ENOENT') return file; throw error; }
  }
}
