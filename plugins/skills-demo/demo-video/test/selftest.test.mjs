import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildCursor } from '../scripts/lib/timeline.mjs';
import { stillBoth } from '../scripts/lib/render.mjs';
import { copyScenarioTree, scenarioGraph, FIXTURE } from '../scripts/lib/record.mjs';
import { strayFiles } from '../scripts/lib/selftest.mjs';

test('cursor: across a cut it glides to the new spot over ~200 ms instead of teleporting', () => {
  // Cursor rests at x=100 until the cut [1000, 3000], and is at x=500 after it.
  const moves = [{ t: 0, x: 100, y: 100 }, { t: 2000, x: 500, y: 100 }];
  const { samples } = buildCursor(moves, [], { width: 1000, height: 1000, hz: 60, durationMs: 4000 }, [[1000, 3000]]);
  const xs = samples.map((s) => s.cx * 1000);
  const maxStep = Math.max(...xs.slice(1).map((x, i) => Math.abs(x - xs[i])));
  assert.ok(maxStep < 60, `largest frame-to-frame jump ${maxStep.toFixed(0)} px`);
  assert.ok(Math.abs(xs[Math.round(1.25 * 60)] - 500) < 1, 'arrives at the new spot within 250 ms of the cut');
});

test('freeze: a laptop span counts only while the cursor also rests', () => {
  const whole = { spans: [[3.5, 3]] }; // page still 3.5-6.5
  const hand = { spans: [[4.7, 1.8]] }; // cursor still 4.7-6.5
  assert.deepEqual(stillBoth(whole, hand).spans, [[4.7, 1.8]]);
  assert.equal(stillBoth({ spans: [[3.5, 3]] }, { spans: [[5.8, 2]] }).ok, true, '0.7 s overlap is under the 1.2 s limit');
});

test('record: the scenario folder is copied with helper imports rewritten, never its dot files or node_modules', async () => {
  const src = await mkdtemp(path.join(tmpdir(), 'demo-scn-'));
  await mkdir(path.join(src, 'helpers'), { recursive: true });
  await mkdir(path.join(src, 'node_modules', 'x'), { recursive: true });
  await mkdir(path.join(src, '.demo'), { recursive: true });
  await writeFile(path.join(src, 'flow.spec.ts'), "import { test } from '@playwright/test';\nimport { open } from './helpers/open';\n");
  await writeFile(path.join(src, 'helpers', 'open.ts'), "import { expect } from \"@playwright/test\";\nexport const open = 1;\n");
  await writeFile(path.join(src, '.env'), 'SECRET=1');
  await writeFile(path.join(src, '.demo', 'auth.json'), '{}');
  await writeFile(path.join(src, 'node_modules', 'x', 'i.js'), '');
  const out = path.join(src, 'demo-videos', 'run', 'scenario'); // inside the source, as in real runs
  await copyScenarioTree(src, out, await scenarioGraph(path.join(src, 'flow.spec.ts')));
  const fixture = JSON.stringify(FIXTURE.split(path.sep).join('/'));
  assert.ok((await readFile(path.join(out, 'helpers', 'open.ts'), 'utf8')).includes(`from ${fixture}`));
  assert.ok((await readFile(path.join(out, 'flow.spec.ts'), 'utf8')).includes("from './helpers/open'"));
  for (const f of ['.env', '.demo', 'node_modules', 'demo-videos']) assert.equal(existsSync(path.join(out, f)), false, `${f} copied`);
});

test('selftest: a file beside the allowed folders is reported, even in a folder whose name only starts the same (else the "nothing outside ~/.demo-video" check passes vacuously)', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'demo-stray-'));
  const allowed = [path.join(home, '.demo-video'), path.join(home, 'Desktop', 'Demo Videos')];
  for (const f of ['.demo-video/runs/a/run.json', 'Desktop/Demo Videos/x/x.mp4', 'Desktop/Demo Videos-old/y.mp4', 'Library/z.plist']) {
    await mkdir(path.dirname(path.join(home, f)), { recursive: true });
    await writeFile(path.join(home, f), '');
  }
  assert.deepEqual((await strayFiles(home, allowed)).map((f) => path.relative(home, f)).sort(), ['Desktop/Demo Videos-old/y.mp4', 'Library/z.plist']);
});
