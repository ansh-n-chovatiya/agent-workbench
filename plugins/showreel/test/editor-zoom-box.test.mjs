import test from 'node:test';
import assert from 'node:assert/strict';
import { zoomBox,moveZoomBox,resizeZoomBox,snapDepth,DEPTH_PRESETS,setZoomMode } from '../editor/zoom-box.mjs';
import { resolveComposition } from '../scripts/lib/compose/composition.mjs';
const viewport = {width:1000,height:600};
const region = {id:'z',tStart:1,tEnd:4,depth:2,keyframes:[{t:1,x:500,y:300}],stepIds:[],source:'manual'};
function inside(b) {assert.ok(b.x >= -1e-9 && b.y >= -1e-9 && b.x+b.w <= 1000+1e-9 && b.y+b.h <= 600+1e-9);}
test('crop and move use source CSS pixels and clamp all four sides', () => {
  assert.deepEqual(zoomBox(region,viewport),{x:250,y:150,w:500,h:300});
  const p = moveZoomBox(region,100,50,viewport);
  assert.deepEqual(p.keyframes,[{t:1,x:600,y:350}]);
  assert.deepEqual(zoomBox({...region,...p},viewport),{x:350,y:200,w:500,h:300});
  for (const dx of [-5000,0,5000]) for (const dy of [-5000,0,5000]) inside(zoomBox({...region,...moveZoomBox(region,dx,dy,viewport)},viewport));
});
test('corner resize keeps aspect and anchored opposite corner; depth snaps to presets', () => {
  // Bottom right moves from (750,450) to (650,390): width 400 => 2.5x.
  const p = resizeZoomBox(region,'se',{x:650,y:390},viewport);
  assert.ok(Math.abs(p.depth-2.5) < 1e-9);
  const b = zoomBox({...region,...p},viewport);assert.ok(Math.abs(b.x-250) < 1e-9);assert.ok(Math.abs(b.y-150) < 1e-9);
  for (const d of DEPTH_PRESETS) {assert.equal(snapDepth(d*1.02),d);assert.equal(snapDepth(d*.98),d);}
  assert.equal(snapDepth(0),1.05);assert.equal(snapDepth(10),5);assert.equal(snapDepth(2.5),2.5);
  for (const [corner,point] of [['nw',{x:350,y:210}],['ne',{x:650,y:210}],['sw',{x:350,y:390}],['se',{x:650,y:390}]]) {
    const resized = {...region,...resizeZoomBox(region,corner,point,viewport)};assert.ok(Math.abs(resized.depth-2.5) < 1e-9);inside(zoomBox(resized,viewport));
  }
});
test('arbitrary move/resize operations keep the crop inside viewport', () => {
  let n = 42,r = region;const random = () => ((n=(Math.imul(n,1664525)+1013904223)>>>0)/2**32);
  for(let i=0;i<500;i++) {
    r = {...r,...moveZoomBox(r,(random()-.5)*4000,(random()-.5)*2400,viewport)};
    r = {...r,...resizeZoomBox(r,['nw','ne','sw','se'][i%4],{x:random()*3000-1000,y:random()*1800-600},viewport)};
    inside(zoomBox(r,viewport));assert.ok(r.depth >= 1.05 && r.depth <= 5);
  }
});
test('Manual freezes focus; Auto regenerates only the selected region', () => {
  const c = resolveComposition({run:{id:'test'},cards:{title:{enabled:false},outro:{enabled:false}},zoom:{regions:[region,{...region,id:'other',tStart:6,tEnd:8,keyframes:[{t:6,x:600,y:400}]}]}});
  const context = {duration:10,focus:{x:450,y:250},record:{durationSec:10},events:{viewport,targets:[{t:1,kind:'click',stepId:'a',box:{x:10,y:10,w:20,h:20}}],clicks:[{t:2,stepId:'a'}],keys:[]}};
  const manual = setZoomMode(c,'z','manual',context);assert.deepEqual(manual.zoom.regions[0].keyframes,[{t:1,x:450,y:250}]);
  const auto = setZoomMode(manual,'z','auto',context);assert.equal(auto.zoom.regions[0].source,'auto');assert.equal(auto.zoom.regions[0].keyframes[0].x,20);
  assert.deepEqual(auto.zoom.regions[1],c.zoom.regions[1]);assert.equal(c.zoom.regions[0].keyframes[0].x,500);
});
