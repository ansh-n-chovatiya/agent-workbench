// Overflow audit for the settings panel: every rail topic (and its sub-tabs, expanded Advanced sections, search results,
// empty states and open popovers) at panel widths 320, 400 and 560 px in both themes must show nothing that leaves the panel,
// no block wider than its box, and no clipped text without an ellipsis. The preview and timeline must fit beside a wide panel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const directory = await mkdtemp(path.join(os.tmpdir(), 'showreel-overflow-'));
process.env.SHOWREEL_HOME = path.join(directory, 'home');
process.env.SHOWREEL_VOICE_ENGINE = 'fake';
const { syntheticRun } = await import('./helpers/synthetic-run.mjs');
const { startEditorServer } = await import('../scripts/lib/editor/server.mjs');

export const WIDTHS = [320, 400, 560];
// Runs inside the page. Intentional scrollers (the panel body, long lists) may scroll; everything else must fit.
export const AUDIT = () => {
  const panel = document.querySelector('.settings-column');
  if (!panel) return [{ kind: 'missing-panel', el: '.settings-column' }];
  const box = panel.getBoundingClientRect(), problems = [];
  const scrollers = ['panel-scroll', 'voice-list', 'timeline-grid'];
  const describe = el => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}${el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label').slice(0, 24)}]` : el.id ? `#${el.id}` : ''}`;
  const texts = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  for (const el of panel.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    if (el.classList.contains('sr-only') || el.closest('.sr-only')) continue; // visually hidden by design (1 px, clipped)
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed') continue;
    const control = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName); // their scrollWidth is their text, which scrolls inside the field
    if (r.right > box.right + 1) problems.push({ kind: 'beyond-panel', el: describe(el), by: Math.round(r.right - box.right) });
    if (r.left < box.left - 1) problems.push({ kind: 'before-panel', el: describe(el), by: Math.round(box.left - r.left) });
    const scrolls = ['auto', 'scroll'].includes(cs.overflowX) || scrollers.some(c => el.classList.contains(c));
    if (!control && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && !scrolls && cs.display !== 'inline') {
      if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') {
        if (texts(el) && cs.textOverflow !== 'ellipsis') problems.push({ kind: 'clipped-text', el: describe(el), text: el.textContent.trim().slice(0, 40), by: el.scrollWidth - el.clientWidth });
        else if (!texts(el) && el.scrollWidth - el.clientWidth > 2) problems.push({ kind: 'clipped-content', el: describe(el), by: el.scrollWidth - el.clientWidth }); // 2 px: sub-pixel font metrics differ per OS
      } else problems.push({ kind: 'wider-than-box', el: describe(el), by: el.scrollWidth - el.clientWidth });
    }
  }
  for (const pop of document.querySelectorAll('.ui-popover, .info-bubble, .ui-tooltip')) {
    const r = pop.getBoundingClientRect();
    if (r.width && (r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1 || r.top < -1)) problems.push({ kind: 'popover-offscreen', el: describe(pop), by: Math.round(Math.max(r.right - innerWidth, -r.left, r.bottom - innerHeight, -r.top)) });
    if (pop.scrollWidth > pop.clientWidth + 1 && !['auto', 'scroll'].includes(getComputedStyle(pop).overflowX)) problems.push({ kind: 'popover-wider-than-box', el: describe(pop), by: pop.scrollWidth - pop.clientWidth });
  }
  // The rest of the window beside a wide panel: page never scrolls, preview and timeline stay inside the window.
  if (document.scrollingElement.scrollWidth > innerWidth || document.scrollingElement.scrollHeight > innerHeight) problems.push({ kind: 'page-scrolls', el: 'document', by: Math.max(document.scrollingElement.scrollWidth - innerWidth, document.scrollingElement.scrollHeight - innerHeight) });
  for (const sel of ['.viewer', '.preview-stage', '.preview canvas', '.transport', '#timeline-root', '.timeline-toolbar']) {
    const el = document.querySelector(sel); if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.right > innerWidth + 1 || r.bottom > innerHeight + 1) problems.push({ kind: 'outside-window', el: sel, by: Math.round(Math.max(r.right - innerWidth, r.bottom - innerHeight)) });
  }
  const stage = document.querySelector('.preview-stage'), canvas = document.querySelector('.preview canvas');
  if (stage && canvas) { const s = stage.getBoundingClientRect(), c = canvas.getBoundingClientRect(); if (c.right > s.right + 1 || c.bottom > s.bottom + 1 || c.width <= 0) problems.push({ kind: 'preview-overflows-stage', el: '.preview canvas', by: Math.round(Math.max(c.right - s.right, c.bottom - s.bottom)) }); }
  return problems;
};

