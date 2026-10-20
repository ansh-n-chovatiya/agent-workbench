import { mkdir, readFile, writeFile, rename, link, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { projectDir } from './paths.mjs';
import { renameRetry } from './fs-retry.mjs';

export const PROJECT_FILES = Object.freeze({ config: 'config.json', brief: 'brief.json', guide: 'guide.json', resolved: 'guide.resolved.json', storyboard: 'storyboard.json', scenario: 'scenario.json' });
const commands = { config: 'init', brief: 'brief init', guide: 'guide', resolved: 'guide resolve', storyboard: 'storyboard draft', scenario: 'scenario build' };
function filePath(name, key) {
  if (!Object.hasOwn(PROJECT_FILES, key)) throw new Error(`Unknown project file "${key}"`);
  return path.join(projectDir(name), PROJECT_FILES[key]);
}
export async function readProjectFile(name, key) {
  const file = filePath(name, key);
  let text;
  try { text = await readFile(file, 'utf8'); }
  catch (err) {
    if (err.code === 'ENOENT') throw new Error(`${PROJECT_FILES[key]} not found for project ${name}; run: showreel ${commands[key]} --name ${name}`);
    throw err;
  }
  try { return JSON.parse(text); }
  catch (err) { throw new Error(`${file} is not valid JSON: ${err.message}`); }
}
export async function writeProjectFile(name, key, data, { overwrite = true } = {}) {
  const file = filePath(name, key);
  await mkdir(projectDir(name), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
    // Linking publishes complete bytes without a check-then-write overwrite race.
    if (overwrite) await renameRetry(temp, file);
    else await link(temp, file);
  } catch (err) {
    if (err.code === 'EEXIST') throw new Error(`Refusing to overwrite existing ${key}: ${file}`);
    throw err;
  } finally { await unlink(temp).catch((err) => { if (err.code !== 'ENOENT') throw err; }); }
  return file;
}
export async function projectExists(name) {
  try { return (await stat(projectDir(name))).isDirectory(); }
  catch (err) { if (err.code === 'ENOENT') return false; throw err; }
}
