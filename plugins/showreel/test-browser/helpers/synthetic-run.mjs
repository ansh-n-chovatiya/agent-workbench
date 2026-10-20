import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { projectDir } from '../../scripts/lib/paths.mjs';
import { DEFAULT_BRIEF } from '../../scripts/lib/brief.mjs';
import { startRenderServer } from '../../scripts/lib/compose/render.mjs';

let bundle;
async function helperBundle() {
  bundle ??= build({ stdin: { resolveDir: fileURLToPath(new URL('../../', import.meta.url)), contents: `
    import { Output, Mp4OutputFormat, BufferTarget, CanvasSource, canEncodeVideo,
      Input, UrlSource, ALL_FORMATS, CanvasSink } from 'mediabunny';
    window.makeSynthetic = async ({ background = '#808080', duration = 4, motionSize = 40 } = {}) => {
      const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
      const ctx = canvas.getContext('2d');
      let codec;
      for (const c of ['avc', 'vp9']) if (await canEncodeVideo(c, { width: 1280, height: 720, bitrate: 8e6 })) { codec = c; break; }
      if (!codec) throw new Error('No synthetic encoder');
      const target = new BufferTarget();
      const output = new Output({ format: new Mp4OutputFormat(), target });
      const source = new CanvasSource(canvas, { codec, bitrate: 8e6, keyFrameInterval: 2 });
      output.addVideoTrack(source, { frameRate: 30 });
      let done = false;
      try {
        await output.start();
        for (let k = 0; k < Math.round(duration * 30); k++) {
          ctx.fillStyle = background; ctx.fillRect(0, 0, 1280, 720);
          ctx.fillStyle = '#ff0000'; ctx.fillRect(200, 100, 60, 60);
          ctx.fillStyle = '#0000ff'; ctx.fillRect(900, 500, 80, 80);
          ctx.fillStyle = '#00ff00'; ctx.fillRect(40 + 280 * (k / 30), Math.min(650, 690 - motionSize), motionSize, motionSize);
          await source.add(k / 30, 1 / 30);
        }
        source.close(); await output.finalize(); done = true;
        const data = new Uint8Array(target.buffer); let binary = '';
        for (let i = 0; i < data.length; i += 32768) binary += String.fromCharCode(...data.subarray(i, i + 32768));
        return { base64: btoa(binary), codec };
      } finally { if (!done) await output.cancel(); }
    };
    window.inspectFrames = async (url, timestamps, probes = []) => {
      const input = new Input({ source: new UrlSource(url), formats: ALL_FORMATS });
      try {
        const track = await input.getPrimaryVideoTrack();
        const stats = await track.computePacketStats();
        const sink = new CanvasSink(track, { poolSize: 2 });
        const frames = []; let index = 0;
        for await (const wrapped of sink.canvasesAtTimestamps(timestamps)) {
          if (!wrapped) throw new Error('Missing decoded frame');
          const canvas = wrapped.canvas, ctx = canvas.getContext('2d');
          const { width, height } = canvas, data = ctx.getImageData(0, 0, width, height).data;
          const boxes = Object.fromEntries(['red', 'blue', 'green'].map((name) => [name, { x0: width, y0: height, x1: -1, y1: -1, count: 0 }]));
          for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
            const name = r >= 231 && g <= 24 && b <= 24 ? 'red'
              : b >= 231 && r <= 24 && g <= 24 ? 'blue' : g >= 231 && r <= 24 && b <= 24 ? 'green' : null;
            if (name) { const box = boxes[name]; box.x0 = Math.min(box.x0, x); box.x1 = Math.max(box.x1, x);
              box.y0 = Math.min(box.y0, y); box.y1 = Math.max(box.y1, y); box.count++; }
          }
          const samples = (probes[index] ?? []).map(({ x, y, radius = 0, color, tolerance = 24 }) => {
            let matches = 0; const pixels = [];
            for (let py = Math.max(0, Math.round(y) - radius); py <= Math.min(height - 1, Math.round(y) + radius); py++) {
              for (let px = Math.max(0, Math.round(x) - radius); px <= Math.min(width - 1, Math.round(x) + radius); px++) {
                const offset = (py * width + px) * 4, rgb = [...data.slice(offset, offset + 3)];
                if (color?.every((c, channel) => Math.abs(c - rgb[channel]) <= tolerance)) matches++;
                if (radius === 0) pixels.push(rgb);
              }
            }
            return { matches, pixels };
          });
          const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map((b) => b.toString(16).padStart(2, '0')).join('');
          const grid = []; const gw = 32, gh = 18;
          for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
            let r = 0, g = 0, b = 0, n = 0;
            for (let y = Math.floor(gy * height / gh); y < Math.floor((gy + 1) * height / gh); y += 4) {
              for (let x = Math.floor(gx * width / gw); x < Math.floor((gx + 1) * width / gw); x += 4) {
                const o = (y * width + x) * 4; r += data[o]; g += data[o + 1]; b += data[o + 2]; n++;
              }
            }
            grid.push(r / n, g / n, b / n);
          }
          frames.push({ boxes, samples, digest, grid }); index++;
        }
        return { width: await track.getDisplayWidth(), height: await track.getDisplayHeight(), codec: await track.getCodec(),
          duration: await track.computeDuration(), fps: stats.averagePacketRate, frames };
      } finally { input.dispose(); }
    };
  ` }, bundle: true, write: false, format: 'iife', platform: 'browser' }).then((result) => result.outputFiles[0].text);
  return bundle;
}

