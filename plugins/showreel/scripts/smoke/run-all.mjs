import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { PLUGIN_ROOT, run } from '../lib/env.mjs';

const directory = path.join(PLUGIN_ROOT, 'smoke-results');
await mkdir(directory, { recursive: true });
const summary = [];
for (const name of ['export', 'capture', 'memory']) {
  const file = path.join(directory, `${name}.json`);
  let result;
  try {
    // Remove stale output so a crashed child cannot appear to have passed.
    await rm(file, { force: true });
    const child = await run(process.execPath, [path.join(PLUGIN_ROOT, `scripts/smoke/${name}.mjs`)], {
      signal: AbortSignal.timeout(180000),
    });
    if (child.code !== 0) throw new Error(child.stderr.trim() || `${name} exited with code ${child.code}`);
    result = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    result = { os: process.platform, arch: process.arch, error: String(error.message || error) };
    if (name === 'export') Object.assign(result, { engine: 'chromium-bundled', avc: false, vp9: false, av1: false, mp4Bytes: null });
    if (name === 'capture') Object.assign(result, { results: [], recommended: 1 });
    if (name === 'memory') Object.assign(result, { completed: false, encodeFps: null, peakJsHeapMb: null, peakRssMb: null });
    await writeFile(file, JSON.stringify(result, null, 2) + '\n');
  }
  const detail = name === 'export' ? `avc=${result.avc}, MP4=${result.mp4Bytes} bytes`
    : name === 'capture' ? `recommended capture scale: ${result.recommended}`
      : `completed=${result.completed}, encode fps=${result.encodeFps}, RSS=${result.peakRssMb} MB`;
  summary.push({ smoke: name, status: result.error ? 'error' : 'ok', detail,
    error: result.error ? result.error.split('\n')[0].slice(0, 140) : '' });
}
console.table(summary);
console.log(`Results: ${directory}`);
process.exit(0);
