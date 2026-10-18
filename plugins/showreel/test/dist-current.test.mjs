import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { encoderHash } from '../scripts/lib/record/bundle-hash.mjs';

test('committed encoder bundle matches its sources', async () => {
  let text = '';
  try { text = await readFile(new URL('../dist/encoder-page.js', import.meta.url), 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  assert.equal(text.split('\n')[0], `// showreel encoder sources sha256: ${await encoderHash()}`,
    'run npm run build');
});
