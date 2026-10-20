import path from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { projectDir } from '../paths.mjs';
import { readProjectFile, writeProjectFile } from '../project.mjs';
import { parseGuideAdd, GUIDE_ADD_USAGE, GUIDE_ADD_EXAMPLE } from './pure.mjs';

export async function addGuideStep(flags) {
  let batch;
  try {
    if (flags.includes('--json') || flags.includes('--file')) {
      const opts = {};
      for (let i = 0; i < flags.length; i += 2) {
        const k = flags[i];
        if (!['--name','--json','--file'].includes(k) || opts[k] !== undefined || flags[i + 1] === undefined) throw new Error('Invalid batch option: ' + k);
        opts[k] = flags[i + 1];
      }
      if (!opts['--name'] || Boolean(opts['--json']) === Boolean(opts['--file'])) throw new Error('Supply --name and exactly one of --json or --file');
      const items = JSON.parse(opts['--json'] ?? await readFile(opts['--file'], 'utf8'));
      if (!Array.isArray(items) || !items.length) throw new Error('Batch must be a non-empty JSON array');
      batch = items.map((item, i) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Batch step ' + i + ' must be an object');
        if (Object.entries(item).some(([k,v]) => typeof v !== 'string' && !(k === 'tab' && Number.isSafeInteger(v)))) throw new Error('Batch step ' + i + ': use string fields and a non-negative integer tab');
        return parseGuideAdd(['--name', opts['--name'], ...Object.entries(item).flatMap(([k, v]) => ['--' + k, String(v)])]);
      });
    } else batch = [parseGuideAdd(flags)];
  } catch (error) { throw new Error(error.message.includes('Usage:') ? error.message : error.message + '\n' + GUIDE_ADD_USAGE + '\n' + GUIDE_ADD_EXAMPLE); }
  const options = batch[0];
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
  for (const options of batch) {
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
  }
  await writeProjectFile(options.name, 'guide', guide);
  return guide.steps.length;
}
