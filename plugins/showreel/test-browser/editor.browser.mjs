import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, stat, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const directory = await mkdtemp(path.join(os.tmpdir(), 'showreel-editor-browser-'));
process.env.SHOWREEL_HOME = path.join(directory, 'home');
// Task EX: authored only; browser execution is intentionally left to the integration session.
const exportFolder = path.join(directory, 'exports');
process.env.SHOWREEL_OPENER = 'noop';
process.env.SHOWREEL_OPENER_LOG = path.join(directory, 'opener.jsonl');
process.env.SHOWREEL_VOICE_ENGINE = 'fake'; // set before the server starts: the deterministic fake voice engine, never the real model
const { syntheticRun } = await import('./helpers/synthetic-run.mjs');
const { startEditorServer } = await import('../scripts/lib/editor/server.mjs');
const { projectDir } = await import('../scripts/lib/paths.mjs');
const { SETTINGS } = await import('../scripts/lib/compose/settings-schema.mjs');
const { brandDefaults } = await import('../scripts/lib/brand/schema.mjs');
const { encodeWav } = await import('../scripts/lib/voice/wav.mjs');

// On timeout, print what the page looked like (saved edits, clip blocks, console errors) so CI failures explain themselves.
async function diagnose(what) {
  const page = globalThis.__diagPage; if (!page) return '';
  try {
    const info = await page.evaluate(() => ({
      url: location.pathname, scroll: [document.scrollingElement.scrollWidth, document.scrollingElement.scrollHeight],
      clips: [...document.querySelectorAll('.clip-track .clip-block')].map(c => ({ cls: c.className.replace(/\s+/g, ' '), box: (r => [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)])(c.getBoundingClientRect()) })),
      zooms: document.querySelectorAll('.timeline-block.zoom').length, menus: document.querySelectorAll('[role=menu]').length,
      status: document.querySelector('.save-status')?.textContent, notice: document.querySelector('[role=status].timeline-notice, .timeline-message')?.textContent ?? null }));
    return ` | DIAG(${what}) ${JSON.stringify(info)}`;
  } catch (e) { return ` | DIAG failed: ${e.message}`; }
}

const until = async (fn, what, ms = 20000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await new Promise((r) => setTimeout(r, 150)); }
  throw new Error(`timed out waiting for ${what}${last ? `: ${last.message}` : ''}${await diagnose(what)}`);
};

