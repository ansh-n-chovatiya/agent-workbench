// Where every file lives. Nothing goes into the project being demoed by
// default: config, login state and runs sit under HOME_DIR, and the files a
// person watches or shares go to one visible deliverables folder.
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CONFIG_FILE, readConfigFile } from './config.mjs';
import { slug } from './env.mjs';

// Read once at import: tests and selftest set DEMO_VIDEO_HOME before loading.
export const HOME_DIR = path.resolve(process.env.DEMO_VIDEO_HOME || path.join(os.homedir(), '.demo-video'));

const expandHome = (p) => (p === '~' || p.startsWith('~/') ? path.join(os.homedir(), p.slice(1)) : p);

// Absolute form of a path, for anything printed to the user.
export const abs = (p) => path.resolve(expandHome(String(p)));

// Lookup order: --config, DEMO_VIDEO_CONFIG, <cwd>/demo.config.json,
// HOME_DIR/configs/<cwd name>.json. Relative outDir/storageState resolve
// against cwd (the project).
export async function resolveProject({ cwd, configFlag } = {}) {
  cwd = path.resolve(cwd);
  const named = configFlag || process.env.DEMO_VIDEO_CONFIG;
  const local = path.join(cwd, CONFIG_FILE);
  const home = path.join(HOME_DIR, 'configs', `${path.basename(cwd)}.json`);
  let configFile;
  if (named) {
    configFile = path.resolve(cwd, expandHome(named));
    if (!existsSync(configFile)) throw Object.assign(new Error(`config file not found: ${configFile}`), { code: 'NO_CONFIG' });
  } else if (existsSync(local)) configFile = local;
  else if (existsSync(home)) configFile = home;
  else throw Object.assign(new Error(`no config found at ${local} or ${home}; run "demo.mjs init" (or "init --here") first`), { code: 'NO_CONFIG' });

  const config = await readConfigFile(configFile);
  const project = config.project || path.basename(cwd);
  const inProject = (p, dflt) => (p ? path.resolve(cwd, expandHome(p)) : dflt);
  return {
    project,
    configFile,
    config,
    runsDir: inProject(config.outDir, path.join(HOME_DIR, 'runs', project)),
    authFile: inProject(config.storageState, path.join(HOME_DIR, 'auth', `${project}.json`)),
    nextBuildDir: inProject(config.nextBuildDir, null),
  };
}

// <deliver root>/<slug>-<YYYY-MM-DD-HHMM>, local time.
export function deliverFolder(config, slugName, date = new Date()) {
  const root = process.env.DEMO_VIDEO_DELIVER || config.deliverDir || path.join(os.homedir(), 'Desktop', 'Demo Videos');
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`;
  return path.join(abs(root), `${slugName}-${stamp}`);
}

const even = (n) => Math.round(n / 2) * 2;

// The laptop recording size. The final video is 1920x1080 and, in band mode,
// its bottom `band` output pixels are the caption band, so the page shows in a
// 1920 x (1080 - band) area. The recording takes exactly that shape, with its
// height derived from laptop.width (laptop.height is not used): compose then
// scales it to fill the area without cropping a row or a column of the UI, and
// the captions never sit on top of the product.
export function laptopViewport(config) {
  const band = config.caption.mode === 'band' ? even(config.caption.bandHeight) : 0;
  const width = even(config.laptop.width);
  return { width, height: even((width * (1080 - band)) / 1920), band };
}

// Scenario file name without .spec/.test and extension, slugged.
export const scenarioSlug = (file) => slug(path.basename(file).replace(/(\.(spec|test))?\.[cm]?[jt]sx?$/, ''));
