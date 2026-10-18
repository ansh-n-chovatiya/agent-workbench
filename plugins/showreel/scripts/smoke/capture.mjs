import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PLUGIN_ROOT } from '../lib/env.mjs';
import { startFixtureServer } from '../lib/fixture-server.mjs';
import { benchmarkCapture, recommendScale } from '../lib/capture-benchmark.mjs';

const result = { os: process.platform, arch: process.arch, results: [], recommended: 1 };
let server;
try {
  server = await startFixtureServer();
  result.results = await benchmarkCapture({ url: `${server.url}/index.html` });
  result.recommended = recommendScale(result.results);
  const failures = result.results.filter((entry) => entry.error);
  if (failures.length) result.error = failures.map(({ scale, error }) => `${scale}: ${error}`).join('; ');
} catch (error) { result.error = String(error.message || error); }
finally { await server?.close().catch((error) => { result.error ??= error.message; }); }
const directory = path.join(PLUGIN_ROOT, 'smoke-results');
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, 'capture.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
process.exit(0);
