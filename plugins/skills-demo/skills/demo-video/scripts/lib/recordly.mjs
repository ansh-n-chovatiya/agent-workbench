// Recordly detection and the guided handoff. Recordly has no CLI or open-file
// hook, so the edited clip and its cursor log are put in the deliverables
// folder where the user can see them, the app is opened, and the user edits,
// exports, saves the project and comes back. The wait is bounded: on timeout
// or Ctrl+C the render falls back to its own drawn cursor.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, open as openFile, readdir, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { ffprobeDuration, log, run } from './env.mjs';

const APP = '/Applications/Recordly.app';
const BUNDLE_ID = 'dev.recordly.app';
const TIP = 'Tip: install Recordly (recordly.dev) for cursor animation and auto-zoom.';
const RECORDLY_DATA = path.join(os.homedir(), 'Library', 'Application Support', 'Recordly');

export async function recordlyStatus() {
  if (process.platform !== 'darwin') return { installed: false, appPath: null };
  let appPath = existsSync(APP) ? APP : null;
  if (!appPath) {
    try {
      appPath = (await run('mdfind', [`kMDItemCFBundleIdentifier == ${BUNDLE_ID}`])).stdout.split('\n')[0].trim() || null;
    } catch { appPath = null; }
  }
  return { installed: !!appPath, appPath };
}

export const recordlyTip = () => log(TIP);

// Where the handoff puts the clip for Recordly, and where it suggests the
// export and the saved project go.
export function recordlyPaths(folder, slug) {
  const dir = path.join(folder, 'for-recordly');
  return {
    dir, clip: path.join(dir, `${slug}.mp4`),
    suggested: path.join(dir, `${slug}-recordly.mp4`), project: path.join(dir, `${slug}.recordly`),
  };
}

// Where a saved Recordly project is looked for besides for-recordly/, and the
// app's list of recently saved projects.
export const projectPlaces = () => ({
  dirs: [...['Downloads', 'Documents', 'Movies'].map((d) => path.join(os.homedir(), d)), path.join(RECORDLY_DATA, 'projects')],
  recentFile: path.join(RECORDLY_DATA, 'recent-projects.json'),
});

// Loaded on first use so the handoff module still imports where the project
// parser is absent.
const projectLib = () => import('./recordly-project.mjs');

// Size plus a hash of the first MB: tells the unedited clip (or a copy of it)
// from a real export without reading whole videos.
async function fingerprint(file) {
  const fh = await openFile(file, 'r');
  try {
    const buf = Buffer.alloc(1 << 20);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    return `${(await fh.stat()).size}:${createHash('sha1').update(buf.subarray(0, bytesRead)).digest('hex')}`;
  } finally { await fh.close(); }
}

// Why `file` is not this clip's export, or null when it is.
async function rejectReason(file, { since, source }) {
  let s;
  try { s = await stat(file); } catch { return 'was not found'; }
  if (!s.isFile()) return 'is not a file';
  if (s.mtimeMs < since) return 'was there before Recordly was opened';
  if (await fingerprint(file) === source) return 'is a copy of the clip given to Recordly, not its export';
  try { await ffprobeDuration(file); } catch { return 'is not a readable video'; }
  return null;
}