// Visits every panel state and runs the audit; returns {state: problems[]} for the states that had any.
export async function auditPanels(page, { widths = WIDTHS, themes = ['dark', 'light'], log = () => {} } = {}) {
  const found = {}; let states = 0;
  const topic = name => page.getByRole('navigation', { name: 'Editor topics' }).getByRole('button', { name, exact: true }).click();
  const record = async name => { states++; const problems = await page.evaluate(AUDIT); if (problems.length) { found[name] = problems; log(name, problems); } };
  const expandAdvanced = async () => { for (const toggle of await page.locator('.scard-adv, .scard-toggle').all()) if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click(); };
  for (const width of widths) {
    await page.evaluate(w => localStorage.setItem('showreel:panel-width', String(w)), width);
    await page.reload(); await page.getByRole('status').filter({ hasText: /Saved|Saving/ }).first().waitFor({ timeout: 20000 });
    for (const theme of themes) {
      await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
      const tag = `${theme} ${width}px`;
      for (const name of ['Zoom', 'Cursor', 'Appearance', 'Captions', 'Audio', 'Brand', 'Export settings']) {
        await topic(name); await page.waitForTimeout(120);
        const tabs = name === 'Audio' ? ['Voice', 'Music'] : [null];
        for (const tab of tabs) {
          if (tab) { await page.getByRole('tab', { name: tab, exact: true }).click(); await page.waitForTimeout(80); }
          const label = `${tag} ${name}${tab ? ` / ${tab}` : ''}`;
          await record(label);
          await expandAdvanced(); await page.waitForTimeout(300); await record(`${label} (Advanced open)`); // transitions are 150 ms
          if (name === 'Appearance') {
            const background = page.getByRole('group', { name: 'Background', exact: true });
            for (const type of ['Gradient', 'Solid', 'Image']) { await background.getByRole('button', { name: type, exact: true }).click(); await page.waitForTimeout(100); await record(`${label} background ${type}`); }
            await page.getByRole('button', { name: 'Custom', exact: true }).first().click().catch(() => {}); await page.waitForTimeout(100); await record(`${label} gradient Custom`);
            await background.getByRole('button', { name: 'Theme', exact: true }).click();
          }
          if (name === 'Cursor') {
            await page.locator('[data-path="cursor.fill"] .swatch-btn').click(); await page.waitForTimeout(150); await record(`${label} colour popover`); await page.keyboard.press('Escape');
            await page.locator('.scard-menu').first().click(); await page.waitForTimeout(150); await record(`${label} section menu`); await page.keyboard.press('Escape');
            await page.getByRole('button', { name: 'About Cursor size' }).hover(); await page.waitForTimeout(100); await record(`${label} info tooltip`); await page.mouse.move(innerWidthSafe(page), 300);
          }
          if (tab === 'Voice') { const browse = page.getByText('Browse all voices'); if (await browse.count()) { await browse.click(); await page.waitForTimeout(100); await record(`${label} browse voices`); await browse.click(); } }
        }
      }
      const search = page.getByRole('searchbox', { name: 'Search settings' });
      await search.fill('colour'); await page.waitForTimeout(150); await record(`${tag} search results`);
      await search.fill('xyzzy'); await page.waitForTimeout(100); await record(`${tag} search empty`);
      await search.fill('');
    }
  }
  return { found, states };
}
const innerWidthSafe = () => 900;

test('settings panel overflow audit: nothing leaves the panel at 320, 400 and 560 px in either theme', { timeout: 600000 }, async () => {
  let browser, server;
  try {
    browser = await chromium.launch({ headless: true });
    const run = await syntheticRun(browser);
    // A brand kit and a background image make the Brand summary and image thumbnail states real.
    server = await startEditorServer({ name: run.name });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    await page.goto(server.url);
    await page.getByRole('status').filter({ hasText: /Saved|Saving/ }).first().waitFor({ timeout: 20000 });
    await writeFile(path.join(directory, 'backdrop.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR4nGP4z8DwHwyBNAMDiAYAVqoH/4hVzYwAAAAASUVORK5CYII=', 'base64'));
    const { found, states } = await auditPanels(page, { log: (name, list) => console.log(`  overflow in ${name}: ${JSON.stringify(list.slice(0, 6))}`) });
    assert.ok(states > 100, `audited ${states} states`);
    assert.deepEqual(found, {}, `${Object.keys(found).length} of ${states} panel states overflow`);
    assert.deepEqual(problems, []);
  } finally {
    try { await browser?.close(); } finally { try { await server?.close(); } finally { await rm(directory, { recursive: true, force: true }); } }
  }
});
