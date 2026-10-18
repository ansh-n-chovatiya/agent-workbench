import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const bundleInputs = [
  'scripts/lib/record/encoder-page.js', 'scripts/build.mjs', 'scripts/lib/record/bundle-hash.mjs',
  'package.json', 'package-lock.json',
];

export const renderBundleInputs = [...bundleInputs,
  'scripts/lib/compose/render-page.js',
  ...['timemap', 'zoom', 'camera', 'cursor-track', 'cursor-director', 'custom-cursor', 'captions', 'themes', 'layout', 'composition', 'plan']
    .map((name) => `scripts/lib/compose/${name}.mjs`),
];
export const encoderHash = (root = new URL('../../../', import.meta.url)) => hashInputs(bundleInputs, root);
export const renderHash = (root = new URL('../../../', import.meta.url)) => hashInputs(renderBundleInputs, root);
async function hashInputs(inputs, root) {
  const hash = createHash('sha256');
  for (const name of inputs) {
    hash.update(name + '\0');
    // Line endings are normalised: Git for Windows checks files out with CRLF, which would change the hash of identical sources.
    hash.update((await readFile(new URL(name, root), 'utf8')).replace(/\r\n/g, '\n'));
    hash.update('\0');
  }
  return hash.digest('hex');
}
