import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditLicences } from '../scripts/check-licences.mjs';

function fixture(t, packages = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'showreel-licences-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'assets/fonts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages: { '': {}, ...packages } }));
  const notices = path.join(root, 'NOTICES.md');
  fs.writeFileSync(notices, '`mediabunny` `preact` `tailwindcss` `lucide-preact` `class-variance-authority` `clsx` `tailwind-merge`');
  fs.appendFileSync(notices, ' ' + Object.entries(packages).filter(([, v]) => !v.dev).map(([p]) => '`' + p.split('node_modules/').at(-1) + '`').join(' '));
  return { root, notices };
}

test('licence audit rejects unknown production licences, including optional and nested packages', t => {
  const f = fixture(t, {
    'node_modules/good': { license: 'MIT' },
    'node_modules/bad': { license: 'GPL-3.0', optional: true },
    'node_modules/good/node_modules/missing': {},
    'node_modules/tool': { license: 'GPL-3.0', dev: true },
    'node_modules/mediabunny': { license: 'MPL-2.0', dev: true },
  });
  const result = auditLicences(f.root, f.notices);
  assert.ok(result.problems.some(x => x.includes('bad') && x.includes('GPL-3.0')));
  assert.ok(result.problems.some(x => x.includes('missing') && x.includes('unknown')));
  assert.ok(!result.problems.some(x => x.includes('tool')));
  assert.ok(result.development.some(x => x.includes('tool')));
  assert.ok(!result.problems.some(x => x.includes('mediabunny')));
});

test('licence audit checks installed metadata too and restricts MPL to mediabunny', t => {
  const f = fixture(t, { 'node_modules/pkg': { license: 'MIT' }, 'node_modules/other': { license: 'MPL-2.0' } });
  fs.mkdirSync(path.join(f.root, 'node_modules/pkg'), { recursive: true });
  fs.writeFileSync(path.join(f.root, 'node_modules/pkg/package.json'), JSON.stringify({ license: 'AGPL-3.0' }));
  const result = auditLicences(f.root, f.notices);
  assert.ok(result.problems.some(x => x.includes('installed') && x.includes('AGPL-3.0')));
  assert.ok(result.problems.some(x => x.includes('other') && x.includes('MPL-2.0')));
});

test('licence audit accepts the allowlist offline and lists development dependencies separately', t => {
  const licences = ['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'Unlicense', 'CC0-1.0', 'BlueOak-1.0.0'];
  const f = fixture(t, Object.fromEntries(licences.map((license, i) => [`node_modules/p${i}`, { license }])));
  assert.deepEqual(auditLicences(f.root, f.notices).problems, []);
});

test('licence audit requires family notices, fontsource notices and an adjacent matching OFL', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, 'assets/fonts/SpaceGrotesk-Bold.woff2'), 'font');
  fs.writeFileSync(path.join(f.root, 'assets/fonts/OFL.txt'), 'Inter SIL OPEN FONT LICENSE');
  let result = auditLicences(f.root, f.notices);
  assert.ok(result.problems.some(x => x.includes('Space Grotesk')));
  assert.ok(result.problems.some(x => x.includes('OFL')));
  fs.appendFileSync(f.notices, ' Space Grotesk `@fontsource/space-grotesk`');
  fs.writeFileSync(path.join(f.root, 'assets/fonts/SpaceGrotesk-OFL.txt'), 'Space Grotesk SIL OPEN FONT LICENSE');
  assert.deepEqual(auditLicences(f.root, f.notices).problems, []);
});

test('licence audit discovers bundled transitive dependencies even when marked dev', t => {
  const f = fixture(t, { 'node_modules/transitive': { license: 'GPL-3.0', dev: true } });
  fs.mkdirSync(path.join(f.root, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(f.root, 'dist/editor.js'), '// node_modules/transitive/index.js');
  const problems = auditLicences(f.root, f.notices).problems;
  assert.ok(problems.some(x => x.includes('transitive') && x.includes('GPL-3.0')));
  assert.ok(problems.some(x => x.includes('transitive') && x.includes('notice')));
});

test('licence audit CLI fails clearly for malformed lockfiles', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, 'package-lock.json'), '{}');
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/check-licences.mjs', import.meta.url)), f.root, f.notices], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /packages/);
});

test('licence audit CLI exits zero on clean inputs and one with a clear violation list', t => {
  const f = fixture(t);
  const cli = fileURLToPath(new URL('../scripts/check-licences.mjs', import.meta.url));
  const run = () => spawnSync(process.execPath, [cli, f.root, f.notices], { encoding: 'utf8' });
  assert.equal(run().status, 0);
  fs.writeFileSync(path.join(f.root, 'package-lock.json'), JSON.stringify({ packages: { '': {}, 'node_modules/copyleft': { license: 'GPL-3.0' } } }));
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /copyleft.*GPL-3.0/);
  assert.match(result.stderr, /notice is missing/);
});
