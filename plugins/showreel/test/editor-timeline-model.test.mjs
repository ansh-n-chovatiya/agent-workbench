import test from 'node:test';
import assert from 'node:assert/strict';
import { snapTime, displayTime } from '../editor/timeline-model.mjs';
import { buildTimeMap } from '../scripts/lib/compose/timemap.mjs';
test('timeline snaps within eight screen pixels; Alt disables magnets but keeps frame steps', () => {
  const options = {duration:10,fps:30,points:[1,3,5],px:t => t*80};
  assert.equal(snapTime(2.94,options),3);
  assert.equal(snapTime(2.94,{...options,alt:true}),88/30);
  assert.equal(snapTime(2.8,options),2.8);
  assert.equal(snapTime(-5,options),0);assert.equal(snapTime(20,options),10);
});
test('output view collapses removed gaps and includes title and speed offsets', () => {
  const map = buildTimeMap({duration:10,lead:2,trims:[{start:2,end:4}],speeds:[{start:4,end:8,rate:2}]});
  assert.equal(displayTime(map,3,false),3);
  assert.equal(displayTime(map,3,true),4);
  assert.equal(displayTime(map,6,true),5);
});
