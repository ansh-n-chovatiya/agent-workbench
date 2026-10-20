import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import * as op from '../editor/edit-ops.mjs';
import { SETTINGS } from '../scripts/lib/compose/settings-schema.mjs';
import { resolveComposition, validateComposition } from '../scripts/lib/compose/composition.mjs';
const context = {duration:10,plan:{cues:[{id:'step1',text:'Original',start:1,end:2}]}};
const base = () => resolveComposition({run:{id:'test'},cards:{title:{enabled:false},outro:{enabled:false}}});
const valid = c => { const r = validateComposition(c,{duration:10}); assert.ok(r.ok,r.errors.join('\n')); return c; };
test('friendly setting labels, help and units cover every entry', () => {
  const helps = new Set(), labels = new Map();
  for (const s of SETTINGS) {
    assert.equal(typeof s.label,'string',s.path); assert.ok(s.label.trim(),s.path);
    assert.doesNotMatch(s.label,/›|Pct|Px|Sec|[a-z][A-Z]/,s.path);
    assert.match(s.help,/^[A-Z].*\.$/,s.path);
    assert.doesNotMatch(s.help,/for the .* settings/i,s.path);
    assert.ok(!s.help.toLowerCase().startsWith(`choose ${s.label.toLowerCase()}`),s.path);
    assert.ok(s.help.length >= 25 && s.help.length <= 140,`${s.path}: ${s.help.length} characters`);
    assert.ok(!helps.has(s.help),`Repeated help: ${s.path}`);
    helps.add(s.help);
    const groupLabels = labels.get(s.group) ?? new Set();
    assert.ok(!groupLabels.has(s.label.toLowerCase()),`Repeated label in ${s.group}: ${s.label}`);
    groupLabels.add(s.label.toLowerCase()); labels.set(s.group,groupLabels);
    if (/Pct$/.test(s.path)) assert.equal(s.unit,'%');
    if (/Px$/.test(s.path)) assert.equal(s.unit,'px');
    if (/Sec$/.test(s.path)) assert.equal(s.unit,'s');
  }
});
test('cuts snap, merge, subtract speed fragments, restore and protect the recording', () => {
  const original = base(), before = JSON.stringify(original);
  assert.deepEqual(op.splitAt(original,3,context).edits.splits,[3]);
  let c = valid(op.setSpeed(original,0,9,2,context));
  c = valid(op.cutRange(c,2.001,4.001,context));
  assert.deepEqual(c.edits.speeds,[{start:0,end:2,rate:2},{start:4,end:9,rate:2}]);
  c = valid(op.cutRange(c,4,5,context)); c = valid(op.cutRange(c,1,3,context));
  assert.deepEqual(c.edits.trims,[{start:1,end:5}]);
  assert.throws(() => op.cutRange(c,0,10,context),/Keep/);
  assert.throws(() => op.cutRange(c,5,5.08,context),/0.1/);
  assert.throws(() => op.cutRange(c,-1,2,context),/valid range/);
  c = valid(op.restoreRange(c,0,context)); assert.deepEqual(c.edits.trims,[]);
  assert.equal(JSON.stringify(original),before);
});
test('speed replacement splits overlaps, merges neighbours and rejects trimmed ranges', () => {
  let c = op.setSpeed(base(),1,8,2,context);
  c = valid(op.setSpeed(c,3,5,4,context));
  assert.deepEqual(c.edits.speeds,[{start:1,end:3,rate:2},{start:3,end:5,rate:4},{start:5,end:8,rate:2}]);
  c = valid(op.setSpeed(c,3,5,2,context)); assert.deepEqual(c.edits.speeds,[{start:1,end:8,rate:2}]);
  c = valid(op.setSpeed(c,3,5,1,context)); assert.equal(c.edits.speeds.length,2);
  c = valid(op.clearSpeed(c,0,context));
  assert.throws(() => op.setSpeed(c,1,3,31,context),/Speed/);
  c = op.cutRange(c,1,2,context); assert.throws(() => op.setSpeed(c,1,3,2,context),/removed/);
});
test('zoom edits retain sorted regions, contained keyframes and manual provenance', () => {
  let c = valid(op.addZoomRegion(base(),{tStart:3,tEnd:5,x:20,y:30,depth:2},context));
  const id = c.zoom.regions[0].id;
  c = valid(op.setZoomFocus(c,id,4,50,60,context));
  c = valid(op.setZoomFocus(c,id,4,70,80,context)); assert.equal(c.zoom.regions[0].keyframes.length,2);
  c = valid(op.updateZoomRegion(c,id,{tStart:2,tEnd:3},context));
  assert.equal(c.zoom.regions[0].keyframes[0].t,2); assert.equal(c.zoom.regions[0].source,'manual');
  assert.throws(() => op.addZoomRegion(c,{tStart:2,tEnd:4,x:0,y:0,depth:2},context),/overlap/);
  assert.throws(() => op.updateZoomRegion(c,id,{depth:10},context),/depth/);
  c = valid(op.addZoomRegion(c,{tStart:0,tEnd:1,x:0,y:0,depth:2},context));
  assert.throws(() => op.updateZoomRegion(c,id,{tStart:0.5},context),/overlapping/);
  c = valid(op.deleteZoomRegion(c,id,context)); assert.equal(c.zoom.regions.length,1);
});
test('caption edits materialise source-time plan cues and reject overlap or invalid text', () => {
  const original = base(); let c = valid(op.setCaption(original,'step1',{text:'Edited'},context));
  assert.equal(original.captions.cues,undefined); assert.equal(c.captions.cues[0].start,1);
  c = valid(op.addCaption(c,{start:3,end:4,text:'Second'},context));
  assert.throws(() => op.setCaption(c,'step1',{end:3.5},context),/overlaps/);
  assert.throws(() => op.setCaption(c,'step1',{text:''},context),/characters/);
  c = valid(op.deleteCaption(c,'step1',context)); assert.equal(c.captions.cues.length,1);
  c = valid(op.deleteCaption(base(),'step1',context)); assert.deepEqual(c.captions.cues,[]);
});
test('automatic zoom regeneration preserves manual regions and unique IDs', () => {
  let c = op.addZoomRegion(base(),{tStart:2,tEnd:4,x:10,y:10,depth:2},context);
  const manual = structuredClone(c.zoom.regions[0]);
  const events = {viewport:{width:100,height:100},targets:[{t:2,kind:'click',stepId:'a',box:{x:1,y:1,w:5,h:5}},{t:6,kind:'click',stepId:'b',box:{x:1,y:1,w:5,h:5}}],clicks:[{t:2.1,stepId:'a'},{t:6.1,stepId:'b'}],keys:[]};
  c = valid(op.autoZoomRegenerate(c,events,{durationSec:10}));
  assert.deepEqual(c.zoom.regions[0],manual); assert.equal(c.zoom.regions.length,2); assert.equal(c.zoom.regions[1].source,'auto');
  const auto = c.zoom.regions[1]; c = valid(op.setZoomFocus(c,auto.id,auto.tStart,5,5,context)); assert.equal(c.zoom.regions[1].source,'manual');
});
test('seeded random sequences preserve validity, immutability and sorted disjoint edits', () => {
  for (const seed of [1,42,2026,0xdeadbeef]) {
    let n = seed >>> 0, c = base();
    const random = () => ((n = (Math.imul(1664525,n)+1013904223)>>>0)/2**32);
    for(let i=0;i<700;i++) {
      const start = Math.floor(random()*540)/60, end = Math.min(10,start+(1+Math.floor(random()*120))/60), before = JSON.stringify(c);
      const choice = Math.floor(random()*12); let next;
      try {
        if(choice === 0) next = op.cutRange(c,start,end,context);
        if(choice === 1) next = op.restoreRange(c,Math.floor(random()*c.edits.trims.length),context);
        if(choice === 2) next = op.setSpeed(c,start,end,[0.25,0.5,1,2,4,8][Math.floor(random()*6)],context);
        if(choice === 3) next = op.clearSpeed(c,Math.floor(random()*c.edits.speeds.length),context);
        if(choice === 4) next = op.addZoomRegion(c,{tStart:start,tEnd:end,x:random()*100,y:random()*100,depth:1.05+random()*2.95},context);
        const z = c.zoom.regions[Math.floor(random()*c.zoom.regions.length)];
        if(choice === 5 && z) next = op.updateZoomRegion(c,z.id,{tStart:start,tEnd:end},context);
        if(choice === 6 && z) next = op.setZoomFocus(c,z.id,start,20,30,context);
        if(choice === 7 && z) next = op.deleteZoomRegion(c,z.id,context);
        if(choice === 8) next = op.addCaption(c,{text:'Random',start,end},context);
        const cue = c.captions.cues?.[Math.floor(random()*(c.captions.cues?.length ?? 0))];
        if(choice === 9 && cue) next = op.setCaption(c,cue.id,{start,end,text:'Changed'},context);
        if(choice === 10 && cue) next = op.deleteCaption(c,cue.id,context);
        if(choice === 11) next = op.splitAt(c,start);
      } catch(e) { assert.ok(e instanceof Error); }
      assert.equal(JSON.stringify(c),before,'operations never mutate their input');
      if(next) c = valid(next);
      for(const ranges of [c.edits.trims,c.edits.speeds]) ranges.forEach((r,i) => { if(i) assert.ok(r.start >= ranges[i-1].end); });
    }
  }
});
test('editor JavaScript and CSS together stay below 600 KB gzipped', () => {
  const total = ['editor.js','editor.css'].reduce((size,file) => size+gzipSync(readFileSync(new URL(`../dist/editor/${file}`,import.meta.url))).length,0);
  assert.ok(total < 600*1024,`${total} bytes`);
});

