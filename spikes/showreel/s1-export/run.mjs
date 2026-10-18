import { build } from 'esbuild';
import { chromium, webkit, firefox } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';

await build({ entryPoints: ['page.js'], bundle: true, format: 'iife', outfile: '../scratch/s1-page.js', logLevel: 'error' });
mkdirSync('../results', { recursive: true });

const targets = {
  'chromium-bundled': () => chromium.launch(),
  'chrome-installed': () => chromium.launch({ channel: 'chrome' }),
  'msedge-installed': () => chromium.launch({ channel: 'msedge' }),
  'webkit-playwright': () => webkit.launch(),
  'firefox-playwright': () => firefox.launch(),
};
const server = createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end('<!doctype html><title>s1</title>'); }).listen(0, '127.0.0.1');
await new Promise((res) => server.once('listening', res));
const origin = `http://127.0.0.1:${server.address().port}/`;
const engines = {};
for (const [name, launch] of Object.entries(targets)) {
  try {
    const browser = await launch();
    const page = await browser.newPage();
    await page.goto(origin);
    await page.addScriptTag({ path: '../scratch/s1-page.js' });
    engines[name] = await page.evaluate(() => window.runExport());
    engines[name].diag = await page.evaluate(() => ({ secure: isSecureContext, hasVideoEncoder: typeof VideoEncoder !== 'undefined', ua: navigator.userAgent.slice(0, 90) }));
    if (name === 'chromium-bundled' && engines[name].mp4Bytes) {
      const b64 = await page.evaluate(() => { let s = ''; const a = window.__mp4; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode(...a.subarray(i, i + 32768)); return btoa(s); });
      writeFileSync('../scratch/s1.mp4', Buffer.from(b64, 'base64'));
    }
    await browser.close();
  } catch (e) { engines[name] = { error: 'launch failed: ' + String(e.message).split('\n').slice(0, 3).join(' | ') }; }
  console.log(name, engines[name]);
}
server.close();
writeFileSync('../results/s1-export.json', JSON.stringify({ engines }, null, 2));
