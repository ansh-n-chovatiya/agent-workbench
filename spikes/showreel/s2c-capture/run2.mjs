import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';

process.on('unhandledRejection', (e) => console.log('unhandled rejection (ignored):', String(e && e.message).split('\n')[0]));
const URL = 'https://anshchovatiya.vercel.app/';
const SECONDS = 15;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dims = (f) => execSync(`ffprobe -v error -show_entries stream=width,height -of csv=p=0 "${f}"`).toString().trim();
const ssim = (a, b) => { const r = spawnSync('ffmpeg', ['-v', 'info', '-i', a, '-i', b, '-lavfi', '[0:v]scale=1920:1080:flags=lanczos[a];[1:v]scale=1920:1080:flags=lanczos[b];[a][b]ssim', '-f', 'null', '-'], { encoding: 'utf8' }); const m = /All:([0-9.]+)/.exec(r.stderr); return m ? +m[1] : null; };
async function scrollWhile(page, ms) { const end = Date.now() + ms; while (Date.now() < end) { await page.mouse.wheel(0, 40); await sleep(16); } }
async function open(b, opts, after) { const ctx = await b.newContext(opts); const page = await ctx.newPage(); await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 }); await sleep(4000); if (after) await after(page); return { ctx, page }; }
async function withBrowser(fn) { const b = await chromium.launch(); try { return await fn(b); } finally { await b.close().catch(() => {}); } }
function stats(stamps, bytes) { const span = stamps.length > 1 ? (stamps.at(-1) - stamps[0]) / 1000 : SECONDS; const gaps = stamps.slice(1).map((t, i) => t - stamps[i]); return { fps: +(stamps.length / span).toFixed(1), framesDropped: gaps.filter((g) => g > 50).length, bytesPerMinute: Math.round((bytes / span) * 60) }; }
async function screencastRun(page, ctx, maxW, maxH, work) {
  const cdp = await ctx.newCDPSession(page); const stamps = []; let bytes = 0, first = null;
  cdp.on('Page.screencastFrame', async (f) => { const b = Buffer.from(f.data, 'base64'); if (!first) first = b; bytes += b.length; stamps.push(Date.now()); await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1, maxWidth: maxW, maxHeight: maxH });
  await Promise.all([scrollWhile(page, SECONDS * 1000), work ? work() : Promise.resolve()]);
  await cdp.send('Page.stopScreencast');
  return { ...stats(stamps, bytes), first };
}
const out = { b2: [], c2: {} };

// b2: zoom trick at viewports that hold 60 fps; zoom = viewportWidth / 1920 keeps the desktop layout
for (const [w, h] of [[2560, 1440], [3200, 1800]]) {
  const z = w / 1920, name = `b2-${w}x${h}-zoom${z.toFixed(2)}`;
  try {
    await withBrowser(async (b) => {
      const base = await open(b, { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }); await base.page.screenshot({ path: '../scratch/s2c/b2-base.png' });
      const zo = await open(b, { viewport: { width: w, height: h }, deviceScaleFactor: 1 }, async (p) => { await p.evaluate((zz) => { document.documentElement.style.zoom = String(zz); }, z); await sleep(2500); });
      await zo.page.screenshot({ path: `../scratch/s2c/${name}.png` });
      const layoutSsim = ssim(`../scratch/s2c/${name}.png`, '../scratch/s2c/b2-base.png');
      const r = await screencastRun(zo.page, zo.ctx, w, h);
      writeFileSync(`../scratch/s2c/${name}-first.jpg`, r.first);
      out.b2.push({ variant: name, scale: +z.toFixed(2), layoutSsimVsBase1080p: layoutSsim, fps: r.fps, framesDropped: r.framesDropped, bytesPerMinute: r.bytesPerMinute, framePixels: dims(`../scratch/s2c/${name}-first.jpg`) });
    });
  } catch (e) { out.b2.push({ variant: name, error: String(e.message).split('\n')[0] }); }
  console.log(out.b2.at(-1));
}

// c2: continuous high-res region stills (dsf 2, 960x540 CSS clip), alone and alongside the 1x stream
try {
  await withBrowser(async (b) => {
    const { ctx, page } = await open(b, { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
    const clip = { x: 480, y: 270, width: 960, height: 540 };
    const loop = async (ms, sink) => { const end = Date.now() + ms; while (Date.now() < end) { const buf = await page.screenshot({ type: 'jpeg', quality: 90, clip }); sink.stamps.push(Date.now()); sink.bytes += buf.length; } };
    const alone = { stamps: [], bytes: 0 };
    await Promise.all([scrollWhile(page, 8000), loop(8000, alone)]);
    out.c2.stillsAlone = stats(alone.stamps, alone.bytes);
    const together = { stamps: [], bytes: 0 };
    const r = await screencastRun(page, ctx, 1920, 1080, () => loop(SECONDS * 1000, together));
    out.c2.stillsWithStream = stats(together.stamps, together.bytes);
    out.c2.streamWhileStillsRun = { fps: r.fps, framesDropped: r.framesDropped };
    out.c2.stillPixels = '1920x1080 for the 960x540 CSS clip (true 2x)';
  });
} catch (e) { out.c2.error = String(e.message).split('\n')[0]; }
console.log('c2', out.c2);
writeFileSync('../results/s2c-capture-2.json', JSON.stringify(out, null, 2));
process.exit(0);
