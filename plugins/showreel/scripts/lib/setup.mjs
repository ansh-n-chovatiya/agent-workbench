// First-run setup for an installed plugin. Imports only Node built-ins: it has to run when nothing else can.
//
// The marketplace copy of the plugin has no node_modules, and Showreel needs exactly one runtime package, Playwright
// (everything else is bundled into dist/). `setup` installs it into a folder that survives plugin updates
// (CLAUDE_PLUGIN_DATA, else ~/.showreel/runtime), links it into the plugin folder, and downloads Chromium once.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync, lstatSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const isWindows = process.platform === 'win32';

export const supportedNode = (version) => {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return false;
  const [, major, minor] = match.map(Number);
  return (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22;
};

export function runtimeDir(env = process.env) {
  if (env.CLAUDE_PLUGIN_DATA) return path.join(env.CLAUDE_PLUGIN_DATA, 'showreel-runtime');
  return path.join(env.SHOWREEL_HOME || path.join(os.homedir(), '.showreel'), 'runtime');
}

const playwrightVersion = (root) => JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).dependencies.playwright;
const has = (dir) => existsSync(path.join(dir, 'node_modules', 'playwright', 'package.json'));

/** True when `import 'playwright'` would work from the plugin folder. */
export function depsInstalled(root = PLUGIN_ROOT) {
  try { createRequire(path.join(root, 'package.json')).resolve('playwright/package.json'); return true; } catch { return false; }
}

/** Point `<plugin>/node_modules` at the persistent install. Silent and cheap; returns true when it linked. */
export function relink(root = PLUGIN_ROOT, dir = runtimeDir()) {
  if (depsInstalled(root) || !has(dir)) return false;
  const link = path.join(root, 'node_modules');
  try {
    try { if (lstatSync(link).isSymbolicLink()) rmSync(link); } catch { /* nothing there */ }
    symlinkSync(path.join(dir, 'node_modules'), link, isWindows ? 'junction' : 'dir');
  } catch { return false; }
  return depsInstalled(root);
}

export const notSetUpMessage = `Showreel is not set up on this machine yet.
Run:  node "${path.join(PLUGIN_ROOT, 'scripts', 'showreel.mjs')}" setup
(it installs Playwright and a Chromium browser, about 300 MB, once; plugin updates keep it).`;

function run(command, args, options = {}) {
  const useShell = isWindows && /\.(cmd|bat)$/i.test(command);
  return spawnSync(command, args, { stdio: 'inherit', shell: useShell, ...options });
}

/** `showreel setup [--check]`. Returns the process exit code. */
export async function setupMain(flags = [], { root = PLUGIN_ROOT, dir = runtimeDir(), log = console.log } = {}) {
  const check = flags.includes('--check');
  const unknown = flags.filter((f) => f !== '--check');
  if (unknown.length) { log('Usage: showreel setup [--check]'); return 2; }
  if (!supportedNode(process.versions.node)) {
    log(`fail node ${process.versions.node} -> install Node 20.19+ or 22.12+ (https://nodejs.org), then run setup again`);
    return 1;
  }
  log(`ok   node          ${process.versions.node}`);

  relink(root, dir);
  const installed = depsInstalled(root);
  log(`${installed ? 'ok  ' : 'todo'} playwright    ${installed ? 'installed' : 'not installed'}`);
  if (check) return installed ? 0 : 1;

  if (!installed) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'showreel-runtime', private: true, dependencies: { playwright: playwrightVersion(root) } }, null, 2));
    log(`installing Playwright ${playwrightVersion(root)} into ${dir} ...`);
    const npm = process.env.SHOWREEL_NPM || (isWindows ? 'npm.cmd' : 'npm');
    const done = run(npm, ['install', '--omit=dev', '--no-audit', '--no-fund', '--prefix', dir]);
    if (done.status !== 0 || !has(dir)) {
      log('fail install -> check your internet connection and that `npm` works, then run setup again. If this keeps failing, run:');
      log(`       npm install --prefix "${dir}" playwright@${playwrightVersion(root)}`);
      return 1;
    }
    if (!relink(root, dir)) {
      log(`fail link -> could not link ${path.join(root, 'node_modules')} (is the plugin folder read-only?). Manual fix: run \`npm install playwright@${playwrightVersion(root)}\` inside ${root}`);
      return 1;
    }
  }

  const cli = path.join(dir, 'node_modules', 'playwright', 'cli.js');
  const browsers = run(process.execPath, [existsSync(cli) ? cli : path.join(root, 'node_modules', 'playwright', 'cli.js'), 'install', 'chromium']);
  if (browsers.status !== 0) {
    log('fail chromium -> the browser download failed; check your connection and run setup again');
    return 1;
  }
  log('\nSetup finished. Checking the machine:');
  return 0;
}
