import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Everything this test writes stays in a temp folder: paths.mjs reads these
// once at import, so they are set before render.mjs is loaded. The Recordly
// stand-in below watches no real folder.
const tmp = await mkdtemp(path.join(os.tmpdir(), 'demo-deliver-'));
process.env.DEMO_VIDEO_HOME = path.join(tmp, 'demo-video-home');
process.env.DEMO_VIDEO_DELIVER = path.join(tmp, 'deliver');
const { main: render } = await import('../scripts/lib/render.mjs');

const CAPTIONS = [
  { index: 0, text: 'Open the product page', start: 0.6, end: 2.2 },
  { index: 1, text: 'Check out with the saved card', start: 2.6, end: 3.8 },
];

// A run as record + edit leave it, with no raw/ so render does not re-edit.
async function run(runDir, folder) {
  const edit = path.join(runDir, 'edit', 'laptop');
  await mkdir(edit, { recursive: true });
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=1920x1080:rate=60:duration=4',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', path.join(edit, 'clip.mp4')]);
  await writeFile(path.join(edit, 'captions.json'), JSON.stringify(CAPTIONS));
  await writeFile(path.join(edit, 'cursor.json'), JSON.stringify({ version: 2, samples: Array.from({ length: 241 }, (_, f) => (
    { timeMs: Math.round(f * 1000 / 60), cx: 0.2 + f / 600, cy: 0.3, interactionType: 'move', cursorType: 'arrow' })) }));
  await writeFile(path.join(edit, 'timeline.json'), JSON.stringify({ duration: 4, cuts: [], steps: [], narration: [] }));
  await writeFile(path.join(runDir, 'record.json'), JSON.stringify({
    version: 1, scenario: 'checkout-flow.spec.ts', runId: 'x', startedAt: '2026-01-15T10:00:00Z',
    clips: [{ name: 'laptop', width: 1920, height: 1080, mobile: false }], blocked: [], recordly: true, voice: false,
    config: { baseURL: 'http://localhost:3000' }, deliver: folder,
  }));
}

async function capture(fn) {
  const lines = [];
  const orig = console.log;
  console.log = (m) => lines.push(String(m));
  try { await fn(); } finally { console.log = orig; }
  return lines;
}

const NAMED = ['checkout-flow-contact-sheet.png', 'checkout-flow-poster.png', 'checkout-flow-short.mp4',
  'checkout-flow.mp4', 'checkout-flow.srt', 'checkout-flow.vtt'];

// Catches: an agent/CI render hanging on a Recordly click nobody will make;
// deliverables missing, misnamed or mixed with working files; a relative or
// missing path in the summary line; and a Recordly timeout aborting the render
// instead of finishing it with the drawn cursor.
test('render delivers the named files with one absolute summary line; non-interactive runs skip Recordly unless --recordly, whose timeout falls back to the drawn cursor', { timeout: 300_000 }, async (t) => {
  t.after(() => rm(tmp, { recursive: true, force: true }));
  assert.ok(!process.stdin.isTTY, 'this test needs a non-interactive stdin');
  const runDir = path.join(tmp, 'run');
  const folder = path.join(process.env.DEMO_VIDEO_DELIVER, 'checkout-flow-2026-01-15-1000');
  await run(runDir, folder);
  // Stands in for an installed Recordly; opening it leaves a marker.
  const marker = path.join(tmp, 'recordly-opened');
  process.env.DEMO_RECORDLY_FAKE = JSON.stringify({
    openCmd: [process.execPath, '-e', `require('fs').writeFileSync(${JSON.stringify(marker)}, '')`],
    watch: [], pollMs: 20, settleMs: 50, timeoutMs: 400,
  });
  t.after(() => { delete process.env.DEMO_RECORDLY_FAKE; });

  const first = await capture(() => render([runDir], { cwd: runDir }));
  assert.equal(existsSync(marker), false, 'a non-interactive render without --recordly started the handoff');
  assert.deepEqual((await readdir(folder)).sort(), NAMED);
  const summary = first.filter((l) => l.startsWith('Final video:'));
  assert.equal(summary.length, 1, first.join('\n'));
  assert.match(summary[0], /^Final video: (\/.+\.mp4) \(\d+\.\d s, \d+x\d+, \d+(\.\d+)? fps\)$/);
  assert.equal(summary[0].match(/^Final video: (.+) \(/)[1], path.join(folder, 'checkout-flow.mp4'));
  assert.ok(first.some((l) => /^\[\d+\.\d s\] compose/.test(l)), 'no stage progress line');

  const second = await capture(() => render([runDir, '--recordly'], { cwd: runDir }));
  assert.equal(existsSync(marker), true, '--recordly did not start the handoff');
  assert.ok(second.some((l) => /^No Recordly export after .*drawn cursor instead\.$/.test(l)), second.join('\n'));
  const runJson = JSON.parse(await readFile(path.join(runDir, 'out', 'run.json'), 'utf8'));
  assert.equal(runJson.render.recordlyExport, null);
  assert.equal(runJson.render.cursorDrawn, true, 'the fallback render has no drawn cursor');
  // The re-render gets its own folder, with the Recordly pair it used; the
  // first render's video stays as delivered.
  assert.deepEqual((await readdir(folder)).sort(), NAMED);
  const again = `${folder}-2`;
  assert.deepEqual((await readdir(again)).sort(), [...NAMED, 'for-recordly'].sort());
  assert.deepEqual((await readdir(path.join(again, 'for-recordly'))).sort(), ['checkout-flow.mp4', 'checkout-flow.mp4.cursor.json']);
  assert.equal(second.filter((l) => l.startsWith('Final video:')).length, 1);
});
