import { profileContext } from './record/profiles.mjs';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startEncoder } from './record/frame-sink.mjs';
import { installWriteGuard } from './record/write-guard.mjs';

// JPEG segments carry their own lengths; skip metadata without decoding pixels.
export function readJpegSize(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset++] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === undefined || marker === 0xda || marker === 0xd9) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;
    const length = bytes[offset] * 256 + bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (length < 8) return null;
      const height = bytes[offset + 3] * 256 + bytes[offset + 4];
      const width = bytes[offset + 5] * 256 + bytes[offset + 6];
      return width && height ? { width, height } : null;
    }
    offset += length;
  }
  return null;
}

// Picks the highest capture scale that holds 50 fps with the layout intact. Layout drift is judged against the
// noise floor: scale 1 is compared with the baseline too, so on an animated page it already differs a little
// (measured 0.077 on a real site), and only the excess over that floor counts against a larger scale.
export function recommendScale(results) {
  const floor = results.find(({ scale, layoutDrift }) => scale === 1 && Number.isFinite(layoutDrift))?.layoutDrift ?? 0;
  const eligible = results.filter(({ scale, fps, pipelineFps, layoutDrift, error }) => !error &&
    Number.isFinite(scale) && scale > 0 && Number.isFinite(pipelineFps ?? fps) && (pipelineFps ?? fps) >= 50 &&
    Number.isFinite(layoutDrift) && layoutDrift >= 0 && layoutDrift - floor <= 0.02);
  return eligible.length ? Math.max(...eligible.map(({ scale }) => scale)) : 1;
}

async function openPage(browser, url, scale, options = {}) {
  const viewport = options.viewport ?? { width: 1920, height: 1080 };
  const context = await browser.newContext({
    viewport: { width: Math.round(viewport.width * scale), height: Math.round(viewport.height * scale) },
    deviceScaleFactor: 1, ...profileContext(options.profile),
    storageState: options.storageState,
  });
  try {
    if (options.guard) await installWriteGuard(context, options.guard);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(async (zoom) => {
      document.documentElement.style.zoom = String(zoom);
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, scale);
    return { context, page };
  } catch (error) { await context.close(); throw error; }
}

function boxes(page, scale) {
  return page.evaluate((zoom) => ['nav a', 'h1', '.card', 'main section'].map((selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return ['x', 'y', 'width', 'height'].map((key) => box[key] / zoom);
  }), scale);
}

export function layoutDrift(base, scaled) {
  const differences = base.flatMap((box, i) => {
    if (!box || !scaled[i]) return [1];
    // A one-pixel floor makes coordinates at zero meaningful without division by zero.
    return box.map((value, key) => Math.abs(scaled[i][key] - value) / Math.max(1, Math.abs(value)));
  });
  return differences.reduce((sum, value) => sum + value, 0) / differences.length;
}

async function capture(page, context, seconds, onFrame) {
  const cdp = await context.newCDPSession(page);
  const stamps = [];
  let bytes = 0, first = null, failure;
  cdp.on('Page.screencastFrame', (frame) => {
    // Ack immediately so Node-side measurements do not throttle Chromium.
    void cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => {});
    const jpeg = Buffer.from(frame.data, 'base64');
    try { onFrame?.(jpeg, frame.metadata.timestamp); } catch (error) { failure ??= error; }
    first ??= jpeg;
    bytes += jpeg.length;
    stamps.push(performance.now());
  });
  try {
    // Screencast emits a frame only when the page changes, so a still page would measure how often the page
    // updates rather than what the capture pipeline can sustain. A 2 px fixed square on a compositor animation
    // makes every display frame differ; it is out of flow, so it cannot move any layout.
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = '@keyframes sr-beat{from{transform:translateX(0)}to{transform:translateX(40px)}}'
        + '#sr-beat{position:fixed;left:0;top:0;width:2px;height:2px;background:#000;opacity:.02;pointer-events:none;animation:sr-beat .4s linear infinite alternate}';
      const beat = document.createElement('div');
      beat.id = 'sr-beat';
      document.head.append(style);
      document.body.append(beat);
    });
    const { width, height } = page.viewportSize();
    await cdp.send('Page.startScreencast', {
      format: 'jpeg', quality: 90, everyNthFrame: 1, maxWidth: width, maxHeight: height,
    });
    const start = performance.now();
    // No scripted input here: driving the page through Playwright (wheel events) lowers the screencast rate by itself
    // (about 42 fps on this machine), which would hide what the capture pipeline can sustain at each scale.
    await sleep(seconds * 1000);
    await cdp.send('Page.stopScreencast');
    const elapsed = (performance.now() - start) / 1000;
    if (failure) throw failure;
    const size = readJpegSize(first);
    if (!size) throw new Error('Screencast produced no readable JPEG frame');
    return {
      fps: Number((stamps.length / elapsed).toFixed(1)),
      framesDropped: stamps.slice(1).filter((stamp, i) => stamp - stamps[i] > 50).length,
      bytesPerMinute: Math.round(bytes / elapsed * 60), framePixels: `${size.width}x${size.height}`,
    };
  } finally {
    try { await cdp.send('Page.stopScreencast').catch(() => {}); }
    finally { await cdp.detach().catch(() => {}); }
  }
}

