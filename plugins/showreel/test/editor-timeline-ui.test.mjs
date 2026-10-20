import test from 'node:test';
import assert from 'node:assert/strict';
import { layerRows, missingLayers, rowHeights, ROW_SIZES, tickPlan, ticks, shortClock, fitScale, sliderFromScale, scaleFromSlider, hasUserEdits } from '../editor/timeline-model.mjs';
import { clampZoomRange, dragCreateRange, zoomPlacement, duplicateRange, freeGap, regionAt, MIN_ZOOM_SEC } from '../editor/timeline/zoom-geometry.mjs';
import { menuActions, quickActions, SPEED_PICKS } from '../editor/timeline/context-menu.mjs';
import { thumbnailStep, thumbnailTimes, nearestThumb, stripSlots, createThumbnailStrip } from '../editor/timeline/thumbnails.mjs';

const region = (id,tStart,tEnd,source = 'manual') => ({id,tStart,tEnd,depth:2,source,keyframes:[{t:tStart,x:1,y:1}],stepIds:[]});
const regions = [region('a',1,2),region('b',3,4,'auto'),region('c',6,7)];
const sortedAndDisjoint = list => list.every((z,i) => !i || z.tStart >= list[i-1].tEnd-1e-9);

test('Clip and Zoom always show; Captions, Voice and Music only when present or added, and Add Layer lists the rest', () => {
  assert.deepEqual(layerRows(),['clip','zoom']);
  assert.deepEqual(missingLayers(layerRows()).map(l => l.id),['captions','voice','music']);
  assert.deepEqual(layerRows({cues:2}),['clip','zoom','captions']);
  assert.deepEqual(layerRows({voice:1,music:true}),['clip','zoom','voice','music']);
  assert.deepEqual(layerRows({added:{captions:true,voice:true,music:true}}),['clip','zoom','captions','voice','music']);
  assert.deepEqual(missingLayers(layerRows({added:{captions:true,voice:true,music:true}})),[]);
  // Adding an existing layer again never duplicates it.
  assert.deepEqual(layerRows({cues:1,added:{captions:true}}),['clip','zoom','captions']);
  for (const l of missingLayers(['clip','zoom'])) assert.ok(l.hint,`${l.id} has an empty-state hint`);
});

test('rows stretch from their minimum to their maximum, Clip tallest, and never below the minimum when space is short', () => {
  const rows = ['clip','zoom','captions'];
  const small = rowHeights(60,rows);
  assert.deepEqual(small,{clip:44,zoom:44,captions:28},'minimums hold when the grid is too small (it scrolls instead)');
  const medium = rowHeights(150,rows);
  assert.equal(Object.values(medium).reduce((a,b) => a+b),150);
  assert.ok(medium.clip > medium.zoom && medium.zoom >= medium.captions);
  const large = rowHeights(1000,rows);
  assert.equal(Object.values(large).reduce((a,b) => a+b),1000,'no dead space: rows keep growing past their maxima');
  assert.ok(large.clip > large.zoom && large.zoom > large.captions);
  const two = rowHeights(300,['clip','zoom']);
  assert.equal(two.clip+two.zoom,300);assert.ok(two.clip > two.zoom);
  for (const id of rows) assert.ok(ROW_SIZES[id].min >= 28 && ROW_SIZES[id].max <= 96);
  assert.ok(ROW_SIZES.captions.max <= 56 && ROW_SIZES.zoom.max <= 72 && ROW_SIZES.clip.max > ROW_SIZES.zoom.max);
  assert.ok(ROW_SIZES.zoom.min >= 44,'zoom blocks are at least 40 px tall inside their row');
});

