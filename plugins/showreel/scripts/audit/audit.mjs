import { readMp4Metadata } from '../lib/mp4-align.mjs';
import http from 'node:http';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { projectDir } from '../lib/paths.mjs';
import { loadRunComposition, resolveImageAssets, loadVoiceClips, resolveAudioRoute, compositionForFormat } from '../lib/compose/render.mjs';
import { planRender } from '../lib/compose/plan.mjs';
import { sizeKeyFor } from '../lib/compose/layout.mjs';
import { readScenes, validateScenesInProject, sceneStoryboard } from '../lib/scenes.mjs';
import { safeFile } from '../lib/editor/files.mjs';
import { loadBriefBrand, resolveBrandRoute } from '../lib/brand/storage.mjs';
import { checkCadence, checkSync, checkLoudness, checkCaptions, checkFrozen, allowedFreezeRanges, checkParity, checkContainer, auditPassed, formatAudit } from './checks.mjs';

import { parseWav } from '../lib/voice/wav.mjs';
import { speechBounds } from '../lib/voice/trim.mjs';

const root = new URL('../../', import.meta.url);
const json = async file => JSON.parse(await readFile(file, 'utf8'));
// Read-only server: only explicitly registered files and validated project/brand assets are reachable.
export async function startAuditServer({ video, sources = new Map(), assets = new Map() }) {
  const prefix = `/${randomUUID()}/`, bundle = await readFile(new URL('dist/audit-page.js', root));
  const files = new Map([['video.mp4', { file: video, type: 'video/mp4' }], ...sources]);
  for (const name of ['Inter-Regular', 'Inter-SemiBold', 'SpaceGrotesk-SemiBold', 'SpaceGrotesk-Bold']) {
    files.set(`fonts/${name}.woff2`, { file: new URL(`assets/fonts/${name}.woff2`, root), type: 'font/woff2' });
  }
  let failure;
  const server = http.createServer((req, res) => {
    (async () => {
      if (!['GET', 'HEAD'].includes(req.method) || !req.url.startsWith(prefix)) { res.writeHead(404); res.end(); return; }
      const route = req.url.slice(prefix.length);
      let data, type, found = files.get(route);
      if (route === '') { data = Buffer.from('<!doctype html><meta charset="utf-8"><script src="audit-page.js"></script>'); type = 'text/html'; }
      else if (route === 'audit-page.js') { data = bundle; type = 'text/javascript'; }
      else if (route.startsWith('assets/')) { const asset = assets.get(decodeURIComponent(route.slice(7))); if (asset) { data = asset.data; type = asset.type; } }
      else if (route.startsWith('brand/')) found = await resolveBrandRoute(route.slice(6));
      if (data) {
        res.writeHead(200, { 'content-type': type, 'content-length': data.length, 'x-content-type-options': 'nosniff' });
        res.end(req.method === 'HEAD' ? undefined : data); return;
      }
      if (!found) { res.writeHead(404); res.end(); return; }
      const size = (await stat(found.file)).size;
      let start = 0, end = size - 1, status = 200;
      const headers = { 'content-type': found.type, 'accept-ranges': 'bytes', 'x-content-type-options': 'nosniff' };
      if (req.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (match && (match[1] || match[2])) {
          if (match[1]) { start = Number(match[1]); end = match[2] ? Math.min(end, Number(match[2])) : end; }
          else start = Math.max(0, size - Number(match[2]));
        } else start = NaN;
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) {
          res.writeHead(416, { 'content-range': `bytes */${size}` }); res.end(); return;
        }
        status = 206; headers['content-range'] = `bytes ${start}-${end}/${size}`;
      }
      headers['content-length'] = Math.max(0, end - start + 1); res.writeHead(status, headers);
      if (req.method === 'HEAD' || !size) { res.end(); return; }
      const stream = createReadStream(found.file, { start, end });
      stream.on('error', error => { failure ??= error; res.destroy(error); });
      res.on('close', () => stream.destroy()); stream.pipe(res);
    })().catch(error => { failure ??= error; if (!res.headersSent) res.writeHead(500); res.end('Audit transport failed'); });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); }); });
  return { url: `http://127.0.0.1:${server.address().port}${prefix}`,
    check() { if (failure) throw failure; },
    close: () => new Promise((resolve, reject) => { server.closeAllConnections(); server.close(error => error ? reject(error) : resolve()); }) };
}
// Preserve indexed placements even if a clip was removed after the export was made.
export async function loadAuditVoiceClips(dir) {
  const { voiceClips } = await loadVoiceClips(dir); // validate the index shape
  return voiceClips ? json(path.join(dir, 'voice', 'clips.json')) : null;
}
export async function loadNarrationLeads(dir, narration) {
  const cache = new Map();
  return Promise.all(narration.map(async n => {
    if (!cache.has(n.clipUrl)) cache.set(n.clipUrl, (async () => {
      const found = await resolveAudioRoute(dir, n.clipUrl);
      if (!found) return { leadSilence: null };
      const wav = parseWav(await readFile(found.file));
      const bounds = speechBounds(wav.data, wav.sampleRate, -45);
      return { leadSilence: bounds ? bounds.start / wav.sampleRate : null, clipSilent: !bounds };
    })());
    return { ...n, ...await cache.get(n.clipUrl) };
  }));
}
async function projectInputs(name) {
  const dir = projectDir(name);
  // The saved composition identifies the source run; do not silently substitute the newest capture.
  const saved = await json(path.join(dir, 'composition.json'));
  const loaded = await loadRunComposition({ name, runId: saved.run.id });
  const voiceClips = await loadAuditVoiceClips(dir), brand = await loadBriefBrand(loaded.brief, () => {});
  const sceneData = await readScenes(dir);
  let scenes;
  if (sceneData) {
    const valid = await validateScenesInProject(dir, sceneData);
    if (!valid.ok) throw new Error(valid.errors.join('\n'));
    scenes = await Promise.all(sceneData.scenes.map(async scene => {
      const file = name => safeFile(dir, `runs/${encodeURIComponent(scene.run)}/${name}`);
      const [rawFile, events, record, storyboard] = await Promise.all([file('raw.mp4'), file('events.json').then(json), file('record.json').then(json), sceneStoryboard(dir, scene, loaded.storyboard)]);
      return { ...scene, rawFile, events, record, storyboard, storyboardFile: scene.storyboard };
    }));
  }
  const assets = await resolveImageAssets(loaded.composition, dir);
  const sources = new Map([['raw.mp4', { file: loaded.rawFile, type: 'video/mp4' }], ...(scenes ?? []).map(s => [`run/${encodeURIComponent(s.run)}/raw.mp4`, { file: s.rawFile, type: 'video/mp4' }])]);
  return { ...loaded, voiceClips, brand, scenes, sources, assets };
}
export async function auditVideo({ video, srt, project, strict = false }) {
  if (!video) throw new Error('--video is required');
  const videoFile = path.resolve(video), sizeBytes = (await stat(videoFile)).size;
  const mp4 = (await readMp4Metadata(videoFile)).metadata;
  const captions = srt === undefined ? null : await readFile(srt, 'utf8');
  const context = project ? await projectInputs(project) : null;
  let server, browser;
  try {
    server = await startAuditServer({ video: videoFile, sources: context?.sources, assets: context?.assets });
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage(); await page.goto(server.url);
    await page.waitForFunction(() => typeof window.inspectAudit === 'function');
    const url = new URL('video.mp4', server.url).href;
    const decoded = await page.evaluate(url => window.inspectAudit(url), url);
    let plan, parity = null;
    if (context) {
      const sourceSize = await page.evaluate(() => window.probeRenderSource());
      if (context.scenes) for (const scene of context.scenes) scene.sourceSize = await page.evaluate(url => window.probeRenderSource(url), new URL(`run/${encodeURIComponent(scene.run)}/raw.mp4`, server.url).href);
      // Rendering can override the saved profile, size and fps without saving those overrides.
      // Reapply that same export transform using the inspected file's profile.
      const inferred = checkCadence({ frames: decoded.frames, containerDuration: decoded.containerDuration }).measured.fps;
      const fps = [30, 60].find(f => Math.abs(f - inferred) < 0.1) ?? context.composition.output.fps;
      const format = decoded.width === decoded.height ? 'square' : decoded.width > decoded.height ? 'landscape' : 'vertical';
      const composition = compositionForFormat(context.composition, format, sizeKeyFor(decoded.width, decoded.height), fps);
      plan = planRender({ ...context, composition, sourceSize, assetWarnings: context.assets.warnings });
      parity = await page.evaluate(args => window.auditParity(args), { url, plan: JSON.parse(JSON.stringify(plan)), options: { cursorImages: Object.fromEntries([...context.assets.keys()].map(image => [image, `assets/${encodeURIComponent(image)}`])) } });
    }
    server.check();
    const cadence = checkCadence({ frames: decoded.frames, containerDuration: decoded.containerDuration, fps: plan?.output.fps });
    const narration = plan ? await loadNarrationLeads(projectDir(project), plan.audio.narration) : null;
    const checks = [cadence,
      checkSync(decoded.videoDuration, decoded.audioDuration, { envelope: decoded.envelope, narration, mp4 }), checkLoudness(decoded.loudness), checkCaptions(captions, decoded.duration),
      checkFrozen(decoded.samples, plan ? allowedFreezeRanges(plan) : [], cadence.pass), checkParity(parity), checkContainer({ ...decoded, sizeBytes })];
    return { pass: auditPassed(checks, strict), strict, checks };
  } finally { try { await browser?.close(); } finally { await server?.close(); } }
}
export async function auditCommand(flags) {
  const options = {};
  for (let i = 0; i < flags.length; i++) {
    const flag = flags[i];
    if (!['--video', '--srt', '--project', '--json', '--strict'].includes(flag) || Object.hasOwn(options, flag)) throw new Error(`Invalid audit option: ${flag}`);
    if (['--json', '--strict'].includes(flag)) options[flag] = true;
    else { if (!flags[i + 1] || flags[i + 1].startsWith('--')) throw new Error(`Missing value for ${flag}`); options[flag] = flags[++i]; }
  }
  const report = await auditVideo({ video: options['--video'], srt: options['--srt'], project: options['--project'], strict: !!options['--strict'] });
  console.log(options['--json'] ? JSON.stringify(report, (_, value) => typeof value === 'number' && !Number.isFinite(value) ? String(value) : value, 2) : formatAudit(report));
  process.exitCode = report.pass ? 0 : 1;
  return report;
}
