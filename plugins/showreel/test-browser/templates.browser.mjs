import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
const directory = await mkdtemp(path.join(os.tmpdir(),'showreel-templates-'));
process.env.SHOWREEL_HOME = path.join(directory,'home');
const { syntheticRun, inspectionPage } = await import('./helpers/synthetic-run.mjs');
const { buildComposition } = await import('../scripts/lib/compose/composition.mjs');
const { planRender } = await import('../scripts/lib/compose/plan.mjs');
const { TEMPLATES } = await import('../scripts/lib/compose/templates/index.mjs');
const { calloutGeometry } = await import('../scripts/lib/compose/templates/shared.mjs');
const { THEMES } = await import('../scripts/lib/compose/themes.mjs');
const wire = value => JSON.parse(JSON.stringify(value));
test('template hold stills change their expected areas; theme backgrounds differ', { timeout:120000 }, async t => {
  let browser,session;
  try {
    browser=await chromium.launch({headless:true});
    const run=await syntheticRun(browser,{name:'templates'});
    session=await inspectionPage(browser,run.rawFile,path.join(directory,'unused.mp4'));
    const composition=buildComposition({...run,overrides:{output:{width:640,height:360},cursor:{visible:false},zoom:{enabled:false},captions:{enabled:false},cards:{title:{enabled:false},outro:{enabled:false}}}});
    const planFor=c=>planRender({...run,composition:c,sourceSize:{width:1280,height:720}});
    const baseline=planFor(composition);
    const baselinePng=await session.page.evaluate(p=>window.renderStill(p,1.5),wire(baseline));
    // Compare in the browser to avoid another PNG decoder dependency. Loose RGB differences ignore edge antialiasing.
    const compare=async(plan,region,protectedRegion)=>session.page.evaluate(async({plan,baselinePng,region,protectedRegion})=>{
      const decode=async url=>{const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
      const [a,b]=await Promise.all([decode(baselinePng),decode(await window.renderStill(plan,1.5))]);
      let changed=0,outside=0;
      const contains=(r,x,y)=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;
      for(let y=0;y<plan.output.height;y++)for(let x=0;x<plan.output.width;x++){
        const i=(y*plan.output.width+x)*4,d=Math.max(...[0,1,2].map(k=>Math.abs(a[i+k]-b[i+k])));
        if(d>20){if(contains(region,x,y))changed++;if(protectedRegion&&contains(protectedRegion,x,y)&&!contains(region,x,y))outside++;}
      }
      return {changed,outside};
    },{plan:wire(plan),baselinePng,region,protectedRegion});
    const f=baseline.layout.content??baseline.layout.frame;
    const sourceRect={x:f.x+320/1280*f.w,y:f.y+180/720*f.h,w:320/1280*f.w,h:180/720*f.h};
    for(const id of Object.keys(TEMPLATES))await t.test(id,async()=>{
      const c=structuredClone(composition);c.overlays=[{id:'test',template:id,start:0,end:3,params:{}}];
      let region={x:25,y:100,w:590,h:160},protectedRegion=f;
      if(['title-card','outro-card','spotlight'].includes(id))region={x:0,y:0,w:640,h:360};
      if(id==='lower-third')region={x:f.x,y:f.y+f.h-70,w:260,h:70};
      if(id==='callout-arrow') {
        const p=TEMPLATES[id].defaults,em=360*.024;
        const textWidth=await session.page.evaluate(({family,weight,em,text})=>{
          const ctx=document.createElement('canvas').getContext('2d');ctx.font=`${weight} ${em}px "${family}"`;return ctx.measureText(text).width;
        },{family:baseline.theme.typography.family,weight:baseline.theme.typography.weights.display,em,text:p.text});
        const target={x:f.x+p.x/1280*f.w,y:f.y+p.y/720*f.h};
        const {plate}=calloutGeometry({width:640,height:360,layout:baseline.layout},p,{w:Math.max(em*4,textWidth+em*1.8),h:em*2.35},target);
        const x=Math.min(plate.x,target.x)-12,y=Math.min(plate.y,target.y)-12;
        region={x,y,w:Math.max(plate.x+plate.w,target.x)-x+12,h:Math.max(plate.y+plate.h,target.y)-y+12};
      }
      if(id==='step-badge')region={x:180,y:155,w:280,h:50};
      if(id==='highlight-box')region={x:sourceRect.x-15,y:sourceRect.y-45,w:sourceRect.w+30,h:sourceRect.h+65};
      if(id==='spotlight') {
        // The spotlight must preserve pixels well inside the cutout, while dimming pixels elsewhere.
        const hole={x:sourceRect.x+10,y:sourceRect.y+10,w:sourceRect.w-20,h:sourceRect.h-20};
        const result=await compare(planFor(c),hole,f);assert.equal(result.changed,0);assert.ok(result.outside>100);return;
      }
      const result=await compare(planFor(c),region,protectedRegion);
      assert.ok(result.changed>20,`${id}: visible pixels in expected region`);
      assert.equal(result.outside,0,`${id}: recording unchanged outside overlay`);
    });
    const backgrounds=[];
    for(const theme of Object.keys(THEMES)) {
      const c=buildComposition({...run,overrides:{theme,output:{width:640,height:360},cursor:{visible:false},zoom:{enabled:false},captions:{enabled:false},cards:{title:{enabled:false},outro:{enabled:false}}}});
      const png=await session.page.evaluate(p=>window.renderStill(p,1.5),wire(planFor(c)));
      backgrounds.push(await session.page.evaluate(async url=>{const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);},png));
    }
    for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(backgrounds[i].some((v,k)=>Math.abs(v-backgrounds[j][k])>30));
  } finally { try {await session?.close();}finally{await browser?.close();await rm(directory,{recursive:true,force:true});} }
});
