// Offline release audit. Bundled dev dependencies are subject to the runtime policy.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const allowed = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'Unlicense', 'CC0-1.0', 'BlueOak-1.0.0']);
const bundled = ['mediabunny', 'preact', 'tailwindcss', 'lucide-preact', 'class-variance-authority', 'clsx', 'tailwind-merge'];
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function files(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : entry.isFile() ? [file] : [];
  });
}
const packageName = location => location.split('node_modules/').at(-1);

export function auditLicences(root, noticesPath = path.resolve(root, '../../THIRD_PARTY_NOTICES.md')) {
  const lock = readJSON(path.join(root, 'package-lock.json'));
  if (!lock.packages || typeof lock.packages !== 'object' || Array.isArray(lock.packages)) {
    throw new Error('package-lock.json must contain a packages object (lockfile v2/v3)');
  }
  const notices = fs.readFileSync(noticesPath, 'utf8');
  const problems = [], production = [], development = [];
  const shipped = new Set(bundled);
  // esbuild preserves input paths in the committed, unminified JS bundles.
  for (const file of files(path.join(root, 'dist')).filter(file => file.endsWith('.js'))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/node_modules\/((?:@[^/\s]+\/)?[^/\s]+)\//g)) shipped.add(match[1]);
  }
  for (const [location, metadata] of Object.entries(lock.packages)) {
    if (!location) continue;
    const name = packageName(location);
    const runtime = !metadata.dev || shipped.has(name);
    const installedFile = path.join(root, location, 'package.json');
    const installed = fs.existsSync(installedFile) ? readJSON(installedFile) : null;
    (metadata.dev ? development : production).push(`${name}: ${metadata.license || installed?.license || 'unknown'}${metadata.dev && runtime ? ' (bundled)' : ''}`);
    if (!runtime) continue;
    for (const [origin, license] of [['lockfile', metadata.license ?? installed?.license], ...(installed ? [['installed', installed.license ?? metadata.license]] : [])]) {
      if (!allowed.has(license) && !(name === 'mediabunny' && license === 'MPL-2.0') && !(name.startsWith('@fontsource/') && ['OFL-1.1', 'OFL'].includes(license))) {
        problems.push(`${location}: ${origin} licence ${JSON.stringify(license ?? 'unknown')} is not allowed`);
      }
    }
    // All runtime packages get a notice, even when installed rather than bundled.
    if (!notices.includes('`' + name + '`')) problems.push(`${name}: third-party notice is missing`);
  }
  for (const name of shipped) {
    if (!notices.includes('`' + name + '`')) problems.push(`${name}: bundled dependency notice is missing`);
  }
  for (const file of files(path.join(root, 'assets/fonts')).filter(file => /\.(woff2?|ttf|otf|ttc)$/i.test(file))) {
    const stem = path.basename(file).split('-')[0];
    const family = stem.replace(/([a-z])([A-Z])/g, '$1 $2');
    const slug = family.toLowerCase().replaceAll(' ', '-');
    const adjacent = [path.join(path.dirname(file), `${stem}-OFL.txt`), path.join(path.dirname(file), 'OFL.txt')];
    const licensed = adjacent.some(licenseFile => {
      if (!fs.existsSync(licenseFile)) return false;
      const text = fs.readFileSync(licenseFile, 'utf8');
      return /SIL OPEN FONT LICENSE/i.test(text) && text.toLowerCase().includes(family.toLowerCase());
    });
    if (!licensed) problems.push(`${path.relative(root, file)}: adjacent OFL.txt for ${family} is missing or invalid`);
    if (!notices.includes(family)) problems.push(`${family}: bundled font family notice is missing`);
    if (!notices.includes('`@fontsource/' + slug + '`')) problems.push(`@fontsource/${slug}: bundled font source notice is missing`);
  }
  return { problems: [...new Set(problems)], production: production.sort(), development: development.sort() };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = process.argv[2] ? path.resolve(process.argv[2]) : fileURLToPath(new URL('../', import.meta.url));
    const result = auditLicences(root, process.argv[3]);
    console.log('Production dependencies:\n' + result.production.join('\n'));
    console.log('\nDevelopment dependencies (bundled entries also audited):\n' + result.development.join('\n'));
    if (result.problems.length) {
      console.error('\nLicence audit failed:\n' + result.problems.map(problem => `- ${problem}`).join('\n'));
      process.exitCode = 1;
    } else console.log('\nLicence audit passed.');
  } catch (error) {
    console.error(`Licence audit failed: ${error.message}`);
    process.exitCode = 1;
  }
}
