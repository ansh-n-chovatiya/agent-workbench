import os from 'node:os';
import path from 'node:path';
import { slug } from './env.mjs';

export const HOME_DIR = path.resolve(process.env.SHOWREEL_HOME || path.join(os.homedir(), '.showreel'));
export const expandHome = (p) => (p === '~' || p.startsWith('~/') || p.startsWith('~\\') ? path.join(os.homedir(), p.slice(2)) : p);
export const abs = (p) => path.resolve(expandHome(String(p)));

export function projectDir(name) {
  if (typeof name !== 'string' || !name.trim() || /[\\/]|^\.\.?$/.test(name)) {
    throw new Error('project must be a plain name, not a path');
  }
  return path.join(HOME_DIR, 'projects', slug(name));
}
