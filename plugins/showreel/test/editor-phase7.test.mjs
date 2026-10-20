import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveComposition,validateComposition } from '../scripts/lib/compose/composition.mjs';
import { themePreviewGeometry } from '../editor/theme-preview.mjs';
import { patchScene,reorderScenes,sceneRows,saveScenes,canActivateScene } from '../editor/scenes-api.js';
import { resetBrandWatermark,brandOverrides } from '../editor/brand-model.mjs';
import { createEditorStore } from '../editor/state.js';

test('theme preview geometry contains landscape, square and portrait in a 160 by 90 canvas',()=>{
  for(const output of [{width:1920,height:1080},{width:1080,height:1920},{width:1080,height:1080}]){
    const g=themePreviewGeometry(output);assert.ok(g.x>=0&&g.y>=0);
    assert.ok(g.x+output.width*g.scale<=160);assert.ok(g.y+output.height*g.scale<=90);
    assert.equal(g.width,160);assert.equal(g.height,90);
  }
});
test('scenes adapter preserves document fields, transition extras and order, and guards absent contracts',async()=>{
  const document={version:1,extra:'keep',scenes:[{id:'a',run:'r',title:'First',transition:{type:'cut',extra:1}},{id:'b',run:'s'}]};
  assert.deepEqual(sceneRows(null),[]);assert.deepEqual(sceneRows({}),[]);
  const patch=patchScene(document,0,{title:'New'});assert.equal(patch.extra,'keep');assert.equal(patch.scenes[0].transition.extra,1);assert.equal(document.scenes[0].title,'First');
  assert.deepEqual(reorderScenes(document,0,1).scenes.map(s=>s.id),['b','a']);
  assert.throws(()=>reorderScenes(document,2,0));assert.throws(()=>patchScene(document,2,{}));
  const rows=sceneRows(document,{runId:'r',record:{durationSec:4}});assert.equal(rows[0].duration,4);assert.equal(rows[1].title,'Scene 2');
  assert.equal(canActivateScene({scenes:[]},{}),false);assert.equal(canActivateScene({scenes:[]},{activateScene(){}}),true);
  let sent;await saveScenes(async(url,options)=>{sent={url,...options};},patch);assert.equal(sent.url,'/api/scenes');assert.deepEqual(JSON.parse(sent.body),patch);
});
test('watermark reset removes explicit leaves and provenance, retaining other composition changes',()=>{
  const c=resolveComposition({theme:'bold',watermark:{opacity:.8},brandDefaults:{'watermark.enabled':false}});
  assert.ok(brandOverrides(c).includes('opacity'));const reset=resetBrandWatermark(c);assert.equal(reset.watermark,undefined);assert.equal(reset.theme,'bold');assert.deepEqual(reset.brandDefaults,{});assert.equal(c.watermark.opacity,.8);
});
test('project scenes document does not enter the resolved-scene planner',async()=>{
  const project={runId:'r',composition:resolveComposition({run:{id:'r'},cards:{title:{enabled:false}}}),scenes:{version:1,scenes:[{id:'one',run:'r'}]},brief:{},storyboard:{steps:[]},record:{durationSec:4,scale:{used:1}},events:{viewport:{width:640,height:360},cursor:[],clicks:[],steps:[],keys:[],targets:[]}};
  const store=createEditorStore({api:async()=>project,debounce:100000});await store.load();store.setSourceSize({width:640,height:360});
  assert.ok(store.getState().plan,store.getState().error);
  store.change('theme','dark');store.undo();assert.equal(store.getState().composition.theme,'clean');store.dispose();
});
