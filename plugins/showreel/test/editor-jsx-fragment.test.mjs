import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// esbuild compiles <>...</> to Fragment; a file that uses it without importing Fragment throws at render time in the browser.
const root = fileURLToPath(new URL('../editor/', import.meta.url));
async function files(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await files(full));
    else if (entry.name.endsWith('.jsx')) out.push(full);
  }
  return out;
}
test('every editor component that uses a JSX fragment imports Fragment', async () => {
  for (const file of await files(root)) {
    const source = await readFile(file, 'utf8');
    if (/<>|<\/>/.test(source)) assert.match(source, /import\s*\{[^}]*\bFragment\b[^}]*\}\s*from\s*'preact'/, `${path.relative(root, file)} uses <> without importing Fragment`);
  }
});
