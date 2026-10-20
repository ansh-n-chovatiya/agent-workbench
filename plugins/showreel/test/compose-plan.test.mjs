import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BRIEF } from '../scripts/lib/brief.mjs';
import { buildComposition } from '../scripts/lib/compose/composition.mjs';
import { planRender, stateAt } from '../scripts/lib/compose/plan.mjs';
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
function run(scale = 1) {
  const brief = { ...structuredClone(DEFAULT_BRIEF), topic: 'Open a report' };
  const storyboard = { steps: [{ id: 's1', caption: 'Open report', guideSteps: [7] }] };
  const events = { viewport: { width: 1280, height: 720 }, scale,
    steps: [{ id: 's1', tStart: 0, holdStart: 4, tEnd: 6 }],
    targets: [{ t: 1, stepId: 's1', kind: 'click', sensitive: false, box: { x: 900, y: 500, w: 80, h: 80 } }],
    cursor: [{ t: 0, x: 100, y: 100 }, { t: 1.6, x: 940, y: 540 }],
    clicks: [{ t: 1.7, stepId: 's1', x: 940, y: 540, tab: 0 }], keys: [] };
  const record = { runId: '20261018-120000', durationSec: 7, scale: { used: scale }, warnings: ['Recording warning'] };
  const sourceSize = { width: 1280 * scale, height: 720 * scale };
  const composition = buildComposition({ brief, storyboard, events, record, edits: { speeds: [{ start: 3, end: 5, rate: 2 }] }, overrides: { cursor: { clickEffect: { style: 'ripple' } } } });
  return { brief, storyboard, events, record, sourceSize, composition };
}
test('drawing plan combines cards, captions, zoom, cursor and speed changes on one clock', () => {
  const input = run(), before = structuredClone(input), plan = planRender(input), map = plan.timemap;
  assert.deepEqual(input, before);
  assert.equal(plan.output.fps, 60); assert.equal(plan.cursor.sizePx, 36.72);
  assert.deepEqual(plan.captions, input.composition.captions);
  assert.equal(plan.theme.name, 'clean'); assert.ok(plan.warnings.some((w) => w.includes('sharp limit')));
  assert.ok(plan.warnings.includes('Recording warning'));
  const title = stateAt(plan, 0.5);
  assert.equal(title.section, 'title'); assert.equal(title.alphaTitle, 1); near(title.sourceT, 0);
  const crossfade = stateAt(plan, 2);
  assert.equal(crossfade.section, 'main'); near(crossfade.alphaTitle, 0.5);
  const beforeZoom = stateAt(plan, map.toOutput(0.5));
  near(beforeZoom.camera.z, 1); assert.equal(beforeZoom.caption.text, 'Open report'); assert.equal(beforeZoom.caption.alpha, 1);
  const zoom = stateAt(plan, map.toOutput(2.4)); assert.ok(zoom.camera.z > 1.65);
  const click = stateAt(plan, map.toOutput(1.745)); near(click.cursor.press, 0.86); assert.ok(click.ripple);
  const speed = stateAt(plan, map.mainStart + 3.5); near(speed.sourceT, 4);
  const afterZoom = stateAt(plan, map.toOutput(5)); assert.ok(afterZoom.camera.z < 1.01); assert.equal(afterZoom.ripple, null);
  const outroCrossfade = stateAt(plan, map.mainEnd - 0.2); near(outroCrossfade.alphaOutro, 0.5); assert.equal(outroCrossfade.section, 'main');
  assert.equal(stateAt(plan, map.outputDuration - 0.1).section, 'outro');
  const json = JSON.parse(JSON.stringify(plan));
  for (let t = 0; t < map.outputDuration; t += 0.037) assert.deepEqual(stateAt(json, t), stateAt(plan, t));
});
test('real source pixel sizes keep camera and event coordinates in CSS pixels at capture scale', () => {
  const normal = planRender(run()), scaled = planRender(run(2));
  assert.deepEqual(scaled.camera, normal.camera); assert.deepEqual(scaled.layout.frame, normal.layout.frame);
  assert.equal(scaled.scale, 2); assert.equal(scaled.layout.scaleFramePx, normal.layout.scaleFramePx / 2);
  assert.deepEqual(scaled.cursor.samples, normal.cursor.samples);
  const limit = (plan) => Number(plan.warnings.find((w) => w.includes('sharp limit'))?.split(' ').at(-1) ?? Infinity);
  assert.ok(limit(scaled) > limit(normal));
});
test('disabled tracks and cards do not draw effects, and invalid composition or run bounds fail', () => {
  const input = run();
  Object.assign(input.composition.zoom, { enabled: false });
  input.composition.captions.enabled = false; input.composition.cursor.clickEffect = false;
  input.composition.cards.title.enabled = false; input.composition.cards.outro.enabled = false;
  const plan = planRender(input), state = stateAt(plan, 1.8);
  assert.equal(plan.timemap.mainStart, 0); assert.equal(plan.timemap.outputDuration, 6);
  assert.equal(plan.layout.caption, null); assert.equal(state.caption, null); assert.equal(state.ripple, null); near(state.camera.z, 1);
  input.composition.output.fps = 12; assert.throws(() => planRender(input), /output.fps/);
  const short = run(); short.record.durationSec = 1; assert.throws(() => planRender(short), /speeds\[0\]/);
  const invalid = run(); invalid.composition.zoom.regions[0].tEnd = 10; assert.throws(() => planRender(invalid), /invalid times/);
});

