import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const name of ['Inter-Regular.woff2', 'Inter-SemiBold.woff2']) {
  test(`${name} is a bundled WOFF2 font`, async () => {
    const bytes = await readFile(new URL(`../assets/fonts/${name}`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'wOF2');
    assert.ok(bytes.length > 48, 'font includes more than its header');
  });
}
