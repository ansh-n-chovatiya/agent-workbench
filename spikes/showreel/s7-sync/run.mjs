import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';

const seconds = Number(process.argv[2] ?? 180);
const mode = { correct: process.argv.includes('--correct'), load: process.argv.includes('--load'), seconds };
const name = `s7-sync${mode.load ? '-load' : ''}${mode.correct ? '-corrected' : '-free'}`;
const video = readFileSync('../scratch/s7-180s.mp4');
const server = createServer((req, res) => {
  if (req.url === '/') { res.setHeader('content-type', 'text/html'); res.end(readFileSync('page.html')); return; }
  if (req.url === '/s7.mp4') { // range support so the video can seek
    const range = req.headers.range; res.setHeader('accept-ranges', 'bytes'); res.setHeader('content-type', 'video/mp4');
    if (range) { const [a, b] = range.replace('bytes=', '').split('-'); const s = +a, e = b ? +b : video.length - 1; res.statusCode = 206; res.setHeader('content-range', `bytes ${s}-${e}/${video.length}`); res.setHeader('content-length', e - s + 1); res.end(video.subarray(s, e + 1)); }
    else { res.setHeader('content-length', video.length); res.end(video); }
    return;
  }
  res.statusCode = 404; res.end();
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const { drift, nudges, seeks } = await page.evaluate((m) => window.start(m), mode);
  const med = [...drift].sort((a, b) => a - b)[Math.floor(drift.length / 2)];
  const dev = drift.map((d) => Math.abs(d - med)).sort((a, b) => a - b);
  const q = (p) => +dev[Math.min(dev.length - 1, Math.floor(dev.length * p))].toFixed(1);
  const n = drift.length, xs = drift.map((_, i) => i), mx = (n - 1) / 2, my = drift.reduce((a, b) => a + b, 0) / n;
  const slopePerFrame = xs.reduce((a, x, i) => a + (x - mx) * (drift[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const out = { mode: name, seconds, frames: n, offsetMedianMs: +med.toFixed(1), driftP95AroundMedianMs: q(0.95), driftMaxAroundMedianMs: +dev.at(-1).toFixed(1), slopeMsPerMinute: +(slopePerFrame * 30 * 60).toFixed(2), absP95VsAudioMs: +[...drift].map(Math.abs).sort((a, b) => a - b)[Math.floor(n * 0.95)].toFixed(1), nudges, seeks };
  writeFileSync(`../results/${name}.json`, JSON.stringify(out, null, 2)); console.log(out);
} finally { await browser.close().catch(() => {}); server.close(); }
process.exit(0);