test('caption overrides replace generated cues in source time under trims and speed changes', () => {
  const input = run(); input.composition.captions.cues = [{id:'edited',text:'Edited report',start:3,end:5}];
  input.composition.edits.trims = [{start:0.5,end:1}];
  const before = structuredClone(input.composition), plan = planRender(input);
  assert.deepEqual(plan.cues,before.captions.cues);
  assert.equal(stateAt(plan,plan.timemap.toOutput(4)).caption.text,'Edited report');
  assert.equal(stateAt(plan,plan.timemap.toOutput(2)).caption,null); assert.deepEqual(input.composition,before);
  input.composition.captions.cues = []; assert.deepEqual(planRender(input).cues,[]);
  input.composition.captions.enabled = false; input.composition.captions.cues = before.captions.cues; assert.deepEqual(planRender(input).cues,[]);
});

test('timeline receives detached regions and edited/deleted auto zooms persist in the plan', async () => {
  const { updateZoomRegion, deleteZoomRegion, autoZoomRegenerate } = await import('../editor/edit-ops.mjs');
  const input = run(), context = {duration:input.record.durationSec};
  const original = input.composition.zoom.regions[0];
  let plan = planRender(input);
  assert.deepEqual(plan.regions,input.composition.zoom.regions);
  plan.regions[0].depth = 4;
  assert.equal(input.composition.zoom.regions[0].depth,original.depth);
  input.composition = updateZoomRegion(input.composition,original.id,{depth:2.5},context);
  plan = planRender(input); assert.equal(plan.regions[0].depth,2.5); assert.equal(plan.regions[0].source,'manual');
  input.composition = deleteZoomRegion(input.composition,original.id,context);
  assert.deepEqual(planRender(input).regions,[]);
  input.composition = autoZoomRegenerate(input.composition,input.events,input.record);
  assert.ok(planRender(input).regions.length);
});

function pacingRun() {
  const input = run();
  input.events.steps = Array.from({length:3}, (_,i) => ({id:`s${i+1}`,tStart:i*8,holdStart:i*8+2,tEnd:(i+1)*8}));
  input.storyboard.steps = input.events.steps.map(s => ({id:s.id,caption:`Sentence ${s.id}`}));
  input.record.durationSec = 24;
  input.composition = buildComposition({...input, overrides:{cards:{title:{enabled:false},outro:{enabled:false}},
    zoom:{enabled:false},audio:{voice:{enabled:true}}}});
  input.voiceClips = {steps:{s1:'a',s2:'b',s3:'c'}, clips:{a:{durationSec:2.5},b:{durationSec:3},c:{durationSec:4}}};
  return input;
}

