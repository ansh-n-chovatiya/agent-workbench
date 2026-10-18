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

    for (const viewport of [{width:1280,height:720},{width:1024,height:640},{width:1440,height:900}]) {
      await t.test(`viewport fits at ${viewport.width}x${viewport.height}`, async () => {
        await page.setViewportSize(viewport);
        await until(() => page.evaluate(() => {
          const stage=document.querySelector('.preview-stage').getBoundingClientRect(),canvas=document.querySelector('.preview canvas').getBoundingClientRect();
          const c=document.querySelector('.preview canvas'); return canvas.width > 0 && canvas.right <= stage.right + 1 && canvas.bottom <= stage.bottom + 1 && Math.abs(canvas.width/canvas.height/(c.width/c.height) - 1) < .01;
        }), 'preview resize');
        const geometry = await page.evaluate(() => {
          const rect = selector => {const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
          const canvas=document.querySelector('.preview canvas');
          return {width:innerWidth,height:innerHeight,scrollHeight:document.scrollingElement.scrollHeight,scrollWidth:document.scrollingElement.scrollWidth,
            timeline:rect('#timeline-root'),settings:rect('.settings-column .settings'),stage:rect('.preview-stage'),canvas:rect('.preview canvas'),aspect:canvas.width/canvas.height};
        });
        assert.ok(geometry.scrollHeight <= geometry.height, JSON.stringify(geometry));
        assert.ok(geometry.scrollWidth <= geometry.width, JSON.stringify(geometry));
        for (const region of [geometry.timeline,geometry.settings]) {
          assert.ok(region.width > 0 && region.height > 0);
          assert.ok(region.x >= 0 && region.y >= 0 && region.right <= geometry.width && region.bottom <= geometry.height, JSON.stringify(region));
        }
        if (viewport.width === 1280 && viewport.height === 720) {
          const splitter = page.getByRole('separator', {name:'Resize timeline'});
          assert.equal(Number(await splitter.getAttribute('aria-valuenow')),216,'default timeline height');
          assert.equal(await page.locator('.hint-card').count(),1,'first-run tip is still visible');
          const tip = await page.locator('.hint-card').boundingBox();
          assert.ok(tip.height <= 33,`tip height: ${tip.height}`);
          for (const name of ['Time','Video','Speed','Zoom','Captions','Cursor']) {
            const label = await page.locator('.track-labels > div').filter({hasText:new RegExp(`^${name}$`)}).boundingBox();
            assert.ok(label && label.x >= geometry.timeline.x && label.y >= geometry.timeline.y &&
              label.x + label.width <= geometry.timeline.right && label.y + label.height <= geometry.timeline.bottom,
              `${name} must fit without scrolling: ${JSON.stringify({label,timeline:geometry.timeline})}`);
            assert.equal(label.height,name === 'Time' ? 20 : 26,`${name} row height`);
          }
          const tabs = await page.getByRole('tab').all();
          const boxes = await Promise.all(tabs.map(tab => tab.boundingBox()));
          assert.ok(boxes.every(box => box && Math.abs(box.y - boxes[0].y) < 1),'settings tabs stay in one row');
          assert.equal(await page.locator('.timeline-toolbar .timeline-summary').count(),1);
          assert.equal(await page.locator('.depth-control > span').first().innerText(),'Depth');
          const depth = page.getByRole('button',{name:'Zoom depth',exact:true});
          const initialDepth = Number((await depth.innerText()).replace('×',''));
          await page.getByRole('button',{name:'Increase zoom depth'}).click();
          await until(async () => Number((await depth.innerText()).replace('×','')) > initialDepth,'depth stepper');
          await page.getByRole('button',{name:'Decrease zoom depth'}).click();
          await until(async () => Number((await depth.innerText()).replace('×','')) === initialDepth,'depth restored');
          assert.equal(await page.locator('.track-placeholder').filter({hasText:'Select a part of the video, then choose Speed'}).count(),1);
          const zoomTrack = page.locator('.timeline-track').nth(2);
          assert.equal(await zoomTrack.locator('.track-placeholder').count(),await zoomTrack.locator('.timeline-block').count() ? 0 : 1);
        }
        const {canvas,stage} = geometry;
        const output=(await saved()).output;
        assert.ok(canvas.x >= stage.x && canvas.y >= stage.y && canvas.right <= stage.right + 1 && canvas.bottom <= stage.bottom + 1);
        assert.ok(Math.abs(canvas.width/canvas.height/(output.width/output.height) - 1) < .01, JSON.stringify(geometry));
        const controls = page.locator('.timeline-toolbar button, .timeline-toolbar input, .transport button, .transport input, .transport [role=slider]');
        assert.ok(await controls.count() > 10);
        for (const control of await controls.all()) {
          if (!await control.isVisible() || await control.getAttribute('aria-hidden') === 'true') continue; // Radix form-bubbling inputs are hidden implementation details.
          assert.match(await control.ariaSnapshot(), /^- (?:button|textbox|spinbutton|slider|checkbox|switch|combobox) "[^"]+"/, await control.evaluate(el => el.outerHTML));
        }
      });
    }
    await page.getByRole('button',{name:'Dismiss editing hint'}).click();
    await t.test('splitter, theme and hint preferences survive reload', async () => {
      const splitter=page.getByRole('separator',{name:'Resize timeline'});
      const before=Number(await splitter.getAttribute('aria-valuenow'));
      const b=await splitter.boundingBox();
      await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y-40);await page.mouse.up();
      const after=Number(await splitter.getAttribute('aria-valuenow'));assert.ok(after > before + 30);
      const themeBefore=await page.locator('html').getAttribute('data-theme');
      await page.getByRole('button',{name:/Switch to .* theme/}).click();
      const themeAfter=await until(async () => { const v=await page.locator('html').getAttribute('data-theme'); return v !== themeBefore ? v : null; },'theme change');
      await page.reload();await until(async () => await page.getByRole('tab',{name:'Cursor',exact:true}).count(), 'editor reload');
      assert.equal(Number(await splitter.getAttribute('aria-valuenow')),after);
      assert.equal(await page.locator('html').getAttribute('data-theme'),themeAfter);
      assert.equal(await page.getByRole('button',{name:'Dismiss editing hint'}).count(),0);
      await splitter.dblclick();assert.equal(Number(await splitter.getAttribute('aria-valuenow')),Math.max(190, Math.round(await page.evaluate(() => innerHeight) * .3)));
    });

    await t.test('cut, undo, speed and zoom edits reach composition.json', async () => {
      const track = page.locator('.video-track'); const b = await track.boundingBox();
      await page.mouse.move(b.x + b.width * 0.40, b.y + b.height / 2);
      await page.mouse.down(); await page.mouse.move(b.x + b.width * 0.60, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
      await page.getByRole('button', { name: 'Cut', exact:true }).click();
      await until(async () => (await saved()).edits.trims.length === 1, 'trim saved');
      const trim = (await saved()).edits.trims[0]; assert.ok(trim.end - trim.start > 0.5, 'cut is a real range');
      await page.keyboard.press('Control+z'); await page.keyboard.press('Meta+z');
      await until(async () => (await saved()).edits.trims.length === 0, 'undo restores');
      await page.mouse.move(b.x + b.width * 0.20, b.y + b.height / 2);
      await page.mouse.down(); await page.mouse.move(b.x + b.width * 0.35, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
      await page.getByRole('button', { name: 'Speed', exact: true }).click();
      await page.getByRole('button', { name: '2x', exact: true }).click();
      await until(async () => (await saved()).edits.speeds.some((s) => s.rate === 2), 'speed saved');
      assert.equal(await page.getByText('Select a part of the video, then choose Speed',{exact:true}).count(),0);
      const before = (await saved()).zoom.regions.filter(z => z.source === 'manual').length;
      const ruler=page.locator('.timeline-ruler'), rulerBox=await ruler.boundingBox();
      await page.mouse.click(rulerBox.x + 3.9 * 80, rulerBox.y + rulerBox.height/2);
      await page.getByRole('button', { name: 'Add zoom', exact:true }).click();
      await until(async () => (await saved()).zoom.regions.filter(z => z.source === 'manual').length === before + 1, 'manual zoom saved');
      assert.equal(await page.getByText('Add zoom to bring a detail closer',{exact:true}).count(),0);
      assert.ok((await saved()).zoom.regions.some(z => z.source === 'manual' && z.tStart >= 3.8));
      await page.getByLabel('Seek output time').focus();await page.keyboard.press('Home');
      await waitSaved();
    });

    await t.test('playback advances without dropped-frame warning', async () => {
      const clock = async () => { const m = (await page.locator('.transport').innerText()).match(/(\d+):(\d+):(\d+):(\d+)\s*\//); return Number(m[3]) + Number(m[4]) / 30 + Number(m[2]) * 60; };
      const ruler = await page.locator('.timeline-ruler').boundingBox(); await page.mouse.click(ruler.x + 140, ruler.y + 8);
      await page.waitForTimeout(300);
      const before = await clock();
      await page.getByRole('button', { name: 'Play' }).click();
      await page.waitForTimeout(1500);
      const during = await clock();
      await page.getByRole('button', { name: 'Pause' }).click();
      assert.ok(during > 0.5 && (during > before + 0.5 || during < before), `playhead advanced ${before} -> ${during}`);
      assert.equal(await page.getByText('Preview below 24 fps').count(), 0);
    });

    await t.test('export writes a playable video with the edits', async () => {
      await page.getByRole('button', { name: 'Export' }).click();
      await page.getByRole('combobox', {name:'Frame rate',exact:true}).click();
      await page.getByRole('option', {name:'30 fps',exact:true}).click();
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
