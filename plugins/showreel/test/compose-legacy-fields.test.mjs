import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveComposition, validateComposition, buildComposition, changeComposition } from '../scripts/lib/compose/composition.mjs';
import { DEFAULT_BRIEF } from '../scripts/lib/brief.mjs';
import { validateStoryboard, draftFromGuide } from '../scripts/lib/storyboard.mjs';
import { planRender, stateAt } from '../scripts/lib/compose/plan.mjs';

test('legacy overlay fields are ignored without changing the input or retaining them in plans', () => {
  const base = resolveComposition({run:{id:'legacy'},cards:{title:{enabled:false}}});
  for (const overlays of [null, 'invalid legacy data', [{template:'removed',params:{placement:'frame'}}]]) {
    const legacy = {...base, overlays, motion:{pace:1.6}, theme:{name:'dark',overlay:{accent:'invalid legacy data'}}};
    const before = structuredClone(legacy);
    assert.equal(validateComposition(legacy).ok,true);
    const resolved = resolveComposition(legacy);
    assert.equal(Object.hasOwn(resolved,'overlays'),false);
    assert.equal(resolved.theme,'dark');
    assert.equal(Object.hasOwn(resolved,'motion'),false);
    assert.deepEqual(legacy,before);
    assert.throws(()=>changeComposition(resolved,'overlays',[]),/Unknown composition path/);
  }
  const storyboard = draftFromGuide({steps:[{action:'click',name:'Report'}]});
  storyboard.steps[0].overlays = {invalid:'ignored'};
  assert.equal(validateStoryboard(storyboard).ok,true);
  const run = {brief:{...structuredClone(DEFAULT_BRIEF),topic:'Report'},storyboard,
    events:{viewport:{width:640,height:360},steps:[{id:'s1',tStart:0,tEnd:4}],targets:[],cursor:[],clicks:[],keys:[]},
    record:{runId:'legacy',durationSec:4,scale:{used:1}},sourceSize:{width:640,height:360}};
  const composition = buildComposition(run);
  assert.equal(Object.hasOwn(composition,'overlays'),false);
  const plan = planRender({...run,composition:{...composition,overlays:[{template:'removed'}]}});
  assert.equal(Object.hasOwn(plan,'overlays'),false);
  assert.equal(Object.hasOwn(plan.theme,'overlay'),false);
  assert.equal(Object.hasOwn(stateAt(plan,2),'overlays'),false);
});
