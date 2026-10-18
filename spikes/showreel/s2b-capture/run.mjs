import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

process.on('unhandledRejection', (e) => console.log('unhandled rejection (ignored):', String(e && e.message).split('\n')[0]));
const URL = 'https://anshchovatiya.vercel.app/';
const SECONDS = 15;
const LAUNCH = process.env.CHANNEL ? { channel: process.env.CHANNEL } : {};
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const OUT = process.env.OUT || '../results/s2b-capture.json';
const want = (v) => !ONLY || ONLY.some((p) => v.startsWith(p));
mkdirSync('../scratch/s2b', { recursive: true });
const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dims = (f) => execSync(`ffprobe -v error -show_entries stream=width,height -of csv=p=0 "${f}"`).toString().trim().split(',').map(Number);

async function scrollWhile(page, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { await page.mouse.wheel(0, 40); await sleep(16); }
}
async function open(browser, vw, vh, dsf) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 }); await sleep(4000);
  return { ctx, page };
}
async function stillPosition(page) { // identical scroll position for the sharpness stills
  await page.evaluate(() => window.scrollTo(0, 0)); await sleep(300);
  await page.getByText('What I Build With').first().scrollIntoViewIfNeeded(); await sleep(1000);
}
function summarize(variant, stamps, bytes, extra = {}) {
  const span = stamps.length > 1 ? (stamps.at(-1) - stamps[0]) / 1000 : SECONDS;
  const gaps = stamps.slice(1).map((t, i) => t - stamps[i]);
  return { variant, supported: true, fps: +(stamps.length / span).toFixed(1), framesDropped: gaps.filter((g) => g > 50).length,
    bytesPerMinute: Math.round((bytes / span) * 60), frames: stamps.length, ...extra };
}
async function finish(r, firstPath, stillPath, cropScale) {
  const [w, h] = dims(stillPath); r.framePixelWidth = w; r.framePixelHeight = h;
  const [fw, fh] = dims(firstPath); r.firstFramePixels = `${fw}x${fh}`;
  execSync(`ffmpeg -v error -y -i "${stillPath}" -vf "crop=${700 * cropScale}:${380 * cropScale}:${100 * cropScale}:${200 * cropScale}" ../scratch/s2b/${r.variant}-crop.png`);
  results.push(r); console.log(r);
}

async function screencastVariant(variant, vw, vh, dsf, useOverride) {
  if (!want(variant)) return;
  const browser = await chromium.launch(LAUNCH);
  try {
    const { ctx, page } = await open(browser, vw, vh, 1 /* context dsf */ === 1 && useOverride ? 1 : dsf);
    const cdp = await ctx.newCDPSession(page);
    if (useOverride) await cdp.send('Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: dsf, mobile: false });
    const stamps = []; let bytes = 0, first = null; let latest = null;
    cdp.on('Page.screencastFrame', async (f) => {
      if (!first) { first = Buffer.from(f.data, 'base64'); writeFileSync(`../scratch/s2b/${variant}-first.jpg`, first); }
      latest = Buffer.from(f.data, 'base64'); bytes += latest.length; stamps.push(Date.now());
      await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1, maxWidth: vw * dsf, maxHeight: vh * dsf });
    await scrollWhile(page, SECONDS * 1000);
    const r = summarize(variant, stamps, bytes);
    await stillPosition(page); await page.mouse.wheel(0, 1); await sleep(600);
    writeFileSync(`../scratch/s2b/${variant}-still.jpg`, latest);
    await cdp.send('Page.stopScreencast');
    await finish(r, `../scratch/s2b/${variant}-first.jpg`, `../scratch/s2b/${variant}-still.jpg`, vw * dsf / 1920);
  } catch (e) { results.push({ variant, supported: false, notes: String(e.message).split('\n')[0] }); console.log(variant, 'FAILED', e.message.split('\n')[0]); }
  await browser.close();
}

async function loopVariant(variant, grab) {
  if (!want(variant)) return;
  const browser = await chromium.launch(LAUNCH);
  try {
    const { ctx, page } = await open(browser, 1920, 1080, 2);
    const cdp = await ctx.newCDPSession(page);
    const stamps = []; let bytes = 0; let go = true;
    const scroller = scrollWhile(page, SECONDS * 1000).then(() => { go = false; });
    let firstSaved = false;
    while (go) { const b = await grab(page, cdp); if (!firstSaved) { writeFileSync(`../scratch/s2b/${variant}-first.jpg`, b); firstSaved = true; } bytes += b.length; stamps.push(Date.now()); }
    await scroller;
    const r = summarize(variant, stamps, bytes);
    await stillPosition(page);
    writeFileSync(`../scratch/s2b/${variant}-still.jpg`, await grab(page, cdp));
    await finish(r, `../scratch/s2b/${variant}-first.jpg`, `../scratch/s2b/${variant}-still.jpg`, 2);
  } catch (e) { results.push({ variant, supported: false, notes: String(e.message).split('\n')[0] }); console.log(variant, 'FAILED', e.message.split('\n')[0]); }
  await browser.close();
}

await screencastVariant('A-viewport-4k-dsf1', 3840, 2160, 1, false);
await loopVariant('B-captureScreenshot-dsf2', async (page, cdp) => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, fromSurface: true })).data, 'base64'));
await loopVariant('C-page.screenshot-dsf2', async (page) => page.screenshot({ type: 'jpeg', quality: 90 }));
await screencastVariant('D-cdp-override-dsf2', 1920, 1080, 2, true);

