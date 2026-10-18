import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, writeFile, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import { startFixtureServer } from '../scripts/lib/fixture-server.mjs';

const temp = await mkdtemp(path.join(os.tmpdir(), 'showreel-browser-'));
process.env.SHOWREEL_HOME = path.join(temp, 'home');
const { installRecorder } = await import('../scripts/lib/guide/recorder.mjs');
const { resolveGuide } = await import('../scripts/lib/guide/resolver.mjs');
const { snapshotPage, formatSnapshot } = await import('../scripts/lib/snapshot.mjs');
const { writeProjectFile, readProjectFile } = await import('../scripts/lib/project.mjs');
const fixture = path.join(temp, 'fixture');
await cp(new URL('../fixtures/demo-app/', import.meta.url), fixture, { recursive: true });
await writeFile(path.join(fixture, 'private.html'), `<!doctype html>
<html lang="en"><head><title>Private fields</title></head><body>
<label>Password<input type="password" autocomplete="current-password"></label>
<label>Card number<input autocomplete="cc-number"></label>
<label>Search<input placeholder="Search"></label>
</body></html>`);
after(async () => { await rm(temp, { recursive: true, force: true }); });

const viewport = { width: 1440, height: 900 };
const run = promisify(execFile);
const cli = fileURLToPath(new URL('../scripts/showreel.mjs', import.meta.url));

test('mixed guide resolves duplicate links, widgets, forms, secrets, popup and iframe', { timeout: 300000 }, async () => {
  const server = await startFixtureServer(fixture);
  let browser;
  let recorder;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport });
    const steps = [];
    recorder = await installRecorder(context, (step) => { steps.push(step); });
    const page = await context.newPage();
    const url = `${server.url}/index.html`;
    await page.goto(url);
    await page.getByRole('link', { name: 'Learn more', exact: true }).nth(1).click();
    await page.waitForURL('**/features.html#connect');
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await page.getByRole('tab', { name: 'Share', exact: true }).click();
    assert.equal(await page.locator('#tab-share').getAttribute('aria-selected'), 'true');
    await page.locator('summary').first().click();
    assert.equal(await page.locator('details').first().getAttribute('open'), '');
    await page.getByRole('link', { name: 'Features', exact: true }).click();
    await page.frameLocator('iframe').getByRole('button', { name: 'Frame button', exact: true }).click();
    assert.equal(await page.frameLocator('iframe').locator('button').textContent(), 'Clicked in frame');
    await page.getByRole('link', { name: 'Contact', exact: true }).click();
    await page.getByLabel('Name', { exact: true }).fill('Avery');
    await page.getByLabel('Name', { exact: true }).blur();
    await page.getByLabel('Email', { exact: true }).fill('avery@example.com');
    await page.getByLabel('Email', { exact: true }).blur();
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('link', { name: 'Open pricing in a new tab', exact: true }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    await popup.getByRole('button', { name: 'Choose plan', exact: true }).nth(1).click();
    await popup.goto(`${server.url}/private.html`);
    await popup.getByLabel('Password', { exact: true }).fill('never-store-this');
    await popup.getByLabel('Password', { exact: true }).blur();
    await popup.getByLabel('Card number', { exact: true }).fill('4111111111111111');
    await popup.getByLabel('Card number', { exact: true }).blur();
    await popup.getByLabel('Search', { exact: true }).fill('notes');
    await popup.getByLabel('Search', { exact: true }).press('Enter');
    await popup.getByLabel('Search', { exact: true }).blur();
    await recorder.drain();

    const guide = { version: 1, url, viewport, steps };
    const secretSteps = steps.filter((step) => step.sensitive);
    assert.equal(secretSteps.length, 2);
    for (const step of secretSteps) assert.equal(Object.hasOwn(step, 'value'), false);
    assert.ok(!JSON.stringify(guide).includes('never-store-this'));
    assert.ok(!JSON.stringify(guide).includes('4111111111111111'));
    const frameStep = steps.find((step) => step.name === 'Frame button');
    assert.equal(frameStep.isTopFrame, false);
    assert.equal(frameStep.frameUrl, `${server.url}/frame.html`);
    const popupStep = steps.find((step) => step.name === 'Choose plan');
    assert.equal(popupStep.tab, 1);
    assert.ok(steps.some((step) => step.action === 'press' && step.key === 'Enter'));

    await writeProjectFile('mixed', 'guide', guide);
    const result = await resolveGuide({ guide });
    assert.deepEqual(result.failures, []);
    assert.equal(result.steps.length, steps.length);
    assert.equal(result.steps[0].how, 'scoped');
    assert.equal(result.steps.find((step) => step.name === 'Choose plan').tab, 1);
    assert.equal(result.steps.find((step) => step.name === 'Frame button').frameUrl, frameStep.frameUrl);
    for (const name of ['Name', 'Email']) {
      assert.ok(result.steps.some((step) => step.name === name && step.action === 'fill'));
    }
    assert.equal(result.steps.find((step) => step.action === 'press').key, 'Enter');
    for (const step of result.steps.filter((step) => step.sensitive)) {
      assert.equal(Object.hasOwn(step, 'value'), false);
    }
    const verification = await browser.newContext({ viewport });
    const check = await verification.newPage();
    await check.goto(url);
    const duplicate = check.locator(result.steps[0].selector);
    assert.equal(await duplicate.count(), 1);
    assert.equal(await duplicate.evaluate((el) => el.closest('article').querySelector('h3').textContent), 'Connect');

    const tabStep = result.steps.find((step) => step.role === 'tab');
    await check.locator(tabStep.selector).click();
    assert.equal(await check.locator('#tab-share').getAttribute('aria-selected'), 'true');
    const accordionStep = result.steps.find((step) => step.name === 'Can I explore without an account?');
    await check.locator(accordionStep.selector).click();
    assert.equal(await check.locator('details').first().getAttribute('open'), '');
    await check.goto(`${server.url}/features.html`);
    const resolvedFrame = result.steps.find((step) => step.name === 'Frame button');
    await check.frameLocator('iframe').locator(resolvedFrame.selector).click();
    assert.equal(await check.frameLocator('iframe').locator('button').textContent(), 'Clicked in frame');
    await verification.close();

    // Exercise CLI file writing and exit status as well as the direct resolver API.
    const resolved = await run(process.execPath, [cli, 'guide', 'resolve', '--name', 'mixed'], {
      env: process.env, timeout: 150000,
    });
    assert.match(resolved.stdout, new RegExp(`${steps.length}/${steps.length} steps resolved`));
    assert.deepEqual((await readProjectFile('mixed', 'resolved')).failures, []);
    const stored = await readFile(path.join(process.env.SHOWREEL_HOME, 'projects/mixed/guide.resolved.json'), 'utf8');
    assert.ok(!stored.includes('never-store-this'));
  } finally {
    try { await recorder?.drain(); }
    finally {
      try { await browser?.close(); }
      finally { await server.close(); }
    }
  }
});

