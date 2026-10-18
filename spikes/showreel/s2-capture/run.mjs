import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, statSync, readdirSync, rmSync } from 'node:fs';

const URL = 'https://anshchovatiya.vercel.app/';
const SECONDS = 15;
rmSync('../scratch/s2', { recursive: true, force: true });
mkdirSync('../scratch/s2', { recursive: true });
const methods = {};

async function scrollFor(page, seconds) {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) { await page.mouse.wheel(0, 40); await page.waitForTimeout(16); }
}

for (const [name, quality, dsf] of [['screencast-jpeg-90', 90, 1], ['screencast-jpeg-100', 100, 1], ['screencast-jpeg-90-dsf2', 90, 2]]) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' }); await page.waitForTimeout(2000);
  const cdp = await ctx.newCDPSession(page);
  let frames = 0, bytes = 0, w = 0, h = 0; const stamps = [];
  cdp.on('Page.screencastFrame', async (f) => {
    if (frames === 0) writeFileSync(`../scratch/s2/${name}-first.jpg`, Buffer.from(f.data, 'base64'));
    frames++; bytes += Buffer.byteLength(f.data, 'base64'); w = f.metadata.deviceWidth; h = f.metadata.deviceHeight;
    stamps.push(f.metadata.timestamp);
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId });
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality, everyNthFrame: 1, maxWidth: 1920 * dsf, maxHeight: 1080 * dsf });
  await scrollFor(page, SECONDS);
  await cdp.send('Page.stopScreencast');
  const span = stamps.length > 1 ? stamps.at(-1) - stamps[0] : SECONDS;
  const gaps = stamps.slice(1).map((t, i) => t - stamps[i]);
  methods[name] = { fps: +(frames / span).toFixed(1), framesDropped: gaps.filter((g) => g > 0.05).length,
    bytesPerMinute: Math.round((bytes / span) * 60), width: w, height: h, frames };
  console.log(name, methods[name]);
  await browser.close();
}

{ // Playwright built-in video for comparison
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: '../scratch/s2', size: { width: 1920, height: 1080 } } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' }); await page.waitForTimeout(2000);
  await scrollFor(page, SECONDS);
  await ctx.close(); await browser.close();
  const f = readdirSync('../scratch/s2').find((x) => x.endsWith('.webm'));
  const size = statSync('../scratch/s2/' + f).size;
  methods['playwright-recordVideo'] = { fps: null, framesDropped: null, bytesPerMinute: Math.round((size / SECONDS) * 60), width: 1920, height: 1080, file: 'page.webm' };
  console.log('playwright-recordVideo', methods['playwright-recordVideo']);
}
mkdirSync('../results', { recursive: true });
writeFileSync('../results/s2-capture.json', JSON.stringify({ site: URL, seconds: SECONDS, methods }, null, 2));
