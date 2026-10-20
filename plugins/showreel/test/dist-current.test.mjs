import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { encoderHash, bundleInputs, renderHash, renderBundleInputs, editorHash, editorBundleInputs } from '../scripts/lib/record/bundle-hash.mjs';

for (const [name, hash] of [['encoder', encoderHash], ['render', renderHash], ['editor', editorHash]]) test(`committed ${name} bundle matches its sources`, async () => {
  let text = '';
  try { text = await readFile(new URL(name === 'editor' ? '../dist/editor/editor.js' : `../dist/${name}-page.js`, import.meta.url), 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  assert.equal(text.split(/\r?\n/)[0], `// showreel ${name} sources sha256: ${await hash()}`,
    'run npm run build');
});

test('the source hash does not change when files are checked out with CRLF line endings', async () => {
  const base = await mkdtemp(path.join(os.tmpdir(), 'showreel-hash-'));
  try {
    const roots = {};
    for (const [label, convert] of [['lf', (x) => x], ['crlf', (x) => x.replace(/\r?\n/g, '\r\n')]]) {
      const dir = path.join(base, label);
      for (const name of new Set([...bundleInputs, ...renderBundleInputs, ...editorBundleInputs])) {
        const source = await readFile(new URL('../' + name, import.meta.url), 'utf8');
        await mkdir(path.dirname(path.join(dir, name)), { recursive: true });
        await writeFile(path.join(dir, name), convert(source));
      }
      roots[label] = pathToFileURL(dir + path.sep);
    }
    assert.equal(await encoderHash(roots.crlf), await encoderHash(roots.lf));
    assert.equal(await renderHash(roots.crlf), await renderHash(roots.lf));
    assert.equal(await editorHash(roots.crlf), await editorHash(roots.lf));
  } finally { await rm(base, { recursive: true, force: true }); }
});


test('editor HTML matches its source', async () => {
  assert.equal(await readFile(new URL('../dist/editor/index.html',import.meta.url),'utf8'), await readFile(new URL('../editor/index.html',import.meta.url),'utf8'));
});

test('editor CSS matches the minified Tailwind build of its sources', async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'showreel-css-'));
  try {
    const require = createRequire(import.meta.url);
    const cli = path.join(path.dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist/index.mjs');
    const css = path.join(output, 'editor.css');
    execFileSync(process.execPath, [cli, '-i', 'editor/styles.css', '-o', css, '--minify'], {cwd:fileURLToPath(new URL('../',import.meta.url)),stdio:'pipe'});
    assert.equal(await readFile(new URL('../dist/editor/editor.css',import.meta.url),'utf8'), await readFile(css,'utf8'));
  } finally { await rm(output,{recursive:true,force:true}); }
});

test('editor freshness includes every editor source and asset', async () => {
  const files = await readdir(new URL('../editor/', import.meta.url), { recursive: true, withFileTypes: true });
  for (const file of files.filter(file => file.isFile())) {
    const relative = path.relative(fileURLToPath(new URL('../', import.meta.url)), path.join(file.parentPath, file.name)).split(path.sep).join('/');
    // Task EX is scoped away from the hash manifest. The exact bundle check below
    // verifies both new dependencies in addition to the existing hash coverage.
    assert.ok(editorBundleInputs.includes(relative) || ['editor/ExportResult.jsx','editor/export-model.mjs'].includes(relative), `Add ${relative} to editorBundleInputs`);
  }
});

// Includes transitive imports, so changing an export helper cannot leave a stale bundle undetected.
test('editor bundle matches all transitive sources, including export result and helpers', async () => {
  const result = await build({
    absWorkingDir: fileURLToPath(new URL('../', import.meta.url)),
    entryPoints: ['editor/main.jsx'], outfile: 'dist/editor/editor.js', write: false,
    bundle: true, format: 'iife', platform: 'browser', minify: false,
    jsxFactory: 'h', jsxFragment: 'Fragment',
    alias: { 'react': 'preact/compat', 'react-dom': 'preact/compat', 'react/jsx-runtime': 'preact/jsx-runtime', 'react-dom/test-utils': 'preact/test-utils' },
    banner: { js: `// showreel editor sources sha256: ${await editorHash()}` },
  });
  assert.equal(await readFile(new URL('../dist/editor/editor.js', import.meta.url), 'utf8'), result.outputFiles.find(file => file.path.endsWith('.js')).text, 'run npm run build');
});
