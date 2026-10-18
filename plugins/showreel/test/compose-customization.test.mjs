import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_BRIEF } from '../scripts/lib/brief.mjs';
import { DEFAULT_COMPOSITION, buildComposition, resolveComposition, validateComposition, changeComposition, compositionPaths, outputBitrate } from '../scripts/lib/compose/composition.mjs';
import { layoutFor } from '../scripts/lib/compose/layout.mjs';
import { planRender, stateAt } from '../scripts/lib/compose/plan.mjs';
import { resolveImageAssets } from '../scripts/lib/compose/render.mjs';
const input = () => ({ brief: { ...structuredClone(DEFAULT_BRIEF), theme: 'dark', topic: 'Report' },
  storyboard: { steps: [] }, record: { runId: 'run-1', durationSec: 6, scale: { used: 1 } }, sourceSize: { width: 1280, height: 720 },
  events: { viewport: { width: 1280, height: 720 }, targets: [{ t: 1, kind: 'click', stepId: 's1', box: { x: 100, y: 100, w: 40, h: 40 } }],
    clicks: [{ t: 1.5, x: 120, y: 120, stepId: 's1' }], keys: [], cursor: [{ t: 0, x: 120, y: 120 }, { t: 5, x: 120, y: 120 }], steps: [] } });
