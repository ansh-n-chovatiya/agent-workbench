import { spawn } from 'node:child_process';
import { access, constants } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const isWindows = process.platform === 'win32';

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

export async function which(bin) {
  if (isWindows) {
    const { code, stdout } = await run('where', [bin]);
    return code === 0 ? stdout.split(/\r?\n/).find(Boolean) ?? null : null;
  }
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, bin);
    try { await access(candidate, constants.X_OK); return candidate; } catch {}
  }
  return null;
}

export const log = (msg) => console.log(msg);
export const warn = (msg) => console.error(`warning: ${msg}`);

export function slug(s) {
  return String(s)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'demo';
}