test('real editor: load, edit, undo, autosave, play and export', { timeout: 240000 }, async (t) => {
  let browser, server;
  try {
    // The fake microphone flags let the own-voice recording test run without a real device or a permission prompt.
    browser = await chromium.launch({ headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
    const run = await syntheticRun(browser);
    const compositionFile = path.join(projectDir(run.name), 'composition.json');
    server = await startEditorServer({ name: run.name });
    const exportBase = `http://127.0.0.1:${server.port}`;
    const exportApi = (route, options = {}) => fetch(exportBase + route, { ...options, headers: { Authorization: `Bearer ${server.token}`, ...options.headers } });
    assert.equal((await exportApi('/api/export/folder', { method: 'POST', body: JSON.stringify({ dir: exportFolder }) })).status, 200);
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); globalThis.__diagPage = page;
    // Keep every Audio element the app creates so tests can prove sound really starts (the voice controller never attaches its player to the DOM).
    await page.addInitScript(() => { window.__audios = []; const A = window.Audio; window.Audio = function (...a) { const el = new A(...a); window.__audios.push(el); return el; }; window.Audio.prototype = A.prototype; });
    const problems = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
    await page.goto(server.url);
    await page.getByRole('status').filter({ hasText: /Saved|Saving/ }).first().waitFor({ timeout: 20000 });
    const saved = async () => JSON.parse(await readFile(compositionFile, 'utf8'));
    // R2: authored without launching a browser. Claude/R3 runs these integration checks.
    const topic = async name => {await page.getByRole('navigation',{name:'Editor topics'}).getByRole('button',{name,exact:true}).click();};
    const status = () => page.locator('.save-status').innerText();
    const waitSaved = async () => until(async () => (await status()) === 'Saved', 'autosave');
    
    await t.test('preview draws and settings autosave', async () => {
      await until(() => page.evaluate(() => {
        const c = document.querySelector('.preview canvas'); if (!c) return false;
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        for (let i = 0; i < d.length; i += 4000) if (d[i] !== d[0] || d[i + 1] !== d[1]) return true; return false;
      }), 'preview pixels');
      await topic('Cursor');
      const box = page.getByLabel('Cursor size value');
      await box.fill('5'); await box.blur();
      await until(async () => (await saved()).cursor.sizePct === 5, 'cursor size saved');
      await waitSaved();
    });

    await t.test('rail navigation keeps one topic panel and search; audio contains Voice and Music',async()=>{
      for(const name of ['Zoom','Cursor','Appearance','Captions','Audio','Brand','Export settings']) {
        await topic(name);
        assert.equal(await page.locator('.settings-column > aside').count(),1);
        assert.equal(await page.getByRole('searchbox',{name:'Search settings'}).count(),1);
        assert.equal(await page.locator('.editor-rail').getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true');
        if(name==='Audio') for(const tab of ['Voice','Music']) await page.getByRole('tab',{name:tab,exact:true}).click();
      }
      await topic('Cursor');
    });

    await t.test('global search finds settings across topics with Go to, Cmd/Ctrl+K focuses it, and the empty state offers suggestions', async () => {
      await topic('Cursor');
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');
      const box = page.getByRole('searchbox',{name:'Search settings'});
      await until(() => box.evaluate(el => document.activeElement === el), 'Cmd/Ctrl+K focuses the search field');
      await box.fill('trigger');
      const results = page.locator('.search-results');
      await results.waitFor();
      assert.equal(await results.locator('mark').first().innerText(), 'Trigger', 'matched text is highlighted');
      await box.fill('typing');
      assert.equal(await results.getByRole('group',{name:'Triggers'}).count(), 1, 'keywords find Triggers too');
      assert.equal(await results.locator('.sgroup').first().getAttribute('aria-label'), 'Zoom', 'grouped by topic');
      assert.equal(await results.getByRole('group',{name:'Triggers'}).count(), 1, 'the real control renders inside the result');
      await box.fill('xyzzy');
      await page.getByText('No settings match “xyzzy”').waitFor();
      assert.equal(await page.getByRole('group',{name:'Suggested settings'}).getByRole('button').count(), 3);
      await page.getByRole('button',{name:'Cursor size',exact:true}).click();
      assert.equal(await box.inputValue(), 'Cursor size');
      await page.getByRole('button',{name:'Clear search',exact:true}).count();
      await box.fill('trigger');
      await page.getByRole('button',{name:'Go to Triggers'}).click();
      await until(async () => (await page.locator('.editor-rail').getByRole('button',{name:'Zoom',exact:true}).getAttribute('aria-pressed')) === 'true', 'Go to switches the topic');
      assert.equal(await box.inputValue(), '');
      await page.locator('[data-path="zoom.onlyKinds"].flash').waitFor();
      await box.fill('nothing-here'); await page.getByRole('button',{name:'Clear search',exact:true}).click(); assert.equal(await box.inputValue(), '');
    });
    await t.test('Zoom triggers chips write zoom.onlyKinds and keep at least one trigger', async () => {
      await topic('Zoom');
      const chips = page.getByRole('group',{name:'Triggers'});
      await chips.getByRole('button',{name:'Typing',exact:true}).click();
      await until(async () => JSON.stringify((await saved()).zoom.onlyKinds) === '["click"]', 'typing trigger removed');
      await chips.getByRole('button',{name:'Clicks',exact:true}).click();
      await page.waitForTimeout(300);
      assert.equal(await chips.getByRole('button',{name:'Clicks',exact:true}).getAttribute('aria-pressed'), 'true', 'the last trigger cannot be removed');
      await chips.getByRole('button',{name:'Typing',exact:true}).click();
      await until(async () => JSON.stringify((await saved()).zoom.onlyKinds) === '["click","fill"]', 'typing trigger restored');
      assert.equal(await page.locator('.topic-panel textarea, .topic-panel input[type=text]').count(), 0, 'no raw JSON box');
    });
    await t.test('output size presets set width and height; Width/Height live under Advanced as steppers', async () => {
      await topic('Export settings');
      const size = page.getByRole('group',{name:'Output size'});
      await size.getByRole('button',{name:'720p',exact:true}).click();
      await until(async () => { const o=(await saved()).output; return o.width===1280 && o.height===720; }, '720p saved');
      await size.getByRole('button',{name:'4K',exact:true}).click();
      await until(async () => { const o=(await saved()).output; return o.width===3840 && o.height===2160; }, '4K saved');
      await size.getByRole('button',{name:'1080p',exact:true}).click();
      await until(async () => (await saved()).output.width===1920, '1080p saved');
      assert.equal(await page.getByRole('slider',{name:'Width'}).count(), 0, 'width is no longer a slider');
      await page.locator('.scard[data-card=output] .scard-adv').click();
      const width = page.getByRole('spinbutton',{name:'Width',exact:true});
      await width.fill('1500'); await width.blur();
      await until(async () => { const o=(await saved()).output; return o.width===1500 && o.preset===null; }, 'custom width clears the format preset');
      assert.equal(await size.getByRole('button',{name:'Custom',exact:true}).getAttribute('aria-pressed'), 'true');
      await size.getByRole('button',{name:'1080p',exact:true}).click();
      await until(async () => (await saved()).output.width===1920, 'back to 1080p');
    });
    await t.test('background image upload stores the file under assets/ and shows a thumbnail with Replace and Remove', async () => {
      await topic('Appearance');
      await page.getByRole('group',{name:'Background',exact:true}).getByRole('button',{name:'Image',exact:true}).click();
      await page.getByText('Choose an image to use it as the background.').waitFor();
      await waitSaved(); assert.notEqual((await saved()).frame.background.type, 'image', 'Image without a file is never saved as an invalid composition');
      const png = path.join(directory, 'backdrop.png');
      await writeFile(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR4nGP4z8DwHwyBNAMDiAYAVqoH/4hVzYwAAAAASUVORK5CYII=', 'base64'));
      await page.getByLabel('Choose Background image file').setInputFiles(png);
      await until(async () => { const b=(await saved()).frame.background; return b.type==='image' && /^assets\/backdrop-[0-9a-f]{8}\.png$/.test(b.image ?? ''); }, 'uploaded path and image type saved together');
      const stored = (await saved()).frame.background.image;
      assert.ok((await stat(path.join(projectDir(run.name), stored))).size > 0, 'file written into the project');
      const thumb = page.locator('.img-thumb');
      await thumb.waitFor();
      assert.ok(await thumb.evaluate(img => img.complete && img.naturalWidth > 0), 'thumbnail loaded');
      assert.equal(await page.getByRole('button',{name:'Replace Background image'}).count(), 1);
      assert.equal(await page.locator('input[placeholder*="relative/path"]').count(), 0, 'no bare path box');
      await page.getByRole('button',{name:'Remove Background image'}).click();
      await until(async () => { const b=(await saved()).frame.background; return b.image === null && b.type === 'theme'; }, 'removing the image falls back to the theme background');
    });
    await t.test('info tooltips open above their row and never cover it; the settings panel resizes and remembers its width', async () => {
      await topic('Cursor');
      await page.mouse.move(900, 300); await page.waitForTimeout(400); // park the pointer so no rail tooltip is open
      const tip = page.getByRole('button',{name:'About Cursor size'});
      await tip.focus();
      const tooltip = page.getByRole('tooltip');
      await tooltip.waitFor({ timeout: 5000 }).catch(async () => { await tip.hover(); await tooltip.waitFor({ timeout: 5000 }); }).catch(async error => {
        const info = await tip.evaluate(el => ({ state: el.parentElement?.dataset.state, parent: el.parentElement?.outerHTML.slice(0, 200), tooltips: document.querySelectorAll('[role=tooltip]').length, active: document.activeElement?.outerHTML.slice(0, 120), at: document.elementFromPoint(el.getBoundingClientRect().x + 4, el.getBoundingClientRect().y + 4)?.outerHTML.slice(0, 120) }));
        await page.screenshot({ path: path.join(os.tmpdir(), 'showreel-tooltip-failure.png') });
        throw new Error(`${error.message}\n${JSON.stringify(info)}`);
      });
      const [t, row] = await Promise.all([tooltip.boundingBox(), page.locator('[data-path="cursor.sizePct"]').boundingBox()]);
      assert.ok(t.y + t.height <= row.y + 1, `tooltip (${t.y}-${t.y+t.height}) sits above the row (${row.y})`);
      await page.keyboard.press('Escape');
      const handle = page.getByRole('separator',{name:'Resize settings panel'});
      const h = await handle.boundingBox();
      await page.mouse.move(h.x+h.width/2,h.y+h.height/2); await page.mouse.down(); await page.mouse.move(h.x+h.width/2+120,h.y+h.height/2,{steps:6}); await page.mouse.up();
      await until(async () => { const w=Math.round((await page.locator('.settings-column').boundingBox()).width); return w >= 510 && w <= 530; }, 'panel grew by about 120px');
      const h2 = await handle.boundingBox();
      await page.mouse.move(h2.x+h2.width/2,h2.y+h2.height/2); await page.mouse.down(); await page.mouse.move(h2.x-400,h2.y+h2.height/2,{steps:6}); await page.mouse.up();
      await until(async () => Math.round((await page.locator('.settings-column').boundingBox()).width) === 320, 'panel clamps at 320');
      for (const name of ['Audio','Appearance','Brand']) { await topic(name); assert.ok(await page.locator('.settings-column').evaluate(col => { const right = col.getBoundingClientRect().right + 1; return ![...col.querySelectorAll('*')].some(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > right; }); }), `${name} fits at 320`); }
      await page.reload(); await until(async () => await page.getByRole('navigation',{name:'Editor topics'}).getByRole('button',{name:'Cursor',exact:true}).count(), 'editor reload');
      assert.equal(Math.round((await page.locator('.settings-column').boundingBox()).width), 320, 'width remembered');
      await handle.dblclick();
      await until(async () => Math.round((await page.locator('.settings-column').boundingBox()).width) === 400, 'double-click resets');
      await topic('Cursor');
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
          // R1 simple timeline assertions: authored without launching a browser; Claude/R3 runs these.
          for (const name of ['Time','Clip','Zoom']) assert.equal(await page.locator('.track-labels > div').filter({hasText:new RegExp(`^${name}$`)}).count(),1);
          assert.equal(await page.locator('.editor-rail button').count(),7,'seven topics, Overlays is gone');
          assert.equal(await page.locator('.editor-rail').getByRole('button',{name:/overlay/i}).count(),0);
          const rail=await page.locator('.editor-rail').boundingBox();assert.equal(Math.round(rail.width),56);
          const panel=await page.locator('.settings-column').boundingBox();assert.equal(Math.round(panel.width),400,'default panel width');
          assert.equal(await page.getByRole('button',{name:'Increase zoom depth'}).count(),0);
          assert.equal(await page.locator('.timeline-toolbar .result-chip').count(),1);
        }
        assert.ok(await page.locator('.editor-rail').evaluate(el => el.scrollHeight <= el.clientHeight + 1), `rail never scrolls at ${viewport.height}px`);
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
      await page.reload();await until(async () => await page.getByRole('navigation',{name:'Editor topics'}).getByRole('button',{name:'Cursor',exact:true}).count(), 'editor reload');
      assert.equal(Number(await splitter.getAttribute('aria-valuenow')),after);
      assert.equal(await page.locator('html').getAttribute('data-theme'),themeAfter);
      assert.equal(await page.getByRole('button',{name:'Dismiss editing hint'}).count(),0);
      await splitter.dblclick();assert.equal(Number(await splitter.getAttribute('aria-valuenow')),Math.max(190, Math.round(await page.evaluate(() => innerHeight) * .3)));
    });

    // Phase 7 subtests are authored here; Task E does not launch browsers.
    await t.test('theme cards switch the saved theme and draw mini previews', async () => {
      await topic('Appearance');
      for(const theme of ['dark','bold','clean']) {
        const card=page.getByRole('button',{name:`Theme ${theme}`,exact:true});await card.click();
        await until(async()=> (await saved()).theme===theme,`${theme} saved`);
        assert.equal(await card.getAttribute('aria-pressed'),'true');
        await until(()=>card.locator('canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,160,90).data.some((v,i)=>i%4===3&&v>0)),'theme preview pixels');
      }
    });
    await t.test('Brand lists a generated kit and apply writes brief.json', async () => {
      const brandDir=path.join(directory,'home','brands','editor-test');await mkdir(brandDir,{recursive:true});
      await writeFile(path.join(brandDir,'brand.json'),JSON.stringify(brandDefaults('editor-test')));
      await topic('Brand');
      await page.getByRole('combobox',{name:'Applied brand'}).click();
      await page.getByRole('option',{name:'editor-test',exact:true}).click();
      const briefFile=path.join(projectDir(run.name),'brief.json');
      await until(async()=>JSON.parse(await readFile(briefFile,'utf8')).brand==='editor-test','applied brand');
      await page.getByRole('region',{name:'Brand summary'}).waitFor();
      await page.getByRole('combobox',{name:'Applied brand'}).click();await page.getByRole('option',{name:'No brand',exact:true}).click();
      await until(async()=>!JSON.parse(await readFile(briefFile,'utf8')).brand,'brand cleared');
    });
    await t.test('Format selects vertical and square and panels fit supported viewports', async () => {
      await topic('Export settings');
      for(const [label,value] of [['Vertical','vertical'],['Square','square'],['Landscape','landscape']]) {
        await page.locator('.topbar').getByRole('button',{name:label,exact:true}).click();await until(async()=>(await saved()).output.preset===value,`${value} format`);
      }
      for(const viewport of [{width:1280,height:720},{width:1024,height:640}]) {
        await page.setViewportSize(viewport);
        for(const tab of ['Appearance','Brand']) {
          await topic(tab);
          assert.ok(await page.evaluate(()=>document.scrollingElement.scrollWidth<=innerWidth&&document.scrollingElement.scrollHeight<=innerHeight),'page fits with Phase 7 panels');
        }
      }
      await page.setViewportSize({width:1440,height:900});await topic('Cursor');
    });

    // R1: NOT BROWSER-VERIFIED. Claude/R3 must run these after integrating R2.
    await t.test('scissors split, clip speed, Delete, restore, zoom edge and Add Layer persist', async () => {
      // Isolate source-time clip/zoom behavior from the generated automatic zooms/captions.
      const initial = await saved();
      initial.edits = {...initial.edits,splits:[],speeds:[],trims:[],mutes:[]};
      initial.zoom = {...initial.zoom,regions:[],autoSuggest:false};initial.captions.cues=[];
      await page.evaluate(async composition => {
        const r = await fetch('/api/composition',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(composition)});
        if(!r.ok)throw new Error(await r.text());
      },initial);
      await page.reload();await page.locator('.clip-track').waitFor();
      // The timeline opens fitted to the window; its lanes publish the current pixels-per-second scale.
      const scale = async () => Number(await page.locator('.timeline-lanes').getAttribute('data-scale'));
      const seekSource = async seconds => {
        const ruler = page.locator('.timeline-ruler');
        await page.locator('.timeline-grid').evaluate(el => {el.scrollLeft=0;el.scrollTop=0;});
        const b = await ruler.boundingBox();
        await page.mouse.click(b.x+seconds*await scale(),b.y+b.height/2);
      };
      for(const seconds of [1,2]) {
        await seekSource(seconds);await page.getByRole('button',{name:'Split',exact:true}).click();
        await until(async () => (await saved()).edits.splits.length === seconds,'split saved');
      }
      assert.equal(await page.locator('.clip-track .clip-block').count(),3);
      await page.locator('.clip-track .clip-block').nth(1).locator('button').first().click();
      assert.equal(await page.getByRole('dialog',{name:'Change speed'}).count(),0,'clip selection opens no popover');
      const speed = page.getByRole('group',{name:'Clip speed',exact:true}).getByRole('button',{name:'4x',exact:true});
      await page.getByRole('complementary',{name:'Clip settings'}).waitFor();
      await speed.click();
      await until(async () => (await saved()).edits.speeds.some(r => r.rate === 4),'clip 4x saved');
      assert.equal(await page.locator('.clip-track .clip-block').nth(1).getByText('4x',{exact:true}).count(),1);
      await page.getByRole('button',{name:'Delete Clip',exact:true}).click();
      await until(async () => (await saved()).edits.trims.length === 1,'Delete clip saved');
      const gap = page.locator('.clip-track .clip-block.deleted');await gap.locator('button').first().focus();
      await gap.getByRole('button',{name:/Restore clip/}).click();
      await until(async () => (await saved()).edits.trims.length === 0,'clip restored');
      await seekSource(.2);await page.getByRole('button',{name:'Add zoom',exact:true}).click();
      await until(async () => (await saved()).zoom.regions.length === 1,'magnifier zoom saved');
      const zoom = (await saved()).zoom.regions[0], edge = page.locator('.zoom-track').getByRole('button',{name:'Resize zoom end',exact:true});
      await edge.scrollIntoViewIfNeeded();await page.locator('.zoom-track .timeline-block').hover();
      const eb = await edge.boundingBox();
      await page.mouse.move(eb.x+eb.width/2,eb.y+eb.height/2);await page.mouse.down();
      await page.mouse.move(eb.x+eb.width/2+24,eb.y+eb.height/2,{steps:8});await page.mouse.up();
      await until(async () => (await saved()).zoom.regions[0].tEnd > zoom.tEnd,'zoom edge resized');
      await page.getByRole('button',{name:'Undo',exact:true}).click();
      await until(async () => (await saved()).zoom.regions[0].tEnd === zoom.tEnd,'one undo reverses one drag');
      assert.equal(await page.locator('.caption-track').count(),0);
      // Add Layer only shows the Captions row (with its hint); a double-click on the row adds the first caption.
      await page.getByRole('button',{name:'Add Layer',exact:true}).click();await page.getByRole('group',{name:'Layers to add'}).getByRole('button',{name:'Captions',exact:true}).click();
      await page.locator('.caption-track').waitFor();
      assert.equal((await saved()).captions.cues.length,0,'adding the layer adds no caption by itself');
      const captionRow = await page.locator('.caption-track').boundingBox();
      await page.mouse.dblclick(captionRow.x+3.2*await scale(),captionRow.y+captionRow.height/2);
      await until(async () => (await saved()).captions.cues.length === 1,'caption added by double-click');
      await page.getByRole('button',{name:'Save caption',exact:true}).click();
      await waitSaved();
    });

    await t.test('zoom contextual panel, depth, Auto/Manual, preview drag and one-step undo',async()=>{
      const region=(await saved()).zoom.regions[0];assert.ok(region);
      const ruler=page.locator('.timeline-ruler');
      await page.locator('.timeline-grid').evaluate(el=>{el.scrollLeft=0;el.scrollTop=0;});
      // Select a source time before the spring settles so the crop corners remain visible.
      const scale=Number(await page.locator('.timeline-lanes').getAttribute('data-scale'));
      const r=await ruler.boundingBox();await page.mouse.click(r.x+(region.tStart+.05)*scale,r.y+r.height/2);
      const block=page.locator('.zoom-track .timeline-block').first();await block.click();
      const panel=page.getByRole('complementary',{name:'Zoom settings'});await panel.waitFor();
      assert.equal(await panel.getByRole('searchbox').count(),0,'selection panels do not show search');
      await page.getByTestId('zoom-box').waitFor();
      await panel.getByRole('button',{name:'Depth 2.2x',exact:true}).click();
      await until(async()=>(await saved()).zoom.regions.find(z=>z.id===region.id)?.depth===2.2,'depth chip saved');
      await panel.getByRole('button',{name:'Auto',exact:true}).click();
      await until(async()=>(await saved()).zoom.regions.find(z=>z.id===region.id)?.source==='auto','Auto saved');
      assert.equal(await page.locator('.zoom-box.auto').count(),1);assert.equal(await page.locator('.zoom-handle').count(),0);
      await panel.getByRole('button',{name:'Manual',exact:true}).click();
      await until(async()=>(await saved()).zoom.regions.find(z=>z.id===region.id)?.source==='manual','Manual saved');
      assert.equal(await page.locator('.zoom-handle').count(),4);
      const before=(await saved()).zoom.regions.find(z=>z.id===region.id),box=await page.getByTestId('zoom-box').boundingBox();
      const frame=await page.locator('.preview-canvas-wrap').boundingBox();
      // Use the visible part of the box; Auto may have moved the crop towards an edge.
      const x=Math.max(frame.x+16,Math.min(frame.x+frame.width-16,box.x+box.width/2));
      const y=Math.max(frame.y+16,Math.min(frame.y+frame.height-16,box.y+box.height/2));
      await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+18,y+12,{steps:8});await page.mouse.up();
      await until(async()=>JSON.stringify((await saved()).zoom.regions.find(z=>z.id===region.id).keyframes)!==JSON.stringify(before.keyframes),'Manual drag keyframes saved');
      await page.getByRole('button',{name:'Undo',exact:true}).click();
      await until(async()=>JSON.stringify((await saved()).zoom.regions.find(z=>z.id===region.id).keyframes)===JSON.stringify(before.keyframes),'one undo restores the complete drag');
      await page.keyboard.press('Escape');assert.equal(await page.getByTestId('zoom-box').count(),0);
      await block.click();await panel.waitFor();
      const empty=await page.locator('.zoom-track').boundingBox();await page.mouse.click(empty.x+empty.width-8,empty.y+empty.height/2);
      assert.equal(await page.getByTestId('zoom-box').count(),0,'empty timeline clears selection');
      await topic('Cursor');
    });

    await t.test('playback advances without dropped-frame warning', async () => {
      const clock = async () => { const m = (await page.getByLabel('Current time',{exact:true}).innerText()).match(/(\d+):(\d+):(\d+):(\d+)/); return Number(m[3]) + Number(m[4]) / 30 + Number(m[2]) * 60; };
      const ruler = await page.locator('.timeline-ruler').boundingBox(); await page.mouse.click(ruler.x + 140, ruler.y + 8);
      await page.waitForTimeout(300);
      const before = await clock();
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await page.waitForTimeout(1500);
      const during = await clock();
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      assert.ok(during > 0.5 && (during > before + 0.5 || during < before), `playhead advanced ${before} -> ${during}`);
      assert.equal(await page.getByText('Preview below 24 fps').count(), 0);
    });

    await t.test('export writes a playable video with the edits', async () => {
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      await page.getByRole('combobox', {name:'Frame rate',exact:true}).click();
      await page.getByRole('option', {name:'30 fps',exact:true}).click();
      await page.getByRole('button', { name: /^(Start|Export)( export)?$/ }).last().click();
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('dialog').count(), 1, 'Escape cannot close the active export');
      await page.getByRole('heading', { name: 'Your video is ready' }).waitFor({ timeout: 120000 });
      const result = (await (await exportApi('/api/export/settings')).json()).lastExport;
      const finalFile = result.finalFile;
      assert.equal(path.dirname(finalFile), exportFolder);
      assert.match(path.basename(finalFile), new RegExp(`^${run.name} \\d{4}-\\d{2}-\\d{2} \\d{2}\\.\\d{2}.*\\.mp4$`));
      assert.ok((await stat(finalFile)).size > 10000, 'exported video has content');
      for (const ext of ['srt', 'vtt']) assert.ok((await stat(finalFile.replace(/\.mp4$/, `.${ext}`))).isFile());
      assert.match(await readFile(finalFile.replace(/\.mp4$/, '.vtt'), 'utf8'), /^WEBVTT/);
      assert.equal(JSON.parse(await readFile(path.join(result.renderDir, 'export.json'), 'utf8')).finalFile, finalFile);
      assert.ok((await stat(path.join(result.renderDir, 'poster.png'))).size > 0);
      assert.equal((await page.locator('.export-file-name').innerText()).trim(), result.fileName);
      await page.getByRole('button', { name: 'Show in folder', exact: true }).click();
      await page.getByRole('button', { name: 'Open video', exact: true }).click();
      const calls = await until(async () => { const lines = (await readFile(process.env.SHOWREEL_OPENER_LOG, 'utf8')).trim().split('\n').map(JSON.parse); return lines.length >= 2 ? lines : null; }, 'injected opener calls');
      assert.deepEqual(calls.slice(-2), [{ action: 'reveal', file: finalFile }, { action: 'open', file: finalFile }]);
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: exportBase });
      await page.getByRole('button', { name: 'Copy path', exact: true }).click();
      await page.getByRole('button', { name: 'Copied', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), finalFile);
      assert.equal(await page.getByRole('link', { name: 'Download a copy' }).getAttribute('href'), '/api/export/download');
      assert.equal(await page.getByRole('button', { name: 'Export again', exact: true }).count(), 1);
      const c = await saved();
      assert.equal(c.output.fps, 30);
    });


    // ---- Phase 6 audio UI (written without a browser available: first run of these is by the integration session) ----
    await t.test('Voice and Music tabs, script rows, fake-engine generation, timeline tracks and every audio setting', async () => {
      await page.keyboard.press('Escape'); // the export dialog from the previous test stays open
      await until(async () => (await page.getByRole('dialog').count()) === 0, 'export dialog closed');
      await page.setViewportSize({ width: 1440, height: 900 });
      await topic('Audio');
      const voiceTab = page.getByRole('tab', { name: 'Voice', exact: true }), musicTab = page.getByRole('tab', { name: 'Music', exact: true });
      assert.equal(await voiceTab.count(), 1, 'Voice tab'); assert.equal(await musicTab.count(), 1, 'Music tab');
      await voiceTab.click();
      const rows = page.locator('.script-row');
      assert.equal(await rows.count(), run.storyboard.steps.length, 'one script row per step');
      await page.getByRole('combobox', { name: 'Voice', exact: true }).waitFor(); // the fake engine counts as installed
      assert.equal(await page.getByText('showreel voice install --yes').count(), 0, 'no install card when the engine is available');
      const narration = page.getByLabel('Narration for Open the report');
      await narration.fill('Open the report and check the totals.');
      await until(async () => (await saved()).audio?.narration?.steps?.s1?.text === 'Open the report and check the totals.', 'narration text saved');
      assert.equal((await rows.first().locator('.status').innerText()).trim(), 'Not generated');
      assert.match(await page.locator('.counter').first().innerText(), /^\d+\/280$/);
      const voiceSwitch = page.getByRole('switch', { name: 'Voice-over', exact: true });
      if (await voiceSwitch.getAttribute('aria-checked') !== 'true') await voiceSwitch.click();
      await until(async () => (await saved()).audio?.voice?.enabled === true, 'voice-over switched on');
      await page.getByRole('button', { name: /^Generate voice, Open the report/ }).click();
      await until(async () => (await rows.first().locator('.status').innerText()).trim() === 'Ready', 'voice-over generated', 30000);
      const index = JSON.parse(await readFile(path.join(projectDir(run.name), 'voice', 'clips.json'), 'utf8'));
      assert.ok(index.steps.s1 && index.clips[index.steps.s1].source === 'tts', 'clip index written by the server');
      await page.locator('.timeline-track.voice-track .voice-block').first().waitFor({ timeout: 10000 });
      assert.match(await page.locator('.voice-block').first().innerText(), /Open the report/);
      await waitSaved();
      // Editing the words makes the clip stale (undo-able through the normal history).
      await narration.fill('A different sentence now.');
      await until(async () => (await rows.first().locator('.status').innerText()).trim() === 'Needs update', 'stale after editing');
      // A voice sample is generated on demand and then really plays (the shared Audio element starts and advances).
      const playing = () => page.evaluate(() => window.__audios.some(a => !a.paused && a.currentTime > 0.15 && !a.error));
      await page.getByRole('button', { name: 'Play sample', exact: true }).click();
      await until(async () => stat(path.join(directory, 'home', 'voice-samples', 'af_heart.wav')).then(() => true, () => false), 'sample file', 30000);
      await until(playing, 'sample audio playing', 15000);
      assert.equal(await page.getByRole('button', { name: 'Stop sample', exact: true }).getAttribute('aria-pressed'), 'true', 'playing state is unmistakable');
      await page.getByRole('button', { name: 'Stop sample', exact: true }).click();
      await until(() => page.evaluate(() => window.__audios.every(a => a.paused)), 'sample stopped');
      await page.getByText('Browse all voices').click();
      await page.getByRole('button', { name: 'Play sample of Aoede' }).click();
      await until(async () => (await page.getByRole('button', { name: 'Stop sample of Aoede' }).count()) === 1 && await page.evaluate(() => window.__audios.some(a => !a.paused && a.src.includes('af_aoede') && a.currentTime > 0.15)), 'browse-list sample plays', 30000);
      await page.getByRole('button', { name: 'Stop sample of Aoede' }).click();
      assert.deepEqual(await page.locator('.voice-list .error').allInnerTexts(), []);
      await page.getByRole('button', { name: /^Play clip, Open the report/ }).click();
      await until(() => page.evaluate(() => window.__audios.some(a => !a.paused && a.src.includes('/media/voice/') && a.currentTime > 0.15)), 'step clip plays', 15000);
      await page.getByRole('button', { name: /^Stop clip, Open the report/ }).click();
      // Mute toggle writes composition.json.
      await page.getByRole('button', { name: /^Mute Open the report/ }).click();
      await until(async () => (await saved()).audio?.narration?.steps?.s1?.muted === true, 'muted saved');
      assert.equal((await rows.first().locator('.status').innerText()).trim(), 'Muted');
      await page.getByRole('button', { name: /^Mute Open the report/ }).click();
      await until(async () => (await saved()).audio?.narration?.steps?.s1?.muted === undefined, 'unmuted saved');
      // Import a WAV file for the step.
      const wavFile = path.join(directory, 'import.wav');
      await writeFile(wavFile, encodeWav(Float32Array.from({ length: 24000 }, (_, i) => 0.3 * Math.sin(i / 12)), 24000));
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: /^Import file, / }).first().click();
      await (await chooser).setFiles(wavFile);
      await until(async () => (await rows.first().locator('.status').innerText()).trim() === 'Imported file', 'imported file used', 30000);
      // Record my own voice with the fake microphone.
      await page.getByRole('button', { name: /^Record my voice, Open the report/ }).click();
      await page.getByRole('checkbox', { name: '3-2-1 countdown' }).click();
      await page.getByRole('button', { name: 'Start recording' }).click();
      await page.getByRole('meter', { name: 'Microphone level' }).waitFor({ timeout: 10000 });
      await page.waitForTimeout(1200);
      await page.getByRole('button', { name: 'Stop', exact: true }).click();
      await page.getByRole('button', { name: 'Keep recording' }).click();
      await until(async () => (await rows.first().locator('.status').innerText()).trim() === 'Your recording', 'own recording used', 30000);
      // Remove the clip again.
      await page.getByRole('button', { name: /^Remove clip, Open the report/ }).click();
      await until(async () => (await rows.first().locator('.status').innerText()).trim() === 'Not generated', 'clip removed');
      // Every audio setting is reachable in the Voice or Music panel.
      await voiceTab.click();
      const narrator = page.getByRole('region', { name: 'Narrator', exact: true });
      for (const [setting, label] of [['audio.tighten.enabled', 'Trim waiting after narration'], ['audio.tighten.pauseSec', 'Pause after each sentence']]) {
        const control = narrator.locator(`.scard-rows:not(.scard-rows-advanced) [id="setting-${setting}"]`);
        // Slider thumbs are zero-size in this design, so presence in the primary (not Advanced) rows is the check; the visible label proves it renders.
        await control.waitFor({ state: 'attached' });
        assert.equal(await control.count(), 1, `${label} is a primary Narrator control`);
        assert.equal(await narrator.getByText(label, { exact: true }).count(), 1, `${label} label`);
      }
      const inVoice = s => s.path.startsWith('audio.voice.') || s.path.startsWith('audio.tighten.');
      const missing = [];
      for (const [tab, wanted] of [['Voice', SETTINGS.filter(s => s.group === 'audio' && inVoice(s))], ['Music', SETTINGS.filter(s => s.group === 'audio' && !inVoice(s))]]) {
        await page.getByRole('tab', { name: tab, exact: true }).click();
        for (const toggle of await page.locator('.scard-adv, .scard-toggle').all()) if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click(); // Advanced rows are collapsed by default
        for (const setting of wanted) if (await page.locator(`[id="setting-${setting.path}"]`).count() !== 1) missing.push(setting.path);
      }
      assert.deepEqual(missing, [], 'settings missing from the audio panels');
      // Music: upload a file, see the bar on the timeline, then remove it.
      const musicFile = path.join(directory, 'loop.wav');
      await writeFile(musicFile, encodeWav(Float32Array.from({ length: 96000 }, (_, i) => 0.2 * Math.sin(i / 30)), 48000));
      await page.getByLabel('Choose a music file').setInputFiles(musicFile);
      await until(async () => /^music\/loop-[0-9a-f]{8}\.wav$/.test((await saved()).audio?.music?.file ?? ''), 'music file saved');
      assert.equal((await saved()).audio.music.enabled, true);
      await page.locator('.music-bar').waitFor({ timeout: 10000 });
      await page.getByText('Last measured:').waitFor();
      await page.getByRole('button', { name: 'Remove music' }).click();
      await until(async () => (await saved()).audio?.music?.file === null, 'music removed');
      await topic('Cursor');
    });

    await t.test('timeline keeps its toolbar and ruler while the tracks scroll, with all existing tracks visible at 1280x720', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      const grid = page.locator('.timeline-grid');
      assert.ok(await grid.evaluate(el => el.scrollHeight >= el.clientHeight), 'tracks area may scroll');
      for (const name of ['Time', 'Clip', 'Zoom', 'Captions']) assert.equal(await page.locator('.track-labels > div').filter({ hasText: new RegExp(`^${name}$`) }).count(), 1, name);
      assert.equal(await page.locator('.track-labels > div').filter({hasText:/^Music$/}).count(),0,'removed music hides its layer');
      const toolbarBefore = await page.locator('.timeline-toolbar').boundingBox(), rulerBefore = await page.locator('.timeline-ruler').boundingBox();
      await grid.evaluate(el => { el.scrollTop = el.scrollHeight; });
      await page.waitForTimeout(100);
      const toolbarAfter = await page.locator('.timeline-toolbar').boundingBox(), rulerAfter = await page.locator('.timeline-ruler').boundingBox();
      assert.equal(toolbarAfter.y, toolbarBefore.y, 'toolbar stays');
      assert.ok(Math.abs(rulerAfter.y - rulerBefore.y) < 1.5, `ruler stays: ${rulerBefore.y} -> ${rulerAfter.y}`);
    });

    await t.test('export dialog lists voice readiness and reports the measured loudness', { timeout: 200000 }, async () => {
      assert.equal((await exportApi('/api/export/folder', { method: 'POST', body: JSON.stringify({ dir: exportFolder }) })).status, 200);
      await topic('Audio');
      await page.getByRole('tab', { name: 'Voice', exact: true }).click();
      const rows = page.locator('.script-row');
      await page.getByRole('button', { name: /^Generate voice, Open the report/ }).click();
      await until(async () => (await rows.first().locator('.status').innerText()).trim() === 'Ready', 'voice-over generated again', 30000);
      await topic('Cursor');
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      await page.getByRole('list', { name: 'Voice-over checklist' }).waitFor({ timeout: 10000 });
      assert.match(await page.getByRole('list', { name: 'Voice-over checklist' }).innerText(), /Voice-over: 1 of 1 steps ready/);
      const start = page.getByRole('button', { name: /^(Start|Export)( export)?$/ }).last();
      await until(() => start.isEnabled(), 'Start export enabled once the voice job has finished', 10000);
      await start.click();
      await page.locator('.loudness-result').first().waitFor({ timeout: 150000 });
      assert.match((await page.locator('.loudness-result').first().innerText()).trim(), /LUFS, true peak .* dBTP/);
      await page.keyboard.press('Escape');
    });

    assert.deepEqual(problems, [], `console problems:\n${problems.join('\n')}`);
  } finally {
    try { await browser?.close(); } finally { try { await server?.close(); } finally { await rm(directory, { recursive: true, force: true }); } }
  }
});
