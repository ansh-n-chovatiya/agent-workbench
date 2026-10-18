import { build } from 'esbuild';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const seconds = Number(process.argv[2] ?? 10);
const target = process.argv[3] ?? 'buffer';
await build({ entryPoints: ['page.js'], bundle: true, format: 'iife', outfile: '../scratch/s8-page.js', logLevel: 'error' });
mkdirSync('../results', { recursive: true });
const server = createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end('<!doctype html><title>s8</title>'); }).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const browser = await chromium.launch();
const browserRssMb = () => { // resident memory of every process whose command lives in the Playwright Chromium folder
  const rows = execSync('ps -axo rss=,command=').toString().split('\n').filter((l) => l.includes('chromium_headless_shell') || l.includes('ms-playwright/chromium-'));
  return rows.reduce((a, l) => a + parseInt(l.trim(), 10), 0) / 1024;
};
let result = { width: 3840, height: 2160, fps: 60, seconds, target, completed: false };
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.addScriptTag({ path: '../scratch/s8-page.js' });
  const cdp = await page.context().newCDPSession(page); await cdp.send('Runtime.enable');
  let peakHeap = 0, peakRss = 0, stop = false;
  const sampler = (async () => { while (!stop) { const h = await cdp.send('Runtime.getHeapUsage').catch(() => null); if (h) peakHeap = Math.max(peakHeap, h.usedSize / 1048576); peakRss = Math.max(peakRss, browserRssMb()); await new Promise((r) => setTimeout(r, 500)); } })();
  const r = await page.evaluate(([s, t]) => window.run4k(s, t), [seconds, target]);
  stop = true; await sampler;
  result = { ...result, ...r, peakJsHeapMb: Math.round(peakHeap), peakBrowserRssMb: Math.round(peakRss) };
  if (target !== 'stream') {
    const b64 = await page.evaluate(() => { let s = ''; const a = window.__mp4; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode(...a.subarray(i, i + 32768)); return btoa(s); });
    writeFileSync(`../scratch/s8-${seconds}s.mp4`, Buffer.from(b64, 'base64'));
    result.ffprobe = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,nb_frames -of csv=p=0 ../scratch/s8-${seconds}s.mp4`).toString().trim();
  }
} catch (e) { result.error = String(e.message).split('\n')[0]; }
finally { await browser.close().catch(() => {}); server.close(); }
writeFileSync(`../results/s8-memory-${target}-${seconds}s.json`, JSON.stringify(result, null, 2)); console.log(result);
process.exit(0);
