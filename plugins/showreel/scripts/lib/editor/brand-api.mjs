import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { HOME_DIR } from '../paths.mjs';
import { resolveBrand } from '../brand/storage.mjs';
import { BRAND_NAME } from '../brand/schema.mjs';
import { readProjectFile, writeProjectFile } from '../project.mjs';
import { readBody } from './body.mjs';
export const shapeBrand = b => ({name:b.name,summary:{logo:b.logo,colors:b.colors,fonts:b.fonts,watermark:b.watermark,defaultTheme:b.defaultTheme}});
export async function listBrands() {
  let entries=[];
  try {entries=await readdir(path.join(HOME_DIR,'brands'),{withFileTypes:true});} catch(e){if(e.code!=='ENOENT')throw e;}
  const brands=[];
  for(const entry of entries) if(entry.isDirectory()&&BRAND_NAME.test(entry.name)) {
    try {brands.push(shapeBrand(await resolveBrand(entry.name)));}catch { /* Damaged kits are omitted, as in brand list. */ }
  }
  return brands.sort((a,b)=>a.name.localeCompare(b.name));
}
// Called only after the editor's host, origin and session checks. Serialize brief updates.
let writes=Promise.resolve();
export async function handleBrandApi({request,route,method,send,name}) {
  if(method==='GET'&&route==='/api/brands'){send(200,{brands:await listBrands()});return true;}
  if(method!=='POST'||route!=='/api/brand/apply')return false;
  const body=JSON.parse((await readBody(request)).toString('utf8'));
  if(!body||!Object.hasOwn(body,'brand')||Object.keys(body).some(k=>k!=='brand')||(body.brand!==null&&(typeof body.brand!=='string'||!BRAND_NAME.test(body.brand))))throw new Error('Choose a valid brand name or null.');
  const brand=body.brand===null?null:await resolveBrand(body.brand);
  const job=writes.then(async()=>{
    const brief=await readProjectFile(name,'brief');
    if(brand)brief.brand=brand.name;else delete brief.brand;
    await writeProjectFile(name,'brief',brief);
    return brief;
  });
  writes=job.catch(()=>{});
  send(200,{ok:true,brief:await job,brand});return true;
}
