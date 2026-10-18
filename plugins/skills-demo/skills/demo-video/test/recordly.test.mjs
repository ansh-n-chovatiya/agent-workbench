import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { handoff } from '../scripts/lib/recordly.mjs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// A small real video: duration is what the export check reads.
const clip = (file, sec, color) => execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi',
  '-i', `color=c=${color}:s=64x64:r=30:d=${sec}`, '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', file]);

async function setup(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'recordly-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const d = (n) => path.join(dir, n);
  for (const n of ['downloads', 'movies', 'elsewhere']) await mkdir(d(n));
  clip(d('clip.mp4'), 2, 'blue');
  await writeFile(d('cursor.json'), '{"version":2,"samples":[]}');
  // Made before the handoff, with the right length: a previous export.
  clip(d('downloads/old-export.mp4'), 2, 'red');
  const past = new Date(Date.now() - 60_000);
  await utimes(d('downloads/old-export.mp4'), past, past);
  const lines = [];
  const opened = [];
  const opts = {
    clip: d('clip.mp4'), cursor: d('cursor.json'), folder: d('Demo Videos/flow-2026'), slug: 'flow',
    dirs: [d('downloads'), d('movies')], timeoutMs: 20_000, pollMs: 20, settleMs: 60,
    notify: async () => {}, print: (l) => lines.push(l), interactive: false,
  };
  return { d, lines, opened, opts, record: (fn) => async (args) => { opened.push(args); if (args[0] === '-a') fn(); return { code: 0 }; } };
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Catches: the unedited clip (copied into Downloads) being taken for the
// export, which ships a video without Recordly's work; an export the user cut
// or sped up being refused for its length, which throws their edits away; and
// an export saved to Downloads/Movies never being seen.
test('handoff: rejects a copy of the source, accepts a new export of any length in a watched folder', async (t) => {
  const s = await setup(t);
  const got = await handoff({ ...s.opts, open: s.record(async () => {
    await wait(30);
    await copyFile(s.d('clip.mp4'), s.d('downloads/flow.mp4'));
    await wait(400);
    clip(s.d('movies/Recordly export.mp4'), 1, 'white');
  }) });
  assert.equal(got, s.d('movies/Recordly export.mp4'));
  const placed = s.d('Demo Videos/flow-2026/for-recordly/flow.mp4');
  assert.ok(existsSync(placed) && existsSync(`${placed}.cursor.json`), 'pair not placed in the deliverables folder');
  assert.deepEqual(s.opened, [['-a', 'Recordly'], ['-R', placed]]);
  const out = s.lines.join('\n');
  assert.match(out, /downloads\/flow\.mp4 is a copy of the clip/);
  assert.doesNotMatch(out, /old-export/, 'a file from before the handoff was considered');
  assert.match(out, new RegExp(`In Recordly choose Open and pick:[^\\n]*\\n[^\\n]*${esc(placed)}`));
  assert.match(out, /Edit anything: zoom, cut, speed up, cursor, background, shape\.[^\n]*\n[^\n]*Then 1\) export and 2\) save the project \(Cmd\+S\)/);
  assert.match(out, new RegExp(esc(s.d('Demo Videos/flow-2026/for-recordly/flow.recordly'))));
});

// Catches: a pasted path being trusted as is (the source clip was accepted
// as the export in a real run), Finder-dragged paths with escaped spaces not
// resolving, and a pasted longer export being refused for its length.
test('handoff: a pasted path is validated the same way; a dragged-in path with escaped spaces is accepted', async (t) => {
  const s = await setup(t);
  const input = new PassThrough();
  const good = s.d('elsewhere/my export.mp4');
  const got = await handoff({ ...s.opts, interactive: true, input, open: s.record(async () => {
    await wait(30);
    await copyFile(s.d('clip.mp4'), s.d('elsewhere/copy.mp4'));
    input.write(`'${s.d('elsewhere/copy.mp4')}'\n`);
    await wait(100);
    clip(good, 3, 'white');
    input.write(`${good.replace(/ /g, '\\ ')} \n`);
  }) });
  assert.equal(got, good);
  assert.match(s.lines.join('\n'), /copy\.mp4 is a copy of the clip given to Recordly/);
});

// Catches: the project search looking in the wrong places or for the wrong
// clip (so the user's exact edits are never read), and a slow or absent
// project blocking the render instead of giving up after the short wait.
test('handoff withProject: the finder is asked for this clip in for-recordly/ and the given places; none in time gives project null', async (t) => {
  const s = await setup(t);
  const asks = [];
  let calls = 0;
  const base = { ...s.opts, withProject: true, projectDirs: [s.d('downloads')], recentFile: s.d('recent.json'),
    open: s.record(() => clip(s.d('movies/export.mp4'), 1, 'white')) };
  const got = await handoff({ ...base, findProject: async (o) => { asks.push(o); return ++calls === 3 ? s.d('downloads/p.recordly') : null; } });
  assert.deepEqual(got, { export: s.d('movies/export.mp4'), project: s.d('downloads/p.recordly') });
  const [ask] = asks;
  assert.equal(ask.clipName, 'flow.mp4');
  assert.deepEqual(ask.dirs, [s.d('Demo Videos/flow-2026/for-recordly'), s.d('downloads')]);
  assert.equal(ask.recentFile, s.d('recent.json'));
  assert.ok(ask.since <= Date.now() && ask.since > Date.now() - 60_000, 'since is not the handoff time');

  const none = await handoff({ ...base, projectWaitMs: 100, findProject: async () => null });
  assert.deepEqual(none, { export: s.d('movies/export.mp4'), project: null });
  assert.match(s.lines.join('\n'), /No saved Recordly project after/);
});

// Catches: a pasted project from an earlier session or for another clip being
// used, which would re-time captions with edits the export does not have.
test('handoff withProject: a pasted project must be newer than the handoff and reference this clip', async (t) => {
  const s = await setup(t);
  await writeFile(s.d('elsewhere/old.recordly'), '{"clip":"flow.mp4"}');
  await utimes(s.d('elsewhere/old.recordly'), new Date(Date.now() - 60_000), new Date(Date.now() - 60_000));
  const input = new PassThrough();
  const got = await handoff({ ...s.opts, withProject: true, interactive: true, input, projectWaitMs: 20_000,
    findProject: async () => null,
    parseProject: (text, { clipName }) => ({ references: text.includes(clipName) }),
    open: s.record(async () => {
      await wait(30);
      await writeFile(s.d('elsewhere/other.recordly'), '{"clip":"another.mp4"}');
      await writeFile(s.d('elsewhere/my project.recordly'), '{"clip":"flow.mp4"}');
      // Pasted before the export turns up: kept for the project search.
      input.write(`${s.d('elsewhere/old.recordly')}\n${s.d('elsewhere/other.recordly')}\n`);
      await wait(100);
      clip(s.d('movies/export.mp4'), 1, 'white');
      await wait(300);
      input.write(`'${s.d('elsewhere/my project.recordly')}'\n`);
    }) });
  assert.deepEqual(got, { export: s.d('movies/export.mp4'), project: s.d('elsewhere/my project.recordly') });
  const out = s.lines.join('\n');
  assert.match(out, /old\.recordly was saved before Recordly was opened/);
  assert.match(out, /other\.recordly is not a project for flow\.mp4/);
});