test('ruler ticks adapt to zoom: labels at least 72 px apart, minor ticks subdividing, short 0:05 labels', () => {
  assert.deepEqual(tickPlan(80),{major:1,minor:0.25,tenths:false});
  assert.deepEqual(tickPlan(10),{major:10,minor:2,tenths:false});
  assert.deepEqual(tickPlan(800),{major:0.1,minor:0.05,tenths:true});
  for (const scale of [2,5,10,20,40,80,160,320,640,800]) {
    const plan = tickPlan(scale);
    assert.ok(plan.major*scale >= 72,`labels at ${scale}px/s are ${plan.major*scale}px apart`);
    assert.ok(plan.minor < plan.major && Math.abs(plan.major/plan.minor-Math.round(plan.major/plan.minor)) < 1e-9);
  }
  const marks = ticks(10,80);
  assert.equal(marks[0].label,'0:00');
  assert.equal(marks.filter(m => m.major).length,11);
  assert.equal(marks.filter(m => m.major).at(-1).label,'0:10');
  assert.equal(marks.filter(m => !m.major).length,30);
  assert.equal(shortClock(65),'1:05');assert.equal(shortClock(0.5,{tenths:true}),'0:00.5');assert.equal(shortClock(125.4),'2:05');
});

test('fit scale shows the whole recording and the zoom slider maps the scale on a log curve between fit and 800 px/s', () => {
  assert.equal(fitScale(1302,16.67),Math.min(800,1300/16.67));
  assert.equal(fitScale(0,10),80);assert.equal(fitScale(100,0),80);
  const min = fitScale(1000,10);
  assert.equal(sliderFromScale(min,min),0);assert.equal(sliderFromScale(800,min),100);assert.equal(sliderFromScale(5,min),0);
  assert.ok(Math.abs(scaleFromSlider(sliderFromScale(300,min),min)-300) < 6);
  assert.equal(scaleFromSlider(0,min),min);assert.equal(scaleFromSlider(100,min),800);
});

test('the legend shows only while the user has made no edits', () => {
  const c = {edits:{splits:[],trims:[],speeds:[],mutes:[]},zoom:{regions:[region('auto-1',1,2,'auto')]},captions:{}};
  assert.equal(hasUserEdits(c),false);
  assert.equal(hasUserEdits({...c,edits:{...c.edits,splits:[2]}}),true);
  assert.equal(hasUserEdits({...c,zoom:{regions:[region('m',1,2)]}}),true);
  assert.equal(hasUserEdits({...c,captions:{cues:[{id:'x'}]}}),true);
  assert.equal(hasUserEdits(null),false);
});

test('zoom regions never overlap: moves and resizes clamp against neighbours and report the snap guide', () => {
  const original = {start:3,end:4};
  // Moving b right stops at c's start (6): start 5, guide at 6.
  assert.deepEqual(clampZoomRange(regions,{start:5.5,end:6.5},{excludeId:'b',duration:10,mode:'move',original}),{start:5,end:6,guide:6});
  // Moving b left stops at a's end (2).
  assert.deepEqual(clampZoomRange(regions,{start:1.5,end:2.5},{excludeId:'b',duration:10,mode:'move',original}),{start:2,end:3,guide:2});
  // Free movement reports no guide.
  assert.deepEqual(clampZoomRange(regions,{start:4.5,end:5.5},{excludeId:'b',duration:10,mode:'move',original}),{start:4.5,end:5.5,guide:null});
  // Resizing the end stops at 6; resizing the start stops at 2; neither can invert past the minimum length.
  assert.deepEqual(clampZoomRange(regions,{start:3,end:9},{excludeId:'b',duration:10,mode:'end',original}),{start:3,end:6,guide:6});
  assert.deepEqual(clampZoomRange(regions,{start:0,end:4},{excludeId:'b',duration:10,mode:'start',original}),{start:2,end:4,guide:2});
  const tiny = clampZoomRange(regions,{start:3.95,end:4},{excludeId:'b',duration:10,mode:'start',original});
  assert.ok(tiny.end-tiny.start >= MIN_ZOOM_SEC-1e-9);
  // The recording edges clamp too, without a guide.
  assert.deepEqual(clampZoomRange(regions,{start:9,end:10},{excludeId:'c',duration:10,mode:'move',original:{start:6,end:7}}),{start:9,end:10,guide:null});
  assert.deepEqual(clampZoomRange(regions,{start:-1,end:0},{excludeId:'a',duration:10,mode:'move',original:{start:1,end:2}}),{start:0,end:1,guide:null});
  // Property: random moves of each region keep the set sorted and disjoint.
  let seed = 7; const rnd = () => (seed = (seed*48271)%2147483647)/2147483647;
  for (let i=0;i<500;i++) {
    const z = regions[Math.floor(rnd()*3)], len = z.tEnd-z.tStart, start = rnd()*12-1;
    const mode = ['move','start','end'][Math.floor(rnd()*3)];
    const r = clampZoomRange(regions,mode === 'move' ? {start,end:start+len} : mode === 'start' ? {start,end:z.tEnd} : {start:z.tStart,end:start+len},{excludeId:z.id,duration:10,mode,original:{start:z.tStart,end:z.tEnd}});
    const next = regions.map(o => o.id === z.id ? {...o,tStart:r.start,tEnd:r.end} : o).sort((a,b) => a.tStart-b.tStart);
    assert.ok(sortedAndDisjoint(next),JSON.stringify({z:z.id,mode,start,r}));
    assert.ok(r.end-r.start >= MIN_ZOOM_SEC-1e-9 && r.start >= 0 && r.end <= 10);
  }
});

