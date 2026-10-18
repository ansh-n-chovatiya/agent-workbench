import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';

process.on('unhandledRejection', (e) => console.log('unhandled rejection (ignored):', String(e && e.message).split('\n')[0]));
const URL = 'https://anshchovatiya.vercel.app/';
const SECONDS = 15;
mkdirSync('../scratch/s2c', { recursive: true });
const out = { site: URL, seconds: SECONDS };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dims = (f) => execSync(`ffprobe -v error -show_entries stream=width,height -of csv=p=0 "${f}"`).toString().trim();

async function scrollWhile(page, ms) { const end = Date.now() + ms; while (Date.now() < end) { await page.mouse.wheel(0, 40); await sleep(16); } }
async function open(browser, opts, after) {
  const ctx = await browser.newContext(opts); const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 }); await sleep(4000);
  if (after) await after(page);
  return { ctx, page };
}
async function withBrowser(fn) { const b = await chromium.launch(); try { return await fn(b); } finally { await b.close().catch(() => {}); } }
function stats(stamps, bytes) {
  const span = stamps.length > 1 ? (stamps.at(-1) - stamps[0]) / 1000 : SECONDS;
  const gaps = stamps.slice(1).map((t, i) => t - stamps[i]);
  return { fps: +(stamps.length / span).toFixed(1), framesDropped: gaps.filter((g) => g > 50).length, bytesPerMinute: Math.round((bytes / span) * 60) };
}
async function screencastRun(page, ctx, maxW, maxH, extraWork) {
  const cdp = await ctx.newCDPSession(page); const stamps = []; let bytes = 0, firstBuf = null;
  cdp.on('Page.screencastFrame', async (f) => { const b = Buffer.from(f.data, 'base64'); if (!firstBuf) firstBuf = b; bytes += b.length; stamps.push(Date.now()); await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1, maxWidth: maxW, maxHeight: maxH });
  await Promise.all([scrollWhile(page, SECONDS * 1000), extraWork ? extraWork() : Promise.resolve()]);
  await cdp.send('Page.stopScreencast');
  return { ...stats(stamps, bytes), firstBuf };
}

