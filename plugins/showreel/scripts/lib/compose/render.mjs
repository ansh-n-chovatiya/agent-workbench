import http from 'node:http';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { access, mkdir, open, readFile, readdir, realpath, stat, writeFile, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { projectDir } from '../paths.mjs';
import { readProjectFile } from '../project.mjs';
import { localRunId } from '../record/timing.mjs';
import { buildComposition, validateComposition, safeImagePath, resolveComposition } from './composition.mjs';
import { planRender } from './plan.mjs';
import { imageAssetUrl, cursorImageWarning } from './custom-cursor.mjs';
import { toSrt, toVtt } from './captions.mjs';

const root = new URL('../../../', import.meta.url);
const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
async function writeRenderChunk(file, data, position) {
  if (!Number.isSafeInteger(position) || position < 0) throw new Error('Invalid chunk position');
  let offset = 0;
  while (offset < data.length) {
    const { bytesWritten } = await file.write(data, offset, data.length - offset, position + offset);
    if (!bytesWritten) throw new Error('Render write made no progress');
    offset += bytesWritten;
  }
  return position + offset;
}

// Shared with browser tests so production Range and chunk transport are exercised.
export async function resolveImageAssets(composition, dir) {
  const c = resolveComposition(composition), assets = new Map(), root = await realpath(dir);
  assets.warnings = [];
  const custom = c.cursor.style === 'custom' ? ['arrow', 'hand', 'text'].map((shape) => c.cursor.custom?.[shape]).filter(Boolean) : [];
  for (const spec of [c.frame.background, c.cards.title.background, c.cards.outro.background, c.cards.title.logo, c.cards.outro.logo, ...custom]) {
    if (!spec?.image) continue;
    if (!safeImagePath(spec.image)) throw new Error('Image must be inside the project');
    const isCursor = custom.includes(spec);
    if (isCursor && !/\.(png|svg|webp)$/i.test(spec.image)) throw new Error(`Unsupported cursor image format: ${spec.image}`);
    let file;
    try { file = await realpath(path.join(root, spec.image)); }
    catch (error) {
      if (!isCursor || error.code !== 'ENOENT') throw error;
      assets.warnings.push(cursorImageWarning(spec.image)); continue;
    }
    const relative = path.relative(root, file);
    if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) throw new Error('Image must be inside the project');
    if (!(await stat(file)).isFile()) throw new Error('Image must be a file');
    const type = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif' }[path.extname(file).toLowerCase()];
    if (isCursor && !['image/png', 'image/svg+xml', 'image/webp'].includes(type)) throw new Error(`Unsupported cursor image format: ${spec.image}`);
    if (!type) throw new Error(`Unsupported image format: ${spec.image}`);
    try { assets.set(spec.image, { data: await readFile(file), type }); }
    catch (error) {
      if (!isCursor) throw error;
      assets.warnings.push(cursorImageWarning(spec.image));
    }
  }
  return assets;
}
export async function startRenderServer({ rawFile, outFile, assets = new Map(), onProgress = () => {} }) {
  const prefix = `/${randomUUID()}/`;
  const rawStat = await stat(rawFile);
  const bundle = await readFile(new URL('dist/render-page.js', root));
  let file, server, failure, bytes = 0, writes = Promise.resolve();
  const close = async () => {
    try {
      if (server?.listening) {
        server.closeAllConnections();
        await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
      }
    } finally { await writes.catch(() => {}); await file?.close(); }
  };
  try {
    file = await open(outFile, 'wx');
    server = http.createServer((request, response) => {
      const handle = async () => {
        const route = request.url;
        if (['GET', 'HEAD'].includes(request.method) && route === `${prefix}raw.mp4`) {
          const headers = { 'content-type': 'video/mp4', 'accept-ranges': 'bytes' };
          let start = 0, end = rawStat.size - 1, status = 200;
          if (request.headers.range) {
            const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
            if (!match || (!match[1] && !match[2])) { response.writeHead(416, { 'content-range': `bytes */${rawStat.size}` }); response.end(); return; }
            if (match[1]) { start = Number(match[1]); end = match[2] ? Math.min(end, Number(match[2])) : end; }
            else start = Math.max(0, rawStat.size - Number(match[2]));
            if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= rawStat.size) {
              response.writeHead(416, { 'content-range': `bytes */${rawStat.size}` }); response.end(); return;
            }
            status = 206; headers['content-range'] = `bytes ${start}-${end}/${rawStat.size}`;
          }
          headers['content-length'] = end - start + 1;
          response.writeHead(status, headers);
          if (request.method === 'HEAD') response.end();
          else {
            const stream = createReadStream(rawFile, { start, end });
            stream.on('error', (error) => { failure ??= error; response.destroy(error); });
            response.on('close', () => stream.destroy()); stream.pipe(response);
          }
        } else if (request.method === 'GET' && route.startsWith(`${prefix}assets/`)) {
          const key = decodeURIComponent(route.slice(`${prefix}assets/`.length));
          const asset = assets.get(key);
          if (!asset) { response.writeHead(404); response.end(); return; }
          response.writeHead(200, { 'content-type': asset.type }); response.end(asset.data);
        } else if (request.method === 'GET' && route === prefix) {
          response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
          response.end('<!doctype html><meta charset="utf-8"><script src="render-page.js"></script>');
        } else if (request.method === 'GET' && route === `${prefix}render-page.js`) {
          response.writeHead(200, { 'content-type': 'text/javascript' }); response.end(bundle);
        } else if (request.method === 'GET' && [`${prefix}fonts/Inter-Regular.woff2`, `${prefix}fonts/Inter-SemiBold.woff2`].includes(route)) {
          const font = await readFile(new URL(`assets/fonts/${route.split('/').at(-1)}`, root));
          response.writeHead(200, { 'content-type': 'font/woff2' }); response.end(font);
        } else if (request.method === 'POST' && ['chunk', 'progress'].some((name) => route === prefix + name)) {
          const limit = route === prefix + 'chunk' ? 32 * 1024 * 1024 : 4096;
          const chunks = []; let length = 0;
          for await (const chunk of request) {
            length += chunk.length; if (length > limit) throw new Error('Render request exceeds limit'); chunks.push(chunk);
          }
          const data = Buffer.concat(chunks);
          if (route === prefix + 'chunk') {
            if (request.headers['x-pos'] === undefined) throw new Error('Missing chunk position');
            const position = Number(request.headers['x-pos']);
            writes = writes.then(async () => { bytes = Math.max(bytes, await writeRenderChunk(file, data, position)); });
            await writes;
          } else {
            const progress = JSON.parse(data.toString('utf8'));
            if (!Number.isSafeInteger(progress.frame) || !Number.isSafeInteger(progress.total)
              || progress.frame < 0 || progress.frame > progress.total || progress.total <= 0) throw new Error('Invalid render progress');
            onProgress(progress);
          }
          response.writeHead(204); response.end();
        } else { response.writeHead(404); response.end(); }
      };
      handle().catch((error) => {
        failure ??= error;
        if (!response.headersSent) response.writeHead(500);
        response.end('Render transport failed');
      });
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
    });
    return { url: `http://127.0.0.1:${server.address().port}${prefix}`, close,
      options: { cursorImages: Object.fromEntries([...assets.keys()].map((image) => [image, imageAssetUrl(image)])) },
      async finish() { await writes; if (failure) throw failure; await file.sync(); return bytes; } };
  } catch (error) {
    try { await close(); } finally { if (file) await rm(outFile,{force:true}); }
    throw error;
  }
}