// Terminal paste or a file dragged in from Finder: quotes and `\ ` escapes.
function pastedPath(line) {
  const s = line.trim().replace(/^(['"])(.*)\1$/, '$2').replace(/\\(.)/g, '$1');
  return s === '~' || s.startsWith('~/') ? path.join(os.homedir(), s.slice(1)) : path.resolve(s);
}

const minutes = (ms) => `${+(ms / 60_000).toFixed(2)} min`;
const elapsed = (ms) => {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
};

function box(lines) {
  const w = Math.max(...lines.map((l) => l.length));
  return [`┌${'─'.repeat(w + 2)}┐`, ...lines.map((l) => `│ ${l.padEnd(w)} │`), `└${'─'.repeat(w + 2)}┘`].join('\n');
}

const macNotify = (title, text) => run('osascript', ['-e', `display notification ${JSON.stringify(text)} with title ${JSON.stringify(title)}`]);


// Why `file` is not a saved project for this clip, or null when it is.
async function projectRejectReason(file, { since, clipName, parseProject }) {
  let s;
  try { s = await stat(file); } catch { return 'was not found'; }
  if (!s.isFile()) return 'is not a file';
  if (s.mtimeMs < since) return 'was saved before Recordly was opened';
  let r;
  try { r = await parseProject(await readFile(file, 'utf8'), { clipName }); } catch { return 'is not a Recordly project'; }
  if (r.error) return `could not be read (${r.error})`;
  if (!r.references) return `is not a project for ${clipName}`;
  return null;
}

// Hands the clip to the user in Recordly, waits for the export and then,
// with withProject, briefly for the saved project. Resolves with null when
// the render should use its drawn cursor (Recordly would not open, the wait
// timed out, or Ctrl+C); otherwise with the export's path, or with
// {export, project} under withProject (project null when none was saved in
// time). `dirs` are the folders watched for the export besides for-recordly/,
// `projectDirs` and `recentFile` where the project is looked for besides it.
// open/notify/input/now/print, the project finder and parser and the
// millisecond knobs exist so tests never launch the app, read real folders
// or wait real time.
export async function handoff({
  clip, cursor, folder, slug, timeoutMs = 10 * 60_000, withProject = false, projectWaitMs = 20_000,
  dirs = [path.join(os.homedir(), 'Downloads'), path.join(os.homedir(), 'Movies')],
  projectDirs = projectPlaces().dirs, recentFile = projectPlaces().recentFile,
  findProject = async (o) => (await projectLib()).findProject(o),
  parseProject = async (json, o) => (await projectLib()).parseProject(json, o),
  open = (args) => run('open', args), notify = macNotify,
  input = process.stdin, interactive = Boolean(process.stdin.isTTY),
  pollMs = 1000, settleMs = 1000, reminderMs = 60_000, now = Date.now, print = log,
}) {
  // File times are wall-clock; `now` only paces the wait.
  const since = Date.now();
  const start = now();
  const p = recordlyPaths(folder, slug);
  await mkdir(p.dir, { recursive: true });
  await copyFile(clip, p.clip);
  await copyFile(cursor, `${p.clip}.cursor.json`);
  const want = { since, source: await fingerprint(clip) };

  const opened = await open(['-a', 'Recordly']);
  if (opened?.code) {
    print(`Could not open Recordly (${String(opened.stderr ?? '').trim().split('\n').pop() || `exit ${opened.code}`}); rendering with the drawn cursor instead.`);
    return null;
  }
  await Promise.resolve(open(['-R', p.clip])).catch(() => {});
  await Promise.resolve(notify('Demo video', `In Recordly, open ${slug}.mp4 and edit anything, then export and save the project (Cmd+S), and come back to the terminal.`)).catch(() => {});
  print(box([
    'Recordly: shape the video before the captions and narration go on',
    '',
    'In Recordly choose Open and pick:',
    `   ${p.clip}`,
    'Edit anything: zoom, cut, speed up, cursor, background, shape.',
    'Then 1) export and 2) save the project (Cmd+S). Suggested:',
    `   ${p.suggested}`,
    `   ${p.project}`,
    interactive ? 'Then come back here and press Enter, or paste the export path.'
      : 'Nothing else: both are picked up once saved.',
    '',
    'The export is looked for in:',
    ...[p.dir, ...dirs].map((d) => `   ${d}`),
    `After ${minutes(timeoutMs)} or Ctrl+C the video is made with the drawn cursor instead.`,
  ]));

  // A file counts once it is new, has stopped changing for settleMs, and passes
  // rejectReason; each version of a file is judged (and reported) once.
  const judged = new Map();
  async function scan() {
    for (const dir of [p.dir, ...dirs]) {
      let names;
      try { names = await readdir(dir); } catch { continue; }
      for (const n of names) {
        const f = path.join(dir, n);
        if (!/\.(mp4|gif)$/i.test(n) || f === p.clip) continue;
        let s;
        try { s = await stat(f); } catch { continue; }
        if (s.mtimeMs < since || Date.now() - s.mtimeMs < settleMs) continue;
        const sig = `${s.size}:${s.mtimeMs}`;
        if (judged.get(f) === sig) continue;
        judged.set(f, sig);
        const why = await rejectReason(f, want);
        if (!why) return f;
        print(`Not the export: ${f} ${why}.`);
      }
    }
    return null;
  }

  let pasted = [];
  let asked = false;
  let interrupted = false;
  let wake = () => {};
  const nap = (ms) => new Promise((r) => { const t = setTimeout(r, ms); wake = () => { clearTimeout(t); r(); }; });
  const rl = interactive ? readline.createInterface({ input, terminal: false }) : null;
  rl?.on('line', (line) => { if (line.trim()) pasted.push(line); else asked = true; wake(); });
  // While waiting, Ctrl+C means "skip Recordly", not "abort the render".
  const onInterrupt = () => { interrupted = true; wake(); };
  process.on('SIGINT', onInterrupt);
  // A project path pasted before the export is kept for the project search.
  const isProject = (line) => withProject && /\.recordly$/i.test(pastedPath(line));

  async function waitExport() {
    let nextReminder = start + reminderMs;
    for (;;) {
      if (interrupted) { print('Recordly skipped (Ctrl+C); rendering with the drawn cursor instead.'); return null; }
      const lines = pasted;
      pasted = lines.filter(isProject);
      for (const line of lines.filter((l) => !isProject(l))) {
        const f = pastedPath(line);
        const why = await rejectReason(f, want);
        if (!why) return f;
        print(`Not the export: ${f} ${why}. Paste another path or press Enter to re-check.`);
      }
      const found = await scan();
      if (found) return found;
      if (asked) { asked = false; print('No finished export yet; still watching (a file still being saved is picked up once it is done).'); }
      const t = now();
      if (t - start >= timeoutMs) { print(`No Recordly export after ${minutes(timeoutMs)}; rendering with the drawn cursor instead.`); return null; }
      if (t >= nextReminder) {
        print(`Still waiting for the Recordly export (${elapsed(t - start)} so far; drawn cursor at ${minutes(timeoutMs)}).${interactive ? ' Press Enter to re-check or paste the export path.' : ''}`);
        nextReminder += reminderMs;
      }
      await nap(pollMs);
    }
  }

  // The project carries the exact cuts and speed changes; without one the
  // edits are recovered from the export's frames, so the wait is short.
  async function waitProject() {
    const clipName = path.basename(p.clip);
    const where = { dirs: [p.dir, ...projectDirs], since, clipName, recentFile };
    const limit = elapsed(projectWaitMs);
    print(`Looking for the saved Recordly project (Cmd+S) for up to ${limit}.${interactive ? ' Press Enter to re-check or paste its path.' : ''}`);
    asked = false;
    const t0 = now();
    for (;;) {
      if (interrupted) { print('Project search skipped (Ctrl+C); the edits will be read from the export itself.'); return null; }
      for (const line of pasted.splice(0)) {
        const f = pastedPath(line);
        const why = await projectRejectReason(f, { since, clipName, parseProject });
        if (!why) return f;
        print(`Not the project: ${f} ${why}. Paste another path or press Enter to re-check.`);
      }
      const found = await findProject(where);
      if (found) return found;
      if (asked) { asked = false; print('No saved project yet; still looking.'); }
      if (now() - t0 >= projectWaitMs) { print(`No saved Recordly project after ${limit}; the edits will be read from the export itself.`); return null; }
      await nap(pollMs);
    }
  }

  try {
    const exported = await waitExport();
    if (!exported) return null;
    print(`Recordly export: ${exported}`);
    // Recordly's GIF export is read like any video, at GIF's 256 colours.
    if (/\.gif$/i.test(exported)) print('GIF export: limited colours; MP4 recommended');
    if (!withProject) return exported;
    const project = await waitProject();
    if (project) print(`Recordly project: ${project}`);
    return { export: exported, project };
  } finally {
    rl?.close();
    process.off('SIGINT', onInterrupt);
  }
}
