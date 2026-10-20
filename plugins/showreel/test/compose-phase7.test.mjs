import test from 'node:test';
import assert from 'node:assert/strict';
import { EASING, DURATIONS, enterExit } from '../scripts/lib/compose/easing.mjs';
import { THEMES, diffThemes } from '../scripts/lib/compose/themes.mjs';

test('easing tokens have exact endpoints, monotonic bounded samples and deterministic ramps', () => {
  assert.deepEqual(Object.keys(EASING),['standard','enterOut','moveInOut','exitIn','springSoft','none']);
  for(const curve of Object.values(EASING)) {
    assert.equal(curve(0),0);assert.equal(curve(1),1);let previous=0;
    for(let i=0;i<=1000;i++){const t=i/1000,v=curve(t);assert.ok(v>=previous-1e-12 && v>=0 && v<=1);assert.equal(v,curve(t));previous=v;}
  }
  assert.ok(DURATIONS.exit<DURATIONS.enter);assert.equal(DURATIONS.move,.6);
  assert.deepEqual(enterExit(-1,0,3),{progress:0,phase:'off',alpha:0});
  assert.equal(enterExit(.2,0,3).phase,'enter');assert.equal(enterExit(1,0,3).phase,'hold');assert.equal(enterExit(2.9,0,3).phase,'exit');assert.equal(enterExit(3,0,3).phase,'off');
  for(let t=0;t<.2;t+=.001)assert.ok(enterExit(t,0,.2).alpha>=0);
});
test('themes have the same complete token shape and visibly distinct groups',()=>{
  const leaves=(o,p='')=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'&&!Array.isArray(v)?leaves(v,p+k+'.'):[p+k]);
  for(const theme of Object.values(THEMES))assert.deepEqual(leaves(theme),leaves(THEMES.clean));
  for(const [a,b]of [[THEMES.clean,THEMES.dark],[THEMES.clean,THEMES.bold],[THEMES.dark,THEMES.bold]]) {
    const diffs=diffThemes(a,b);for(const group of ['background.','caption.','cursor.','typography.'])assert.ok(diffs.some(k=>k.startsWith(group)),group);
  }
  assert.equal(THEMES.bold.font,'Space Grotesk');
});
test('source mapping shares cursor geometry at capture scale and camera zoom', async()=>{
  const {mapSourcePoint}=await import('../scripts/lib/compose/draw.js');
  const plan={sourceSize:{width:2560,height:1440},scale:2,layout:{frame:{x:0,y:0,w:1000,h:700},content:{x:100,y:100,w:800,h:450}}};
  assert.deepEqual(mapSourcePoint(plan,{cx:640,cy:360,z:2},{x:640,y:360}),{x:500,y:325});
  assert.deepEqual(mapSourcePoint(plan,{cx:640,cy:360,z:2},{x:320,y:180}),{x:100,y:100});
});
