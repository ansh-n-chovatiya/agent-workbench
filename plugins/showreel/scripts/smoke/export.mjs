import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PLUGIN_ROOT } from '../lib/env.mjs';
import { startFixtureServer } from '../lib/fixture-server.mjs';

const result = {
  os: process.platform, arch: process.arch, engine: 'chromium-bundled',
  avc: false, vp9: false, av1: false, mp4Bytes: null, error: null,
};
let temporary, server, browser, timeout;
try {
  temporary = await mkdtemp(path.join(os.tmpdir(), 'showreel-export-'));
  await build({
    entryPoints: [path.join(PLUGIN_ROOT, 'scripts/smoke/pages/export.js')],
    bundle: true, format: 'iife', outfile: path.join(temporary, 'page.js'), logLevel: 'error',
  });
  await writeFile(path.join(temporary, 'index.html'), '<!doctype html><title>Export smoke</title><script src="/page.js"></script>');
  // Loopback is a secure context; both HTML and bundle come from this origin.
  server = await startFixtureServer(temporary);
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(server.url);
  Object.assign(result, await Promise.race([
    page.evaluate(() => window.runExport()),
    new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Export timed out after 120 seconds')), 120000); }),
  ]));
} catch (error) { result.error = String(error.message || error); }
finally {
  clearTimeout(timeout);
  await browser?.close().catch((error) => { result.error ??= error.message; });
  await server?.close().catch((error) => { result.error ??= error.message; });
  if (temporary) await rm(temporary, { recursive: true, force: true }).catch((error) => { result.error ??= error.message; });
}
const directory = path.join(PLUGIN_ROOT, 'smoke-results');
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, 'export.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
process.exit(0);
