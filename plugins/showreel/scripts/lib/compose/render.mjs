import { readScenes, validateScenesInProject, sceneStoryboard } from '../scenes.mjs';
import { chaptersFor } from './chapters.mjs';
import { getExportDir, validateExportDir, exportFileName, uniqueName } from '../export-dir.mjs';
import { THEMES } from './themes.mjs';
import { leafValues } from '../brand/apply.mjs';
import { loadBriefBrand, resolveBrandRoute } from '../brand/storage.mjs';
import { safeFile } from '../editor/files.mjs';
import { presetOutput, sizeKeyFor, OUTPUT_SIZES } from './layout.mjs';
import { profileWarnings } from './plan.mjs';
import { listRuns } from '../record/commands.mjs';
import http from 'node:http';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { access, mkdir, open, readFile, realpath, stat, writeFile, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { projectDir } from '../paths.mjs';
import { readProjectFile } from '../project.mjs';
import { localRunId } from '../record/timing.mjs';
import { buildComposition, validateComposition, safeImagePath, resolveComposition, safeMusicPath } from './composition.mjs';
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

const AUDIO_TYPES = { '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg' };
const inside = (root, file) => { const relative = path.relative(root, file); return !(relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)); };
// Maps an export-server audio route (voice/<key>.wav or music/<project path>) to a real file inside the project, or null.
export async function resolveAudioRoute(dir, route) {
  let root, relative;
  try {
    const parts = route.split('/').map(decodeURIComponent);
    if (parts[0] === 'voice' && parts.length === 2 && /^[A-Za-z0-9_-]{1,128}\.wav$/.test(parts[1])) { root = path.join(dir, 'voice', 'clips'); relative = parts[1]; }
    else if (parts[0] === 'music' && parts.length > 1 && safeMusicPath(parts.slice(1).join('/'))) { root = dir; relative = parts.slice(1).join('/'); }
    else return null;
    const realRoot = await realpath(root), file = await realpath(path.join(realRoot, relative));
    if (!inside(realRoot, file) || !(await stat(file)).isFile()) return null;
    return { file, type: AUDIO_TYPES[path.extname(file).toLowerCase()] };
  } catch { return null; }
}
// voice/clips.json from the voice task: { version: 1, clips: { <key>: { durationSec, source } }, steps: { <stepId>: <key> } }.
// Entries whose WAV file is gone are dropped with a warning instead of failing the export.
export async function loadVoiceClips(dir) {
  let index;
  try { index = await json(path.join(dir, 'voice', 'clips.json')); }
  catch (error) { if (error.code === 'ENOENT') return { voiceClips: null, warnings: [] }; throw new Error(`voice/clips.json is not readable: ${error.message}`); }
  if (!index || index.version !== 1 || typeof index.clips !== 'object' || typeof index.steps !== 'object') throw new Error('voice/clips.json has an unsupported shape');
  const steps = {}, warnings = [];
  for (const [stepId, key] of Object.entries(index.steps)) {
    if ((await resolveAudioRoute(dir, `voice/${encodeURIComponent(key)}.wav`)) && index.clips[key]) steps[stepId] = key;
    else warnings.push(`The narration clip for step ${stepId} is missing, so that step has no voice; generate it again.`);
  }
  return { voiceClips: { ...index, steps }, warnings };
}

