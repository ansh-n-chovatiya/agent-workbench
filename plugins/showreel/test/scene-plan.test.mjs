import test from 'node:test';
import assert from 'node:assert/strict';
import {validateComposition} from '../scripts/lib/compose/composition.mjs';
import {buildComposition} from '../scripts/lib/compose/composition.mjs';
import {planRender,stateAt} from '../scripts/lib/compose/plan.mjs';
import {toVtt} from '../scripts/lib/compose/captions.mjs';
import {DEFAULT_BRIEF} from '../scripts/lib/brief.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function fixture() {
  const brief={...structuredClone(DEFAULT_BRIEF),topic:'Sequence'};
  const scene=(id,duration,x)=>({id,run:id,transition:{type:'crossfade',durationSec:0.5},
    storyboard:{steps:[{id:'s1',caption:`Caption ${id}`}]},
    events:{viewport:{width:1280,height:720},steps:[{id:'s1',tStart:0,tEnd:duration}],targets:[],keys:[],clicks:[],cursor:[{t:0,x,y:100}]},
    record:{runId:id,durationSec:duration,scale:{used:1}},sourceSize:{width:1280,height:720}});
  const scenes=[scene('sc1',4,100),scene('sc2',3,900)];
  const composition=buildComposition({brief,...scenes[0],overrides:{zoom:{enabled:false},cards:{title:{enabled:true,durationSec:1},outro:{enabled:true,durationSec:1},fade:0.2},audio:{voice:{enabled:true}}}});
  return {brief,composition,scenes,voiceClips:{version:1,steps:{'sc1:s1':'a','sc2:s1':'b',s1:'wrong'},clips:{a:{durationSec:0.5},b:{durationSec:0.7},wrong:{durationSec:20}}}};
}
test('two scenes plan independent cursors, captions and namespaced narration with global offsets',()=>{
  const input=fixture(),before=structuredClone(input),plan=planRender(input);
  assert.deepEqual(input,before);
  near(plan.timemap.outputDuration,4+3-0.5+2-0.4);
  const second=plan.scenes[1]; near(second.outputStart,4.3);
  const tr=stateAt(plan,4.55).transition; assert.equal(tr.type,'crossfade'); near(tr.progress,0.5);
  assert.equal(tr.from.sceneId,'sc1'); assert.equal(tr.to.sceneId,'sc2');
  assert.equal(tr.from.caption.text,'Caption sc1'); assert.equal(tr.to.caption.text,'Caption sc2');
  assert.ok(tr.to.cursor.x>tr.from.cursor.x+500);
  assert.deepEqual(plan.audio.narration.map(n=>n.stepId),['sc1:s1','sc2:s1']);
  near(plan.audio.narration[1].outStart,second.outputStart+0.15);
  assert.equal(plan.audio.narration[1].clipUrl,'voice/b.wav');
  assert.match(toVtt(plan.cues,plan.timemap),/00:00:04.450 --> 00:00:07.200\nCaption sc2/);
  const wire=JSON.parse(JSON.stringify(plan));
  for(let t=0;t<plan.timemap.outputDuration;t+=0.07) assert.deepEqual(stateAt(wire,t),stateAt(plan,t));
});
test('scene trims and speed edits stay local, muted narration uses namespaced ids, tail holds survive placement',()=>{
  const input=fixture(); input.scenes[0].trims=[{start:1,end:2}]; input.scenes[1].speeds=[{start:1,end:3,rate:2}];
  input.composition.audio.narration.steps={'sc2:s1':{muted:true}};
  assert.equal(validateComposition(input.composition).ok,true);
  let plan=planRender(input); near(plan.scenes[0].plan.timemap.outputDuration,3); near(plan.scenes[1].plan.timemap.outputDuration,2);
  assert.equal(plan.audio.narration.length,1); near(plan.timemap.toOutput('sc2',2),plan.scenes[1].outputStart+1.5);
  delete input.composition.audio.narration.steps['sc2:s1']; input.voiceClips.clips.b.durationSec=4;
  plan=planRender(input); assert.ok(plan.scenes[1].plan.timemap.holds.length);
  const narration=plan.audio.narration.at(-1); assert.ok(narration.outStart+narration.durationSec<=plan.timemap.mainEnd);
});

test('a brand cannot enable per-scene cards; the cards wrap the whole sequence once',async()=>{
  const {brandDefaults}=await import('../scripts/lib/brand/schema.mjs');
  const input=fixture();
  input.composition=buildComposition({brief:input.brief,...input.scenes[0]});
  const brand=brandDefaults('sequence'); brand.intro.title='Branded sequence';
  const plan=planRender({...input,brand});
  assert.equal(plan.cards.title.enabled,true); assert.equal(plan.cards.outro.enabled,true);
  assert.ok(plan.scenes.every(s=>!s.plan.cards.title.enabled && !s.plan.cards.outro.enabled));
  near(plan.timemap.outputDuration,4+3-0.5+2.2+2-0.8);
});

test('drawing composes whole scene frames, then applies the requested transition',async()=>{
  const {drawFrame}=await import('../scripts/lib/compose/draw.js');
  const previous=globalThis.document;
  const makeCanvas=()=>{
    const calls=[], stack=[];
    const target={globalAlpha:1,globalCompositeOperation:'source-over',measureText:()=>({width:10}),
      save(){stack.push({globalAlpha:this.globalAlpha,globalCompositeOperation:this.globalCompositeOperation});},
      restore(){Object.assign(this,stack.pop());},
      drawImage(image,...args){calls.push({image,args,alpha:this.globalAlpha,mode:this.globalCompositeOperation});},
      createLinearGradient:()=>({addColorStop(){}})};
    const ctx=new Proxy(target,{get:(v,k)=>v[k]??(()=>{})});
    return {calls,getContext:()=>ctx};
  };
  globalThis.document={createElement:()=>makeCanvas()};
  try {
    for(const type of ['crossfade','slide','zoom-through','cut']) {
      const input=fixture(); input.scenes[0].transition.type=type;
      input.composition.captions.enabled=false; input.composition.cursor.visible=false;
      const plan=planRender(input),time=type==='cut' ? plan.scenes[1].outputStart : plan.scenes[1].outputStart+0.25;
      const canvas=makeCanvas(),from={width:1280,height:720},to={width:1280,height:720};
      drawFrame(canvas,plan,time,{sc1:from,sc2:to},{images:new Map(),cursorImages:new Map()});
      assert.equal(canvas.calls.length,type==='cut'?1:2);
      if(type==='crossfade') near(canvas.calls[1].alpha,0.5);
      if(type==='slide') {near(canvas.calls[0].args[0],-plan.output.width*0.15); near(canvas.calls[1].args[0],plan.output.width*0.5);}
      if(type==='zoom-through') assert.ok(canvas.calls.every(c=>c.mode==='lighter' && Math.abs(c.alpha-0.5)<1e-8));
    }
  } finally {globalThis.document=previous;}
});
