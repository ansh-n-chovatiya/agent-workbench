import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

async function sources(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'smoke-results') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await sources(file));
    else if (/\.(mjs|js)$/.test(entry.name)) out.push(file);
  }
  return out;
}

// The pathname of a file URL is '/D:/a/...' on Windows and breaks every file path built from it; this broke CI once.
test('no source builds a file path from import.meta.url with .pathname', async () => {
  const offenders = [];
  for (const file of await sources(root)) {
    const text = await readFile(file, 'utf8');
    if (/import\.meta\.url\s*\)\s*\.pathname/.test(text) || /\bcli\.pathname\b/.test(text)) offenders.push(path.relative(root, file));
  }
  assert.deepEqual(offenders, [], 'use fileURLToPath(new URL(..., import.meta.url)) instead');
});
