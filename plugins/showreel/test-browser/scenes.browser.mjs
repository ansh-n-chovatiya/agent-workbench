import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';

// Two recordings, three chapters (the third reuses the first run), at 30 fps.
test('scene export blends two sources, retains overlap/card duration, and writes chapters', {timeout:120000}, async()=>{
  const home=await mkdtemp(path.join(os.tmpdir(),'showreel-scenes-browser-'));
  const previous=process.env.SHOWREEL_HOME; process.env.SHOWREEL_HOME=home;
  let browser,inspection,editor;
  try {
    const {syntheticRun,inspectionPage}=await import('./helpers/synthetic-run.mjs');
    const {buildComposition}=await import('../scripts/lib/compose/composition.mjs');
    const {renderRun}=await import('../scripts/lib/compose/render.mjs');
    const {startEditorServer}=await import('../scripts/lib/editor/server.mjs');
    browser=await chromium.launch({headless:true});
    const a=await syntheticRun(browser,{name:'scenes',runId:'run-red',background:'#ff0000',duration:3});
    const b=await syntheticRun(browser,{name:'scenes',runId:'run-blue',background:'#0000ff',duration:2});
    const composition=buildComposition({...a,overrides:{output:{width:1280,height:720,fps:30},zoom:{enabled:false},cursor:{visible:false},captions:{enabled:false},
      cards:{title:{enabled:true,durationSec:0.6},outro:{enabled:true,durationSec:0.6},transition:'cut'}}});
    await writeFile(path.join(a.dir,'composition.json'),JSON.stringify(composition));
    const scenes={version:1,scenes:[
      {id:'sc1',run:'run-red',title:'Red chapter',transition:{type:'crossfade',durationSec:0.5}},
      {id:'sc2',run:'run-blue',title:'Blue chapter',transition:{type:'cut'}},
      {id:'sc3',run:'run-red',title:'Return',trims:[{start:1,end:3}],transition:{type:'cut'}}]};
    await writeFile(path.join(a.dir,'scenes.json'),JSON.stringify(scenes));
    const rendered=await renderRun({name:'scenes',exportDir:path.join(home,'exports'),fps:30,log:()=>{}});
    const expected=3+2+1-0.5+0.6+0.6;
    assert.ok(Math.abs(rendered.plan.timemap.outputDuration-expected)<1e-8);
    const tr=rendered.plan.timemap.transitions[0],middle=(tr.outputStart+tr.outputEnd)/2;
    inspection=await inspectionPage(browser,rendered.finalFile,path.join(a.dir,'inspection.mp4'));
    const result=await inspection.page.evaluate(({url,middle})=>window.inspectFrames(url,[middle],[[{x:600,y:350,color:[128,0,128],tolerance:32}]]),{url:inspection.url,middle});
    assert.ok(Math.abs(result.duration-expected)<=1/30+0.01,`${result.duration} != ${expected}`);
    assert.equal(result.frames[0].samples[0].matches,1,'middle frame contains both red and blue');
    assert.equal(await readFile(rendered.finalFile.replace(/\.mp4$/,'.chapters.txt'),'utf8'),'0:00 Red chapter\n0:03 Blue chapter\n0:05 Return\n');
    assert.match(await readFile(rendered.finalFile.replace(/\.mp4$/,'.chapters.vtt'),'utf8'),/00:00:03.100 --> 00:00:05.100\nBlue chapter/);
    // Exercise the additive editor API without changing the old /media/raw.mp4 route.
    editor=await startEditorServer({name:'scenes',runId:'run-red'});
    const base=`http://127.0.0.1:${editor.port}`,headers={Authorization:`Bearer ${editor.token}`};
    assert.deepEqual((await (await fetch(base+'/api/project',{headers})).json()).scenes,scenes);
    const range=await fetch(base+'/media/run/run-blue/raw.mp4',{headers:{...headers,Range:'bytes=0-9'}});
    assert.equal(range.status,206); assert.equal((await range.arrayBuffer()).byteLength,10);
    assert.equal((await fetch(base+'/media/run/run-blue/raw.mp4')).status,401);
    assert.ok((await fetch(base+'/media/run/%2e%2e%2fescape/raw.mp4',{headers})).status>=400);
    assert.equal((await fetch(base+'/api/scenes',{method:'PUT',headers,body:JSON.stringify({version:1,scenes:[{id:'bad',run:'missing',transition:{type:'cut'}}]})})).status,400);
    assert.equal((await fetch(base+'/api/scenes',{method:'PUT',headers,body:JSON.stringify(scenes)})).status,200);
    const single=await renderRun({name:'scenes',exportDir:path.join(home,'exports'),sceneId:'sc2',stills:[0.8],log:()=>{}});
    assert.equal(single.plan.scenes.length,1); assert.equal(single.plan.scenes[0].id,'sc2');
  } finally {
    await editor?.close(); await inspection?.close(); await browser?.close();
    if(previous===undefined) delete process.env.SHOWREEL_HOME; else process.env.SHOWREEL_HOME=previous;
    await rm(home,{recursive:true,force:true});
  }
});
