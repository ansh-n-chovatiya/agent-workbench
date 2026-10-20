import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { copyFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { encoderHash, renderHash, editorHash, auditHash } from './lib/record/bundle-hash.mjs';

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

await build({
  absWorkingDir: fileURLToPath(root),
  entryPoints: ['scripts/audit/audit-page.js'], outfile: 'dist/audit-page.js',
  bundle: true, format: 'iife', platform: 'browser', minify: false,
  banner: { js: `// showreel audit sources sha256: ${await auditHash(root)}` },
});

try { import.meta.resolve('preact'); }
catch { throw new Error('Editor build requires Preact. Run npm install in plugins/showreel, then npm run build.'); }
await build({
  absWorkingDir: fileURLToPath(root),
  entryPoints: ['editor/main.jsx'], outfile: 'dist/editor/editor.js',
  bundle: true, format: 'iife', platform: 'browser', minify: false,
  jsxFactory: 'h', jsxFragment: 'Fragment',
  alias: { 'react': 'preact/compat', 'react-dom': 'preact/compat', 'react/jsx-runtime': 'preact/jsx-runtime', 'react-dom/test-utils': 'preact/test-utils' },
  banner: { js: `// showreel editor sources sha256: ${await editorHash(root)}` },
});
await copyFile(new URL('editor/index.html',root),new URL('dist/editor/index.html',root));

const require = createRequire(import.meta.url);
const cliPackage = require.resolve('@tailwindcss/cli/package.json');
const cli = path.join(path.dirname(cliPackage), 'dist/index.mjs');
execFileSync(process.execPath, [cli, '-i', 'editor/styles.css', '-o', 'dist/editor/editor.css', '--minify'], { cwd:fileURLToPath(root), stdio:'inherit' });