// CLI edits and rendering select the same newest completed run without launching a browser.
export async function loadRunComposition({ name, runId, rebuild = false }) {
  const dir = projectDir(name);
  const compositionFile = path.join(dir, 'composition.json');
  let composition;
  if (!rebuild) {
    try { composition = await json(compositionFile); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!runId) {
    const runs = await readdir(path.join(dir, 'runs'), { withFileTypes: true });
    runId = runs.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().at(-1);
  }
  if (typeof runId !== 'string' || !runId || /[\\/]|^\.\.?$/.test(runId)) throw new Error('A valid run ID is required');
  const runDir = path.join(dir, 'runs', runId), rawFile = path.join(runDir, 'raw.mp4');
  try { await access(rawFile); }
  catch (error) { if (error.code === 'ENOENT') throw new Error(`Run ${runId} has no raw.mp4`); throw error; }
  if (composition) {
    const validation = validateComposition(composition);
    if (!validation.ok) throw new Error(validation.errors.join('\n'));
  }
  if (composition && composition.run.id !== runId) throw new Error('Composition belongs to another run; use --rebuild to select this run');
  const [brief, storyboard, events, record] = await Promise.all([
    readProjectFile(name, 'brief'), readProjectFile(name, 'storyboard'), json(path.join(runDir, 'events.json')),
    json(path.join(runDir, 'record.json')),
  ]);
  if (!composition) {
    composition = buildComposition({ brief, storyboard, events, record });
  }
  const bounds = validateComposition(composition, { duration: record.durationSec });
  if (!bounds.ok) throw new Error(bounds.errors.join('\n'));
  return { dir, compositionFile, composition, runId, runDir, rawFile, brief, storyboard, events, record };
}

export async function renderRun({ name, runId, size, fps, out, rebuild = false, stills = null, log = console.log, signal, isCancelled = () => false, onProgress = () => {} }) {
  const cancelled = () => signal?.aborted || isCancelled();
  const checkCancelled = () => { if (cancelled()) throw new Error('Render aborted'); };
  checkCancelled();
  if (size !== undefined && !['1080', '4k'].includes(size)) throw new Error('size must be 1080 or 4k');
  if (fps !== undefined && ![30, 60].includes(fps)) throw new Error('fps must be 30 or 60');
  const { dir, compositionFile, rawFile, brief, storyboard, events, record, composition: loaded } = await loadRunComposition({ name, runId, rebuild });
  let composition = loaded;
  await writeFile(compositionFile, JSON.stringify(composition, null, 2) + '\n');
  composition = resolveComposition(composition);
  composition.output = { ...composition.output, ...(size ? { width: size === '4k' ? 3840 : 1920, height: size === '4k' ? 2160 : 1080 } : {}), ...(fps ? { fps } : {}) };
  const assets = await resolveImageAssets(composition, dir);
  const renderId = localRunId(), renderDir = path.join(dir, 'renders', renderId);
  await mkdir(path.dirname(renderDir), { recursive: true }); await mkdir(renderDir);
  const finalFile = out ? path.resolve(out) : path.join(renderDir, 'final.mp4');
  await mkdir(path.dirname(finalFile), { recursive: true });
  let server, browser, page, plan, result;
  let lastLog = 0, cancelTimer, completed = false, ownsOutput = false;
  const started = Date.now();
  try {
    checkCancelled();
    server = await startRenderServer({ rawFile, outFile: finalFile, assets, onProgress({ frame, total }) {
      onProgress({frame,total});
      const now = Date.now();
      if (now - lastLog < 1000) return;
      const eta = Math.max(0, Math.round((now - started) / 1000 * (total - frame) / Math.max(1, frame)));
      log(`rendering ${Math.round(frame / total * 100)}%  ETA ${eta} s`); lastLog = now;
    } });
    ownsOutput = true;
    checkCancelled();
    browser = await chromium.launch({ headless: true }); page = await browser.newPage();
    cancelTimer = setInterval(() => {
      if (cancelled()) {
        // Closing the page also interrupts decode/encode and pending transport immediately.
        page?.close().catch(() => {});
      }
    }, 50);
    checkCancelled();
    await page.goto(server.url); await page.waitForFunction(() => typeof window.renderComposition === 'function');
    const sourceSize = await page.evaluate(() => window.probeRenderSource());
    plan = planRender({ composition, brief, storyboard, events, record, sourceSize, assetWarnings: assets.warnings });
    for (const warning of plan.warnings) log(`warning: ${warning}`);
    if (stills) {
      const files = [];
      for (const t of stills) {
        checkCancelled();
        const { png, warnings } = await page.evaluate(async ({ plan, t, options }) => ({ png: await window.renderStill(plan, t, options), warnings: plan.warnings }), { plan: JSON.parse(JSON.stringify(plan)), t, options: server.options });
        for (const warning of warnings) if (!plan.warnings.includes(warning)) { plan.warnings.push(warning); log(`warning: ${warning}`); }
        const file = path.join(renderDir, `still-${t}.png`);
        await writeFile(file, Buffer.from(png.split(',')[1], 'base64')); files.push(file);
      }
      log(`Stills: ${files.join(' ')}`);
      checkCancelled(); completed = true;
      return { renderDir, plan, files };
    }
    result = await page.evaluate(({ plan, options }) => window.renderComposition(plan, { ...options, audio: null }), { plan: JSON.parse(JSON.stringify(plan)), options: server.options });
    for (const warning of result.warnings) if (!plan.warnings.includes(warning)) { plan.warnings.push(warning); log(`warning: ${warning}`); }
    await server.finish();
    if (result.codec === 'vp9') log('warning: H.264 unavailable; encoded VP9 inside MP4');
    const poster = await page.evaluate(({ plan, t }) => window.renderStill(plan, t), {
      plan: JSON.parse(JSON.stringify(plan)), t: plan.timemap.mainStart + (plan.timemap.mainEnd - plan.timemap.mainStart) * 0.35,
    });
    await Promise.all([
      writeFile(path.join(renderDir, 'final.srt'), toSrt(plan.cues, plan.timemap)),
      writeFile(path.join(renderDir, 'final.vtt'), toVtt(plan.cues, plan.timemap)),
      writeFile(path.join(renderDir, 'poster.png'), Buffer.from(poster.split(',')[1], 'base64')),
    ]);
    log(`Final video: ${finalFile} (${plan.timemap.outputDuration.toFixed(2)} s, ${composition.output.width}x${composition.output.height}, ${composition.output.fps} fps)`);
    checkCancelled(); completed = true;
    return { renderDir, finalFile, plan, ...result };
  } finally {
    clearInterval(cancelTimer);
    try { await page?.close(); }
    finally { try { await browser?.close(); } finally {
      try { await server?.close(); }
      finally { if (!completed && ownsOutput) await rm(finalFile,{force:true}); }
    } }
  }
}
