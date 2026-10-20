import path from 'node:path';
import { access, chmod, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { projectDir } from '../paths.mjs';
import { readProjectFile } from '../project.mjs';

export function parseRecordOptions(command, flags) {
  const allowed = {
    record: ['--name', '--headed', '--no-rehearsal', '--scale', '--fps', '--profile'],
    login: ['--name', '--url'], runs: ['--name', '--json'], 'cursor-demo': ['--headed'],
  }[command];
  const switches = ['--headed', '--no-rehearsal', '--json'];
  const options = {};
  for (let i = 0; i < flags.length; i++) {
    const flag = flags[i];
    if (!allowed?.includes(flag) || Object.hasOwn(options, flag)) throw new Error(`Invalid option: ${flag}`);
    if (switches.includes(flag)) options[flag] = true;
    else {
      if (!flags[i + 1] || flags[i + 1].startsWith('--')) throw new Error(`Missing value for ${flag}`);
      options[flag] = flags[++i];
    }
  }
  if (command !== 'cursor-demo') {
    if (!options['--name']) throw new Error('--name is required');
    projectDir(options['--name']);
  }
  if (options['--scale'] !== undefined && options['--scale'] !== 'auto') {
    options['--scale'] = Number(options['--scale']);
    if (![1, 1.33, 1.67, 2].includes(options['--scale'])) {
      throw new Error('--scale must be auto, 1, 1.33, 1.67 or 2');
    }
  }
  if (options['--profile'] !== undefined && !['desktop', 'phone'].includes(options['--profile'])) throw new Error('--profile must be desktop or phone');
  if (options['--fps'] !== undefined) {
    options['--fps'] = Number(options['--fps']);
    if (![30, 60].includes(options['--fps'])) throw new Error('--fps must be 30 or 60');
  }
  return options;
}

export async function listRuns(name) {
  const dir = path.join(projectDir(name), 'runs');
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const runs = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    try {
      const record = JSON.parse(await readFile(path.join(dir, entry.name, 'record.json'), 'utf8'));
      runs.push({ id: entry.name, profile: record.profile ?? 'desktop', durationSec: record.durationSec, bytes: record.video?.bytes ?? 0 });
    } catch (error) {
      // A failed rehearsal or interrupted recording has no completed metadata.
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return runs;
}

export async function login({ name, url, log = console.log }) {
  const { chromium } = await import('playwright');
  const dir = projectDir(name);
  url ??= (await readProjectFile(name, 'brief')).baseURL;
  if (!url || !['http:', 'https:'].includes(new URL(url).protocol)) throw new Error('Login needs an http(s) URL');
  const auth = path.join(dir, 'auth.json');
  let storageState;
  try { await access(auth); storageState = auth; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  let browser, context, snapshot, closed = false;
  try {
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext({ storageState });
    const page = await context.newPage();
    page.once('close', () => { closed = true; });
    browser.once('disconnected', () => { closed = true; });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    log('Log in, then close the login window to save the session.');
    // Keep a recent snapshot because closing the last browser window can destroy
    // the context before the close notification reaches Node.
    while (!closed) {
      snapshot = await context.storageState().catch((error) => {
        if (!closed) throw error;
        return snapshot;
      });
      await sleep(250);
    }
    snapshot = await context.storageState().catch(() => snapshot);
    if (!snapshot) throw new Error('Login window closed before session state could be saved');
    await mkdir(dir, { recursive: true });
    await writeFile(auth, JSON.stringify(snapshot, null, 2) + '\n', { mode: 0o600 });
    try { await chmod(auth, 0o600); }
    catch (error) { if (process.platform !== 'win32') throw error; }
    log('Session saved.');
  } finally {
    try { await context?.close().catch(() => {}); }
    finally { await browser?.close(); }
  }
}

export async function recordingCommand(command, flags) {
  const options = parseRecordOptions(command, flags);
  const name = options['--name'];
  if (command === 'record') {
    const { recordScenario } = await import('./recorder.mjs');
    return recordScenario({ name, headless: !options['--headed'],
      rehearsal: !options['--no-rehearsal'], profile: options['--profile'], scale: options['--scale'], fps: options['--fps'] });
  }
  if (command === 'login') return login({ name, url: options['--url'] });
  if (command === 'runs') {
    const runs = await listRuns(name);
    if (options['--json']) { console.log(JSON.stringify(runs, null, 2)); return; }
    const shown = process.argv.includes('--verbose') ? runs : runs.slice(0, 10);
    if (runs.length > 10) console.log(`${runs.length} runs`);
    for (const run of shown) {
      console.log(`${run.id}\t${run.profile}\t${run.durationSec.toFixed(1)} s\t${run.bytes} bytes`);
    }
    if (shown.length < runs.length) console.log(`${runs.length - shown.length} more, use --verbose`);
    return;
  }
  const { cursorDemo } = await import('./cursor-demo.mjs');
  return cursorDemo();
}
