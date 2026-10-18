import { build } from 'esbuild';
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';
import { PLUGIN_ROOT } from '../lib/env.mjs';
import { startFixtureServer } from '../lib/fixture-server.mjs';

const execute = promisify(execFile);
const result = {
  os: process.platform, arch: process.arch, completed: false, encodeFps: null,
  peakJsHeapMb: null, peakRssMb: null, error: null,
};
let temporary, server, browser, sampler, timeout, stopped = false;

async function sampleMemory(pageSession, browserSession) {
  while (!stopped) {
    try {
      const { usedSize } = await pageSession.send('Runtime.getHeapUsage');
      result.peakJsHeapMb = Math.max(result.peakJsHeapMb ?? 0, usedSize / 1048576);
      if (process.platform === 'darwin' || process.platform === 'linux') {
        // Scope RSS to this browser's process tree, excluding other Chrome sessions.
        const { processInfo } = await browserSession.send('SystemInfo.getProcessInfo');
        const pids = processInfo.map(({ id }) => id).filter((id) => Number.isInteger(id) && id > 0);
        if (!pids.length) throw new Error('Chromium returned no process IDs for RSS sampling');
        const { stdout } = await execute('ps', ['-o', 'rss=', '-p', pids.join(',')], { timeout: 5000 });
        const rss = stdout.trim().split(/\s+/).reduce((sum, value) => sum + Number(value), 0) / 1024;
        if (!Number.isFinite(rss)) throw new Error('Cannot read browser RSS');
        result.peakRssMb = Math.max(result.peakRssMb ?? 0, rss);
      }
    } catch (error) { result.error ??= `Memory sampling: ${error.message}`; }
    if (!stopped) await sleep(500);
  }
}

try {
  temporary = await mkdtemp(path.join(os.tmpdir(), 'showreel-memory-'));
  await build({
    entryPoints: [path.join(PLUGIN_ROOT, 'scripts/smoke/pages/memory.js')],
    bundle: true, format: 'iife', outfile: path.join(temporary, 'page.js'), logLevel: 'error',
  });
  await writeFile(path.join(temporary, 'index.html'), '<!doctype html><title>Memory smoke</title><script src="/page.js"></script>');
  server = await startFixtureServer(temporary);
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(server.url);
  const pageSession = await page.context().newCDPSession(page);
  const browserSession = await browser.newBrowserCDPSession();
  sampler = sampleMemory(pageSession, browserSession);
  const encoded = await Promise.race([
    page.evaluate(() => window.runMemory()),
    new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('4K export timed out after 120 seconds')), 120000); }),
  ]);
  result.completed = encoded.completed;
  result.encodeFps = encoded.encodeFps;
  result.error = encoded.error || result.error;
} catch (error) { result.error = String(error.message || error); }
finally {
  clearTimeout(timeout);
  stopped = true;
  await sampler;
  await browser?.close().catch((error) => { result.error ??= error.message; });
  await server?.close().catch((error) => { result.error ??= error.message; });
  if (temporary) await rm(temporary, { recursive: true, force: true }).catch((error) => { result.error ??= error.message; });
}
const directory = path.join(PLUGIN_ROOT, 'smoke-results');
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, 'memory.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
process.exit(0);
