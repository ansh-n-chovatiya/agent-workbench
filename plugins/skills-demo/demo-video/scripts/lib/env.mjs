// Process and path helpers shared by every stage.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { access, constants, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Skill root = two levels above scripts/lib/.
export const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// The skill's own Playwright CLI; run it as `run(process.execPath, [playwrightCli(), ...args])`.
export const playwrightCli = () => createRequire(path.join(SKILL_ROOT, 'package.json')).resolve('@playwright/test/cli');

// Runs a binary and collects its output. Never rejects on a non-zero exit;
// rejects only when the binary cannot be started (err.code === 'ENOENT' when missing).
// `quiet: false` streams output to the terminal as well as collecting it.
// Aborting `signal` kills the process and rejects. `env` replaces the
// inherited environment.
export function run(cmd, args = [], { cwd, input, quiet = true, signal, env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'], signal });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; if (!quiet) process.stdout.write(d); });
    child.stderr.on('data', (d) => { stderr += d; if (!quiet) process.stderr.write(d); });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    if (input != null) child.stdin.end(input);
    else child.stdin.end();
  });
}

// Absolute path of `bin` on PATH, or null.
export async function which(bin) {
  const exts = process.platform === 'win32' ? ['.exe', '.cmd', ''] : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const p = path.join(dir, bin + ext);
      try { await access(p, constants.X_OK); return p; } catch {}
    }
  }
  return null;
}

// Container duration in seconds as reported by ffprobe.
export async function ffprobeDuration(file) {
  const { code, stdout, stderr } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file,
  ]);
  const d = parseFloat(stdout);
  if (code !== 0 || !Number.isFinite(d)) throw new Error(`ffprobe could not read a duration from ${file}: ${stderr.trim().split('\n').pop() || 'no output'}`);
  return d;
}

export const log = (msg) => console.log(msg);
export const warn = (msg) => console.error(`warning: ${msg}`);

// Keeps a folder of recordings or sessions out of git with a `.gitignore` of
// `*`, but only in a folder the skill owns: one the caller just created
// (`created: true`) or one under HOME_DIR. An existing project folder (outDir
// "tests", storageState "e2e/auth.json") gets one warning naming `file`
// instead, since `*` there would hide the project's own files from git. One
// the user wrote is never replaced; a different one gets a warning. The
// warning is only for a folder inside a git work tree: elsewhere nothing
// can commit it.
const warnedDirs = new Set();
// A `.git` folder (or, in a worktree or submodule, file) in `dir` or above.
export function inGitRepo(dir) {
  for (let d = path.resolve(dir); ; d = path.dirname(d)) {
    if (existsSync(path.join(d, '.git'))) return true;
    if (d === path.dirname(d)) return false;
  }
}
export async function ensureGitignore(dir, { created = false, file = dir } = {}) {
  const gitignore = path.join(dir, '.gitignore');
  const had = await readFile(gitignore, 'utf8').catch(() => null);
  // Imported here: paths.mjs imports this module, so a top-level import would be circular.
  const { HOME_DIR } = await import('./paths.mjs');
  const rel = path.relative(HOME_DIR, path.resolve(dir));
  const owned = created || (!rel.startsWith('..') && !path.isAbsolute(rel));
  if (had === null && owned) await writeFile(gitignore, '*\n');
  else if (had === null) {
    if (!warnedDirs.has(dir) && inGitRepo(dir)) warn(`${file} holds recordings or login cookies; add it to .gitignore`);
    warnedDirs.add(dir);
  } else if (had.trim() !== '*') warn(`${gitignore} does not ignore everything; recordings and sessions there may be committed`);
}

// Lowercase, ASCII, dash-separated; used for run ids and file names.
export function slug(s) {
  return String(s)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'demo';
}
