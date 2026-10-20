// Image uploads for backgrounds, logos and custom cursors: POST /api/upload/image?name=<file name> with the raw bytes.
// Runs behind the server's token, Host and Origin checks. Files land in <project>/assets/, written atomically, never outside it.
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { mkdir, realpath, open, rename, rm } from 'node:fs/promises';
import { readBody } from './body.mjs';
import { contained } from './files.mjs';
import { safeImagePath } from '../compose/composition.mjs';
import { renameRetry } from '../fs-retry.mjs';

export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const UPLOAD_DIR = 'assets';
const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });

// Pure: a safe, unique file name under assets/ from whatever name the browser sent. Directory parts and odd characters are dropped.
export function imageFileName(filename, suffix = randomBytes(4).toString('hex')) {
  const leaf = String(filename ?? '').replace(/[\x00-\x1f]/g, '').split(/[\\/]/).pop().trim();
  const dot = leaf.lastIndexOf('.'), ext = dot >= 0 ? leaf.slice(dot + 1).toLowerCase() : '';
  if (!IMAGE_EXTENSIONS.includes(ext)) throw fail(400, 'Choose a PNG, JPG, WebP or SVG image.');
  const stem = leaf.slice(0, dot).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'image';
  return `${stem}-${suffix}.${ext}`;
}
// Pure: do the bytes look like the format the extension claims? SVG must be markup with no script.
export function looksLikeImage(bytes, ext) {
  if (!bytes?.length) return false;
  const head = bytes.subarray(0, 16);
  if (ext === 'png') return head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  if (ext === 'jpg' || ext === 'jpeg') return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  if (ext === 'webp') return head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP';
  if (ext === 'svg') {
    const text = bytes.subarray(0, 4096).toString('utf8').replace(/^﻿/, '').trim();
    return /^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(text) && !/<script|\son[a-z]+\s*=|javascript:/i.test(bytes.toString('utf8'));
  }
  return false;
}
export async function handleUploadApi({ request, route, method, send, dir, limit = MAX_IMAGE_BYTES }) {
  if (method !== 'POST' || route !== '/api/upload/image') return false;
  const name = imageFileName(new URL(request.url, 'http://localhost').searchParams.get('name'));
  const ext = name.slice(name.lastIndexOf('.') + 1);
  const bytes = await readBody(request, limit, 'Image');
  if (!bytes.length) throw fail(400, 'The image file is empty.');
  if (!looksLikeImage(bytes, ext)) throw fail(400, `That file is not a ${ext.toUpperCase()} image.`);
  const base = await realpath(dir), folder = path.join(base, UPLOAD_DIR);
  await mkdir(folder, { recursive: true });
  const real = await realpath(folder);
  if (!contained(base, real)) throw fail(400, 'The assets folder must be inside the project.');
  const target = path.join(real, name), temp = path.join(real, `.${name}.${randomBytes(6).toString('hex')}.tmp`);
  let file;
  try {
    file = await open(temp, 'wx', 0o644);
    await file.writeFile(bytes); await file.sync();
    await file.close(); file = null;
    await renameRetry(temp, target);
  } finally { await file?.close(); await rm(temp, { force: true }); }
  const relative = `${UPLOAD_DIR}/${name}`;
  if (!safeImagePath(relative)) throw fail(500, 'Stored image path is not usable.');
  send(200, { ok: true, file: relative, bytes: bytes.length });
  return true;
}
