import test from 'node:test';
import assert from 'node:assert/strict';
import { EASING, DURATIONS, enterExit } from '../scripts/lib/compose/easing.mjs';
import { TEMPLATES, validateParams } from '../scripts/lib/compose/templates/index.mjs';
import { THEMES, diffThemes } from '../scripts/lib/compose/themes.mjs';
import { validateOverlays, planOverlays, storyboardOverlays } from '../scripts/lib/compose/overlays.mjs';
import { buildTimeMap } from '../scripts/lib/compose/timemap.mjs';
import { DEFAULT_BRIEF } from '../scripts/lib/brief.mjs';
import { buildComposition, validateComposition, changeComposition, compositionPaths } from '../scripts/lib/compose/composition.mjs';
import { planRender, stateAt } from '../scripts/lib/compose/plan.mjs';
import { validateStoryboard, draftFromGuide } from '../scripts/lib/storyboard.mjs';
import { parseOverlayOptions, templateRows } from '../scripts/lib/compose/overlay-commands.mjs';

test('easing tokens have exact endpoints, monotonic bounded samples and deterministic ramps', () => {
  assert.deepEqual(Object.keys(EASING),['standard','enterOut','moveInOut','exitIn','springSoft','none']);
  for(const curve of Object.values(EASING)) {
    assert.equal(curve(0),0);assert.equal(curve(1),1);let previous=0;
    for(let i=0;i<=1000;i++){const t=i/1000,v=curve(t);assert.ok(v>=previous-1e-12 && v>=0 && v<=1);assert.equal(v,curve(t));previous=v;}
  }
  assert.ok(DURATIONS.exit<DURATIONS.enter);assert.equal(DURATIONS.move,.6);
  assert.deepEqual(enterExit(-1,0,3),{progress:0,phase:'off',alpha:0});
  assert.equal(enterExit(.2,0,3).phase,'enter');assert.equal(enterExit(1,0,3).phase,'hold');assert.equal(enterExit(2.9,0,3).phase,'exit');assert.equal(enterExit(3,0,3).phase,'off');
  for(let t=0;t<.2;t+=.001)assert.ok(enterExit(t,0,.2).alpha>=0);
});
for(const template of Object.values(TEMPLATES))test(`${template.id}: defaults and every parameter schema`,()=>{
  assert.deepEqual(validateParams(template,template.defaults),[]);assert.deepEqual(validateParams(template,{}),[]);
  assert.equal(template.defaultDuration,3);assert.ok(template.help.length);assert.equal(typeof template.draw,'function');
  for(const [k,s]of Object.entries(template.params)) {
    let bad=s.type==='number'?s.max+1:s.type==='boolean'?'yes':s.type==='string'?'x'.repeat(s.maxLength+1):'invalid-value';
    assert.ok(validateParams(template,{[k]:bad}).some(e=>e.includes(`params.${k}`)));
    assert.ok(validateParams(template,{[k]:null}).length);
    if(s.type==='number'){assert.deepEqual(validateParams(template,{[k]:s.min}),[]);assert.deepEqual(validateParams(template,{[k]:s.max}),[]);}
    if(s.type==='color')for(const c of ['accent','surface','onSurface','muted','#abc','#aabbcc','#aabbccdd'])assert.deepEqual(validateParams(template,{[k]:c}),[]);
  }
  assert.ok(validateParams(template,{unknown:1}).length);assert.ok(validateParams(template,[]).length);
});
test('themes have the same complete token shape and visibly distinct groups',()=>{
  const leaves=(o,p='')=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'&&!Array.isArray(v)?leaves(v,p+k+'.'):[p+k]);
  for(const theme of Object.values(THEMES))assert.deepEqual(leaves(theme),leaves(THEMES.clean));
  for(const [a,b]of [[THEMES.clean,THEMES.dark],[THEMES.clean,THEMES.bold],[THEMES.dark,THEMES.bold]]) {
    const diffs=diffThemes(a,b);for(const group of ['background.','caption.','cursor.','typography.'])assert.ok(diffs.some(k=>k.startsWith(group)),group);
  }
  assert.equal(THEMES.bold.font,'Space Grotesk');
});
const overlay=(id,start,end,params={})=>({id,template:'step-badge',start,end,params});
test('overlay validation collects index and field errors; allows unsorted overlapping spans',()=>{
  assert.deepEqual(validateOverlays([overlay('b',2,4),overlay('a',0,3)]),[]);
  const errors=validateOverlays([{...overlay('same',-1,9),params:{label:1,number:-1},anchor:'no'},overlay('same',2,1),{template:'missing'}],{duration:5});
  for(const field of ['0.start','0.end','0.params.label','0.params.number','0.anchor','1.id','1.end','2.template'])assert.ok(errors.some(e=>e.includes(field)),field);
  assert.ok(validateOverlays(Array.from({length:101},()=>overlay('x',0,1))).length);
  for(const v of [null,[],1])assert.ok(validateOverlays([v]).length);
});
test('overlay timing clips both endpoints, handles cuts, speeds, lead, and strict hold boundaries',()=>{
  const map=buildTimeMap({duration:10,trims:[{start:1,end:3},{start:8,end:9}],speeds:[{start:4,end:6,rate:2}],holds:[{t:6,duration:2}],lead:2,fade:.4});
  const result=planOverlays([overlay('drop',1,3),overlay('partial',2,9),overlay('ends-here',4,6),overlay('starts-here',6,7),overlay('spans',5,7)],map);
  assert.equal(result.notices.length,1);assert.ok(!result.overlays.some(o=>o.id==='drop'));
  const get=id=>result.overlays.find(o=>o.id===id);
  assert.equal(get('partial').outStart,2.6);assert.equal(get('partial').outEnd,8.6);
  assert.ok(Math.abs(get('ends-here').outEnd-get('ends-here').outStart-1)<1e-9);
  assert.ok(Math.abs(get('starts-here').outEnd-get('starts-here').outStart-1)<1e-9);
  assert.ok(Math.abs(get('spans').outEnd-get('spans').outStart-3.5)<1e-9);
});
function run() {
  const brief={...structuredClone(DEFAULT_BRIEF),topic:'Test'};
  const storyboard={steps:[{id:'s1',overlays:[{template:'lower-third',params:{name:'Sam'},at:'start',duration:2}]}]};
  const events={viewport:{width:1280,height:720},steps:[{id:'s1',tStart:0,tEnd:4}],targets:[],cursor:[{t:0,x:0,y:0}],clicks:[],keys:[]};
  const record={runId:'test',durationSec:4,scale:{used:1}};
  return {brief,storyboard,events,record,sourceSize:{width:1280,height:720}};
}
test('build, composition set, and pure state share source overlays and cinematic pace',()=>{
  const r=run();let c=buildComposition({...r,overrides:{cards:{title:{enabled:false},outro:{enabled:false}},motion:{pace:1.6}}});
  assert.equal(c.overlays.length,1);assert.deepEqual(storyboardOverlays(r.storyboard,r.events),c.overlays);
  c=changeComposition(c,'overlays',[overlay('new',1,3)]);assert.deepEqual(compositionPaths(c).overlays,c.overlays);assert.equal(validateComposition(c).ok,true);
  const plan=planRender({...r,composition:c}),json=JSON.parse(JSON.stringify(plan));
  assert.equal(stateAt(plan,.9).overlays.length,0);assert.equal(stateAt(plan,1.6).overlays[0].phase,'enter');assert.equal(stateAt(plan,2).overlays[0].phase,'hold');assert.equal(stateAt(plan,2.8).overlays[0].phase,'exit');assert.equal(stateAt(plan,3).overlays.length,0);
  assert.deepEqual(stateAt(plan,2),stateAt(json,2));assert.equal(stateAt(plan,2).overlays[0].params.label,'Open the report');
  c.motion.pace=2;assert.equal(validateComposition(c).ok,false);
});
test('storyboard checks overlay parameters and materialises start, end and second offsets',()=>{
  const sb=draftFromGuide({steps:[{action:'click',name:'Report'}]});sb.steps[0].overlays=[{template:'step-badge',params:{number:-1}},{template:'missing',params:{},at:'bad'}];
  const errors=validateStoryboard(sb).errors.join('\n');assert.match(errors,/steps.0.overlays.0.params.number/);assert.match(errors,/steps.0.overlays.1.at/);
  const r=run();r.storyboard.steps[0].overlays=['start','end',1,undefined].map(at=>({template:'step-badge',params:{},at,duration:1}));
  assert.deepEqual(storyboardOverlays(r.storyboard,r.events).map(o=>[o.start,o.end]),[[0,1],[3,4],[1,2],[.3,1.3]]);
});
test('CLI template metadata and repeated parameter parsing are typed',()=>{
  assert.equal(templateRows().length,12);
  const p=parseOverlayOptions(['--name','demo','--param','number=2','--param','label=Hello','--param','showLabel=false']);
  assert.deepEqual(p.params,{number:2,label:'Hello',showLabel:false});
  assert.throws(()=>parseOverlayOptions(['--param','__proto__=1']));assert.throws(()=>parseOverlayOptions(['--param','bad']));
});
test('CLI lists templates and adds, lists, replaces and removes overlays without recording',async t=>{
  const {mkdtemp,mkdir,writeFile,readFile,rm}=await import('node:fs/promises');
  const {spawnSync}=await import('node:child_process');
  const {fileURLToPath}=await import('node:url');
  const path=await import('node:path'),os=await import('node:os');
  const home=await mkdtemp(path.join(os.tmpdir(),'showreel-overlay-cli-'));
  t.after(()=>rm(home,{recursive:true,force:true}));
  const dir=path.join(home,'projects','demo');await mkdir(dir,{recursive:true});
  const file=path.join(dir,'composition.json');await writeFile(file,JSON.stringify(buildComposition(run())));
  const cli=(...args)=>spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/showreel.mjs',import.meta.url)),...args],{env:{...process.env,SHOWREEL_HOME:home},encoding:'utf8'});
  let result=cli('templates','list','--json');assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).length,12);
  result=cli('overlay','add','--name','demo','--template','step-badge','--start','1','--end','3','--param','number=2','--param','label=Report');assert.equal(result.status,0,result.stderr);
  const id=result.stdout.trim();result=cli('overlay','list','--name','demo');assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).at(-1).id,id);
  const before=await readFile(file,'utf8');result=cli('overlay','add','--name','demo','--template','step-badge','--start','0','--end','2','--param','number=-2','--param','label=true');assert.equal(result.status,1);assert.match(result.stderr,/params.number/);assert.match(result.stderr,/params.label/);assert.equal(await readFile(file,'utf8'),before);
  result=cli('overlay','remove','--name','demo','--id',id);assert.equal(result.status,0,result.stderr);
  result=cli('composition','set','--name','demo','--path','overlays','--value',JSON.stringify([overlay('replace',.5,2)]));assert.equal(result.status,0,result.stderr);
  assert.deepEqual(JSON.parse(await readFile(file,'utf8')).overlays,[overlay('replace',.5,2)]);
});
test('source mapping shares cursor geometry at capture scale and camera zoom', async()=>{
  const {mapSourcePoint}=await import('../scripts/lib/compose/draw.js');
  const plan={sourceSize:{width:2560,height:1440},scale:2,layout:{frame:{x:0,y:0,w:1000,h:700},content:{x:100,y:100,w:800,h:450}}};
  assert.deepEqual(mapSourcePoint(plan,{cx:640,cy:360,z:2},{x:640,y:360}),{x:500,y:325});
  assert.deepEqual(mapSourcePoint(plan,{cx:640,cy:360,z:2},{x:320,y:180}),{x:100,y:100});
});
