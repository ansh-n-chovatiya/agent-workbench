import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { installRecorder } from './recorder.mjs';

const url = process.argv[2] ?? 'https://anshchovatiya.vercel.app/';
const steps = [];
const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await installRecorder(ctx, steps, (n, a, name) => console.log(n, a, name));
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
console.log('Click through your flow, then close the browser window.');
await new Promise((res) => browser.on('disconnected', res));
writeFileSync('../scratch/guide.json', JSON.stringify({ url, steps }, null, 2));
console.log('saved', steps.length, 'steps');
