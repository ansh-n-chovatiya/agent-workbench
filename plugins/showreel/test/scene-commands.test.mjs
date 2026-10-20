import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('../scripts/showreel.mjs',import.meta.url));

test('scenes CLI adds any run, lists, sets, validates, reorders and removes without affecting composition',async()=>{
  const home=await mkdtemp(path.join(os.tmpdir(),'showreel-scene-cli-'));
  const dir=path.join(home,'projects','demo');
  const run=(...args)=>execFileSync(process.execPath,[cli,'scenes',...args,'--name','demo'],{env:{...process.env,SHOWREEL_HOME:home},encoding:'utf8',stdio:'pipe'});
  try {
    for(const [id,profile] of [['r1','desktop'],['r2','phone']]) {
      const folder=path.join(dir,'runs',id); await mkdir(folder,{recursive:true});
      await Promise.all(Object.entries({'raw.mp4':'raw','events.json':'{}','record.json':JSON.stringify({durationSec:5,profile})}).map(([f,data])=>writeFile(path.join(folder,f),data)));
    }
    await writeFile(path.join(dir,'composition.json'),'unchanged');
    run('add','--run','r1','--title','First','--transition','crossfade','--duration','0.5');
    assert.match(run('add','--run','r2'),/profiles differ/);
    assert.equal(JSON.parse(run('list','--json')).scenes.length,2);
    run('set','--id','sc2','--path','title','--value','"Second"');
    run('set','--id','sc1','--path','speeds','--value','[{"start":1,"end":2,"rate":2}]');
    run('move','--id','sc2','--to','0'); assert.equal(JSON.parse(run('list','--json')).scenes[0].id,'sc2');
    assert.match(run('validate'),/ok/);
    assert.throws(()=>run('set','--id','sc1','--path','transition.durationSec','--value','99'),/0.2 to 1.5/);
    assert.throws(()=>run('set','--id','sc1','--path','__proto__.polluted','--value','true'),/Unsupported/);
    run('remove','--id','sc1'); assert.equal(JSON.parse(run('list','--json')).scenes.length,1);
    assert.equal(await readFile(path.join(dir,'composition.json'),'utf8'),'unchanged');
    // The voice selector reads the selected storyboard and namespaces step lookups.
    await writeFile(path.join(dir,'storyboard.json'),JSON.stringify({steps:[{id:'s1',caption:'Default'}]}));
    await writeFile(path.join(dir,'phone.json'),JSON.stringify({steps:[{id:'s1',caption:'Phone',narration:null}]}));
    run('set','--id','sc2','--path','storyboard','--value','"phone.json"');
    const source=`import {voiceStoryboard} from ${JSON.stringify(new URL('../scripts/lib/voice/commands.mjs',import.meta.url).href)}; console.log(JSON.stringify(await voiceStoryboard('demo','sc2')));`;
    const board=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',source],{env:{...process.env,SHOWREEL_HOME:home},encoding:'utf8'}));
    assert.equal(board.steps[0].id,'sc2:s1'); assert.equal(board.steps[0].caption,'Phone');
    const voice=execFileSync(process.execPath,[cli,'voice','generate','--name','demo','--scene','sc2'],{env:{...process.env,SHOWREEL_HOME:home},encoding:'utf8'});
    assert.match(voice,/sc2:s1/);
  } finally {await rm(home,{recursive:true,force:true});}
});
