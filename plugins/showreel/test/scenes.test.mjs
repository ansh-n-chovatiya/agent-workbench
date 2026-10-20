import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink,readdir} from 'node:fs/promises';
import {validateScenes,validateScenesInProject,writeScenesAtomic,readScenes} from '../scripts/lib/scenes.mjs';
import {chaptersFor,writeChapters} from '../scripts/lib/compose/chapters.mjs';

test('scene validation collects shape, duplicate, edit and transition errors',()=>{
  const report=validateScenes({version:2,scenes:[{id:'bad/id',run:'../run',title:'x'.repeat(61),storyboard:'../board.json',trims:[{start:2,end:1}],speeds:[{start:0,end:2,rate:99}],transition:{type:'wipe',durationSec:9}},
    {id:'bad/id',run:'run',transition:{type:'cut'}}]});
  assert.equal(report.ok,false); assert.ok(report.errors.length>=9,report.errors.join('\n'));
  assert.equal(validateScenes({version:1,scenes:[]}).ok,true);
  assert.equal(validateScenes({version:1,scenes:Array.from({length:21},(_,i)=>({id:`s${i}`,run:'run',transition:{type:'cut'}}))}).ok,false);
});

test('disk validation checks all run files, source bounds and profiles; atomic write cannot follow symlinks',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'showreel-scenes-'));
  try {
    const dir=path.join(root,'project'); await mkdir(dir);
    assert.equal(await readScenes(dir),null);
    const data={version:1,scenes:[{id:'sc1',run:'desktop',transition:{type:'crossfade'}},{id:'sc2',run:'phone',transition:{type:'cut'}}]};
    const missing=await validateScenesInProject(dir,data); assert.equal(missing.errors.length,6);
    for(const [run,profile] of [['desktop','desktop'],['phone','phone']]) {
      await mkdir(path.join(dir,'runs',run),{recursive:true});
      for(const [file,value] of Object.entries({'raw.mp4':'bytes','events.json':'{}','record.json':JSON.stringify({durationSec:4,profile})})) await writeFile(path.join(dir,'runs',run,file),value);
    }
    const report=await writeScenesAtomic(dir,data); assert.equal(report.ok,true); assert.equal(report.warnings.length,1);
    assert.deepEqual(await readScenes(dir),data);
    data.scenes[0].trims=[{start:3,end:5}]; assert.equal((await validateScenesInProject(dir,data)).ok,false); delete data.scenes[0].trims;
    const outside=path.join(root,'outside.json'); await writeFile(outside,'secret');
    await rm(path.join(dir,'scenes.json')); await symlink(outside,path.join(dir,'scenes.json'));
    await assert.rejects(readScenes(dir),/inside/);
    await writeScenesAtomic(dir,data); assert.equal(await readFile(outside,'utf8'),'secret');
    await symlink(root,path.join(dir,'runs','escape'));
    const unsafe=await validateScenesInProject(dir,{version:1,scenes:[{id:'sc3',run:'escape',transition:{type:'cut'}}]});
    assert.equal(unsafe.ok,false); assert.equal((await readdir(dir)).some(f=>f.endsWith('.tmp')),false);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('chapters skip untitled scenes, start at zero, use scene offsets and require three titles for YouTube',async()=>{
  const plan={scenes:[{id:'a',title:'First',outputStart:1.8},{id:'b',outputStart:5},{id:'c',title:'Second',outputStart:12.6},{id:'d',title:'Third',outputStart:65.4}],timemap:{outputDuration:70}};
  const chapters=chaptersFor(plan); assert.equal(chapters.txt,'0:00 First\n0:12 Second\n1:05 Third\n');
  assert.match(chapters.vtt,/00:00:12.600 --> 00:01:05.400\nSecond/);
  const dir=await mkdtemp(path.join(os.tmpdir(),'showreel-chapters-'));
  try {
    await writeChapters(plan,dir); assert.equal(await readFile(path.join(dir,'chapters.txt'),'utf8'),chapters.txt);
    const notices=[]; await writeChapters({...plan,scenes:plan.scenes.slice(0,3)},dir,x=>notices.push(x));
    assert.equal(notices.length,1); await assert.rejects(readFile(path.join(dir,'chapters.txt')),/ENOENT/);
    assert.match(await readFile(path.join(dir,'chapters.vtt'),'utf8'),/Second/);
  } finally {await rm(dir,{recursive:true,force:true});}
});