test('three narrated steps trim waits, retain pauses, and align captions and clips on a stable clock', async () => {
  const { sourceAt, outputAt } = await import('../scripts/lib/compose/timemap.mjs');
  const { narrationIdleTrims } = await import('../scripts/lib/audio/retime.mjs');
  const { toSrt } = await import('../scripts/lib/compose/captions.mjs');
  const input = pacingRun(), before = structuredClone(input), plan = planRender(input);
  assert.deepEqual(input,before,'planning never writes recordings or edits');
  assert.equal(plan.audio.tightened.length,3); near(plan.audio.removedSec,12.25);
  near(plan.timemap.outputDuration,11.75);
  assert.deepEqual(plan.notices,['Trimmed 12.3 s of waiting after narration']);
  assert.ok(!plan.warnings.some(w => /Trimmed/.test(w)));
  for (const [i,n] of plan.audio.narration.entries()) {
    const step = input.events.steps[i], trim = plan.timemap.trims[i], end = n.outStart+n.durationSec;
    assert.ok(trim.start >= step.holdStart);
    assert.ok(trim.start >= sourceAt(plan.timemap,end).t+0.4-1e-9);
    near(trim.end,step.tEnd-(i === 2 ? 0.5 : 0.05));
    const cue = plan.cues.find(c => c.id === n.stepId);
    assert.ok(cue.start <= sourceAt(plan.timemap,n.outStart).t);
    assert.ok(cue.end >= sourceAt(plan.timemap,end).t);
    const span = plan.audio.captionSpans.find(s => s.stepId === n.stepId);
    near(span.outStart,n.outStart); near(span.outEnd,end);
    near(outputAt(plan.timemap,step.tStart+0.15),n.outStart);
    if (i < 2) assert.ok(plan.audio.narration[i+1].outStart-end >= 0.4-1e-9);
  }
  assert.equal(toSrt(plan.cues,plan.timemap).match(/-->/g).length,3);
  const again = narrationIdleTrims({steps:input.events.steps,narration:plan.audio.narration,timemap:plan.timemap,
    edits:input.composition.edits,pauseSec:0.4});
  again.forEach((r,i) => {near(r.start,plan.timemap.trims[i].start);near(r.end,plan.timemap.trims[i].end);});
  assert.deepEqual(planRender(input).audio,plan.audio,'repeated planning converges');
  input.composition.audio.tighten.enabled = false;
  const off = planRender(input);
  near(off.timemap.outputDuration,24); assert.deepEqual(off.timemap.trims,[]);
  assert.deepEqual(off.audio.tightened,[]); assert.equal(off.audio.removedSec,0); assert.deepEqual(off.notices,[]);
  input.composition.audio.tighten.enabled = true; input.composition.audio.voice.enabled = false;
  near(planRender(input).timemap.outputDuration,24);
});

test('overlapping user trims, speeds and holds win over automatic waits', () => {
  for (const edits of [{trims:[{start:4,end:5}]}, {speeds:[{start:4,end:5,rate:2}]}, {holds:[{t:4,duration:1}]}]) {
    const input = pacingRun(); Object.assign(input.composition.edits,edits);
    const plan = planRender(input);
    assert.deepEqual(plan.audio.tightened.map(r => r.stepId),['s2','s3']);
    assert.deepEqual(plan.timemap.trims.filter(r => r.start < 8),edits.trims ?? []);
    assert.deepEqual(plan.timemap.holds,edits.holds ?? []);
  }
});

test('tightening preserves actions, missing holdStart, minimum cut size and final narration overrun', () => {
  const input = pacingRun(); input.events.steps[0].holdStart = 7;
  delete input.events.steps[1].holdStart; input.voiceClips.clips.c.durationSec = 10;
  const plan = planRender(input);
  near(plan.timemap.trims[0].start,7); assert.ok(plan.timemap.trims[1].start > 11);
  assert.ok(!plan.audio.tightened.some(r => r.stepId === 's3'));
  assert.ok(plan.audio.warnings.some(w => w.code === 'tail-hold'));
  const last = plan.audio.narration.at(-1);
  assert.ok(plan.timemap.mainEnd >= last.outStart+last.durationSec);
  const short = pacingRun(); short.events.steps[0].holdStart = 7.8;
  assert.ok(!planRender(short).audio.tightened.some(r => r.stepId === 's1'));
});
