import path from 'node:path';
import { mkdir, readFile, writeFile, statfs, access } from 'node:fs/promises';
import { chromium } from 'playwright';
import { projectDir, HOME_DIR } from '../paths.mjs';
import { readProjectFile } from '../project.mjs';
import { mergeConfig } from '../config.mjs';
import { benchmarkPipeline, recommendScale, measureLayoutGuard } from '../capture-benchmark.mjs';
import { checkScenario, pendingSecrets, checkDisk } from './preflight.mjs';
import { chooseScale } from './scale.mjs';
import { validateEvents, validateRecord } from './schemas.mjs';
import { RecordingSession } from './session.mjs';
import { localRunId, freshBenchmark, blockedSummary } from './timing.mjs';

async function optionalJson(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}

async function authPath(dir) {
  const file = path.join(dir, 'auth.json');
  try { await access(file); return file; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}

async function selectScale(browser, requested, url, options) {
  let benchmarkScale;
  if (requested === 'auto') {
    benchmarkScale = freshBenchmark(await optionalJson(path.join(HOME_DIR, 'benchmark.json')));
    if (!benchmarkScale) {
      const results = await benchmarkPipeline({ browser, url, seconds: 2, ...options });
      if (results.every((result) => result.error)) {
        throw new Error(`Pipeline benchmark failed: ${results.map((r) => r.error).join('; ')}`);
      }
      benchmarkScale = recommendScale(results);
      await mkdir(HOME_DIR, { recursive: true });
      await writeFile(path.join(HOME_DIR, 'benchmark.json'), JSON.stringify({
        scale: benchmarkScale, at: new Date().toISOString(),
      }) + '\n');
    }
  }
  const candidate = chooseScale({ requested, benchmarkScale });
  const layoutDriftExcess = candidate.used === 1 ? 0
    : await measureLayoutGuard(browser, url, candidate.used, options);
  return chooseScale({ requested, benchmarkScale, layoutDriftExcess });
}

export async function recordScenario({ name, headless = true, scale, fps = 60,
  rehearsal = true, log = console.log }) {
  const dir = projectDir(name);
  const brief = await readProjectFile(name, 'brief');
  const scenario = await readProjectFile(name, 'scenario');
  const steps = checkScenario(scenario);
  const missing = pendingSecrets(scenario, process.env);
  if (missing.length) throw new Error(missing.map(({ id }) =>
    `step ${id} needs a secret: set SHOWREEL_SECRET_${id.toUpperCase()}`).join('; '));
  const config = mergeConfig(await optionalJson(path.join(dir, 'config.json'))
    ?? { baseURL: brief.baseURL ?? scenario.baseURL });
  const requested = scale ?? config.captureScale;
  chooseScale({ requested });
  if (![30, 60].includes(fps)) throw new Error('fps must be 30 or 60');
  const disk = await statfs(dir);
  const headroom = checkDisk(Number(disk.bavail) * Number(disk.bsize),
    (brief.targetSeconds ?? 60) / 60, requested === 'auto' ? 2 : requested);
  if (!headroom.ok) throw new Error(`Not enough disk space: need ${headroom.needBytes} bytes and 2 GB free`);
  const runId = localRunId();
  const startedAt = new Date().toISOString();
  const runDir = path.join(dir, 'runs', runId);
  await mkdir(path.dirname(runDir), { recursive: true });
  await mkdir(runDir); // A same-second collision must never overwrite a prior run.
  const firstURL = steps.flatMap((step) => step.actions).find((a) => a.type === 'goto')?.url
    ?? scenario.baseURL;
  const storageState = await authPath(dir);
  let browser, session;
  try {
    browser = await chromium.launch({ headless });
    const choice = await selectScale(browser, requested, firstURL,
      { viewport: config.viewport, guard: config, storageState });
    session = new RecordingSession(browser, config, choice.used, fps);
    await session.open(firstURL, storageState);
    if (rehearsal) await session.rehearse(steps, firstURL);
    const stats = await session.run(steps, path.join(runDir, 'raw.mp4'));
    const { events, viewport } = session;
    const record = {
      version: 1, projectName: name, runId, startedAt,
      scale: { requested, ...choice },
      fps: { nominal: fps, effective: stats.frames / stats.durationSec,
        dropped: stats.dropped, maxBacklog: stats.maxBacklog },
      video: { file: 'raw.mp4', ...viewport, durationSec: stats.durationSec, bytes: stats.bytes },
      durationSec: stats.durationSec,
      warnings: stats.codec === 'avc' ? [] : ['H.264 unavailable; encoded VP9 inside MP4'],
      codec: stats.codec,
    };
    for (const result of [validateEvents(events), validateRecord(record)]) {
      if (!result.ok) throw new Error(result.errors.join('; '));
    }
    await writeFile(path.join(runDir, 'events.json'), JSON.stringify(events, null, 2) + '\n');
    await writeFile(path.join(runDir, 'record.json'), JSON.stringify(record, null, 2) + '\n');
    log(`Recorded ${record.durationSec.toFixed(1)} s, ${viewport.width}x${viewport.height}`
      + ` (scale ${choice.used}, ${choice.reason}), ${record.fps.effective.toFixed(1)} fps,`
      + ` ${stats.dropped} dropped, ${stats.bytes} -> ${runDir}`);
    if (events.blocked.length) log(`blocked during the run: ${blockedSummary(events.blocked)};`
      + ' add an allowWrites entry to permit these requests');
    return { runDir, events, record };
  } finally {
    try { await session?.close(); }
    finally { await browser?.close(); }
  }
}