test('index snapshot has distinct unique duplicate selectors and stays under 4 KB', { timeout: 30000 }, async () => {
  const server = await startFixtureServer();
  let browser;
  try {
    const url = `${server.url}/index.html`;
    const snapshot = await snapshotPage({ url, viewport });
    assert.ok(snapshot.elements.length >= 12);
    assert.ok(snapshot.headings.length <= 12);
    assert.ok(snapshot.headings.every((heading) => heading.length <= 60));
    const links = snapshot.elements.filter((element) => element.name === 'Learn more');
    assert.equal(links.length, 3);
    assert.equal(new Set(links.map((link) => link.selector)).size, 3);
    assert.ok(Buffer.byteLength(formatSnapshot(snapshot)) < 4096);
    assert.deepEqual(snapshot.elements.map((el) => el.y), snapshot.elements.map((el) => el.y).sort((a, b) => a - b));
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport });
    await page.goto(url);
    for (const [index, link] of links.entries()) {
      const locator = page.locator(link.selector);
      assert.equal(await locator.count(), 1);
      assert.equal(await locator.evaluate((el) => el.closest('article').querySelector('h3').textContent),
        ['Collect', 'Connect', 'Create'][index]);
    }
    assert.equal((await snapshotPage({ url, max: 2 })).elements.length, 2);
  } finally {
    try { await browser?.close(); }
    finally { await server.close(); }
  }
});
