// Synthetic user: drives the recorder with scripted clicks so the pipeline can be tested without a person.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { installRecorder } from './recorder.mjs';

const url = 'https://anshchovatiya.vercel.app/';
const steps = [];
const browser = await chromium.launch({ headless: false });
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installRecorder(ctx, steps, (n, a, name) => console.log(n, a, name));
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(3000);
  const click = async (loc) => { await loc.click({ timeout: 8000 }); await page.waitForTimeout(2500); };
  await click(page.getByRole('link', { name: 'View my work' }).first());
  await click(page.getByRole('link', { name: 'Contact' }).first());
  await click(page.getByRole('link', { name: 'Blog' }).first());
  await click(page.getByRole('link', { name: /Context Ledger/ }).first());
} finally { await browser.close().catch(() => {}); }
writeFileSync('../scratch/guide.json', JSON.stringify({ url, steps }, null, 2));
console.log('saved', steps.length, 'steps');
process.exit(0);
