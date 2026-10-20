import path from 'node:path';
import { readFile, realpath, stat, rename, writeFile, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { HOME_DIR } from '../paths.mjs';
import { safeFile, contained } from '../editor/files.mjs';
import { BRAND_NAME, IMAGE_EXT, FONT_EXT, IMAGE_LIMIT, FONT_LIMIT, validateBrand } from './schema.mjs';
import { renameRetry } from '../fs-retry.mjs';
export function brandDir(name) {
  if (typeof name !== 'string' || !BRAND_NAME.test(name)) throw new Error('Invalid brand name: expected [a-z0-9][a-z0-9-]{0,40}');
  return path.join(HOME_DIR,'brands',name);
}
export async function confinedBrandDir(name) {
  const root=await realpath(path.join(HOME_DIR,'brands')), dir=await realpath(brandDir(name));
  if (!contained(root,dir)) throw new Error('Brand folder must be inside brands');
  return dir;
}
export async function brandAsset(name, relative) {
  const font=FONT_EXT.test(relative), image=IMAGE_EXT.test(relative);
  if (!font && !image) throw new Error('Unsupported brand asset extension');
  const dir=await confinedBrandDir(name), file=await safeFile(dir,relative.split('/').map(encodeURIComponent).join('/'));
  if ((await stat(file)).size > (font ? FONT_LIMIT : IMAGE_LIMIT)) throw new Error(`Brand asset ${relative} exceeds ${font ? '2' : '10'} MB limit`);
  // A symlink with a whitelisted name must not disguise an unsupported real extension.
  if (!(font ? FONT_EXT : IMAGE_EXT).test(file)) throw new Error('Unsupported real asset extension');
  return file;
}
export async function validateBrandAssets(b) {
  const errors=[...validateBrand(b).errors];
  if (!b || typeof b !== 'object') return {ok:false,errors};
  const files=[b.logo?.file,b.fonts?.heading?.file,b.fonts?.body?.file,b.watermark?.file].filter(v=>typeof v === 'string');
  for (const file of new Set(files)) try { await brandAsset(b.name,file); } catch(e) { errors.push(`${file}: ${e.message}`); }
  return {ok:!errors.length,errors};
}
export async function readBrand(name) {
  const dir=await confinedBrandDir(name), file=await safeFile(dir,'brand.json');
  const b=JSON.parse(await readFile(file,'utf8'));
  const result=await validateBrandAssets(b);
  if (b.name !== name) result.errors.push('Brand name must match its folder');
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  return b;
}
export async function resolveBrand(name) {
  const b=await readBrand(name);
  return {...b,watermark:{...b.watermark,file:b.watermark.file ?? b.logo?.file ?? null}};
}
export async function saveBrand(b) {
  const result=await validateBrandAssets(b);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  const dir=await confinedBrandDir(b.name), temp=path.join(dir,`.brand-${randomUUID()}.tmp`);
  try {
    await writeFile(temp,JSON.stringify(b,null,2)+'\n',{flag:'wx'});
    await renameRetry(temp,path.join(dir,'brand.json'));
  } finally { await rm(temp,{force:true}); }
}
export async function loadBriefBrand(brief, warn = console.warn) {
  if (!brief?.brand) return null;
  try { return await resolveBrand(brief.brand); }
  catch(e) { if (e.code !== 'ENOENT') throw e; warn(`warning: Brand ${brief.brand} is missing; continuing with theme`); return null; }
}
export async function resolveBrandRoute(route) {
  try {
    const [name,...parts]=route.split('/').map(decodeURIComponent);
    if (!parts.length || parts.some(p=>p.includes('/') || p.includes('\\'))) return null;
    const file=await brandAsset(name,parts.join('/'));
    const type={'.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf'}[path.extname(file).toLowerCase()];
    return {file,type};
  } catch { return null; }
}
