import { copyFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { encoderHash, renderHash, editorHash } from './lib/record/bundle-hash.mjs';

const root = new URL('../', import.meta.url);
await build({
  absWorkingDir: fileURLToPath(root),
  entryPoints: ['scripts/lib/record/encoder-page.js'],
  outfile: 'dist/encoder-page.js',
  bundle: true, format: 'iife', platform: 'browser', minify: false,
  banner: { js: `// showreel encoder sources sha256: ${await encoderHash(root)}` },
});

await build({
  absWorkingDir: fileURLToPath(root),
  entryPoints: ['scripts/lib/compose/render-page.js'],
  outfile: 'dist/render-page.js',
  bundle: true, format: 'iife', platform: 'browser', minify: false,
  banner: { js: `// showreel render sources sha256: ${await renderHash(root)}` },
});

try { import.meta.resolve('preact'); }
catch { throw new Error('Editor build requires Preact. Run npm install in plugins/showreel, then npm run build.'); }
await build({
  absWorkingDir: fileURLToPath(root),
  entryPoints: ['editor/main.jsx'], outfile: 'dist/editor/editor.js',
  bundle: true, format: 'iife', platform: 'browser', minify: false,
  jsxFactory: 'h', jsxFragment: 'Fragment',
  banner: { js: `// showreel editor sources sha256: ${await editorHash(root)}` },
});
await copyFile(new URL('editor/index.html',root),new URL('dist/editor/index.html',root));

await copyFile(new URL('editor/editor.css',root),new URL('dist/editor/editor.css',root));
