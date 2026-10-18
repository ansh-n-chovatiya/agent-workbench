import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const guide = JSON.parse(readFileSync('../scratch/guide.json', 'utf8'));
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(guide.url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(3000);
let unique = 0; const failures = [];
for (const [i, s] of guide.steps.entries()) {
  if (!s.selector) { failures.push({ i, why: 'no unique selector at capture' }); continue; }
  if (s.url !== page.url()) await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(3000);
  const n = await page.locator(s.selector).count();
  if (n === 1) { unique++; try { if (s.action === 'click') await page.locator(s.selector).click({ timeout: 4000 }); else await page.locator(s.selector).fill(s.value ?? ''); } catch (e) { failures.push({ i, why: 'action failed: ' + String(e.message).split('\n')[0] }); } }
  else failures.push({ i, why: `selector matched ${n}` });
}
await browser.close();
writeFileSync('../results/s4-guide.json', JSON.stringify({ steps: guide.steps.length, uniqueOnReplay: unique, failures }, null, 2));
console.log({ steps: guide.steps.length, unique, failures });
