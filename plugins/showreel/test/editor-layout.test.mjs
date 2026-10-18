import test from 'node:test';
import assert from 'node:assert/strict';
import { timelineHeight, fitPreview, readPreference, writePreference } from '../editor/layout.mjs';

test('timeline restores and clamps stored height after window resizing', () => {
  for (const height of [640,720,900]) {
    assert.equal(timelineHeight(0,height),height*.3);
    assert.equal(timelineHeight(NaN,height),height*.3);
    assert.equal(timelineHeight(100,height),190);
    assert.equal(timelineHeight(10000,height),height*.6);
    assert.equal(timelineHeight(220,height),220);
  }
});
test('preview contains landscape, portrait and ultrawide output in available space', () => {
  for (const [width,height] of [[640,300],[300,640],[1000,1],[0,0]]) for (const aspect of [16/9,9/16,4/3,21/9]) {
    const result=fitPreview(width,height,aspect);
    assert.ok(result.width <= width && result.height <= height + 1e-8);
    if (result.height) assert.ok(Math.abs(result.width/result.height/aspect-1)<1e-8);
  }
});
test('preferences work and storage denial never breaks editor initialization or edits', () => {
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  assert.equal(readPreference('theme','dark',storage),'dark');
  writePreference('theme','light',storage);assert.equal(readPreference('theme','dark',storage),'light');
  assert.equal(values.get('showreel:theme'),'light');
  const blocked={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}};
  assert.equal(readPreference('theme','dark',blocked),'dark');
  assert.doesNotThrow(()=>writePreference('theme','light',blocked));
});
