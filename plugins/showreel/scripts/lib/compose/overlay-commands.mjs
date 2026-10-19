import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { projectDir } from '../paths.mjs';
import { TEMPLATES } from './templates/index.mjs';
import { validateComposition } from './composition.mjs';
export function templateRows() {
  return Object.values(TEMPLATES).map(({id,label,help,params,defaultDuration}) => ({id,label,help,defaultDuration,params}));
}
export function parseOverlayOptions(flags) {
  const options = {}, params = {};
  for (let i=0;i<flags.length;i++) {
    const k=flags[i], v=flags[++i];
    if (!['--name','--template','--start','--end','--id','--param'].includes(k) || v === undefined || v.startsWith('--')) throw new Error(`Invalid overlay option: ${k}`);
    if (k === '--param') {
      const split=v.indexOf('='); if(split<1) throw new Error('--param must be key=value');
      const key=v.slice(0,split); if(['__proto__','prototype','constructor'].includes(key) || Object.hasOwn(params,key)) throw new Error(`Invalid or repeated parameter: ${key}`);
      let value=v.slice(split+1); try {value=JSON.parse(value);} catch { /* Text values need no quotes. */ }
      Object.defineProperty(params,key,{value,enumerable:true});
    } else {if(Object.hasOwn(options,k))throw new Error(`Repeated option: ${k}`);options[k]=v;}
  }
  return {options,params};
}
export async function overlayCommand(flags) {
  const [command,...rest]=flags;
  if(!['add','list','remove'].includes(command))throw new Error('Usage: overlay add|list|remove --name N (remove: --id ID)');
  const {options:o,params}=parseOverlayOptions(rest);
  if(!o['--name'])throw new Error('--name is required');
  const file=path.join(projectDir(o['--name']),'composition.json');
  let c;
  try {c=JSON.parse(await readFile(file,'utf8'));} catch(e) {
    if(e.code!=='ENOENT' || command!=='add')throw e;
    const {loadRunComposition}=await import('./render.mjs'); c=(await loadRunComposition({name:o['--name']})).composition;
  }
  c.overlays ??= [];
  if(command==='list'){console.log(JSON.stringify(c.overlays,null,2));return;}
  if(command==='add') {
    if(!o['--template'] || o['--start']===undefined || o['--end']===undefined)throw new Error('--template, --start and --end are required');
    c.overlays.push({id:randomUUID(),template:o['--template'],start:Number(o['--start']),end:Number(o['--end']),params});
  } else {
    if(!o['--id'] || !c.overlays.some(x=>x.id===o['--id']))throw new Error('Provide an existing overlay --id');
    c.overlays=c.overlays.filter(x=>x.id!==o['--id']);
  }
  const result=validateComposition(c); if(!result.ok)throw new Error(result.errors.join('\n'));
  await writeFile(file,JSON.stringify(c,null,2)+'\n');
  console.log(command==='add'?c.overlays.at(-1).id:'ok');
}