import { buildTimeMap } from '../scripts/lib/compose/timemap.mjs';
import { placeNarration } from '../scripts/lib/audio/retime.mjs';
const fitContext = (c, steps = [{id:'s1',tStart:1,tEnd:4},{id:'s2',tStart:4,tEnd:8}]) =>
  ({duration:10,steps,timemap:buildTimeMap({duration:10,...c.edits}),narrationStartSrc:1.15});
const overrunOf = (c, clipSec, steps) => {
  const context = fitContext(c,steps);
  const result = placeNarration({steps:context.steps,clips:{s1:{durationSec:clipSec}},timemap:context.timemap,cues:[{id:'s1',start:1.15,end:3}]});
  return result.warnings.find(w => w.code === 'voice-overruns-video')?.overrunSec ?? 0;
};
test('fixFreeze holds the last frame of the step and clears the overrun', () => {
  const c = base(), overrun = overrunOf(c,5);
  assert.ok(overrun > 0.5);
  const fixed = valid(op.fixFreeze(c,'s1',overrun,fitContext(c)));
  assert.equal(fixed.edits.holds.length,1);
  assert.ok(fixed.edits.holds[0].t > 3.9 && fixed.edits.holds[0].t < 4);
  assert.ok(overrunOf(fixed,5) < 1/30,`left ${overrunOf(fixed,5)}`);
  assert.deepEqual(c.edits.holds,[]); // input untouched
  const again = valid(op.fixFreeze(fixed,'s1',0.5,fitContext(fixed)));
  assert.equal(again.edits.holds.length,1); assert.ok(again.edits.holds[0].duration > fixed.edits.holds[0].duration);
  assert.throws(() => op.fixFreeze(c,'s1',0,fitContext(c)),/no overrun/);
  assert.throws(() => op.fixFreeze(c,'nope',1,fitContext(c)),/no longer exists/);
});
test('fixFreeze and fixSlow work on the last visible part after a cut', () => {
  const c = op.cutRange(base(),3,4,context), overrun = overrunOf(c,3);
  assert.ok(overrun > 0);
  const frozen = valid(op.fixFreeze(c,'s1',overrun,fitContext(c)));
  assert.ok(frozen.edits.holds[0].t < 3 && frozen.edits.holds[0].t >= 2.9);
  assert.ok(overrunOf(frozen,3) < 1/30);
  const slowed = valid(op.fixSlow(c,'s1',overrun,fitContext(c)));
  assert.ok(slowed.edits.speeds.length === 1 && slowed.edits.speeds[0].rate >= 0.5 && slowed.edits.speeds[0].end <= 3.0001);
  assert.ok(overrunOf(slowed,3) < 1/30,`left ${overrunOf(slowed,3)}`);
  assert.throws(() => op.fixFreeze(op.cutRange(base(),1,4,context),'s1',1,fitContext(op.cutRange(base(),1,4,context))),/was cut/);
});
test('fixSlow slows only the end of the step and never below 0.5x', () => {
  const c = base(), overrun = overrunOf(c,3.6);
  const fixed = valid(op.fixSlow(c,'s1',overrun,fitContext(c)));
  const range = fixed.edits.speeds[0];
  assert.ok(range.rate < 1 && range.rate >= 0.5 && range.end > 3.9 && range.start > 1.5,JSON.stringify(range));
  assert.ok(overrunOf(fixed,3.6) < 1/30,`left ${overrunOf(fixed,3.6)}`);
  assert.throws(() => op.fixSlow(c,'s1',20,fitContext(c)),/below 0.5x/);
});
test('cutting a range removes the holds inside it', () => {
  let c = base(); c.edits.holds = [{t:2,duration:1},{t:6,duration:1}];
  const cut = valid(op.cutRange(c,1.5,3,context));
  assert.deepEqual(cut.edits.holds,[{t:6,duration:1}]);
});
