import path from 'node:path';
import { access } from 'node:fs/promises';
import { projectDir } from '../paths.mjs';
import { readProjectFile, writeProjectFile } from '../project.mjs';
import { parseGuideAdd } from './pure.mjs';

export async function addGuideStep(flags) {
  const options = parseGuideAdd(flags);
  const dir = projectDir(options.name);
  let exists = true;
  try { await access(path.join(dir, 'guide.json')); }
  catch (error) { if (error.code === 'ENOENT') exists = false; else throw error; }
  let guide;
  if (exists) guide = await readProjectFile(options.name, 'guide');
  else {
    const brief = await readProjectFile(options.name, 'brief');
    guide = { version: 1, url: brief.baseURL, viewport: { width: 1440, height: 900 }, steps: [] };
  }
  // The first step opens the app; a later step without --url continues on whatever page the previous step left (url null), because
  // a click can change the page and repeating the old address would make the resolver reload it.
  const url = options.url ?? (guide.steps.length ? null : guide.url);
  if (!guide.steps.length && !url) throw new Error('A URL is required; set brief.baseURL or pass --url');
  const step = {
    action: options.action, candidates: [options.selector], name: options.label,
    role: options.role ?? '', url, frameUrl: url, isTopFrame: true,
    box: null, scope: null, sensitive: false, tab: options.tab,
  };
  if (options.action === 'fill') step.value = options.value;
  if (options.action === 'press') step.key = options.key;
  guide.steps.push(step);
  await writeProjectFile(options.name, 'guide', guide);
  return guide.steps.length;
}
