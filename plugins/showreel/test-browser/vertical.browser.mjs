import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { startFixtureServer } from '../scripts/lib/fixture-server.mjs';

const directory = await mkdtemp(path.join(os.tmpdir(), 'showreel-vertical-'));
process.env.SHOWREEL_HOME = path.join(directory, 'home');
const { recordingCommand, listRuns } = await import('../scripts/lib/record/commands.mjs');
const { renderRun } = await import('../scripts/lib/compose/render.mjs');
const { validateEvents, validateRecord } = await import('../scripts/lib/record/schemas.mjs');
const { DEFAULT_BRIEF } = await import('../scripts/lib/brief.mjs');

test('phone recording CLI, vertical stills and export', { timeout: 180000 }, async () => {
  let fixture, media, browser;
  try {
    fixture = await startFixtureServer();
    const name = 'vertical-demo', dir = path.join(process.env.SHOWREEL_HOME, 'projects', name);
    await mkdir(dir, { recursive: true });
    const baseURL = `${fixture.url}/index.html`;
    const steps = [{ id: 's1', caption: 'Explore on your phone', narration: null, zoom: 'auto', highlight: true,
      holdMs: 350, actions: [{ type: 'goto', url: baseURL }, { type: 'click', selector: 'nav a:text-is("Features")' }] }];
    const brief = structuredClone(DEFAULT_BRIEF);
    Object.assign(brief, { baseURL, topic: 'Phone demo', flowMode: 'guide' });
    brief.outputs.vertical = true; brief.titleCard.enabled = false; brief.outroCard.enabled = false;
    await Promise.all(Object.entries({
      brief, config: { baseURL, captureScale: 1 }, scenario: { version: 1, baseURL, steps },
      storyboard: { version: 1, title: null, outro: null, steps: steps.map(({ actions, ...s }) => ({ ...s, guideSteps: [0] })) },
    }).map(([file, value]) => writeFile(path.join(dir, `${file}.json`), JSON.stringify(value))));
    const run = await recordingCommand('record', ['--name', name, '--profile', 'phone', '--fps', '30']);
    assert.equal(run.events.profile, 'phone'); assert.equal(run.record.profile, 'phone');
    assert.deepEqual(run.events.viewport, { width: 390, height: 844 });
    assert.deepEqual([run.record.video.width, run.record.video.height], [390, 844]);
    assert.ok(run.events.clicks.length > 0); assert.ok(run.events.clicks.every(c => c.kind === 'tap'));
    assert.equal(run.events.moves.length, 0); assert.ok(run.events.cursor.length > 0);
    assert.equal(validateEvents(run.events).ok, true); assert.equal(validateRecord(run.record).ok, true);
    assert.equal((await listRuns(name))[0].profile, 'phone');
    // Trim only for export speed; the recording itself exercises normal navigation and taps.
    const composition = { run: { id: run.record.runId }, output: { preset: 'vertical', fps: 30 },
      zoom: { enabled: false }, cards: { title: { enabled: false }, outro: { enabled: false } },
      edits: { trims: [{ start: 1, end: run.record.durationSec }] } };
    const { buildComposition } = await import('../scripts/lib/compose/composition.mjs');
    const built = buildComposition({ brief, storyboard: { steps }, events: run.events, record: run.record, overrides: composition });
    await writeFile(path.join(dir, 'composition.json'), JSON.stringify(built));
    const stills = await renderRun({ name, runId: run.record.runId, format: 'vertical', stills: [0.5], log() {} });
    const png = await readFile(stills.files[0]);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1080, 1920]);
    const { frame, caption } = stills.plan.layout;
    assert.ok(frame.y >= 1920 * .07); assert.ok(frame.y + frame.h <= caption.y);
    assert.equal(caption.h, Math.round(1920 * .16)); assert.ok(caption.y > 1920 / 2);
    assert.ok(caption.y + caption.h <= 1920 * .86);
    const exported = await renderRun({ name, runId: run.record.runId, format: 'vertical', log() {} });
    assert.equal(path.basename(exported.finalFile), 'final-vertical.mp4');
    media = await startFixtureServer(exported.renderDir); browser = await chromium.launch();
    const page = await browser.newPage(); await page.goto(media.url);
    const dimensions = await page.evaluate(async url => {
      const video = document.createElement('video'); video.muted = true;
      const loaded = new Promise((resolve, reject) => { video.onloadedmetadata = resolve; video.onerror = reject; });
      video.src = url; document.body.append(video); await loaded;
      return [video.videoWidth, video.videoHeight];
    }, `${media.url}/final-vertical.mp4`);
    assert.deepEqual(dimensions, [1080, 1920]);
  } finally {
    try { await browser?.close(); } finally {
      try { await media?.close(); } finally {
        try { await fixture?.close(); } finally { await rm(directory, { recursive: true, force: true }); }
      }
    }
  }
});