if (want('E')) { // E: BeginFrame control (may be unsupported)
  const variant = 'E-beginFrame-dsf2';
  const args = ['--enable-begin-frame-control', '--run-all-compositor-stages-before-draw', '--disable-new-content-rendering-timeout', '--disable-threaded-animation', '--disable-threaded-scrolling', '--disable-checker-imaging'];
  const work = (async () => {
    const browser = await chromium.launch({ args });
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
    await cdp.send('HeadlessExperimental.enable');
    const stamps = []; let bytes = 0; let ticks = 1000;
    const frame = async () => { const r = await cdp.send('HeadlessExperimental.beginFrame', { frameTimeTicks: ticks, interval: 16.666, screenshot: { format: 'jpeg', quality: 90 } }); ticks += 16.666; return r.screenshotData ? Buffer.from(r.screenshotData, 'base64') : null; };
    const nav = page.goto(URL, { waitUntil: 'commit' }).catch(() => {}); for (let i = 0; i < 180; i++) { await frame(); await sleep(16); } await nav; 
    const end = Date.now() + SECONDS * 1000; let first = false;
    while (Date.now() < end) { await page.mouse.wheel(0, 40).catch(() => {}); const b = await frame(); if (b) { if (!first) { writeFileSync(`../scratch/s2b/${variant}-first.jpg`, b); first = true; } bytes += b.length; stamps.push(Date.now()); } }
    if (!first) throw new Error('beginFrame returned no screenshot data');
    const r = summarize(variant, stamps, bytes);
    writeFileSync(`../scratch/s2b/${variant}-still.jpg`, await frame() || Buffer.alloc(0));
    await finish(r, `../scratch/s2b/${variant}-first.jpg`, `../scratch/s2b/${variant}-first.jpg`, 2);
    await browser.close();
  })();
  work.catch(() => {});
  try { await Promise.race([work, sleep(60000).then(() => { throw new Error('timed out after 60 s (page never rendered under BeginFrame control)'); })]); }
  catch (e) { results.push({ variant, supported: false, notes: String(e.message).split('\n')[0] }); console.log(variant, 'FAILED', e.message.split('\n')[0]); }
}
mkdirSync('../results', { recursive: true });
writeFileSync(OUT, JSON.stringify({ site: URL, seconds: SECONDS, channel: process.env.CHANNEL || 'headless-shell', results }, null, 2));
process.exit(0);