// (a) mid-size viewports
out.a = [];
for (const [w, h] of [[2560, 1440], [3200, 1800]]) {
  const name = `a-${w}x${h}`;
  try {
    out.a.push(await withBrowser(async (b) => {
      const { ctx, page } = await open(b, { viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const r = await screencastRun(page, ctx, w, h);
      writeFileSync(`../scratch/s2c/${name}-first.jpg`, r.firstBuf);
      return { variant: name, fps: r.fps, framesDropped: r.framesDropped, bytesPerMinute: r.bytesPerMinute, framePixels: dims(`../scratch/s2c/${name}-first.jpg`) };
    }));
  } catch (e) { out.a.push({ variant: name, error: String(e.message).split('\n')[0] }); }
  console.log(out.a.at(-1));
}

// (b) CSS zoom on a 4K viewport, layout fidelity by SSIM against a plain 1080p screenshot
const ssim = (a, b) => { const r = spawnSync('ffmpeg', ['-v', 'info', '-i', a, '-i', b, '-lavfi', '[0:v]scale=1920:1080:flags=lanczos[a];[1:v]scale=1920:1080:flags=lanczos[b];[a][b]ssim', '-f', 'null', '-'], { encoding: 'utf8' }); const m = /All:([0-9.]+)/.exec(r.stderr); return m ? +m[1] : null; };
out.b = {};
try {
  await withBrowser(async (b) => {
    const base = await open(b, { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await base.page.screenshot({ path: '../scratch/s2c/b-base1.png' }); await sleep(1500); await base.page.screenshot({ path: '../scratch/s2c/b-base2.png' });
    const plain4k = await open(b, { viewport: { width: 3840, height: 2160 }, deviceScaleFactor: 1 });
    await plain4k.page.screenshot({ path: '../scratch/s2c/b-4k-plain.png' });
    const zoomed = await open(b, { viewport: { width: 3840, height: 2160 }, deviceScaleFactor: 1 }, async (p) => { await p.evaluate(() => { document.documentElement.style.zoom = '2'; }); await sleep(2500); });
    await zoomed.page.screenshot({ path: '../scratch/s2c/b-4k-zoom2.png' });
    out.b.layoutSsim = { noiseFloor_base_vs_base: ssim('../scratch/s2c/b-base1.png', '../scratch/s2c/b-base2.png'), plain4k_vs_base: ssim('../scratch/s2c/b-4k-plain.png', '../scratch/s2c/b-base1.png'), zoom2_vs_base: ssim('../scratch/s2c/b-4k-zoom2.png', '../scratch/s2c/b-base1.png') };
    out.b.innerWidthSeenByPage = await zoomed.page.evaluate(() => ({ innerWidth, devicePixelRatio, docWidth: document.documentElement.clientWidth }));
    const r = await screencastRun(zoomed.page, zoomed.ctx, 3840, 2160);
    writeFileSync('../scratch/s2c/b-zoom-first.jpg', r.firstBuf);
    Object.assign(out.b, { fps: r.fps, framesDropped: r.framesDropped, bytesPerMinute: r.bytesPerMinute, framePixels: dims('../scratch/s2c/b-zoom-first.jpg') });
  });
} catch (e) { out.b.error = String(e.message).split('\n')[0]; }
console.log('b', out.b);

// (c) hybrid: 1x stream plus high-res clip stills every 2 s
out.c = {};
try {
  await withBrowser(async (b) => {
    const { ctx, page } = await open(b, { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
    const lat = []; let n = 0;
    const stills = async () => { const end = Date.now() + SECONDS * 1000 - 1500; while (Date.now() < end) { await sleep(2000); const t = Date.now(); const buf = await page.screenshot({ type: 'jpeg', quality: 90, clip: { x: 480, y: 270, width: 960, height: 540 } }); lat.push(Date.now() - t); if (n++ === 0) writeFileSync('../scratch/s2c/c-still.jpg', buf); } };
    const r = await screencastRun(page, ctx, 1920, 1080, stills);
    out.c = { streamFps: r.fps, streamFramesDropped: r.framesDropped, stillLatencyMs: lat, stillPixels: dims('../scratch/s2c/c-still.jpg'), referenceNoStills: 'S2/S2b: about 59.5 fps, 0 dropped' };
  });
} catch (e) { out.c.error = String(e.message).split('\n')[0]; }
console.log('c', out.c);

// (d) visual: real 2x (page.screenshot, dsf 2) versus 1x frame upscaled, same CSS region
try {
  await withBrowser(async (b) => {
    const pos = async (p) => { await p.getByText('What I Build With').first().scrollIntoViewIfNeeded(); await sleep(1500); };
    const hi = await open(b, { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 }); await pos(hi.page); await hi.page.screenshot({ path: '../scratch/s2c/d-2x.png' });
    const lo = await open(b, { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }); await pos(lo.page); await lo.page.screenshot({ path: '../scratch/s2c/d-1x.png' });
  });
  execSync(`ffmpeg -v error -y -i ../scratch/s2c/d-2x.png -vf "crop=700:380:500:300" ../scratch/s2c/d-2x-crop.png`);          // 700x380 CSS region at 2x = 1400x760 real px
  execSync(`ffmpeg -v error -y -i ../scratch/s2c/d-1x.png -vf "crop=350:190:250:150,scale=700:380:flags=bicubic" ../scratch/s2c/d-1x-up-crop.png`); // same CSS region cropped from 1x then upscaled 2x
  out.d = 'images written: scratch/s2c/d-2x-crop.png and d-1x-up-crop.png (same content, true 2x versus upscaled 1x)';
} catch (e) { out.d = 'error: ' + String(e.message).split('\n')[0]; }
mkdirSync('../results', { recursive: true });
writeFileSync('../results/s2c-capture.json', JSON.stringify(out, null, 2));
console.log('done'); process.exit(0);