test('drag-create proposes a region inside the gap and marks short drags invalid', () => {
  assert.equal(dragCreateRange(regions,1.5,2.5,{duration:10}),null,'starting inside a region creates nothing');
  assert.deepEqual(dragCreateRange(regions,4.5,5.5,{duration:10}),{start:4.5,end:5.5,guide:null,valid:true});
  assert.deepEqual(dragCreateRange(regions,4.5,9,{duration:10}),{start:4.5,end:6,guide:6,valid:true},'clamped at the next region with a guide');
  assert.deepEqual(dragCreateRange(regions,4.5,0,{duration:10}),{start:4,end:4.5,guide:4,valid:true},'dragging left clamps at the previous region');
  assert.equal(dragCreateRange(regions,4.5,4.55,{duration:10}).valid,false);
  assert.deepEqual(dragCreateRange(regions,8,20,{duration:10}),{start:8,end:10,guide:null,valid:true});
  assert.deepEqual(freeGap(regions,5,{duration:10}),{lo:4,hi:6});
  assert.equal(freeGap(regions,1.5,{duration:10}),null);
  assert.deepEqual(freeGap(regions,1.5,{excludeId:'a',duration:10}),{lo:0,hi:3});
  assert.equal(regionAt(regions,3.5).id,'b');assert.equal(regionAt(regions,4),null,'the end is exclusive');
});

test('adding a zoom at a time selects the existing region, fits a new one into the gap, or reports no room', () => {
  assert.equal(zoomPlacement(regions,3.5,{duration:10}).existing.id,'b');
  assert.deepEqual(zoomPlacement(regions,4,{duration:10}),{start:4,end:6},'the default two seconds, cut at the next region');
  assert.deepEqual(zoomPlacement(regions,9.5,{duration:10}),{start:9.5,end:10});
  assert.equal(zoomPlacement(regions,9.95,{duration:10}),null);
  assert.deepEqual(zoomPlacement([],0,{duration:10,length:2}),{start:0,end:2});
  assert.deepEqual(duplicateRange(regions,regions[0],{duration:10}),{start:2,end:3});
  assert.deepEqual(duplicateRange(regions,regions[2],{duration:7.1}),null);
  assert.deepEqual(duplicateRange(regions,regions[1],{duration:10}),{start:4,end:5});
});

