import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const root = '../scratch/openscreen';
const focus = ['src/lib/exporter', 'src/lib/cursor', 'src/lib/captioning', 'src/components/video-editor/timeline',
  'src/components/video-editor/videoPlayback', 'src/lib/compositeLayout.ts', 'src/components/video-editor/types.ts'];

function walk(p) {
  if (statSync(p).isFile()) return [p];
  return readdirSync(p).flatMap((n) => walk(join(p, n)));
}
const files = [];
for (const f of focus) {
  let full; try { full = join(root, f); statSync(full); } catch { continue; }
  for (const p of walk(full).filter((x) => /\.(ts|tsx)$/.test(x) && !/\.test\./.test(x))) {
    const src = readFileSync(p, 'utf8');
    const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]).filter((i) => !i.startsWith('.') && !i.startsWith('@/'));
    files.push({
      path: relative(root, p), loc: src.split('\n').length,
      electron: (src.match(/electron/gi) || []).length, gsap: (src.match(/gsap/gi) || []).length,
      window_api: (src.match(/window\.electronAPI/g) || []).length, externalImports: [...new Set(imports)],
    });
  }
}
const assets = readdirSync(join(root, 'public')).map((n) => ({ path: 'public/' + n, bytes: statSync(join(root, 'public', n)).size }));
const commit = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
writeFileSync('../results/s3-extract.json', JSON.stringify({ commit, files, assets }, null, 2));
const clean = files.filter((f) => !f.electron && !f.gsap && !f.window_api);
console.log(`${files.length} files, ${files.reduce((a, f) => a + f.loc, 0)} lines; ${clean.length} files with no electron/gsap/window.electronAPI reference`);
console.log('external packages used:', [...new Set(files.flatMap((f) => f.externalImports))].sort().join(', '));
