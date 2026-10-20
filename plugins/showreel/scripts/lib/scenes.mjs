import path from 'node:path';
import { readFile, open, rename, rm, realpath } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { safeFile } from './editor/files.mjs';
import { buildTimeMap } from './compose/timemap.mjs';
import { TRANSITIONS, buildSceneTimeMap } from './compose/scene-timemap.mjs';

const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export const validSceneId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id);
export const validRunId = id => typeof id === 'string' && !!id.trim() && !/[\\/\x00-\x1f]/.test(id) && !['.','..'].includes(id);
const validStoryboard = file => typeof file === 'string' && !/[\\/\x00-\x1f]/.test(file) && file.endsWith('.json') && file !== '.json';

// Shape validation is pure; disk validation below adds every missing/unsafe run file to this report.
export function validateScenes(data, { records = {} } = {}) {
  const errors = [], warnings = [], ids = new Set();
  if (!object(data) || data.version !== 1) errors.push('scenes.version must be 1');
  if (!Array.isArray(data?.scenes)) return {ok:false,errors:[...errors,'scenes must be an array'],warnings};
  if (data.scenes.length > 20) errors.push('A project may contain at most 20 scenes');
  const profiles = new Set();
  data.scenes.forEach((s,i) => {
    const at = `scenes[${i}]`;
    if (!object(s)) { errors.push(`${at} must be an object`); return; }
    if (!validSceneId(s.id)) errors.push(`${at}.id must use letters, numbers, _ or - (1 to 80 characters)`);
    if (ids.has(s.id)) errors.push(`${at}.id must be unique`); ids.add(s.id);
    if (!validRunId(s.run)) errors.push(`${at}.run must be a run folder id`);
    if (s.title !== undefined && (typeof s.title !== 'string' || s.title.length > 60 || /[\r\n\x00]/.test(s.title))) errors.push(`${at}.title must be a single line of at most 60 characters`);
    if (s.storyboard !== undefined && !validStoryboard(s.storyboard)) errors.push(`${at}.storyboard must be a JSON file name`);
    if (!object(s.transition) || !TRANSITIONS.includes(s.transition.type)) errors.push(`${at}.transition.type is invalid`);
    if (s.transition?.durationSec !== undefined && (!Number.isFinite(s.transition.durationSec) || s.transition.durationSec < 0.2 || s.transition.durationSec > 1.5)) errors.push(`${at}.transition.durationSec must be 0.2 to 1.5`);
    const record = Object.hasOwn(records,s.run) ? records[s.run] : null;
    if (record) profiles.add(record.profile ?? 'desktop');
    // Without metadata still validate shape/order, using the last source endpoint as a temporary bound.
    const duration = record?.durationSec ?? Math.max(0,...[s.trims,s.speeds].flatMap(rs => Array.isArray(rs) ? rs.map(r => Number.isFinite(r?.end) ? r.end : 0) : []));
    for (const key of ['trims','speeds']) {
      try { buildTimeMap({duration,[key]:s[key]}); } catch (e) { errors.push(`${at}.${e.message}`); }
    }
    if (Array.isArray(s.trims) && Array.isArray(s.speeds) && s.speeds.some(r => r && s.trims.some(t => t && r.start < t.end && r.end > t.start))) errors.push(`${at}.speeds intersects a trim`);
  });
  if (profiles.size > 1) warnings.push('Recording profiles differ across scenes; desktop and phone frames have different aspect ratios.');
  return {ok:errors.length === 0,errors,warnings};
}
export async function readScenes(dir) {
  try { return JSON.parse(await readFile(await safeFile(dir,'scenes.json'),'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}
export async function validateScenesInProject(dir,data) {
  const records = Object.create(null), diskErrors = [];
  if (Array.isArray(data?.scenes)) for (const [i,s] of data.scenes.entries()) {
    if (!validRunId(s?.run)) continue;
    for (const file of ['raw.mp4','events.json','record.json']) {
      try {
        const found = await safeFile(dir,`runs/${encodeURIComponent(s.run)}/${file}`);
        if (file !== 'raw.mp4') {
          const parsed = JSON.parse(await readFile(found,'utf8'));
          if (file === 'record.json') {
            records[s.run] = parsed;
            if (!(Number.isFinite(parsed?.durationSec) && parsed.durationSec > 0)) diskErrors.push(`scenes[${i}]: record.durationSec must be positive`);
          }
        }
      } catch (e) { diskErrors.push(`scenes[${i}]: ${s.run}/${file}: ${e.message}`); }
    }
    if (s.storyboard !== undefined && validStoryboard(s.storyboard)) {
      try { JSON.parse(await readFile(await safeFile(dir,encodeURIComponent(s.storyboard)),'utf8')); }
      catch (e) { diskErrors.push(`scenes[${i}].storyboard: ${e.message}`); }
    }
  }
  const report = validateScenes(data,{records});
  report.errors.push(...diskErrors);
  if (report.errors.length === 0 && data.scenes.length) {
    try { buildSceneTimeMap({scenes:data.scenes.map(s => ({...s,duration:records[s.run].durationSec}))}); }
    catch (e) { report.errors.push(e.message); }
  }
  report.ok = report.errors.length === 0;
  return report;
}
export async function writeScenesAtomic(dir,data) {
  const report = await validateScenesInProject(dir,data);
  if (!report.ok) throw new Error(report.errors.join('\n'));
  const root = await realpath(dir), temp = path.join(root,`.scenes-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temp,'wx',0o600); await handle.writeFile(JSON.stringify(data,null,2)+'\n'); await handle.sync();
    await handle.close(); handle = null; await rename(temp,path.join(root,'scenes.json'));
  } finally { await handle?.close(); await rm(temp,{force:true}); }
  return report;
}
export async function sceneStoryboard(dir,scene, fallback) {
  return scene.storyboard ? JSON.parse(await readFile(await safeFile(dir,encodeURIComponent(scene.storyboard)),'utf8')) : fallback;
}
