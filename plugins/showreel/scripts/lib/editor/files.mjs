import path from 'node:path';
import { realpath, stat, open, rename, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { safeRelativePath } from './http.mjs';
import { renameRetry } from '../fs-retry.mjs';

export const contained = (root, file) => { const rel = path.relative(root,file); return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); };
export async function safeFile(root, encoded) {
  const relative = safeRelativePath(encoded);
  if (!relative) throw new Error('Invalid local path');
  const base = await realpath(root), file = await realpath(path.join(base, relative));
  if (!contained(base,file) || !(await stat(file)).isFile()) throw new Error('File must be inside its project');
  return file;
}
export async function writeCompositionAtomic(dir, composition) {
  const base = await realpath(dir), target = path.join(base,'composition.json');
  // Rename replaces a symlink itself, never its target. The temp is exclusively created in the same directory.
  const temp = path.join(base,`.composition-${randomBytes(12).toString('hex')}.tmp`);
  let file;
  try {
    file = await open(temp,'wx',0o600);
    await file.writeFile(JSON.stringify(composition,null,2) + '\n'); await file.sync();
    await file.close(); file = null;
    await renameRetry(temp,target);
  } finally { await file?.close(); await rm(temp,{force:true}); }
}
