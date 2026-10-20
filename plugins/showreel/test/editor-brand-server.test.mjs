import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,readFile,readdir,rm,symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const home=await mkdtemp(path.join(os.tmpdir(),'showreel-editor-brand-'));process.env.SHOWREEL_HOME=home;
const { startEditorServer }=await import('../scripts/lib/editor/server.mjs');
const { brandDefaults }=await import('../scripts/lib/brand/schema.mjs');
const { shapeBrand,listBrands }=await import('../scripts/lib/editor/brand-api.mjs');
const { resolveComposition }=await import('../scripts/lib/compose/composition.mjs');
test.after(()=>rm(home,{recursive:true,force:true}));
test('brand list shaping is bounded to summary fields',()=>{
  const b=brandDefaults('acme'),shape=shapeBrand({...b,private:'omit'});
  assert.deepEqual(Object.keys(shape).sort(),['name','summary']);assert.equal(shape.summary.defaultTheme,'clean');assert.equal(shape.private,undefined);
});
test('authenticated brand list/apply routes validate names, use existing safe assets, and atomically replace brief',async()=>{
  const dir=path.join(home,'projects','demo'),run=path.join(dir,'runs','run1'),brands=path.join(home,'brands');
  await mkdir(run,{recursive:true});await mkdir(path.join(brands,'acme'),{recursive:true});await mkdir(path.join(brands,'damaged'));
  const brand=brandDefaults('acme');brand.logo={file:'logo.svg',heightPct:10};
  await writeFile(path.join(brands,'acme','brand.json'),JSON.stringify(brand));await writeFile(path.join(brands,'acme','logo.svg'),'<svg xmlns="http://www.w3.org/2000/svg"/>');
  await symlink(path.join(brands,'acme'),path.join(brands,'alias')); // wrong folder name is rejected
  for(const [file,data] of Object.entries({'brief.json':{topic:'Preserve me'},'storyboard.json':{steps:[]},'composition.json':resolveComposition({run:{id:'run1'},cards:{title:{enabled:false}}}),'runs/run1/events.json':{viewport:{width:100,height:100},cursor:[],clicks:[],steps:[],targets:[],keys:[]},'runs/run1/record.json':{runId:'run1',durationSec:5,scale:{used:1}}}))await writeFile(path.join(dir,file),JSON.stringify(data));
  await writeFile(path.join(run,'raw.mp4'),'0123');
  assert.deepEqual((await listBrands()).map(b=>b.name),['acme']);
  const server=await startEditorServer({name:'demo',runId:'run1'});
  try{
    const base=`http://127.0.0.1:${server.port}`,headers={Authorization:`Bearer ${server.token}`};
    const request=(route,options={})=>fetch(base+route,{...options,headers:{...headers,...options.headers}});
    for(const [route,method] of [['/api/brands','GET'],['/api/brand/apply','POST']])assert.equal((await fetch(base+route,{method,body:method==='POST'?'{}':undefined})).status,401);
    const list=await(await request('/api/brands')).json();assert.equal(list.brands[0].name,'acme');assert.equal(list.brands[0].summary.colors.primary,brand.colors.primary);
    const apply=brand=>request('/api/brand/apply',{method:'POST',body:JSON.stringify({brand})});
    for(const name of ['../acme','acme/../../x','%2e%2e','missing','alias',4,{},''])assert.ok((await apply(name)).status>=400);
    assert.equal((await request('/api/brand/apply',{method:'POST',body:'{'})).status,400);
    assert.equal((await request('/api/brand/apply',{method:'POST',body:'{}'})).status,400);
    // Renaming over a symlink must leave its target untouched and publish a complete JSON file.
    const outside=path.join(home,'outside.json');await writeFile(outside,JSON.stringify({topic:'Preserve me'}));await rm(path.join(dir,'brief.json'));await symlink(outside,path.join(dir,'brief.json'));
    assert.equal((await apply('acme')).status,200);
    assert.deepEqual(JSON.parse(await readFile(path.join(dir,'brief.json'),'utf8')),{topic:'Preserve me',brand:'acme'});
    assert.deepEqual(JSON.parse(await readFile(outside,'utf8')),{topic:'Preserve me'});
    assert.equal((await request('/media/brand/acme/logo.svg')).status,200);
    for(const route of ['/media/brand/acme/%2e%2e%2fbrand.json','/media/brand/acme/brand.json','/media/brand/acme/%2e%2e/logo.svg'])assert.ok((await request(route)).status>=400);
    assert.equal((await apply(null)).status,200);assert.equal(JSON.parse(await readFile(path.join(dir,'brief.json'),'utf8')).brand,undefined);
    assert.ok(!(await readdir(dir)).some(f=>f.endsWith('.tmp')));
  }finally{await server.close();}
});
