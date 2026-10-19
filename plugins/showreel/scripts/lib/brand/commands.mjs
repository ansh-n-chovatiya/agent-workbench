import path from 'node:path';
import { mkdir, copyFile, readdir, rm, stat } from 'node:fs/promises';
import { HOME_DIR, abs } from '../paths.mjs';
import { readProjectFile, writeProjectFile } from '../project.mjs';
import { brandDefaults, FONT_EXT, IMAGE_EXT, FONT_LIMIT, IMAGE_LIMIT } from './schema.mjs';
import { brandDir, confinedBrandDir, resolveBrand, readBrand, saveBrand } from './storage.mjs';
export async function brandCommand([command,...flags]) {
  const allowed={init:['brand','logo','primary','accent','background','text','muted','font-heading','font-body','font-heading-family','font-body-family','font-heading-weight','font-body-weight','watermark','theme'],show:['brand','json'],set:['brand','path','value'],list:[],remove:['brand','yes'],apply:['name','brand'],clear:['name']};
  if (!Object.hasOwn(allowed,command)) throw new Error('Usage: brand init|show|set|list|remove|apply|clear');
  const o={};
  for(let i=0;i<flags.length;i++) {
    const k=flags[i].slice(2);
    if (!flags[i].startsWith('--') || !allowed[command].includes(k) || Object.hasOwn(o,k)) throw new Error(`Invalid option: ${flags[i]}`);
    o[k]=['json','yes'].includes(k) ? true : flags[++i];
    if (o[k] === undefined) throw new Error(`Missing value for --${k}`);
  }
  if (command === 'list') {
    let entries=[]; try { entries=await readdir(path.join(HOME_DIR,'brands'),{withFileTypes:true}); } catch(e) { if(e.code!=='ENOENT')throw e; }
    const names=[];
    for(const e of entries) if(e.isDirectory()) { try { await resolveBrand(e.name); names.push(e.name); } catch { /* omit damaged kits */ } }
    console.log(names.sort().join('\n')); return;
  }
  if (['apply','clear'].includes(command)) {
    if (!o.name) throw new Error('--name is required');
    const brief=await readProjectFile(o.name,'brief');
    if(command==='apply') { await resolveBrand(o.brand); brief.brand=o.brand; } else delete brief.brand;
    await writeProjectFile(o.name,'brief',brief); console.log('ok'); return;
  }
  const dir=brandDir(o.brand);
  if(command==='init') {
    const b=brandDefaults(o.brand);
    for(const k of ['primary','accent','background','text','muted']) if(o[k]) b.colors[k]=o[k];
    if(o.theme)b.defaultTheme=o.theme;
    // Validate sources before creating the kit. Destination names never come from user paths.
    const copies=[];
    for(const [flag,kind] of [['logo','image'],['watermark','image'],['font-heading','font'],['font-body','font']]) if(o[flag]) {
      const source=abs(o[flag]), ext=path.extname(source).toLowerCase(), info=await stat(source);
      if(!(kind==='font'?FONT_EXT:IMAGE_EXT).test(source) || !info.isFile() || info.size>(kind==='font'?FONT_LIMIT:IMAGE_LIMIT)) throw new Error(`Invalid or oversized ${flag} asset`);
      const file=`${flag}${ext}`; copies.push({source,file});
      if(flag==='logo')b.logo={file,heightPct:10};
      else if(flag==='watermark')Object.assign(b.watermark,{enabled:true,file});
      else { const role=flag.slice(5); b.fonts[role]={file,family:o[`${flag}-family`] ?? `Brand ${role}`,weight:Number(o[`${flag}-weight`] ?? (role==='heading'?600:400))}; }
    }
    await mkdir(path.dirname(dir),{recursive:true}); await mkdir(dir);
    try { await confinedBrandDir(o.brand); for(const {source,file} of copies)await copyFile(source,path.join(dir,file)); await saveBrand(b); }
    catch(e) { await rm(dir,{recursive:true,force:true}); throw e; }
    if(copies.some(c=>c.file.startsWith('font-')))console.log('You are responsible for the licence of fonts you add');
    console.log(dir);return;
  }
  if(command==='remove') {
    if(!o.yes)throw new Error('brand remove requires --yes');
    await confinedBrandDir(o.brand); await rm(dir,{recursive:true}); console.log('ok');return;
  }
  const b=command === 'set' ? await readBrand(o.brand) : await resolveBrand(o.brand);
  if(command==='show') {console.log(JSON.stringify(b,null,2));return;}
  if(command==='set') {
    const keys=(o.path??'').split('.');
    if(!o.path || keys.some(k=>['__proto__','prototype','constructor','name','version'].includes(k)))throw new Error('Invalid brand path');
    let value; try {value=JSON.parse(o.value);}catch{throw new Error('--value must be JSON');}
    let n=b;for(const k of keys.slice(0,-1)){if(!n[k] || typeof n[k]!=='object')throw new Error('Invalid brand path');n=n[k];}
    n[keys.at(-1)]=value;await saveBrand(b);console.log('ok');
  }
}
