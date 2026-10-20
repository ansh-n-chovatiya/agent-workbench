import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

// Timeline flows against a synthetic recording in a temporary SHOWREEL_HOME (never a real project).
const directory = await mkdtemp(path.join(os.tmpdir(),'showreel-timeline-browser-'));
process.env.SHOWREEL_HOME = path.join(directory,'home');
process.env.SHOWREEL_VOICE_ENGINE = 'fake';
const { syntheticRun } = await import('./helpers/synthetic-run.mjs');
const { startEditorServer } = await import('../scripts/lib/editor/server.mjs');
const { projectDir } = await import('../scripts/lib/paths.mjs');

// On timeout, print what the page looked like (saved edits, clip blocks, console errors) so CI failures explain themselves.
async function diagnose(what) {
  const page = globalThis.__diagPage; if (!page) return '';
  try {
    const info = await page.evaluate(() => ({
      url: location.pathname, scroll: [document.scrollingElement.scrollWidth, document.scrollingElement.scrollHeight],
      clips: [...document.querySelectorAll('.clip-track .clip-block')].map(c => ({ cls: c.className.replace(/\s+/g, ' '), box: (r => [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)])(c.getBoundingClientRect()) })),
      zooms: document.querySelectorAll('.timeline-block.zoom').length, menus: document.querySelectorAll('[role=menu]').length,
      status: document.querySelector('.save-status')?.textContent, statusTitle: document.querySelector('.save-status')?.title ?? null, alerts: [...document.querySelectorAll('[role=alert]')].map(a => a.textContent.trim().slice(0, 200)), notice: document.querySelector('[role=status].timeline-notice, .timeline-message')?.textContent ?? null }));
    return ` | DIAG(${what}) ${JSON.stringify(info)}`;
  } catch (e) { return ` | DIAG failed: ${e.message}`; }
}

const until = async (fn,what,ms = 20000) => {
  const end = Date.now()+ms; let last;
  while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await new Promise(r => setTimeout(r,120)); }
  throw new Error(`timed out waiting for ${what}${last ? `: ${last.message}` : ''}${await diagnose(what)}`);
};
const disjoint = list => list.every((z,i) => z.tStart < z.tEnd && (!i || z.tStart >= list[i-1].tEnd-1e-9));