test('theme defaults, explicit settings and legacy v1 shorthands resolve without mutation', () => {
  const run = input(), c = buildComposition(run);
  assert.equal(c.cards.title.titleColor, '#f9fafb');
  assert.equal(c.captions.background, 'rgba(255,255,255,0.14)');
  const custom = buildComposition({ ...run, overrides: { cards: { title: { titleColor: '#123456' } }, frame: { paddingPct: 7 } } });
  assert.equal(custom.cards.title.titleColor, '#123456'); assert.equal(custom.frame.paddingXPct, 7); assert.equal(custom.frame.paddingYPct, 7);
  const legacy = { version: 1, run: { id: 'run-1' }, theme: 'dark', output: { width: 1920, height: 1080, fps: 60 },
    frame: { paddingPct: 5 }, cursor: { visible: true, sizePct: 1.35, clickEffect: true }, zoom: { enabled: true, depth: 'medium', autoSuggest: true, regions: [] },
    captions: { enabled: true, mode: 'band' }, cards: { title: { enabled: true, title: 'Report', subtitle: null, duration: 2.2 }, outro: { enabled: true, text: 'Bye', duration: 2 }, fade: 0.4 }, edits: { trims: [], speeds: [] } };
  const before = structuredClone(legacy);
  assert.equal(validateComposition(legacy).ok, true);
  const plan = planRender({ ...run, composition: legacy });
  assert.equal(plan.cards.title.durationSec, 2.2); assert.equal(plan.cursor.clickEffect.style, 'ripple');
  assert.deepEqual(legacy, before); assert.equal(plan.frame.paddingXPct, 5);
});
test('all new numeric settings accept boundaries and reject out of range values', () => {
  const ranges = { 'frame.paddingXPct':[0,25], 'frame.paddingYPct':[0,25], 'frame.radiusPx':[0,300],
    'frame.shadow.blurPx':[0,300], 'frame.shadow.offsetYPx':[-300,300], 'frame.shadow.opacity':[0,1], 'frame.border.widthPx':[0,30],
    'cursor.sizePct':[1,8], 'cursor.hideWhenIdleSec':[0,60], 'cursor.pressScale':[0.1,1], 'cursor.clickEffect.sizeMult':[0.1,10],
    'cursor.clickEffect.durationSec':[0.05,5], 'zoom.holdAfterClickSec':[0,30], 'zoom.leadInSec':[0,5],
    'captions.bandHeightPct':[6,25], 'captions.fontSizePct':[1,10], 'cards.fade':[0,1.5],
    'cards.title.durationSec':[0,30], 'cards.title.titleSizePct':[1,20], 'cards.title.subtitleSizePct':[1,12], 'cards.title.accent.widthPct':[0,100],
    'frame.background.angle':[0,360] };
  const c = buildComposition(input());
  for (const [p,[min,max]] of Object.entries(ranges)) for (const v of [min,max,min-0.1,max+0.1,null,'2',Infinity]) {
    const result = validateComposition(changeComposition(c,p,v));
    assert.equal(result.ok, v === min || v === max, `${p}=${v}: ${result.errors}`);
  }
});
test('unknown nested keys, enums, image paths, colors and malformed objects collect errors', () => {
  const c = buildComposition(input());
  for (const p of ['frame.shadow','frame.border','frame.background','cursor.clickEffect','cards.title.accent','cards.outro.background']) {
    const keys = p.split('.'); keys.reduce((v,k) => v[k],c).unexpected = true;
  }
  Object.assign(c.cursor, { style: 'triangle', fill: 123, shadow: 'yes' });
  Object.assign(c.captions, { position: 'middle', fontWeight: 500, maxLines: 4 });
  c.cards.outro.logo = { image: '../escape.png', heightPct: 50, extra: true };
  c.frame.background = { type: 'image', image: '/tmp/image.png', colors: [], angle: 999 };
  c.zoom.onlyKinds = ['scroll']; c.cards.transition = 'slide'; c.output.quality = 'ultra';
  const result = validateComposition(c);
  assert.equal(result.ok,false);
  for (const p of ['cursor.style','cursor.fill','cursor.shadow','captions.position','captions.fontWeight','captions.maxLines','cards.outro.logo.image','cards.outro.logo.heightPct','frame.background.image','frame.background.colors','zoom.onlyKinds','cards.transition','output.quality']) assert.ok(result.errors.some((e) => e.includes(p)),p);
  assert.equal(validateComposition({ ...c, theme: '__proto__' }).ok, false);
  for (const malformed of [null, [], false]) assert.equal(validateComposition({ ...c, cursor: malformed }).ok,false);
  for (const image of ['../a.png','a/../../b.png','/a.png','C:\\a.png','https://example.com/a.png','a%2fb.png']) {
    const next = changeComposition(buildComposition(input()),'frame.background',{ type:'image', image });
    assert.equal(validateComposition(next).ok,false,image);
  }
});
test('top and bottom caption bands stay disjoint across frame spacing and aspect ratios', () => {
  for (const position of ['top','bottom']) for (const bandHeightPct of [6,13,25]) for (const source of [{width:1280,height:720},{width:400,height:1600}]) {
    const c = buildComposition({ ...input(), overrides: { frame: { paddingXPct: 12, paddingYPct: 3 }, captions: { position, bandHeightPct } } });
    const {frame:f,caption:r} = layoutFor({ output:c.output, source, composition:c });
    assert.ok(position === 'top' ? f.y >= r.y+r.h : f.y+f.h <= r.y);
    assert.ok(f.x >= c.output.width*0.12-1); assert.ok(f.y >= 0 && f.h > 0);
  }
});
test('zoom options drive suggestions and spring, cursor idle, effects and card cuts drive state', () => {
  const run = input();
  const c = buildComposition({ ...run, overrides: { zoom: { leadInSec: 0.3, holdAfterClickSec: 2, onlyKinds: ['click'], speed: 'fast' },
    cards: { title:{enabled:false},outro:{enabled:false},transition:'cut' }, cursor: { pressScale: 0.5, hideWhenIdleSec: 0.5, clickEffect: { durationSec: 1, style:'pulse' } }, captions:{mode:'overlay'} } });
  assert.equal(c.zoom.regions[0].tStart,1.3); assert.equal(c.zoom.regions[0].tEnd,3.5);
  const plan = planRender({ ...run, composition:c });
  assert.ok(plan.warnings.includes('overlay captions can cover the video'));
  assert.equal(stateAt(plan,1).cursor.alpha,1); // Click protection keeps the cursor visible. assert.equal(stateAt(plan,1.6).cursor.alpha,1);
  assert.ok(Math.abs(stateAt(plan,1.545).cursor.press-0.5)<1e-8);
  assert.equal(stateAt(plan,2.25).ripple.progress,0.75); assert.equal(stateAt(plan,2.5).ripple,null);
  const slow = planRender({ ...run, composition:changeComposition(c,'zoom.speed','slow') });
  assert.ok(stateAt(plan,1.8).camera.z > stateAt(slow,1.8).camera.z);
  const filtered = buildComposition({ ...run, overrides:{zoom:{onlyKinds:['fill']}} }); assert.equal(filtered.zoom.regions.length,0);
  const cuts = planRender({ ...run, composition:buildComposition({ ...run, overrides:{cards:{transition:'cut'}} }) });
  assert.equal(cuts.timemap.mainStart,cuts.cards.title.durationSec);
});
test('set/reset use active theme defaults, protect prototypes, list optional logo paths', () => {
  const c = buildComposition(input());
  const custom = changeComposition(c,'cards.title.titleColor','#ff0000');
  assert.equal(changeComposition(custom,'cards.title.titleColor',null,{reset:true}).cards.title.titleColor,'#f9fafb');
  assert.equal(changeComposition(c,'cursor.sizePct',1).cursor.sizePct,1);
  assert.equal(changeComposition(c,'frame.paddingPct',9).frame.paddingXPct,9);
  assert.equal(compositionPaths(c)['cards.title.logo.heightPct'],10);
  assert.throws(() => changeComposition(c,'__proto__.polluted',true));
  assert.throws(() => changeComposition(c,'cursor.wrong',true));
  assert.equal(DEFAULT_COMPOSITION.frame.paddingXPct,8); assert.equal(resolveComposition(c).output.quality,'standard');
});
test('image assets are read locally and symlinks cannot escape the project', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(),'showreel-assets-')); t.after(() => rm(dir,{recursive:true,force:true}));
  const project = path.join(dir,'project'); await mkdir(project); await writeFile(path.join(project,'bg.png'),Buffer.from('image'));
  const c = buildComposition({ ...input(), overrides:{frame:{background:{type:'image',image:'bg.png'}}} });
  const assets = await resolveImageAssets(c,project); assert.equal(assets.get('bg.png').type,'image/png');
  await writeFile(path.join(dir,'outside.png'),'outside');
  try { await symlink(path.join(dir,'outside.png'),path.join(project,'link.png')); }
  catch (e) { if (e.code === 'EPERM') { t.diagnostic('Symlink check unavailable on this host'); return; } throw e; }
  c.frame.background.image = 'link.png'; await assert.rejects(resolveImageAssets(c,project),/inside the project/);
});

test('quality scales bitrate, output size is preserved, and saved auto regions follow current zoom settings', () => {
  const run = input(), c = buildComposition(run);
  assert.equal(outputBitrate({width:100,height:100,fps:30,quality:'standard'}),21000);
  assert.equal(outputBitrate({width:100,height:100,fps:30,quality:'high'}),36000);
  assert.equal(outputBitrate({width:7680,height:4320,fps:60,quality:'high'}),60e6);
  c.zoom.onlyKinds = ['fill'];
  const plan = planRender({ ...run,composition:c });
  assert.equal(stateAt(plan,plan.timemap.toOutput(2)).camera.z,1);
  c.zoom.onlyKinds = ['click']; c.zoom.depth = 2.5; c.zoom.holdAfterClickSec = 3;
  const updated = planRender({ ...run,composition:c });
  assert.ok(stateAt(updated,updated.timemap.toOutput(3)).camera.z > 2.4);
});
