import { mkdir, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Writes complete bytes to a sibling temp file, then renames over the target (never a partial file at the target).
export async function atomicWrite(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, data, { flag: 'wx' });
    await rename(temp, file);
  } finally { await unlink(temp).catch(() => {}); }
  return file;
}
export const atomicWriteJson = (file, value) => atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
