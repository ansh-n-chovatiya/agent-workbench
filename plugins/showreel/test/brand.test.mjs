import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, truncate } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const home=await mkdtemp(path.join(os.tmpdir(),'showreel-brand-'));
process.env.SHOWREEL_HOME=home;
const {brandDefaults,validateBrand,FONT_LIMIT,IMAGE_LIMIT}=await import('../scripts/lib/brand/schema.mjs');
const {brandDir,resolveBrand,validateBrandAssets,resolveBrandRoute,loadBriefBrand}=await import('../scripts/lib/brand/storage.mjs');
const {applyBrandToComposition}=await import('../scripts/lib/brand/apply.mjs');
const {buildComposition,changeComposition,validateComposition,compositionPaths}=await import('../scripts/lib/compose/composition.mjs');
const {planRender}=await import('../scripts/lib/compose/plan.mjs');
const {DEFAULT_BRIEF,validateBrief}=await import('../scripts/lib/brief.mjs');
const {watermarkRect}=await import('../scripts/lib/compose/draw.js');
const input=()=>({brief:{...structuredClone(DEFAULT_BRIEF),topic:'Project title'},storyboard:{steps:[]},events:{viewport:{width:1280,height:720},cursor:[],clicks:[],targets:[],steps:[],keys:[]},record:{runId:'run',durationSec:4,scale:{used:1},warnings:[]}});
const cli=(...args)=>{
  const result=spawnSync(process.execPath,['scripts/showreel.mjs',...args],{cwd:new URL('../',import.meta.url),env:{...process.env,SHOWREEL_HOME:home},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);return result.stdout;
};
test.after(()=>rm(home,{recursive:true,force:true}));
test('brand schema collects nested errors and rejects malformed objects and unknown keys',()=>{
  assert.equal(validateBrand(brandDefaults('acme')).ok,true);
  for(const v of [null,[],1,{}])assert.equal(validateBrand(v).ok,false);
  const b=brandDefaults('BAD');b.extra=1;b.colors.background='red';b.colors.typo='#fff';b.intro.extra=1;
  b.fonts.heading={file:'../bad.woff2',family:'bad";script',weight:0};b.logo={file:'/tmp/logo.png',heightPct:100};b.watermark.opacity=0;
  const errors=validateBrand(b).errors.join('\n');
  for(const p of ['name','extra','colors.background','colors.typo','intro.extra','fonts.heading.file','fonts.heading.family','fonts.heading.weight','logo.file','logo.heightPct','watermark.opacity'])assert.match(errors,new RegExp(p.replaceAll('.','\\.')));
  for(const name of ['../escape','x/y','a'.repeat(42),'','-a'])assert.equal(validateBrand({...brandDefaults('acme'),name}).ok,false);
  for(const file of ['../x.png','/x.png','https://x.png','x%2epng','a//x.png','x.gif','x.png?x'])assert.equal(validateBrand({...brandDefaults('acme'),logo:{file,heightPct:10}}).ok,false);
});
test('CLI kit lifecycle, copy semantics, JSON set, brief pointers and licence reminder',async()=>{
  const source=path.join(home,'source.svg');await writeFile(source,'<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><path fill="red" d="M0 0h8v8H0z"/></svg>');
  const png=path.join(home,'source.png');await writeFile(png,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7zQAAAAASUVORK5CYII=','base64'));
  const font=path.join(home,'source.woff2');await writeFile(font,await readFile(new URL('../assets/fonts/Inter-SemiBold.woff2',import.meta.url)));
  assert.match(cli('brand','init','--brand','acme','--logo',png,'--watermark',source,'--font-heading',font,'--primary','#123456'),/You are responsible for the licence of fonts you add/);
  const b=JSON.parse(cli('brand','show','--brand','acme','--json'));assert.equal(b.colors.primary,'#123456');assert.equal(b.logo.file,'logo.png');
  assert.deepEqual(await readFile(path.join(brandDir('acme'),'logo.png')),await readFile(png));
  cli('brand','set','--brand','acme','--path','watermark.opacity','--value','0.8');
  cli('brand','set','--brand','acme','--path','intro.title','--value','"Brand intro"');
  assert.equal((await resolveBrand('acme')).watermark.opacity,0.8);
  assert.match(cli('brand','list'),/acme/);
  cli('brief','init','--name','project');cli('brand','apply','--name','project','--brand','acme');
  let brief=JSON.parse(await readFile(path.join(home,'projects/project/brief.json'),'utf8'));assert.equal(brief.brand,'acme');assert.equal(validateBrief(brief).ok,true);
  cli('brand','clear','--name','project');brief=JSON.parse(await readFile(path.join(home,'projects/project/brief.json'),'utf8'));assert.equal(brief.brand,undefined);
  const route=await resolveBrandRoute('acme/logo.png');assert.equal(route.type,'image/png');
  for(const p of ['acme/../source.svg','acme/%2e%2e/source.svg','acme/%2fetc/passwd','acme/logo.png%00','acme/brand.json','%2e%2e/source.svg'])assert.equal(await resolveBrandRoute(p),null,p);
  assert.equal(await resolveBrandRoute('acme/font-heading.woff2').then(r=>r.type),'font/woff2');
  cli('brand','remove','--brand','acme','--yes');assert.equal(cli('brand','list').trim(),'');
  const warnings=[];assert.equal(await loadBriefBrand({brand:'acme'},w=>warnings.push(w)),null);assert.match(warnings[0],/missing.*theme/);
});
test('realpath confinement, file types and independent image/font size limits',async()=>{
  const dir=brandDir('safe');await mkdir(dir,{recursive:true});
  await writeFile(path.join(dir,'logo.png'),'png');await writeFile(path.join(dir,'font.woff2'),'font');
  const b=brandDefaults('safe');b.logo={file:'logo.png',heightPct:10};b.fonts.body={file:'font.woff2',family:'Brand Body',weight:400};
  assert.equal((await validateBrandAssets(b)).ok,true);
  await truncate(path.join(dir,'logo.png'),IMAGE_LIMIT+1);await truncate(path.join(dir,'font.woff2'),FONT_LIMIT+1);
  let r=await validateBrandAssets(b);assert.equal(r.errors.length,2);assert.match(r.errors.join(' '),/10 MB/);assert.match(r.errors.join(' '),/2 MB/);
  await writeFile(path.join(home,'outside.png'),'outside');await symlink(path.join(home,'outside.png'),path.join(dir,'escape.png'));
  b.logo.file='escape.png';assert.match((await validateBrandAssets(b)).errors.join(' '),/inside/);
  await symlink(home,brandDir('escape'));assert.equal(await resolveBrandRoute('escape/outside.png'),null);
});
test('explicit composition > brand > theme, provenance, purity, legacy compositions',()=>{
  const b=brandDefaults('tokens');b.defaultTheme='dark';b.colors={primary:'#aabbcc',accent:'#cc5500',background:'#123456',text:'#abcdef',muted:'#556677'};
  b.intro.title='Brand title';b.intro.durationSec=3;b.outro.enabled=false;b.logo={file:'logo.png',heightPct:12};
  b.watermark={...b.watermark,enabled:true};b.fonts.heading={file:'heading.woff2',family:'Brand Display',weight:700};
  const c=buildComposition(input()),before=structuredClone(c),savedBrand=structuredClone(b);
  const applied=applyBrandToComposition(c,b);
  assert.deepEqual(c,before);assert.deepEqual(b,savedBrand);
  assert.equal(applied.zoom.speed,'slow');assert.equal(applied.zoom.depth,'subtle');
  assert.equal(applied.theme,'dark');assert.equal(applied.themeSource,'brand');assert.equal(applied.cards.title.title,'Brand title');
  assert.equal(applied.cards.title.durationSec,3);assert.equal(applied.cards.outro.enabled,false);
  assert.equal(applied.cards.title.background.type,'solid');assert.deepEqual(applied.cards.title.background.colors,['#123456']);assert.equal(applied.cards.title.accent.color,'#aabbcc');assert.equal(applied.cursor.clickEffect.color,'#cc5500');
  assert.equal(applied.cards.title.logo.image,'brand/tokens/logo.png');assert.equal(applied.watermark.image,'brand/tokens/logo.png');
  let explicit=changeComposition(c,'cards.title.durationSec',2.2);explicit=changeComposition(explicit,'theme','clean');explicit=changeComposition(explicit,'cards.title.background.colors',['#ffffff']);
  let r=applyBrandToComposition(explicit,b);assert.equal(r.cards.title.durationSec,2.2);assert.equal(r.theme,'clean');assert.deepEqual(r.cards.title.background.colors,['#ffffff']);
  c.cards.title.title='Direct edit';assert.equal(applyBrandToComposition(c,b).cards.title.title,'Direct edit');
  const legacy=structuredClone(before);delete legacy.brandDefaults;delete legacy.themeSource;
  r=applyBrandToComposition(legacy,b);assert.equal(r.theme,'clean');assert.equal(r.cards.title.title,'Project title');assert.equal(validateComposition(legacy).ok,true);
  assert.equal(applyBrandToComposition(c,null).theme,c.theme);
  assert.ok(Object.hasOwn(compositionPaths(c),'watermark.opacity'));assert.ok(Object.hasOwn(compositionPaths(c),'themeSource'));
});
test('plan contains confined render/editor URLs, fonts and watermark layout excludes caption bands',()=>{
  const b=brandDefaults('urls');b.logo={file:'logo.png',heightPct:12};b.fonts.heading={file:'heading.woff2',family:'Brand Heading',weight:600};b.fonts.body={file:'body.ttf',family:'Brand Body',weight:400};b.watermark.enabled=true;
  const data=input(),composition=buildComposition(data),plan=planRender({...data,composition,brand:b,sourceSize:{width:1280,height:720}});
  assert.equal(plan.cards.title.title,'Project title');
  assert.equal(plan.brand.logoUrl,'brand/urls/logo.png');assert.equal(plan.brand.fonts[0].url,'brand/urls/heading.woff2');assert.equal(plan.theme.typography.family,'Brand Heading');assert.equal(plan.brand.watermark.url,'brand/urls/logo.png');
  const weighted=structuredClone(b);weighted.fonts.body.weight=700;
  const explicit=changeComposition(composition,'captions.fontWeight',400);
  assert.equal(planRender({...data,composition:explicit,brand:weighted,sourceSize:{width:1280,height:720}}).captions.fontWeight,400);
  assert.equal(planRender({...data,composition,brand:weighted,sourceSize:{width:1280,height:720}}).captions.fontWeight,700);
  const editor=planRender({...data,composition,brand:b,brandBase:'/media/brand/',sourceSize:{width:1280,height:720}});assert.equal(editor.brand.fonts[1].url,'/media/brand/urls/body.ttf');
  for(const position of ['top-left','top-right','bottom-left','bottom-right']) {
    const p={...plan,watermark:{...plan.watermark,position}},r=watermarkRect(p,{width:10,height:10});
    assert.ok(r.x>=p.layout.frame.x);assert.ok(r.y>=p.layout.frame.y);assert.ok(r.y+r.h<=plan.layout.caption.y);
  }
});
test('project images with the same basename stay explicit and do not use brand URLs',()=>{
  const data=input(),b=brandDefaults('collision');b.logo={file:'logo.png',heightPct:10};
  const composition=buildComposition({...data,overrides:{cards:{title:{logo:{image:'logo.png',heightPct:7}}}}});
  const plan=planRender({...data,composition,brand:b,sourceSize:{width:1280,height:720}});
  assert.equal(plan.cards.title.logo.image,'logo.png');assert.equal(plan.brand.assetUrls['logo.png'],undefined);
  assert.equal(plan.cards.outro.logo.image,'brand/collision/logo.png');assert.equal(plan.brand.assetUrls[plan.cards.outro.logo.image],'brand/collision/logo.png');
});
test('shared brand FontFace loader awaits loading and reuses a loaded font',async()=>{
  const {loadBrandFonts}=await import('../scripts/lib/compose/draw.js');
  const oldFace=globalThis.FontFace,oldDocument=globalThis.document;
  let finish,added=0,constructed=0;
  globalThis.FontFace=class {constructor(family,url,options){constructed++;assert.equal(family,'Await Font');assert.equal(options.weight,'600');assert.match(url,/brand\/await\/f.woff2/);}load(){return new Promise(r=>{finish=()=>r(this);});}};
  globalThis.document={fonts:{add(){added++;}}};
  try {
    const plan={brand:{fonts:[{family:'Await Font',weight:600,url:'brand/await/f.woff2'}]}};
    const pending=loadBrandFonts(plan);assert.equal(added,0);finish();await pending;assert.equal(added,1);
    await loadBrandFonts(plan);assert.equal(constructed,1);
  } finally {globalThis.FontFace=oldFace;globalThis.document=oldDocument;}
});
test('draw paints watermark after the video, before cursor drawing and outside caption band',async()=>{
  const {drawFrame}=await import('../scripts/lib/compose/draw.js');
  const data=input(),b=brandDefaults('layers');b.logo={file:'logo.png',heightPct:10};b.watermark.enabled=true;
  const c=buildComposition({...data,overrides:{cards:{title:{enabled:false},outro:{enabled:false}}}});
  const plan=planRender({...data,composition:c,brand:b,sourceSize:{width:1280,height:720}});
  const calls=[],video={width:1280,height:720},mark={width:10,height:10};
  const ctx=new Proxy({measureText:()=>({width:10}),drawImage:(...args)=>calls.push(['image',...args]),translate:(...args)=>calls.push(['cursor',...args])},{get:(v,k)=>v[k]??(()=>{})});
  drawFrame({getContext:()=>ctx},plan,1,video,{images:new Map([[plan.watermark.image,mark]]),cursorImages:new Map()});
  const vi=calls.findIndex(x=>x[1]===video),wi=calls.findIndex(x=>x[1]===mark),ci=calls.findIndex(x=>x[0]==='cursor');
  assert.ok(vi>=0&&wi>vi&&ci>wi);const [, ,x,y,w,h]=calls[wi];assert.ok(y+h<=plan.layout.caption.y);assert.ok(x+w<=plan.layout.frame.x+plan.layout.frame.w);
});

test('export expansion preserves inheritance of fields absent from older compositions',async()=>{
  const {compositionForFormat}=await import('../scripts/lib/compose/render.mjs');
  const c=buildComposition(input());delete c.themeSource;delete c.brandDefaults;delete c.watermark;
  const b=brandDefaults('legacy-export');b.logo={file:'logo.png',heightPct:10};b.watermark.enabled=true;
  const output=compositionForFormat(c,'landscape');
  const applied=applyBrandToComposition(output,b);
  assert.equal(applied.theme,'clean');assert.equal(applied.cards.title.title,'Project title');
  assert.equal(applied.watermark.enabled,true);assert.equal(applied.watermark.image,'brand/legacy-export/logo.png');
});