test('context menus list only the valid actions per block kind', () => {
  const clip = {id:'1',start:1,end:3,rate:1,deleted:false,muted:false};
  assert.deepEqual(menuActions('clip',clip,{sourceT:2}).map(a => a.id),['split','speed','delete']);
  assert.equal(menuActions('clip',clip,{sourceT:2}).find(a => a.id === 'split').disabled,false);
  assert.equal(menuActions('clip',clip,{sourceT:5}).find(a => a.id === 'split').disabled,true,'the playhead must be inside the clip');
  assert.equal(menuActions('clip',clip,{sourceT:1.05}).find(a => a.id === 'split').disabled,true,'at least 0.1 s from the edge');
  const speed = menuActions('clip',{...clip,rate:4},{sourceT:2}).find(a => a.id === 'speed');
  assert.deepEqual(speed.picks.map(p => p.rate),[...SPEED_PICKS]);assert.deepEqual(SPEED_PICKS,[1,2,4,8]);
  assert.deepEqual(speed.picks.map(p => p.active),[false,false,true,false]);
  assert.deepEqual(menuActions('clip',{...clip,deleted:true},{sourceT:2}).map(a => a.id),['restore']);
  assert.deepEqual(menuActions('zoom',region('z',1,2,'auto')).map(a => a.id),['manual','duplicate','delete']);
  assert.deepEqual(menuActions('zoom',region('z',1,2,'manual')).map(a => a.id),['auto','duplicate','delete']);
  assert.deepEqual(menuActions('caption',{id:'c',text:'hi'}).map(a => a.id),['edit','delete']);
  assert.deepEqual(menuActions('voice',{stepId:'s1'}).map(a => a.id),['regenerate','open-audio']);
  assert.deepEqual(menuActions('music',{}).map(a => a.id),['open-audio']);
  assert.deepEqual(menuActions('unknown',{}),[]);
  for (const kind of ['clip','zoom','caption','voice']) {
    const quick = quickActions(kind,kind === 'clip' ? clip : kind === 'zoom' ? region('z',1,2) : {id:'x',stepId:'s1',text:'t'},{sourceT:2});
    assert.ok(quick.length >= 1 && quick.length <= 3,`${kind}: ${quick.length} quick actions`);
    assert.ok(quick.every(a => a.icon && a.label));
  }
  assert.deepEqual(quickActions('clip',{...clip,deleted:true}).map(a => a.id),['restore']);
});

test('thumbnail grid: at most ~120 frames, half-second floor, nearest lookup and slot geometry', () => {
  assert.equal(thumbnailStep(4),0.5);assert.equal(thumbnailStep(16.67),0.5);assert.equal(thumbnailStep(300),2.5);assert.equal(thumbnailStep(0),0.5);
  assert.ok(thumbnailTimes(600).length <= 121);
  assert.deepEqual(thumbnailTimes(2),[0.25,0.75,1.25,1.75]);
  assert.deepEqual(thumbnailTimes(0.1),[0.05]);
  const times = thumbnailTimes(2), frames = ['a',null,'c','d'];
  assert.equal(nearestThumb(frames,times,0.3),'a');assert.equal(nearestThumb(frames,times,0.8),null);assert.equal(nearestThumb(frames,times,5),'d');
  const slots = stripSlots(300,72,10,12);
  assert.equal(slots[0].x,0);assert.equal(slots[0].width,128);assert.equal(slots.length,3);
  assert.ok(slots.every(s => s.t >= 10 && s.t <= 12));
  assert.ok(slots[1].t > slots[0].t);
});

test('thumbnail strip decodes lazily, caches frames, reports status and survives a failing decoder', async () => {
  const updates = []; let release; const gate = new Promise(r => { release = r; });
  const fakeOpen = async () => { await gate; return { input: { dispose() { updates.push('disposed'); } }, aspect: 2, frames: async function* (times) { for (let i=0;i<times.length;i++) yield i === 1 ? null : {index:i,canvas:{width:2,height:1,t:times[i]}}; } }; };
  const strip = createThumbnailStrip({duration:2,onUpdate:() => updates.push(strip.status),open:fakeOpen});
  assert.equal(strip.status,'idle');assert.equal(strip.at(0.3),null);
  const started = strip.start(); assert.equal(strip.status,'loading','decoding starts lazily and reports loading');
  await new Promise(r => setTimeout(r,5)); assert.deepEqual(updates,['loading']);
  release(); await started; await strip.start();
  await new Promise(r => setTimeout(r,20));
  assert.equal(strip.status,'ready');assert.equal(strip.aspect,2);
  assert.equal(strip.at(0.3).t,0.25);assert.equal(strip.at(0.8),null,'a frame the decoder skipped stays empty');
  assert.equal(updates.at(-1),'ready');assert.ok(updates.length < 10,'updates are coalesced per frame');
  strip.close();assert.ok(updates.includes('disposed'));
  const broken = createThumbnailStrip({duration:2,open:async () => { throw new Error('no video'); }});
  await broken.start();assert.equal(broken.status,'error');assert.equal(broken.at(1),null);
});
