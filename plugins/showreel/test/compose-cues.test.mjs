import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveComposition, validateComposition, compositionPaths } from '../scripts/lib/compose/composition.mjs';
import { buildTimeMap } from '../scripts/lib/compose/timemap.mjs';
import { toSrt, toVtt } from '../scripts/lib/compose/captions.mjs';
const cue = {id:'c1',text:'Edited',start:1,end:2};
const check = cues => validateComposition(resolveComposition({run:{id:'test'},cards:{title:{enabled:false}},captions:{cues}}),{duration:10});
test('cues are optional, allow empty override and accept 200 source cues', () => {
  assert.ok(check(undefined).ok); assert.ok(check([]).ok); assert.ok(check([cue]).ok);
  assert.ok(check(Array.from({length:200},(_,i) => ({...cue,id:String(i),start:i/20,end:(i+1)/20}))).ok);
  assert.ok(Object.hasOwn(compositionPaths({}),'captions.cues'));
});
test('cue validation reports indexed time, text, object and overlap errors', () => {
  for (const value of [null,'text',{}, {...cue,start:-1},{...cue,end:11},{...cue,end:1},{...cue,start:NaN},{...cue,text:'x'.repeat(141)},{...cue,text:''},{...cue,id:3},{...cue,extra:1}]) {
    const result = check([value]); assert.ok(!result.ok,JSON.stringify(value)); assert.ok(result.errors.some(e => e.includes('captions.cues.0')));
  }
  assert.ok(check([{...cue,text:'x'.repeat(140)}]).ok);
  assert.ok(check([cue,{...cue,start:1.5,end:3}]).errors.some(e => e.includes('captions.cues.1') && e.includes('overlaps')));
  for (const cues of [{},null,Array(201).fill(cue)]) assert.ok(!check(cues).ok);
});
test('override sidecars map source times through trims and speeds', () => {
  const map = buildTimeMap({duration:10,trims:[{start:0,end:1}],speeds:[{start:2,end:6,rate:2}]});
  const cues = [{id:'edited',text:'Edited',start:2,end:6}];
  assert.match(toSrt(cues,map),/00:00:01,000 --> 00:00:03,000\nEdited/); assert.match(toVtt(cues,map),/00:00:01.000 --> 00:00:03.000\nEdited/);
});
