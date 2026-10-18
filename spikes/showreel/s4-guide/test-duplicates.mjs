// Duplicate-element test: identical link and button labels in different cards; the resolver must pick the one the user clicked.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { writeFileSync, readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);
import { installRecorder } from './recorder.mjs';

const html = `<!doctype html><meta charset=utf-8><title>dup</title><body style="font:20px sans-serif;padding:20px">
<section><h2>Card one</h2><a href="#c1">Read more</a> <button type="button" onclick="document.title='save1'">Save</button></section>
<section><h2>Card two</h2><a href="#c2">Read more</a> <button type="button" onclick="document.title='save2'">Save</button></section>
<section><h2>Card three</h2><a href="#c3">Read more</a> <button type="button" onclick="document.title='save3'">Save</button></section>
<label>Search <input placeholder="Search"></label>`;
const server = createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(html); }).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const url = `http://127.0.0.1:${server.address().port}/`;
const steps = []; const browser = await chromium.launch({ headless: false });
try {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
  await installRecorder(ctx, steps);
  const page = await ctx.newPage(); await page.goto(url);
  await page.getByRole('link', { name: 'Read more' }).nth(1).click(); await page.waitForTimeout(500);   // card two
  await page.getByRole('button', { name: 'Save' }).nth(2).click(); await page.waitForTimeout(500);      // card three
  await page.getByPlaceholder('Search').fill('hello'); await page.keyboard.press('Tab'); await page.waitForTimeout(800);
} finally { await browser.close().catch(() => {}); }
writeFileSync('../scratch/guide-dup.json', JSON.stringify({ url, steps }, null, 2));
const r = await execFileP('node', ['resolve.mjs'], { env: { ...process.env, GUIDE_IN: '../scratch/guide-dup.json', RESOLVED_OUT: '../scratch/guide-dup.resolved.json', RESULT_OUT: '../results/s4-guide-dup.json' } }).catch((e) => ({ stdout: e.stdout || '', stderr: e.stderr || String(e) }));
console.log(String(r.stdout).trim().split('\n').slice(-12).join('\n'), String(r.stderr || '').slice(0, 300));
// correctness: each resolved selector must point at the element the user actually used
const res = JSON.parse(readFileSync('../scratch/guide-dup.resolved.json', 'utf8')).steps;
const b = await chromium.launch(); const p = await b.newPage(); await p.goto(url);
const checks = [];
for (const s of res) { const el = p.locator(s.selector); checks.push({ name: s.name, selector: s.selector, how: s.how, href: await el.getAttribute('href').catch(() => null), section: await el.evaluate((n) => n.closest('section')?.querySelector('h2')?.textContent ?? 'none').catch(() => null) }); }
await b.close(); server.close();
console.log(JSON.stringify(checks, null, 1));
writeFileSync('../results/s4-guide-dup-checks.json', JSON.stringify(checks, null, 2));
process.exit(0);