// Shared with browser tests so production Range and chunk transport are exercised.
export async function resolveImageAssets(composition, dir) {
  const c = resolveComposition(composition), assets = new Map(), root = await realpath(dir);
  assets.warnings = [];
  const custom = c.cursor.style === 'custom' ? ['arrow', 'hand', 'text'].map((shape) => c.cursor.custom?.[shape]).filter(Boolean) : [];
  for (const spec of [c.watermark, c.frame.background, c.cards.title.background, c.cards.outro.background, c.cards.title.logo, c.cards.outro.logo, ...custom]) {
    if (!spec?.image) continue;
    if (!safeImagePath(spec.image)) throw new Error('Image must be inside the project');
    const isCursor = custom.includes(spec);
    if (isCursor && !/\.(png|svg|webp)$/i.test(spec.image)) throw new Error(`Unsupported cursor image format: ${spec.image}`);
    let file;
    try { file = await safeFile(root, spec.image.split('/').map(encodeURIComponent).join('/'));  }
    catch (error) {
      if (error.message === 'File must be inside its project') throw new Error('Image must be inside the project');
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
export async function startRenderServer({ rawFile, outFile, assets = new Map(), projectDir: audioDir = null, rawFiles = new Map(), onProgress = () => {} }) {
  const prefix = `/${randomUUID()}/`;
  const sourceRoutes = new Map([['raw.mp4',{file:rawFile,stat:await stat(rawFile)}]]);
  for (const [run,file] of rawFiles) sourceRoutes.set(`run/${encodeURIComponent(run)}/raw.mp4`,{file,stat:await stat(file)});
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
        const raw = route.startsWith(prefix) ? sourceRoutes.get(route.slice(prefix.length)) : null;
        if (['GET', 'HEAD'].includes(request.method) && raw) {
          const rawStat=raw.stat;
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
            const stream = createReadStream(raw.file, { start, end });
            stream.on('error', (error) => { failure ??= error; response.destroy(error); });
            response.on('close', () => stream.destroy()); stream.pipe(response);
          }
        } else if (request.method === 'GET' && route.startsWith(`${prefix}brand/`)) {
          const found = await resolveBrandRoute(route.slice(`${prefix}brand/`.length));
          if (!found) { response.writeHead(404); response.end(); return; }
          response.writeHead(200, { 'content-type': found.type, 'x-content-type-options': 'nosniff' }); response.end(await readFile(found.file));
        } else if (request.method === 'GET' && route.startsWith(`${prefix}assets/`)) {
          const key = decodeURIComponent(route.slice(`${prefix}assets/`.length));
          const asset = assets.get(key);
          if (!asset) { response.writeHead(404); response.end(); return; }
          response.writeHead(200, { 'content-type': asset.type }); response.end(asset.data);
        } else if (request.method === 'GET' && audioDir && /^(voice|music)\//.test(route.slice(prefix.length)) && route.startsWith(prefix)) {
          const found = await resolveAudioRoute(audioDir, route.slice(prefix.length));
          if (!found) { response.writeHead(404); response.end(); return; }
          response.writeHead(200, { 'content-type': found.type, 'content-length': (await stat(found.file)).size });
          const stream = createReadStream(found.file);
          stream.on('error', (error) => { failure ??= error; response.destroy(error); });
          response.on('close', () => stream.destroy()); stream.pipe(response);
        } else if (request.method === 'GET' && route === prefix) {
          response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
          response.end('<!doctype html><meta charset="utf-8"><script src="render-page.js"></script>');
        } else if (request.method === 'GET' && route === `${prefix}render-page.js`) {
          response.writeHead(200, { 'content-type': 'text/javascript' }); response.end(bundle);
        } else if (request.method === 'GET' && [`${prefix}fonts/Inter-Regular.woff2`, `${prefix}fonts/Inter-SemiBold.woff2`, `${prefix}fonts/SpaceGrotesk-SemiBold.woff2`, `${prefix}fonts/SpaceGrotesk-Bold.woff2`].includes(route)) {
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
export async function loadRunComposition({ name, runId, rebuild = false, rebind = false }) {
  const dir = projectDir(name);
  const compositionFile = path.join(dir, 'composition.json');
  let composition;
  if (!rebuild) {
    try { composition = await json(compositionFile); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!runId) {
    const runs = await listRuns(name);
    runId = runs.at(-1)?.id;
  }
  if (typeof runId !== 'string' || !runId || /[\\/]|^\.\.?$/.test(runId)) throw new Error('A valid run ID is required');
  const runDir = path.join(dir, 'runs', runId), rawFile = path.join(runDir, 'raw.mp4');
  try { await access(rawFile); }
  catch (error) { if (error.code === 'ENOENT') throw new Error(`Run ${runId} has no raw.mp4`); throw error; }
  if (composition) {
    const validation = validateComposition(composition);
    if (!validation.ok) throw new Error(validation.errors.join('\n'));
    composition = resolveComposition(composition);
  }
  if (composition && composition.run.id !== runId) {
    if (!rebind) throw new Error('Composition belongs to another run; use --rebuild to select this run');
    composition = structuredClone(composition);
    composition.run.id = runId;
    composition.edits = { trims: [], speeds: [], holds: [] };
    composition.zoom.regions = [];
    delete composition.captions.cues;
  }
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

export async function renderRun({ name, runId, sceneId, format = 'landscape', size, fps, out, exportDir, rebuild = false, stills = null, log = console.log, signal, isCancelled = () => false, onProgress = () => {} }) {
  presetOutput(format, size ?? '1080');
  const cancelled = () => signal?.aborted || isCancelled();
  const checkCancelled = () => { if (cancelled()) throw new Error('Render aborted'); };
  checkCancelled();
  if (size !== undefined && !Object.hasOwn(OUTPUT_SIZES, String(size))) throw new Error('size must be 720, 1080, 1440 or 4k');
  if (fps !== undefined && ![30, 60].includes(fps)) throw new Error('fps must be 30 or 60');
  const sceneData = await readScenes(projectDir(name));
  let selectedScenes;
  if (sceneData !== null) {
    const validation=await validateScenesInProject(projectDir(name),sceneData);
    if (!validation.ok) throw new Error(validation.errors.join('\n'));
    for (const warning of validation.warnings) log(`warning: ${warning}`);
    selectedScenes=sceneId ? sceneData.scenes.filter(s => s.id === sceneId) : sceneData.scenes;
    if (!selectedScenes.length) throw new Error(sceneId ? `Unknown scene: ${sceneId}` : 'No scenes to render');
    // Preserve source-bound edits from the saved run while loading each other run independently.
    let savedRun;
    if (!rebuild) { try { savedRun=(await json(path.join(projectDir(name),'composition.json'))).run?.id; } catch (e) { if (e.code !== 'ENOENT') throw e; } }
    runId=selectedScenes.some(s => s.run === savedRun) ? savedRun : selectedScenes[0].run;
  } else if (sceneId) throw new Error('--scene requires scenes.json');
  const { dir, compositionFile, rawFile, brief, storyboard, events, record, composition: loaded } = await loadRunComposition({ name, runId, rebuild, rebind: true });
  const sceneInputs = selectedScenes ? await Promise.all(selectedScenes.map(async scene => {
    const runFile = file => safeFile(dir,`runs/${encodeURIComponent(scene.run)}/${file}`);
    const [rawFile,events,record,board] = await Promise.all([runFile('raw.mp4'),runFile('events.json').then(json),runFile('record.json').then(json),sceneStoryboard(dir,scene,storyboard)]);
    return {...scene,rawFile,events,record,storyboardFile:scene.storyboard,storyboard:board};
  })) : null;
  const rawFiles = new Map(sceneInputs?.map(s => [s.run,s.rawFile]) ?? []);
  const brand = await loadBriefBrand(brief,log);
  let composition = loaded;
  // Keep the editable composition on its original run when exporting another profile.
  let saved;
  try { saved = await json(compositionFile); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!saved || saved.run.id === composition.run.id) await writeFile(compositionFile, JSON.stringify(composition, null, 2) + '\n');
  composition = compositionForFormat(composition, format, size, fps);
  for (const warning of profileWarnings(record.profile ?? events.profile, format)) log(`warning: ${warning}`);
  const assets = await resolveImageAssets(composition, dir);
  const { voiceClips, warnings: voiceWarnings } = await loadVoiceClips(dir);
  assets.warnings.push(...voiceWarnings);
  if (composition.audio.music.enabled && composition.audio.music.file && !(await resolveAudioRoute(dir, `music/${composition.audio.music.file.split('/').map(encodeURIComponent).join('/')}`))) {
    assets.warnings.push(`The music file ${composition.audio.music.file} was not found inside the project, so the video has no music.`);
    composition.audio.music.enabled = false;
  }
  const renderId = `${localRunId()}-${format}-${randomUUID().slice(0, 8)}`, renderDir = path.join(dir, 'renders', renderId);
  await mkdir(path.dirname(renderDir), { recursive: true }); await mkdir(renderDir);
  const destination = out ? path.dirname(path.resolve(out)) : await validateExportDir(exportDir ?? await getExportDir(), { create: true });
  const readable = exportFileName({ projectName: name, format, size: size ?? sizeKeyFor(composition.output.width, composition.output.height) });
  const finalFile = out ? path.resolve(out) : await uniqueName(destination, path.basename(readable, '.mp4'));
  const sidecarBase = finalFile.slice(0, -path.extname(finalFile).length);
  await mkdir(path.dirname(finalFile), { recursive: true });
  let server, browser, page, plan, result;
  let lastLog = 0, cancelTimer, completed = false, ownsOutput = false;
  const started = Date.now();
  try {
    checkCancelled();
    server = await startRenderServer({ rawFile, rawFiles, outFile: finalFile, assets, projectDir: dir, onProgress({ frame, total }) {
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
    if (sceneInputs) for (const scene of sceneInputs) scene.sourceSize = await page.evaluate(url => window.probeRenderSource(url),new URL(`run/${encodeURIComponent(scene.run)}/raw.mp4`,server.url).href);
    plan = planRender({ composition, brief, storyboard, events, record, sourceSize, assetWarnings: assets.warnings, voiceClips, brand, scenes:sceneInputs });
    for (const warning of plan.warnings) if (!profileWarnings(record.profile ?? events.profile, format).includes(warning)) log(`warning: ${warning}`);
    for (const warning of plan.audio.warnings) log(`warning: ${warning.message}`);
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
    result = await page.evaluate(({ plan, options }) => window.renderComposition(plan, { ...options, audio: plan.audio.enabled ? {} : null }), { plan: JSON.parse(JSON.stringify(plan)), options: server.options });
    for (const warning of result.warnings) if (!plan.warnings.includes(warning)) { plan.warnings.push(warning); log(`warning: ${warning}`); }
    await server.finish();
    if (result.audio) {
      const { integratedLufs, truePeakDb } = result.audio.measured;
      log(`Loudness: ${integratedLufs.toFixed(1)} LUFS, true peak ${truePeakDb.toFixed(1)} dBTP`);
      for (const warning of result.audio.warnings) { plan.warnings.push(warning); log(`warning: ${warning}`); }
    }
    if (result.codec === 'vp9') log('warning: H.264 unavailable; encoded VP9 inside MP4');
    const poster = await page.evaluate(({ plan, t }) => window.renderStill(plan, t), {
      plan: JSON.parse(JSON.stringify(plan)), t: plan.timemap.mainStart + (plan.timemap.mainEnd - plan.timemap.mainStart) * 0.35,
    });
    await Promise.all([
      writeFile(`${sidecarBase}.srt`, toSrt(plan.cues, plan.timemap)),
      writeFile(`${sidecarBase}.vtt`, toVtt(plan.cues, plan.timemap)),
      writeFile(path.join(renderDir, 'poster.png'), Buffer.from(poster.split(',')[1], 'base64')),
    ]);
    if (plan.scenes) {
      const chapters = chaptersFor(plan);
      await writeFile(`${sidecarBase}.chapters.vtt`, chapters.vtt);
      if (chapters.txt !== null) await writeFile(`${sidecarBase}.chapters.txt`, chapters.txt);
      else log(chapters.notice);
    }
    await writeFile(path.join(renderDir, 'export.json'), JSON.stringify({ finalFile }, null, 2));
    await writeFile(path.join(renderDir, 'summary.json'), JSON.stringify({ finalFile, durationSec: plan.timemap.outputDuration, output: composition.output, audio: result.audio ?? null }, null, 2));
    log(`Final video: ${finalFile} (${plan.timemap.outputDuration.toFixed(2)} s, ${composition.output.width}x${composition.output.height}, ${composition.output.fps} fps)`);
    log(`Saved to: ${path.dirname(finalFile)}`);
    checkCancelled(); completed = true;
    return { renderDir, finalFile, plan, ...result, sizeBytes: (await stat(finalFile)).size, durationSec: plan.timemap.outputDuration, ...composition.output };
  } finally {
    clearInterval(cancelTimer);
    try { await page?.close(); }
    finally { try { await browser?.close(); } finally {
      try { await server?.close(); }
      finally { if (!completed && ownsOutput) await Promise.all([finalFile, ...['.srt','.vtt','.chapters.txt','.chapters.vtt'].map(ext => sidecarBase + ext)].map(file => rm(file,{force:true}))); }
    } }
  }
}

// Export variants share styling and narration; source-time edits are never copied between runs.
export function compositionForFormat(input, format, size, fps) {
  const c = structuredClone(input);
  const previous = c.output.preset ?? 'landscape';
  c.output = { ...c.output, ...presetOutput(format, size ?? sizeKeyFor(c.output.width, c.output.height)), ...(fps ? { fps } : {}) };
  if (format !== previous) {
    if (format === 'vertical') {
      if (c.frame.paddingXPct === 8) c.frame.paddingXPct = 4;
      if (c.frame.paddingYPct === 5) c.frame.paddingYPct = 0;
      if (c.captions.bandHeightPct === 13) c.captions.bandHeightPct = 16;
      if (c.captions.fontSizePct === 3.4*THEMES[c.theme].typography.captionSizeMultiplier) c.captions.fontSizePct=3.0;
      if (c.zoom.depth === resolveComposition({ theme: c.theme }).zoom.depth) c.zoom.depth = 1.5;
    } else if (previous === 'vertical') {
      if (c.frame.paddingXPct === 4) c.frame.paddingXPct = 8;
      if (c.frame.paddingYPct === 0) c.frame.paddingYPct = 5;
      if (c.captions.bandHeightPct === 16) c.captions.bandHeightPct = 13;
      if (c.captions.fontSizePct === 3.0) c.captions.fontSizePct=3.4*THEMES[c.theme].typography.captionSizeMultiplier;
      if (c.captions.maxLines === 3) c.captions.maxLines=2;
      if (c.zoom.depth === 1.5) c.zoom.depth = resolveComposition({ theme: c.theme }).zoom.depth;
      if (c.layout?.safeZones === true) c.layout.safeZones = null;
    }
    if (c.zoom.regions.every(r => r.source === 'auto')) c.zoom.regions = [];
  }
  const resolved = resolveComposition(c);
  // Export expands optional v1 settings. Their newly materialised defaults must
  // remain inheritable, while every leaf actually saved in an older file stays explicit.
  for (const [p,v] of Object.entries(leafValues(resolved))) {
    if (!/^(frame|cursor|captions|cards|watermark)\./.test(p) && !/^zoom\.(speed|depth)$/.test(p)) continue;
    if (p.split('.').reduce((n,k)=>n?.[k],input) === undefined) resolved.brandDefaults[p] = v;
  }
  return resolved;
}
export function selectRenderRuns(runs) {
  const latest = (profile) => runs.filter(r => (r.profile ?? 'desktop') === profile).sort((a,b) => a.id.localeCompare(b.id)).at(-1);
  const desktop = latest('desktop'), phone = latest('phone');
  return [...(desktop ? [{ runId: desktop.id, format: 'landscape' }] : []), ...(phone ? [{ runId: phone.id, format: 'vertical' }] : [])];
}
export async function renderAll(options) {
  if (options.runId || options.sceneId || options.out || options.format) throw new Error('--all cannot be combined with --run, --out or --format');
  const selected = selectRenderRuns(await listRuns(options.name));
  if (!selected.length) throw new Error('No completed recordings found');
  const results = [];
  for (const run of selected) results.push(await renderRun({ ...options, ...run }));
  return results;
}
