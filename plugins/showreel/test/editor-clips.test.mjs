import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveComposition, validateComposition } from '../scripts/lib/compose/composition.mjs';
import { buildTimeMap } from '../scripts/lib/compose/timemap.mjs';
import { cutRange } from '../editor/edit-ops.mjs';
import * as op from '../editor/clips.mjs';
const context = {duration:10};
const base = () => resolveComposition({run:{id:'clips'},cards:{title:{enabled:false},outro:{enabled:false}}});
function valid(c) {
  const r = validateComposition(c,context);assert.ok(r.ok,r.errors.join('\n'));
  const clips = op.clipsOf(c,10);
  assert.equal(clips[0].start,0);assert.equal(clips.at(-1).end,10);
  clips.forEach((clip,i) => {assert.ok(clip.end > clip.start);if(i) assert.equal(clip.start,clips[i-1].end);assert.equal(clip.id,String(Math.round(clip.start*1000)/1000));});
  return c;
}
test('old compositions resolve empty splits/mutes and reject invalid boundaries/ranges', () => {
  const c = base();delete c.edits.splits;delete c.edits.mutes;
  assert.ok(validateComposition(c,context).ok);
  assert.deepEqual(resolveComposition(c).edits.splits,[]);
  for (const splits of [[0],[10],[-1],[2,1],[1,1.09],[NaN]]) assert.equal(validateComposition({...c,edits:{...c.edits,splits}},context).ok,false);
  for (const mutes of [[{start:1,end:11}],[{start:2,end:3},{start:1,end:2}],[{start:1,end:4},{start:2,end:5}]]) assert.equal(validateComposition({...c,edits:{...c.edits,mutes}},context).ok,false);
  assert.deepEqual(op.clipsOf(c,10),[{id:'0',start:0,end:10,rate:1,deleted:false,muted:false}]);
});
test('split speed fragments, per-clip speed round trips and immutable mute toggles', () => {
  const initial = base(), before = JSON.stringify(initial);
  let c = op.setClipSpeed(initial,op.clipsOf(initial,10)[0],4,context);
  c = valid(op.splitClipAt(c,4,context));
  assert.deepEqual(c.edits.speeds,[{start:0,end:4,rate:4},{start:4,end:10,rate:4}]);
  const clip = op.clipsOf(c,10)[1];
  for (const rate of [.25,.5,1,2,4,8,16,30]) {
    c = valid(op.setClipSpeed(c,clip,rate,context));
    assert.equal(op.clipsOf(c,10)[1].rate,rate);assert.equal(op.clipsOf(c,10)[0].rate,4);
  }
  c = valid(op.setClipMuted(c,clip,true));assert.equal(op.clipsOf(c,10)[1].muted,true);
  c = valid(op.setClipMuted(c,clip,false));assert.deepEqual(c.edits.mutes,[]);
  assert.equal(JSON.stringify(initial),before);
});
test('delete merges cuts, drops interior splits; restore removes the gap', () => {
  let c = base();for(const t of [2,4,6,8]) c = op.splitClipAt(c,t,context);
  c = valid(op.deleteClip(c,op.clipsOf(c,10)[1],context));
  c = valid(op.deleteClip(c,op.clipsOf(c,10).find(r => r.start === 4),context));
  assert.deepEqual(c.edits.trims,[{start:2,end:6}]);assert.ok(!c.edits.splits.includes(4));
  const gap = op.clipsOf(c,10).find(r => r.deleted);
  c = valid(op.restoreClip(c,gap));assert.deepEqual(c.edits.trims,[]);
  assert.throws(() => op.deleteClip(base(),op.clipsOf(base(),10)[0],context),/Keep/);
  c = valid(cutRange(c,2,8,context));assert.deepEqual(c.edits.splits,[2,8]);
});
test('splits alone have no effect on the rendered time map', () => {
  const plain = buildTimeMap({duration:10}), split = buildTimeMap({duration:10,splits:[1,2,3],mutes:[{start:2,end:4}]});
  assert.deepEqual(JSON.parse(JSON.stringify(plain)),JSON.parse(JSON.stringify(split)));
});
test('seeded random clip operations keep valid compositions and tile source duration', () => {
  for (const seed of [1,42,2026,0xdeadbeef]) {
    let n = seed >>> 0,c = base();
    const random = () => ((n = (Math.imul(n,1664525)+1013904223) >>> 0)/2**32);
    for (let i=0;i<350;i++) {
      const clips = op.clipsOf(c,10), clip = clips[Math.floor(random()*clips.length)], before = JSON.stringify(c);
      let next;
      try {
        switch (Math.floor(random()*5)) {
          case 0: next = op.splitClipAt(c,Math.round(random()*590)/60,context);break;
          case 1: if (!clip.deleted) next = op.setClipSpeed(c,clip,[.25,.5,1,4,8,30][Math.floor(random()*6)],context);break;
          case 2: if (!clip.deleted) next = op.deleteClip(c,clip,context);break;
          case 3: next = op.restoreClip(c,clip);break;
          case 4: next = op.setClipMuted(c,clip,random() > .5);break;
        }
      } catch(e) {assert.ok(e instanceof Error);}
      assert.equal(JSON.stringify(c),before);
      if(next) c = valid(next);
    }
  }
});
test('deleting a final clip preserves fractional recording end and restores it', () => {
  let c = op.splitClipAt(base(),2,{duration:10.123});
  const last = op.clipsOf(c,10.123).at(-1);
  c = op.deleteClip(c,last,{duration:10.123});
  assert.equal(c.edits.trims[0].end,10.123);
  c = op.restoreClip(c,op.clipsOf(c,10.123).at(-1));assert.deepEqual(c.edits.trims,[]);
});
