import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { encoderHash, bundleInputs } from '../scripts/lib/record/bundle-hash.mjs';

test('committed encoder bundle matches its sources', async () => {
  let text = '';
  try { text = await readFile(new URL('../dist/encoder-page.js', import.meta.url), 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  assert.equal(text.split(/\r?\n/)[0], `// showreel encoder sources sha256: ${await encoderHash()}`,
    'run npm run build');
});

test('the source hash does not change when files are checked out with CRLF line endings', async () => {
  const base = await mkdtemp(path.join(os.tmpdir(), 'showreel-hash-'));
  try {
    const roots = {};
    for (const [label, convert] of [['lf', (x) => x], ['crlf', (x) => x.replace(/\r?\n/g, '\r\n')]]) {
      const dir = path.join(base, label);
      for (const name of bundleInputs) {
        const source = await readFile(new URL('../' + name, import.meta.url), 'utf8');
        await mkdir(path.dirname(path.join(dir, name)), { recursive: true });
        await writeFile(path.join(dir, name), convert(source));
      }
      roots[label] = pathToFileURL(dir + path.sep);
    }
    assert.equal(await encoderHash(roots.crlf), await encoderHash(roots.lf));
  } finally { await rm(base, { recursive: true, force: true }); }
});

