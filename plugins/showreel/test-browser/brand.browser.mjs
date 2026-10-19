import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
const directory=await mkdtemp(path.join(os.tmpdir(),'showreel-brand-browser-'));
process.env.SHOWREEL_HOME=path.join(directory,'home');
const {syntheticRun,inspectionPage}=await import('./helpers/synthetic-run.mjs');
const {brandDefaults}=await import('../scripts/lib/brand/schema.mjs');
const {brandDir,saveBrand,resolveBrand}=await import('../scripts/lib/brand/storage.mjs');
const {buildComposition}=await import('../scripts/lib/compose/composition.mjs');
const {planRender}=await import('../scripts/lib/compose/plan.mjs');
const wire=v=>JSON.parse(JSON.stringify(v));
test('brand stills show logo/watermark, exact card background, and loaded heading font',{timeout:60000},async()=>{
  let browser,session;
  try {
    browser=await chromium.launch({headless:true});
    const run=await syntheticRun(browser,{name:'brand'});
    session=await inspectionPage(browser,run.rawFile,path.join(directory,'unused.mp4'));
    const dir=brandDir('pixel');await mkdir(dir,{recursive:true});
    // Generate an opaque magenta PNG without a new image dependency.
    const png=await session.page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');x.fillStyle='#ff00ff';x.fillRect(0,0,16,16);return c.toDataURL();});
    await writeFile(path.join(dir,'logo.png'),Buffer.from(png.split(',')[1],'base64'));
    await copyFile(new URL('../assets/fonts/Inter-SemiBold.woff2',import.meta.url),path.join(dir,'heading.woff2'));
    const b=brandDefaults('pixel');b.colors.background='#123456';b.logo={file:'logo.png',heightPct:10};
    b.fonts.heading={file:'heading.woff2',family:'Brand Pixel Heading',weight:600};
    b.intro.title='Brand heading';b.watermark={...b.watermark,enabled:true,position:'top-right',opacity:1,sizePct:10,marginPct:5};
    await saveBrand(b);const brand=await resolveBrand('pixel');
    // Keep default provenance for cards so brand intro can supply its title and enabled state.
    run.brief.titleCard={enabled:true,title:null,subtitle:null};run.brief.outroCard={enabled:true,text:'Thank you'};
    const composition=buildComposition({...run,overrides:{output:{width:640,height:360},cursor:{visible:false},zoom:{enabled:false}}});
    const plan=planRender({...run,composition,brand,sourceSize:{width:1280,height:720}});
    const inspect=(p,time)=>session.page.evaluate(async({p,time})=>{
      const url=await window.renderStill(p,time),img=new Image();img.src=url;await img.decode();
      const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
      const pixel=(x,y)=>[...ctx.getImageData(Math.floor(x),Math.floor(y),1,1).data].slice(0,3);
      const f=p.layout.frame,margin=Math.min(f.w,f.h)*p.watermark.marginPct/100,size=f.w*p.watermark.sizePct/100;
      return {background:pixel(2,2),watermark:pixel(f.x+f.w-margin-size/2,f.y+margin+size/2),
        logo:pixel(p.output.width/2,p.output.height*.17),loaded:[...document.fonts].some(f=>f.family.replace(/"/g,'')==='Brand Pixel Heading'&&f.status==='loaded'),
        checked:document.fonts.check('600 20px "Brand Pixel Heading"')};
    },{p:wire(p),time});
    const title=await inspect(plan,0.8);assert.deepEqual(title.background,[18,52,86]);assert.deepEqual(title.logo,[255,0,255]);assert.ok(title.loaded&&title.checked);
    const main=await inspect(plan,plan.timemap.mainStart+1);assert.deepEqual(main.watermark,[255,0,255]);
    // A disabled watermark leaves the same video pixels unchanged, confirming the corner sample is ours.
    const plain=wire(plan);plain.watermark.enabled=false;
    const baseline=await inspect(plain,plan.timemap.mainStart+1);assert.notDeepEqual(baseline.watermark,main.watermark);
  } finally {try{await session?.close();}finally{await browser?.close();await rm(directory,{recursive:true,force:true});}}
});
