import { createHash } from 'node:crypto';
import { readFile, readdir, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { clipsDir, clipsIndexFile, clipFile } from './paths.mjs';
import { atomicWriteJson } from './atomic.mjs';

import { VOICE_POST } from './pins.mjs';

export const emptyIndex = () => ({ version: 1, clips: {}, steps: {} });
export function clipKey({ engine, modelHash, voice, speed, preparedText, post = VOICE_POST }) {
  return createHash('sha256').update(JSON.stringify({ engine, modelHash, voice, speed, preparedText, post })).digest('hex');
}
export async function readIndex(name) {
  let text;
  try { text = await readFile(clipsIndexFile(name), 'utf8'); }
  catch (err) { if (err.code === 'ENOENT') return emptyIndex(); throw err; }
  let data;
  try { data = JSON.parse(text); } catch (err) { throw new Error(`${clipsIndexFile(name)} is not valid JSON: ${err.message}`); }
  if (!data || data.version !== 1 || typeof data.clips !== 'object' || typeof data.steps !== 'object') throw new Error(`${clipsIndexFile(name)} has an unsupported shape`);
  return data;
}
export const writeIndex = (name, index) => atomicWriteJson(clipsIndexFile(name), index);

// Pure. step: { id, narration|null }; wanted: { voice, speed, preparedText, key } for that step (null when narration is null).
// muted: Set/array of step ids muted by the user.
export function stepStatus({ index, stepId, wanted, muted = [] }) {
  const mutedSet = muted instanceof Set ? muted : new Set(muted);
  if (mutedSet.has(stepId)) return 'muted';
  const key = index.steps?.[stepId];
  const clip = key ? index.clips?.[key] : undefined;
  if (clip && (clip.source === 'own' || clip.source === 'file')) return clip.source;
  if (!wanted) return clip ? 'stale' : 'missing';
  if (!clip) return 'missing';
  return clip.post === VOICE_POST && clip.key === wanted.key ? 'fresh' : 'stale';
}
export function computeStatuses({ index, steps, wantedByStep, muted = [] }) {
  return steps.map((step) => {
    const wanted = step.narration == null ? null : wantedByStep[step.id] ?? null;
    const status = stepStatus({ index, stepId: step.id, wanted, muted });
    const clip = index.steps?.[step.id] ? index.clips?.[index.steps[step.id]] : null;
    return { stepId: step.id, status: step.narration == null && !clip ? 'none' : status, key: clip?.key ?? null, durationSec: clip?.durationSec ?? null, source: clip?.source ?? null };
  });
}
export function setClip(index, entry) {
  const next = { version: 1, clips: { ...index.clips, [entry.key]: entry }, steps: { ...index.steps, [entry.stepId]: entry.key } };
  return next;
}
export const referencedKeys = (index) => new Set(Object.values(index.steps));

export async function cleanClips(name) {
  const index = await readIndex(name);
  const keep = referencedKeys(index);
  const removed = [];
  for (const k of Object.keys(index.clips)) if (!keep.has(k)) { delete index.clips[k]; }
  let files = [];
  try { files = await readdir(clipsDir(name)); } catch (err) { if (err.code !== 'ENOENT') throw err; }
  let bytes = 0;
  for (const f of files) {
    const key = f.replace(/\.wav$/, '');
    if (!f.endsWith('.wav') || keep.has(key)) continue;
    const p = path.join(clipsDir(name), f);
    bytes += (await stat(p)).size; await unlink(p); removed.push(f);
  }
  await writeIndex(name, index);
  return { removed, bytes };
}
export { clipFile };
