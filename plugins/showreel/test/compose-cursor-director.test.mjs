import test from 'node:test';
import assert from 'node:assert/strict';
import { directCursor } from '../scripts/lib/compose/cursor-director.mjs';
import { cursorAt } from '../scripts/lib/compose/cursor-track.mjs';
import { buildComposition, changeComposition, compositionPaths, validateComposition } from '../scripts/lib/compose/composition.mjs';
import { planRender, stateAt } from '../scripts/lib/compose/plan.mjs';
import { DEFAULT_BRIEF } from '../scripts/lib/brief.mjs';
const run = () => {
  const cursor = [];
  for (const start of [2, 8]) for (let i = 0; i <= 36; i++) cursor.push({ t: start + i / 60, x: (start === 2 ? 100 : 400) + 300 * i / 36, y: 200 });
  return { viewport: { width: 1000, height: 600 }, cursor,
    clicks: [{ t: 2.8, x: 400, y: 200, stepId: 'a' }, { t: 8.8, x: 700, y: 200, stepId: 'b' }], keys: [], steps: [{ tEnd: 12 }],
    targets: [{ t: 2, stepId: 'a', kind: 'click', box: { x: 390, y: 190, w: 20, h: 20 } }, { t: 8, stepId: 'b', kind: 'fill', box: { x: 690, y: 190, w: 20, h: 20 } }] };
};
const pos = (d, t) => cursorAt({ cursor: d.samples }, t);
const shape = (d, t) => d.shapes.findLast((s) => s.t <= t).shape;
const alpha = (d, t) => { const a = d.alpha.findLast((s) => s.t <= t); const b = d.alpha.find((s) => s.t > t); return b ? a.a + (b.a-a.a)*(t-a.t)/(b.t-a.t) : a.a; };
const near = (a, b, eps = 0.5) => assert.ok(Math.abs(a-b) <= eps, `${a} ~= ${b}`);
test('deterministic, immutable, continuous, exact click hits, 60 Hz plus click boundaries', () => {
  const events = run(), before = structuredClone(events), d = directCursor({ events });
  assert.deepEqual(d, directCursor({ events })); assert.deepEqual(events, before);
  for (let i = 1; i < d.samples.length; i++) {
    const a = d.samples[i-1], b = d.samples[i];
    assert.ok(b.t > a.t); assert.ok(b.t-a.t <= 1/60+1e-9);
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<60);
  }
  for (const c of events.clicks) { near(pos(d,c.t).x,c.x); near(pos(d,c.t).y,c.y); }
  const offGrid = run(); offGrid.clicks[0].t = 2.807;
  near(pos(directCursor({events:offGrid}),2.807).x,400);
});
test('shape proximity, click hold, fill keys, and CSS overrides', () => {
  const events = run(); events.keys = [{ t: 9.2, stepId: 'b', count: 1 }, { t: 10, stepId: 'b', count: 1 }];
  const d = directCursor({ events });
  assert.equal(shape(d,2.4),'arrow'); assert.equal(shape(d,2.59),'hand');
  assert.equal(shape(d,3.14),'hand'); assert.equal(shape(d,3.18),'arrow');
  assert.equal(shape(d,8.7),'text'); assert.equal(shape(d,10.79),'text'); assert.equal(shape(d,10.84),'arrow');
  for (const [cursor,expected] of [['default','arrow'],['crosshair','arrow'],['constructor','arrow'],['__proto__','arrow'],['text','text'],['pointer','hand']]) {
    events.targets[0].cursor = cursor; assert.equal(shape(directCursor({ events }),2.8),expected);
  }
});
test('drifts continue travel, float continuously, clamp and shorten before an early move', () => {
  const events = run(), d = directCursor({ events });
  near(pos(d,3.95).x,540); near(pos(d,3.95).y,200);
  assert.ok(pos(d,5).x !== pos(d,4).x);
  const edge = run(); edge.viewport.width = 480;
  assert.ok(directCursor({events:edge}).samples.filter((s) => s.t>=3.15 && s.t<8).every((s)=>s.x<=456));
  const early = run(); early.cursor = early.cursor.map((s)=>s.t>=8?{...s,t:s.t-4.4}:s); early.clicks[1].t-=4.4; early.targets[1].t-=4.4;
  const short = directCursor({events:early}); assert.ok(pos(short,3.45).x>400 && pos(short,3.45).x<540);
  near(pos(short,3.6).x,400); near(pos(short,3.8).x,500);
  const sooner = run(); sooner.cursor = sooner.cursor.map((s)=>s.t>=8?{...s,t:s.t-4.8}:s);
  near(pos(directCursor({events:sooner}),3.16).x,400);
});
test('entrance, idle fade, wake and typing protection including count-only fill events', () => {
  const events = run(), d = directCursor({events});
  near(alpha(d,1.5),0,1e-8); near(alpha(d,1.75),0.5,1e-8); near(alpha(d,1.9),1,1e-8);
  near(alpha(d,6.3),0,1e-8); assert.ok(alpha(d,7.95)>0); near(alpha(d,8.1),1,1e-8);
  for (const c of events.clicks) for (let t=c.t;t<c.t+1;t+=0.02) near(alpha(d,t),1,1e-8);
  events.keys=[{t:11,stepId:'b',count:40}];
  const typing=directCursor({events}); for(let t=8.8;t<11.5;t+=0.02) near(alpha(typing,t),1,1e-8);
});
test('all settings off preserve original samples and constant arrow/opacity', () => {
  const events=run(); assert.deepEqual(directCursor({events,options:{autoShape:false,followThrough:{enabled:false},microCorrection:false,entrance:false,hideWhenIdleSec:0}}),
    {samples:events.cursor,shapes:[{t:0,shape:'arrow'}],alpha:[{t:0,a:1}]});
});
test('composition paths, ranges, camera independence, press/ripple and shape pop', () => {
  const events=run(); events.steps=[];
  const input={events,brief:{...structuredClone(DEFAULT_BRIEF),topic:'Demo'},storyboard:{steps:[]},record:{runId:'test',durationSec:12,scale:{used:1}},sourceSize:{width:1000,height:600}};
  const c=buildComposition({...input,overrides:{cards:{title:{enabled:false},outro:{enabled:false}},cursor:{clickEffect:{style:'ripple'}}}});
  for(const path of ['cursor.autoShape','cursor.entrance','cursor.microCorrection','cursor.followThrough.enabled','cursor.followThrough.distancePx','cursor.followThrough.durationSec']) assert.ok(path in compositionPaths(c));
  for(const [path,value] of [['cursor.followThrough.distancePx',-1],['cursor.followThrough.durationSec',0],['cursor.followThrough.startAfterClickSec',6],['cursor.autoShape',1],['cursor.followThrough.extra',1]]) {
    if(path.endsWith('extra')) { const bad=structuredClone(c);bad.cursor.followThrough.extra=1;assert.equal(validateComposition(bad).ok,false); }
    else assert.equal(validateComposition(changeComposition(c,path,value)).ok,false);
  }
  const plan=planRender({...input,composition:c}), off=planRender({...input,composition:changeComposition(c,'cursor.followThrough.enabled',false)});
  assert.deepEqual(plan.camera,off.camera);
  const change=plan.cursor.shapes.find(s=>s.shape==='hand'); near(stateAt(plan,change.t+0.06).cursor.pop,1.12,1e-9);
  near(stateAt(plan,2.845).cursor.press,0.86,1e-9); assert.equal(stateAt(plan,2.95).ripple.x,400);
});

test('stationary clicks use down-right fallback and micro correction makes a five-pixel approach', () => {
  const events=run(); events.cursor=[{t:2,x:400,y:200},{t:2.6,x:400,y:200}]; events.clicks=events.clicks.slice(0,1);
  const d=directCursor({events,options:{entrance:false}});
  near(pos(d,2.69).x,400-5*Math.SQRT1_2,0.1);
  near(pos(d,2.8).x,400); assert.ok(pos(d,3.95).x>400 && pos(d,3.95).y>200);
  const off=directCursor({events,options:{microCorrection:false,followThrough:{enabled:false}}});
  near(pos(off,2.69).x,400,1e-9);
});