export async function benchmarkCapture({ url, scales = [1, 1.33, 1.67, 2], seconds = 4 }) {
  if (!Number.isFinite(seconds) || seconds <= 0 || scales.some((scale) => !Number.isFinite(scale) || scale <= 0)) {
    throw new Error('Capture scales and seconds must be positive finite numbers');
  }
  let browser;
  try {
    browser = await chromium.launch();
    const baseline = await openPage(browser, url, 1);
    let base;
    try { base = await boxes(baseline.page, 1); }
    finally { await baseline.context.close(); }
    const results = [];
    for (const scale of scales) {
      let context;
      try {
        const opened = await openPage(browser, url, scale);
        context = opened.context;
        const drift = layoutDrift(base, await boxes(opened.page, scale));
        results.push({ scale, ...await capture(opened.page, context, seconds), layoutDrift: drift });
      } catch (error) { results.push({ scale, error: error.message }); }
      finally { await context?.close().catch(() => {}); }
    }
    return results;
  } finally { await browser?.close().catch(() => {}); }
}

export async function measureLayoutGuard(browser, url, scale, options = {}) {
  let base;
  const measurements = [];
  for (const current of [1, 1, scale]) {
    const opened = await openPage(browser, url, current, options);
    try {
      const measured = await boxes(opened.page, current);
      if (!base) base = measured;
      else measurements.push(layoutDrift(base, measured));
    } finally { await opened.context.close(); }
  }
  return measurements[1] - measurements[0];
}

export async function benchmarkPipeline({ url, scales = [1, 1.33, 1.67, 2], seconds = 4,
  browser: suppliedBrowser, viewport, profile, guard = {}, storageState } = {}) {
  if (!Number.isFinite(seconds) || seconds <= 0
    || scales.some((scale) => !Number.isFinite(scale) || scale <= 0)) {
    throw new Error('Capture scales and seconds must be positive finite numbers');
  }
  let browser, directory;
  const options = { viewport, profile, guard, storageState };
  try {
    directory = await mkdtemp(path.join(os.tmpdir(), 'showreel-pipeline-'));
    browser = suppliedBrowser ?? await chromium.launch();
    const baseline = await openPage(browser, url, 1, options);
    let base;
    try { base = await boxes(baseline.page, 1); }
    finally { await baseline.context.close(); }
    const results = [];
    for (const scale of scales) {
      let context, encoder;
      try {
        const opened = await openPage(browser, url, scale, options);
        context = opened.context;
        const drift = layoutDrift(base, await boxes(opened.page, scale));
        const { width, height } = opened.page.viewportSize();
        encoder = await startEncoder({ browser, width, height,
          outFile: path.join(directory, `${scale}.mp4`) });
        const start = performance.now();
        const captured = await capture(opened.page, context, seconds,
          (jpeg, ts) => encoder.push(jpeg, ts));
        const stats = await encoder.finish(Date.now() / 1000);
        encoder = null;
        results.push({ scale, ...captured, layoutDrift: drift,
          pipelineFps: Number((stats.frames / ((performance.now() - start) / 1000)).toFixed(1)),
          dropped: stats.dropped, maxBacklog: stats.maxBacklog });
      } catch (error) { results.push({ scale, error: error.message }); }
      finally {
        try { await encoder?.finish().catch(() => {}); }
        finally { await context?.close(); }
      }
    }
    return results;
  } finally {
    try { if (!suppliedBrowser) await browser?.close(); }
    finally { if (directory) await rm(directory, { recursive: true, force: true }); }
  }
}