export async function inspectionPage(browser, rawFile, outFile, assets = new Map()) {
  const server = await startRenderServer({ rawFile, outFile, assets });
  let page;
  try {
    page = await browser.newPage(); await page.goto(server.url);
    await page.addScriptTag({ content: await helperBundle() });
    return { page, server, url: new URL('raw.mp4', server.url).href,
      async close() { try { await page.close(); } finally { await server.close(); } } };
  } catch (error) { try { await page?.close(); } finally { await server.close(); } throw error; }
}

export async function syntheticRun(browser, { name = 'synthetic', runId = '20261018-120000', background = '#808080', duration = 4, motionSize = 40 } = {}) {
  const dir = projectDir(name), runDir = path.join(dir, 'runs', runId);
  await mkdir(runDir, { recursive: true });
  const rawFile = path.join(runDir, 'raw.mp4'), scratch = path.join(runDir, 'bootstrap.mp4');
  await writeFile(rawFile, '');
  let session, encoded;
  try {
    session = await inspectionPage(browser, rawFile, scratch);
    encoded = await session.page.evaluate(options => window.makeSynthetic(options), {background,duration,motionSize});
  } finally { try { await session?.close(); } finally { await rm(scratch, { force: true }); } }
  const bytes = Buffer.from(encoded.base64, 'base64'); await writeFile(rawFile, bytes);
  const events = { version: 1, viewport: { width: 1280, height: 720 }, scale: 1,
    cursor: Array.from({ length: 67 }, (_, i) => ({ t: 0.5 + i / 60, x: 100 + 840 * i / 66, y: 100 + 440 * i / 66 })),
    clicks: [{ t: 1.7, x: 940, y: 540, stepId: 's1', tab: 0 }],
    targets: [{ t: 1.2, stepId: 's1', kind: 'click', sensitive: false, box: { x: 900, y: 500, w: 80, h: 80 } }],
    steps: [{ id: 's1', tStart: 0.1, holdStart: Math.min(1.8,duration-0.2), tEnd: duration-0.2 }], keys: [], moves: [], blocked: [], tabs: [],
  };
  const record = { version: 1, projectName: name, runId, startedAt: '2026-10-18T12:00:00.000Z',
    scale: { requested: 1, used: 1, reason: 'synthetic' }, fps: { nominal: 30, effective: 30, dropped: 0, maxBacklog: 0 },
    video: { file: 'raw.mp4', width: 1280, height: 720, durationSec: duration, bytes: bytes.length },
    durationSec: duration, warnings: [], codec: encoded.codec };
  const storyboard = { version: 1, steps: [{ id: 's1', caption: 'Open the report' }] };
  const brief = structuredClone(DEFAULT_BRIEF);
  Object.assign(brief, { topic: 'Synthetic report', theme: 'clean', captions: { enabled: true, mode: 'band' },
    titleCard: { enabled: false, title: 'Synthetic report', subtitle: 'A deterministic recording' }, outroCard: { enabled: false, text: 'Thank you' } });
  for (const [file, value] of Object.entries({ brief, storyboard, config: { baseURL: 'https://example.com' } })) {
    await writeFile(path.join(dir, `${file}.json`), JSON.stringify(value, null, 2) + '\n');
  }
  for (const [file, value] of Object.entries({ events, record })) await writeFile(path.join(runDir, `${file}.json`), JSON.stringify(value, null, 2) + '\n');
  return { name, dir, runDir, rawFile, brief, storyboard, events, record };
}
