import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { encoderHash } from './lib/record/bundle-hash.mjs';

const root = new URL('../', import.meta.url);
await build({
  absWorkingDir: fileURLToPath(root),
  entryPoints: ['scripts/lib/record/encoder-page.js'],
  outfile: 'dist/encoder-page.js',
  bundle: true, format: 'iife', platform: 'browser', minify: false,
  banner: { js: `// showreel encoder sources sha256: ${await encoderHash(root)}` },
});
