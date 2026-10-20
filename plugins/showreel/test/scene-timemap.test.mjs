import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSceneTimeMap, sceneSourceAt, sceneOutputAt } from '../scripts/lib/compose/scene-timemap.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('scene timeline overlaps edited scenes and wraps the sequence with cards once',()=>{
  const map=buildSceneTimeMap({scenes:[
    {id:'a',duration:8,trims:[{start:1,end:2}],speeds:[{start:4,end:6,rate:2}],holds:[{t:3,duration:1}],transition:{type:'crossfade',durationSec:0.5}},
    {id:'b',duration:3}],lead:2,tail:2,fade:0.4});
  near(map.scenes[0].timemap.outputDuration,7);
  near(map.scenes[1].outputStart,8.1);
  near(map.outputDuration,7+3-0.5+2+2-0.8);
  const tr=map.toSource(8.35).transition;
  assert.equal(tr.type,'crossfade'); near(tr.progress,0.5); near(tr.from.t,7.75); near(tr.to.t,0.25);
  assert.equal(map.toSource(0).section,'title'); assert.equal(map.toSource(map.outputDuration).section,'outro');
  assert.equal(map.toOutput('a',1.5),null); near(map.toOutput('a',3),map.mainStart+2);
  const wire=JSON.parse(JSON.stringify(map));
  for(let t=0;t<map.outputDuration;t+=0.037) assert.deepEqual(sceneSourceAt(wire,t),map.toSource(t));
  assert.equal(map.toOutput('absent',1),null);
});

test('seeded property checks: arithmetic, per-scene round trips and monotone source clocks',()=>{
  let seed=901; const random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
  for(let trial=0;trial<120;trial++) {
    const scenes=Array.from({length:2+Math.floor(random()*5)},(_,i)=>({id:`sc${i}`,duration:5+random()*8,
      trims:[{start:0.5,end:1}],speeds:[{start:2,end:3,rate:0.5+random()*3}],
      transition:{type:['cut','crossfade','slide','zoom-through'][trial%4],durationSec:0.2+random()}}));
    const lead=random()*2,tail=random()*2,fade=0.2;
    const map=buildSceneTimeMap({scenes,lead,tail,fade});
    const sum=map.scenes.reduce((a,s)=>a+s.timemap.outputDuration,0),overlap=map.transitions.reduce((a,x)=>a+x.outputEnd-x.outputStart,0);
    near(map.mainEnd-map.mainStart,sum-overlap);
    near(map.outputDuration,Math.max(lead,map.mainEnd-Math.min(fade,tail,sum-overlap)+tail));
    for(const scene of map.scenes) {
      let previous=-Infinity;
      for(let t=0;t<scene.timemap.duration;t+=0.13) {
        const out=sceneOutputAt(map,scene.id,t); if(out===null) continue;
        assert.ok(out>=previous); previous=out;
        const st=sceneSourceAt(map,out), found=st.transition ? [st.transition.from,st.transition.to].find(x=>x.sceneId===scene.id) : st;
        assert.equal(found.sceneId,scene.id); near(found.t,t);
      }
    }
  }
});

test('cut boundaries are instant and invalid/triple overlaps fail clearly',()=>{
  const map=buildSceneTimeMap({scenes:[{id:'a',duration:1,transition:{type:'cut'}},{id:'b',duration:2}]});
  assert.equal(map.toSource(1).sceneId,'b'); assert.equal(map.toSource(1).transition,null); near(map.outputDuration,3);
  const scenes=[{id:'a',duration:2,transition:{type:'slide',durationSec:0.8}},{id:'b',duration:1,transition:{type:'crossfade',durationSec:0.8}},{id:'c',duration:2}];
  assert.throws(()=>buildSceneTimeMap({scenes}),/too short/);
  assert.throws(()=>buildSceneTimeMap({scenes:[]}),/1 to 20/);
  assert.throws(()=>buildSceneTimeMap({scenes:[{id:'a',duration:1},{id:'a',duration:1}]}),/unique/);
});
