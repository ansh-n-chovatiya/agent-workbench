import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const bundleInputs = [
  'scripts/lib/record/encoder-page.js', 'scripts/build.mjs', 'scripts/lib/record/bundle-hash.mjs',
  'package.json', 'package-lock.json',
];

export async function encoderHash(root = new URL('../../../', import.meta.url)) {
  const hash = createHash('sha256');
  for (const name of bundleInputs) {
    hash.update(name + '\0');
    hash.update(await readFile(new URL(name, root)));
    hash.update('\0');
  }
  return hash.digest('hex');
}
