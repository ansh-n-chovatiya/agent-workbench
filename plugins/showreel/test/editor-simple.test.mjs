import test from 'node:test';
import assert from 'node:assert/strict';
import { RAIL_TOPICS, TOPIC_GROUPS, panelFor } from '../editor/rail-model.mjs';
import { zoomScreenBox, screenToZoomPoint, regionAtTime } from '../editor/zoom-screen.mjs';
import { zoomBox } from '../editor/zoom-box.mjs';
import { mapSourcePoint } from '../scripts/lib/compose/draw.js';

test('selection overrides the topic; clearing it restores the topic',()=>{
  for(const type of ['zoom','clip','caption']) {
    for(const {id} of RAIL_TOPICS) assert.equal(panelFor({type,id:'selected'},id),`${type}-selection`);
  }
  for(const {id} of RAIL_TOPICS) assert.equal(panelFor(null,id),id);
  assert.equal(panelFor({type:'voice',id:'s1'},'audio'),'audio');
  assert.equal(panelFor(null,'unknown'),'zoom');
});
test('rail has seven distinct accessible topics and covers every settings group',()=>{
  assert.deepEqual(RAIL_TOPICS.map(t=>t.label),['Zoom','Cursor','Appearance','Captions','Audio','Brand','Export settings']);
  assert.equal(new Set(RAIL_TOPICS.map(t=>t.id)).size,7);
  assert.ok(RAIL_TOPICS.every(t=>t.icon&&t.label&&TOPIC_GROUPS[t.id]));
  assert.deepEqual(Object.values(TOPIC_GROUPS).flat().sort(),['audio','captions','cards','cursor','look','output','zoom']);
});
test('zoom screen mapping matches the real drawing camera, frame padding, capture scale and preview scale',()=>{
  for(const scale of [1,2,3]) for(const output of [{width:1920,height:1080},{width:1080,height:1920},{width:1080,height:1080}]) {
    for(const z of [1,1.8,5]) for(const previewWidth of [200,640]) {
      const plan={output,sourceSize:{width:1200*scale,height:800*scale},scale,
        layout:{frame:{x:50,y:80,w:output.width-100,h:output.height-160}}};
      const camera={cx:700,cy:450,z},size={width:previewWidth,height:previewWidth*output.height/output.width};
      const crop=zoomBox({depth:2,keyframes:[{x:700,y:450}]},{width:1200,height:800});
      const mapped=zoomScreenBox(crop,plan,camera,size);
      const start=mapSourcePoint(plan,camera,crop),end=mapSourcePoint(plan,camera,{x:crop.x+crop.w,y:crop.y+crop.h});
      const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);
      close(mapped.x,start.x/output.width*size.width);close(mapped.y,start.y/output.height*size.height);
      close(mapped.w,(end.x-start.x)/output.width*size.width);close(mapped.h,(end.y-start.y)/output.height*size.height);
      const source=screenToZoomPoint({x:mapped.x,y:mapped.y},plan,camera,size);
      close(source.x,crop.x);close(source.y,crop.y);
    }
  }
});
test('content frame handles letterboxing and inverse pointer mapping',()=>{
  const plan={output:{width:1000,height:1000},sourceSize:{width:2000,height:1000},scale:2,layout:{frame:{x:20,y:20,w:960,h:960},content:{x:20,y:260,w:960,h:480}}};
  const camera={cx:500,cy:250,z:1},size={width:500,height:500};
  assert.deepEqual(zoomScreenBox({x:0,y:0,w:1000,h:500},plan,camera,size),{x:10,y:130,w:480,h:240,sx:.48,sy:.48});
  assert.deepEqual(screenToZoomPoint({x:250,y:250},plan,camera,size),{x:500,y:250});
});
test('zoom box follows the keyframe at the playhead without changing the region',()=>{
  const region={id:'z',depth:2,keyframes:[{t:1,x:10,y:20},{t:3,x:50,y:60}]};
  assert.deepEqual(regionAtTime(region,0).keyframes,[region.keyframes[0]]);
  assert.deepEqual(regionAtTime(region,2).keyframes,[region.keyframes[0]]);
  assert.deepEqual(regionAtTime(region,3).keyframes,[region.keyframes[1]]);
  assert.equal(region.keyframes.length,2);
});
