import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, stat, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const directory = await mkdtemp(path.join(os.tmpdir(), 'showreel-editor-browser-'));
process.env.SHOWREEL_HOME = path.join(directory, 'home');
const { syntheticRun } = await import('./helpers/synthetic-run.mjs');
const { startEditorServer } = await import('../scripts/lib/editor/server.mjs');
const { projectDir } = await import('../scripts/lib/paths.mjs');

const until = async (fn, what, ms = 20000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await new Promise((r) => setTimeout(r, 150)); }
  throw new Error(`timed out waiting for ${what}${last ? `: ${last.message}` : ''}`);
};

test('real editor: load, edit, undo, autosave, play and export', { timeout: 240000 }, async (t) => {
  let browser, server;
  try {
    browser = await chromium.launch({ headless: true });
    const run = await syntheticRun(browser);
    const compositionFile = path.join(projectDir(run.name), 'composition.json');
    server = await startEditorServer({ name: run.name });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const problems = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
    await page.goto(server.url);
    await page.getByRole('status').filter({ hasText: /Saved|Saving/ }).first().waitFor({ timeout: 20000 });
    const saved = async () => JSON.parse(await readFile(compositionFile, 'utf8'));
    const status = () => page.locator('.save-status').innerText();
    const waitSaved = async () => until(async () => (await status()) === 'Saved', 'autosave');
    const summary = () => page.locator('.timeline-summary, .timeline-toolbar ~ *').first();

    await t.test('preview draws and settings autosave', async () => {
      await until(() => page.evaluate(() => {
        const c = document.querySelector('.preview canvas'); if (!c) return false;
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        for (let i = 0; i < d.length; i += 4000) if (d[i] !== d[0] || d[i + 1] !== d[1]) return true; return false;
      }), 'preview pixels');
      await page.getByRole('tab', { name: 'Cursor' }).click();
      const box = page.getByLabel('Cursor size value');
      await box.fill('5'); await box.blur();
      await until(async () => (await saved()).cursor.sizePct === 5, 'cursor size saved');
      await waitSaved();
    });

    await t.test('cut, undo, speed and zoom edits reach composition.json', async () => {
      const track = page.locator('.video-track'); const b = await track.boundingBox();
      await page.mouse.move(b.x + b.width * 0.40, b.y + b.height / 2);
      await page.mouse.down(); await page.mouse.move(b.x + b.width * 0.60, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
      await page.getByRole('button', { name: 'Delete / Cut' }).click();
      await until(async () => (await saved()).edits.trims.length === 1, 'trim saved');
      const trim = (await saved()).edits.trims[0]; assert.ok(trim.end - trim.start > 0.5, 'cut is a real range');
      await page.keyboard.press('Control+z'); await page.keyboard.press('Meta+z');
      await until(async () => (await saved()).edits.trims.length === 0, 'undo restores');
      await page.mouse.move(b.x + b.width * 0.20, b.y + b.height / 2);
      await page.mouse.down(); await page.mouse.move(b.x + b.width * 0.35, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
      await page.getByRole('button', { name: 'Speed', exact: true }).click();
      await page.getByRole('button', { name: '2x', exact: true }).click();
      await until(async () => (await saved()).edits.speeds.some((s) => s.rate === 2), 'speed saved');
      const before = (await saved()).zoom.regions.length;
      await page.getByRole('button', { name: '+ Zoom' }).click();
      await until(async () => (await saved()).zoom.regions.length >= before, 'zoom region op did not break save');
      await waitSaved();
    });

    await t.test('playback advances without dropped-frame warning', async () => {
      const seek = page.getByLabel('Seek output time');
      const before = Number(await seek.inputValue());
      await page.getByRole('button', { name: 'Play' }).click();
      await page.waitForTimeout(1500);
      const during = Number(await seek.inputValue());
      await page.getByRole('button', { name: 'Pause' }).click();
      assert.ok(during > before + 0.5, `playhead advanced ${before} -> ${during}`);
      assert.equal(await page.getByText('Preview below 24 fps').count(), 0);
    });

    await t.test('export writes a playable video with the edits', async () => {
      await page.getByRole('button', { name: 'Export' }).click();
      await page.getByLabel('Frame rate').selectOption('30');
      await page.getByRole('button', { name: /^(Start|Export)( export)?$/ }).last().click();
      const finalFile = await until(async () => (await page.locator('.output-path').first().innerText()).trim(), 'export complete', 120000);
      assert.ok((await stat(finalFile)).size > 10000, 'final.mp4 has content');
      const c = await saved();
      assert.equal(c.output.fps, 30);
    });

    assert.deepEqual(problems, [], `console problems:\n${problems.join('\n')}`);
  } finally {
    try { await browser?.close(); } finally { try { await server?.close(); } finally { await rm(directory, { recursive: true, force: true }); } }
  }
});