test('timeline: layers, zooms that never overlap, context menus, keyboard and viewport fit',{timeout:240000},async t => {
  let browser, server;
  try {
    browser = await chromium.launch({headless:true});
    const run = await syntheticRun(browser,{name:'timeline',duration:4});
    const compositionFile = path.join(projectDir(run.name),'composition.json');
    server = await startEditorServer({name:run.name});
    const page = await browser.newPage({viewport:{width:1440,height:900}}); globalThis.__diagPage = page;
    const problems = [];
    page.on('pageerror',e => problems.push(`pageerror: ${e.message}`));
    page.on('console',m => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
    await page.goto(server.url);
    await page.locator('.clip-track').waitFor({timeout:20000});
    const saved = async () => JSON.parse(await readFile(compositionFile,'utf8'));
    const waitSaved = () => until(async () => (await page.locator('.save-status').innerText()) === 'Saved','autosave');
    await page.getByRole('status').filter({hasText:/Saved|Saving/}).first().waitFor({timeout:20000}); await waitSaved();
    const current = () => page.evaluate(async () => (await (await fetch('/api/project')).json()).composition);
    const duration = run.record.durationSec, fps = (await current()).output.fps;
    // Start from a composition without edits, zooms or captions so every subtest controls its own data.
    async function reset() {
      const c = await current();
      c.edits = {...c.edits,splits:[],speeds:[],trims:[],mutes:[]}; c.zoom = {...c.zoom,regions:[],autoSuggest:false}; c.captions = {...c.captions,cues:[]};
      await page.evaluate(async composition => { const r = await fetch('/api/composition',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(composition)}); if (!r.ok) throw new Error(await r.text()); },c);
      await page.reload(); await page.locator('.clip-track').waitFor({timeout:20000}); await page.locator('.save-status').waitFor(); await waitSaved();
      await page.evaluate(() => { const el = document.querySelector('.timeline-grid'); el.scrollLeft = 0; el.scrollTop = 0; });
    }
    const scale = async () => Number(await page.locator('.timeline-lanes').getAttribute('data-scale'));
    const xAt = async seconds => (await page.locator('.timeline-lanes').boundingBox()).x+seconds*await scale();
    const rowY = async name => { const b = await page.locator(`.timeline-track.${name}-track`).boundingBox(); return b.y+b.height/2; };
    const seek = async seconds => { const r = await page.locator('.timeline-ruler').boundingBox(); await page.mouse.click(await xAt(seconds),r.y+r.height/2); };
    const layerMenu = () => page.getByRole('group',{name:'Layers to add'});
    const labels = async () => (await page.locator('.track-labels .track-label').allInnerTexts()).map(s => s.trim());
    await reset();

    for (const viewport of [{width:1440,height:900},{width:1280,height:720},{width:1024,height:640}]) {
      await t.test(`rows fill the timeline height and nothing is clipped at ${viewport.width}x${viewport.height}`,async () => {
        await page.setViewportSize(viewport); await page.waitForTimeout(250);
        const g = await page.evaluate(() => {
          const grid = document.querySelector('.timeline-grid'), rect = grid.getBoundingClientRect();
          const tracks = [...document.querySelectorAll('.timeline-track')].map(el => { const r = el.getBoundingClientRect(); return {name:el.getAttribute('aria-label'),y:r.y,height:r.height,bottom:r.bottom}; });
          const ruler = document.querySelector('.timeline-ruler').getBoundingClientRect(), labelsEl = document.querySelector('.track-labels').getBoundingClientRect();
          const tick = document.querySelector('.timeline-ruler .tick.major span').getBoundingClientRect();
          const handle = document.querySelector('.playhead-handle').getBoundingClientRect(), pill = document.querySelector('.clip-block').getBoundingClientRect();
          return {grid:{x:rect.x,y:rect.y,bottom:rect.bottom,clientHeight:grid.clientHeight,scrollHeight:grid.scrollHeight,scrollWidth:grid.scrollWidth,clientWidth:grid.clientWidth},tracks,ruler:{y:ruler.y,height:ruler.height,bottom:ruler.bottom},labels:{x:labelsEl.x,width:labelsEl.width},
            pageFits:(() => { const t = document.getElementById('timeline-root').getBoundingClientRect(); return t.bottom <= innerHeight+1 && t.right <= innerWidth+1 && t.x >= 0; })(),
            overflow:[...document.querySelectorAll('#timeline-root *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.bottom > innerHeight+1 || r.right > innerWidth+1); }).slice(0,8).map(el => `${el.tagName}.${[...el.classList].join('.')}@${Math.round(el.getBoundingClientRect().bottom)}`),
            tick:{x:tick.x,y:tick.y,text:document.querySelector('.timeline-ruler .tick.major span').textContent},handle:{bottom:handle.bottom},pill:{y:pill.y}};
        });
        assert.ok(g.pageFits,`the timeline stays inside the window: ${g.overflow.join(', ')}`);
        assert.deepEqual(g.tracks.map(r => r.name),['Clip track','Zoom track']);
        const total = g.tracks.reduce((s,r) => s+r.height,0)+g.ruler.height;
        assert.ok(g.grid.clientHeight-total <= 2 && total <= g.grid.clientHeight,`tracks fill the grid: ${total} of ${g.grid.clientHeight}`);
        for (const r of g.tracks) assert.ok(r.height >= 44 && r.bottom <= g.grid.bottom+1,`${r.name} height ${r.height}`);
        assert.ok(g.tick.y >= g.ruler.y+2,'ruler labels are not clipped at the top');
        assert.ok(g.tracks[0].height >= g.tracks[1].height,'Clip is the tallest row');
        assert.equal(g.labels.width,viewport.width < 1100 ? 44 : 132,'label column width');
        assert.match(g.tick.text,/^0:00(\.0)?$/,'short tick labels (tenths only when zoomed in)');
        assert.ok(g.tick.x >= g.labels.x+g.labels.width,'the 0:00 label is not under the label column');
        assert.ok(g.handle.bottom <= g.ruler.bottom+1 && g.pill.y >= g.ruler.bottom,'the playhead handle stays in the ruler, above block text');
        assert.ok(g.grid.scrollWidth <= g.grid.clientWidth+1 && g.grid.scrollHeight <= g.grid.clientHeight+1,'the fitted timeline needs no scrolling');
      });
    }
    await page.setViewportSize({width:1440,height:900});

    await t.test('Add Layer lists only the missing layers, adds each once and disables itself when none are left',async () => {
      assert.deepEqual(await labels(),['Time','Clip','Zoom']);
      const trigger = page.getByRole('button',{name:'Add Layer',exact:true});
      await trigger.click();
      assert.deepEqual(await layerMenu().getByRole('button').allInnerTexts(),['Captions','Voice','Music']);
      assert.equal(await layerMenu().getByRole('button',{name:/Zoom|Clip|Overlay/}).count(),0,'no Overlay, no duplicates of always-on layers');
      await layerMenu().getByRole('button',{name:'Captions'}).click();
      await page.locator('.caption-track').waitFor();
      assert.match(await page.locator('.caption-track .track-placeholder').innerText(),/Double-click to add a caption/);
      await trigger.click();
      assert.deepEqual(await layerMenu().getByRole('button').allInnerTexts(),['Voice','Music'],'an added layer leaves the menu');
      await layerMenu().getByRole('button',{name:'Voice'}).click();
      await trigger.click(); await layerMenu().getByRole('button',{name:'Music'}).click();
      assert.deepEqual(await labels(),['Time','Clip','Zoom','Captions','Voice','Music']);
      assert.equal(await page.locator('.caption-track').count(),1);
      await until(() => trigger.isDisabled(),'Add Layer disabled');
      assert.match(await page.locator('.timeline-notice').innerText(),/Music layer added/);
      const toolbar = await page.locator('.timeline-toolbar').boundingBox(), notice = await page.locator('.timeline-notice').boundingBox();
      assert.ok(notice.y >= toolbar.y && notice.y+notice.height <= toolbar.y+toolbar.height+1,'the notice lives inside the toolbar, never over the tracks');
    });

    await t.test('with five layers at 1280x720 every row is reachable: the grid scrolls internally under a sticky ruler and label column',async () => {
      await page.setViewportSize({width:1280,height:720}); await page.waitForTimeout(250);
      const grid = page.locator('.timeline-grid');
      const before = await page.evaluate(() => {
        const grid = document.querySelector('.timeline-grid'), ruler = document.querySelector('.timeline-ruler').getBoundingClientRect();
        const tracks = [...document.querySelectorAll('.timeline-track')].map(el => el.getBoundingClientRect().height);
        const root = document.getElementById('timeline-root').getBoundingClientRect();
        return {tracks,rulerY:ruler.y,scrolls:grid.scrollHeight > grid.clientHeight,pageFits:root.bottom <= innerHeight+1 && root.right <= innerWidth+1,toolbarY:document.querySelector('.timeline-toolbar').getBoundingClientRect().y};
      });
      assert.equal(before.tracks.length,5);
      assert.ok(before.pageFits,'the timeline stays inside the window');
      assert.ok(before.tracks.every(h => h >= 28),'rows never shrink below 28 px');
      assert.ok(before.scrolls,'five rows do not fit the default timeline height, so the grid scrolls');
      await grid.evaluate(el => { el.scrollTop = el.scrollHeight; }); await page.waitForTimeout(100);
      const after = await page.evaluate(() => {
        const grid = document.querySelector('.timeline-grid').getBoundingClientRect(), music = document.querySelector('.music-track').getBoundingClientRect();
        return {rulerY:document.querySelector('.timeline-ruler').getBoundingClientRect().y,toolbarY:document.querySelector('.timeline-toolbar').getBoundingClientRect().y,musicVisible:music.bottom <= grid.bottom+1 && music.y >= grid.y,labelX:document.querySelector('.track-labels').getBoundingClientRect().x};
      });
      assert.ok(Math.abs(after.rulerY-before.rulerY) < 1.5,'ruler stays');assert.equal(after.toolbarY,before.toolbarY,'toolbar stays');
      assert.ok(after.musicVisible,'the last row scrolls into view');
      await grid.evaluate(el => { el.scrollTop = 0; });
      await page.setViewportSize({width:1440,height:900});
    });

    await t.test('zoom control: slider, buttons, Fit and Cmd/Ctrl+wheel change the scale around the playhead',async () => {
      // The scale settles once the resize observer has measured the 1440 px window again.
      const fit = await until(async () => { const a = await scale(); await page.waitForTimeout(150); return Math.abs(await scale()-a) < 1e-9 ? a : null; },'stable fit scale');
      const lanes = await page.locator('.timeline-lanes').boundingBox();
      assert.ok(Math.abs(fit-(lanes.width-2)/duration) < 1,'fit shows the whole recording');
      await page.getByRole('button',{name:'Zoom timeline in'}).click();
      await until(async () => await scale() > fit*1.3,'zoomed in');
      await page.getByRole('button',{name:'Fit timeline'}).click();
      await until(async () => Math.abs(await scale()-fit) < 0.01,'fit');
      const grid = await page.locator('.timeline-grid').boundingBox();
      await page.mouse.move(grid.x+grid.width/2,grid.y+grid.height/2);
      await page.keyboard.down('Control'); await page.mouse.wheel(0,-240); await page.keyboard.up('Control');
      await until(async () => await scale() > fit*1.5,'wheel zoom');
      await page.getByRole('button',{name:'Zoom timeline out'}).click({clickCount:6});
      await until(async () => Math.abs(await scale()-fit) < 0.01,'cannot zoom out past fit');
    });

    await t.test('Z adds a zoom at the playhead; adding over an existing zoom selects it and dragging never overlaps',async () => {
      await seek(1); await page.keyboard.press('z');
      await until(async () => (await saved()).zoom.regions.length === 1,'zoom saved');
      let [z] = (await saved()).zoom.regions; assert.ok(Math.abs(z.tStart-1) < 0.05 && Math.abs(z.tEnd-3) < 0.05,JSON.stringify(z));
      await page.keyboard.press('Escape');
      await page.getByRole('button',{name:'Add zoom',exact:true}).click();
      await page.waitForTimeout(300);
      assert.equal((await saved()).zoom.regions.length,1,'no duplicate zoom');
      assert.equal(await page.locator('.zoom-track .timeline-block.selected').count(),1,'the existing zoom is selected instead');
      assert.match(await page.locator('.timeline-notice').innerText(),/already covers/);
      await seek(3.5); await page.keyboard.press('z');
      await until(async () => (await saved()).zoom.regions.length === 2,'second zoom');
      // Resize the first zoom's end far to the right: it stops at the second zoom and shows the snap guide while dragging.
      const first = page.locator('.zoom-track .timeline-block').first();
      await first.hover();
      const edge = await first.getByRole('button',{name:'Resize zoom end'}).boundingBox();
      await page.mouse.move(edge.x+edge.width/2,edge.y+edge.height/2); await page.mouse.down();
      await page.mouse.move(await xAt(3.9),edge.y+edge.height/2,{steps:10});
      assert.equal(await page.locator('.snap-guide').count(),1,'snap guide while clamped');
      await page.mouse.up();
      await until(async () => { const r = (await saved()).zoom.regions; return Math.abs(r[0].tEnd-r[1].tStart) < 1e-6; },'end clamped to the neighbour');
      assert.ok(disjoint((await saved()).zoom.regions));
      // Drag the whole block to the right: it stays before the second zoom.
      const body = await first.boundingBox();
      await page.mouse.move(body.x+body.width/2,body.y+body.height/2); await page.mouse.down();
      await page.mouse.move(await xAt(3.95),body.y+body.height/2,{steps:10}); await page.mouse.up();
      await page.waitForTimeout(400);
      const regions = (await saved()).zoom.regions;
      assert.ok(disjoint(regions),JSON.stringify(regions));
      assert.ok(regions[0].tEnd <= regions[1].tStart+1e-6);
      await waitSaved();
    });

    await t.test('double-click and drag on the empty Zoom track create zooms of the right length',async () => {
      await reset();
      assert.match(await page.locator('.zoom-track .ghost-block').innerText(),/Double-click to add a zoom/);
      await page.mouse.dblclick(await xAt(0.5),await rowY('zoom'));
      await until(async () => (await saved()).zoom.regions.length === 1,'double-click zoom');
      let [z] = (await saved()).zoom.regions; assert.ok(Math.abs(z.tStart-0.5) < 0.05 && Math.abs(z.tEnd-2.5) < 0.05,JSON.stringify(z));
      assert.equal(await page.locator('.zoom-track .timeline-block.selected').count(),1);
      const y = await rowY('zoom');
      await page.mouse.move(await xAt(3),y); await page.mouse.down();
      await page.mouse.move(await xAt(3.8),y,{steps:12});
      assert.equal(await page.locator('.ghost-block.create').count(),1,'ghost preview while dragging');
      await page.mouse.up();
      await until(async () => (await saved()).zoom.regions.length === 2,'drag-create zoom');
      const r = (await saved()).zoom.regions;
      assert.ok(Math.abs(r[1].tStart-3) < 0.05 && Math.abs(r[1].tEnd-3.8) < 0.05,JSON.stringify(r));
      // Dragging across an existing zoom clamps at its edge instead of overlapping.
      await page.mouse.move(await xAt(2.7),y); await page.mouse.down(); await page.mouse.move(await xAt(0.2),y,{steps:12}); await page.mouse.up();
      await until(async () => (await saved()).zoom.regions.length === 3,'third zoom');
      assert.ok(disjoint((await saved()).zoom.regions),JSON.stringify((await saved()).zoom.regions));
      assert.ok(Math.abs((await saved()).zoom.regions[1].tStart-2.5) < 1e-6,'clamped to the first zoom');
      await waitSaved();
    });

    await t.test('context menus: split, speed 4x, delete, restore, Auto/Manual, duplicate and delete write composition.json',async () => {
      await reset();
      for (const s of [1,2]) { await seek(s); await page.keyboard.press('s'); await until(async () => (await saved()).edits.splits.length === s,'split'); }
      const middle = () => page.locator('.clip-track .clip-block').nth(1);
      await middle().click({button:'right'});
      const menu = page.getByRole('menu',{name:'Clip actions'}); await menu.waitFor();
      const items = async m => (await m.getByRole('menuitem').allInnerTexts()).map(s => s.replace(/(Enter|Del|S)$/,'').trim());
      assert.deepEqual(await items(menu),['Split here','Delete clip'],'clip menu items');
      assert.deepEqual(await menu.getByRole('menuitemradio').allInnerTexts(),['1x','2x','4x','8x'],'speed quick picks');
      assert.equal(await menu.getByRole('menuitem',{name:'Split here'}).isDisabled(),true,'playhead is on the clip edge');
      await menu.getByRole('menuitemradio',{name:'Speed 4x'}).click();
      await until(async () => (await saved()).edits.speeds.some(r => r.rate === 4 && Math.abs(r.start-1) < 1e-6 && Math.abs(r.end-2) < 1e-6),'4x saved');
      assert.equal(await middle().getByText('4x',{exact:true}).count(),1,'speed badge in the pill');
      await middle().click({button:'right'}); await menu.waitFor();
      assert.equal(await menu.getByRole('menuitemradio',{name:'Speed 4x'}).getAttribute('aria-checked'),'true');
      await menu.getByRole('menuitem',{name:'Delete clip'}).click();
      await until(async () => (await saved()).edits.trims.length === 1,'deleted');
      assert.equal(await page.locator('.clip-track .clip-block.deleted').count(),1);
      await page.locator('.clip-track .clip-block.deleted').click({button:'right'}); await menu.waitFor();
      assert.deepEqual(await menu.getByRole('menuitem').allInnerTexts(),['Restore clip']);
      await menu.getByRole('menuitem',{name:'Restore clip'}).click();
      await until(async () => (await saved()).edits.trims.length === 0,'restored');
      await page.locator('.clip-track .clip-block.deleted').getByRole('button',{name:/Restore clip/}).count().then(n => assert.equal(n,0));
      await seek(1.5); await middle().click({button:'right'}); await menu.waitFor();
      await menu.getByRole('menuitem',{name:'Split here'}).click();
      await until(async () => (await saved()).edits.splits.some(s => Math.abs(s-1.5) < 0.05),'split here');
      assert.equal(await page.getByRole('menu').count(),0,'menu closes after an action');
      // Zoom menu (the zoom ends at 3 s so Duplicate has room before the end of the recording).
      await seek(1); await page.keyboard.press('z');
      await until(async () => (await saved()).zoom.regions.length === 1,'zoom');
      const block = page.locator('.zoom-track .timeline-block').first(), zoomMenu = page.getByRole('menu',{name:'Zoom actions'});
      await block.click({button:'right'}); await zoomMenu.waitFor();
      assert.deepEqual(await zoomMenu.getByRole('menuitem').allInnerTexts().then(l => l.map(s => s.replace(/Del$/,'').trim())),['Switch to Auto','Duplicate','Delete zoom']);
      await zoomMenu.getByRole('menuitem',{name:'Switch to Auto'}).click();
      await until(async () => (await saved()).zoom.regions[0].source === 'auto','auto');
      await block.click({button:'right'}); await zoomMenu.waitFor();
      assert.equal(await zoomMenu.getByRole('menuitem',{name:'Switch to Manual'}).count(),1);
      await zoomMenu.getByRole('menuitem',{name:'Duplicate'}).click();
      await until(async () => (await saved()).zoom.regions.length === 2,'duplicate');
      const [a,b] = (await saved()).zoom.regions; assert.ok(Math.abs(b.tStart-a.tEnd) < 1e-6 && b.tEnd <= duration+1e-6 && b.depth === a.depth,JSON.stringify([a,b]));
      // The keyboard opens the same menu (Shift+F10) and Escape returns focus to the block.
      await page.locator('.zoom-track .timeline-block').nth(1).focus(); await page.keyboard.press('Shift+F10'); await zoomMenu.waitFor();
      await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
      await until(async () => (await saved()).zoom.regions.length === 1,'deleted from the keyboard menu');
      await waitSaved();
    });

    await t.test('keyboard: arrows nudge, Delete removes, S splits, C adds a caption, mini toolbar on the selected block',async () => {
      await reset();
      await seek(1); await page.keyboard.press('z');
      await until(async () => (await saved()).zoom.regions.length === 1,'zoom');
      const before = (await saved()).zoom.regions[0];
      await page.locator('.zoom-track .timeline-block').first().click();
      await page.keyboard.press('ArrowRight');
      await until(async () => Math.abs((await saved()).zoom.regions[0].tStart-before.tStart-1/fps) < 1e-6,'nudged one frame');
      await page.keyboard.press('Shift+ArrowLeft');
      await until(async () => (await saved()).zoom.regions[0].tStart < before.tStart,'nudged ten frames back');
      await page.locator('.zoom-track .timeline-block').first().hover();
      const quick = page.getByRole('toolbar',{name:'zoom quick actions'});
      await quick.waitFor();
      assert.deepEqual(await quick.getByRole('button').evaluateAll(els => els.map(el => el.getAttribute('aria-label'))),['Switch to Auto','Duplicate','Delete zoom']);
      await page.keyboard.press('Delete');
      await until(async () => (await saved()).zoom.regions.length === 0,'deleted');
      assert.match(await page.locator('.zoom-track .ghost-block').innerText(),/Double-click/);
      await seek(2); await page.keyboard.press('s');
      await until(async () => (await saved()).edits.splits.length === 1,'split');
      assert.equal(await page.locator('.clip-track .clip-block.selected').count(),1,'the split clip is selected');
      await page.locator('.clip-track .clip-block.selected').hover();
      assert.deepEqual(await page.getByRole('toolbar',{name:'clip quick actions'}).getByRole('button').evaluateAll(els => els.map(el => el.getAttribute('aria-label'))),['Split here','Delete clip']);
      await page.keyboard.press('c');
      await until(async () => (await saved()).captions.cues.length === 1,'caption');
      await page.locator('.caption-track .timeline-block.selected').waitFor();
      await page.locator('.caption-inline').getByLabel('Caption text').fill('Hello there'); await page.getByRole('button',{name:'Save caption'}).click();
      await until(async () => (await saved()).captions.cues[0].text === 'Hello there','caption text');
      await page.locator('.caption-track .timeline-block').first().click({button:'right'});
      assert.deepEqual(await page.getByRole('menu',{name:'Caption actions'}).getByRole('menuitem').allInnerTexts().then(l => l.map(s => s.replace(/Enter$|Del$/,'').trim())),['Edit text','Delete caption']);
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('menu').count(),0);
      // Clicking the Clip track seeks and selects the clip under the pointer.
      await page.mouse.click(await xAt(3),await rowY('clip'));
      assert.equal(await page.locator('.clip-track .clip-block.selected').count(),1);
      assert.ok(Math.abs(Number(await page.locator('.timeline-ruler').getAttribute('aria-valuenow'))-3) < 0.05,'playhead at the click');
      await waitSaved();
    });

    await t.test('the legend shows until the first edit or until dismissed, and stays dismissed after reload',async () => {
      await reset();
      await page.evaluate(() => localStorage.removeItem('showreel:hint-dismissed')); await page.reload(); await page.locator('.clip-track').waitFor();
      const hint = page.locator('.timeline-editor .hint-card');
      assert.match(await hint.innerText(),/Split a clip to speed it up or remove it\. Select a zoom to move its box\./);
      await seek(2); await page.keyboard.press('s');
      await until(async () => (await saved()).edits.splits.length === 1,'split');
      assert.equal(await hint.count(),0,'hidden once the user has edited');
      await reset(); await page.evaluate(() => localStorage.removeItem('showreel:hint-dismissed')); await page.reload(); await page.locator('.clip-track').waitFor();
      await page.getByRole('button',{name:'Dismiss editing hint'}).click();
      await page.reload(); await page.locator('.clip-track').waitFor();
      assert.equal(await page.locator('.hint-card').count(),0);
    });

    assert.deepEqual(problems,[],`console problems:\n${problems.join('\n')}`);
  } finally {
    try { await browser?.close(); } finally { try { await server?.close(); } finally { await rm(directory,{recursive:true,force:true}); } }
  }
});
