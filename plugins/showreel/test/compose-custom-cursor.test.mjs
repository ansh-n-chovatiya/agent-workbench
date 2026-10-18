import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_COMPOSITION, resolveComposition, validateComposition, compositionPaths, changeComposition } from '../scripts/lib/compose/composition.mjs';
import { resolveImageAssets } from '../scripts/lib/compose/render.mjs';
import { customCursorSpec, loadCustomCursorImages, imageAssetUrl } from '../scripts/lib/compose/custom-cursor.mjs';
import { planRender, stateAt } from '../scripts/lib/compose/plan.mjs';
const composition = () => resolveComposition({ run: { id: 'test' }, cards: { title: { enabled: false } }, cursor: { style: 'custom', custom: { arrow: { image: 'cursors/arrow.png' } } } });
const input = (c) => ({ composition: c, storyboard: { steps: [] }, events: { viewport: { width: 1280, height: 720 }, cursor: [{ t: 0, x: 640, y: 360 }], clicks: [{ t: 1, x: 640, y: 360 }], targets: [], keys: [] }, record: { durationSec: 3, scale: { used: 1 } }, sourceSize: { width: 1280, height: 720 } });
test('custom validation, hotspot defaults, unknown keys, paths and ranges', () => {
  const c = composition();
  assert.equal(validateComposition(c).ok, true);
  assert.deepEqual(c.cursor.custom.arrow.hotspot, { x: 0, y: 0 });
  assert.equal(DEFAULT_COMPOSITION.cursor.style, 'arrow');
  assert.equal(DEFAULT_COMPOSITION.cursor.clickEffect.style, 'none');
  assert.equal(DEFAULT_COMPOSITION.cursor.pressScale, 0.86);
  for (const custom of [null, false, [], {}, { arrow: {} }, { arrow: null }, { arrow: { image: 'a.png', extra: true } },
    { arrow: { image: 'a.png', hotspot: { x: 0, y: 0, extra: 0 } } }, { arrow: { image: 'a.png' }, extra: true },
    { arrow: { image: 'a.png' }, hand: null }, { arrow: { image: 'a.png', hotspot: null } }]) {
    assert.equal(validateComposition(changeComposition(c, 'cursor.custom', custom)).ok, false, JSON.stringify(custom));
  }
  for (const shape of ['arrow', 'hand', 'text']) {
    for (const image of ['../a.png', '/a.png', 'C:\\a.png', 'https://example.com/a.png', 'a%2fb.png', 'a.png?x', 'a//b.png', 'a.jpg', 'a.gif', 'a.txt']) {
      assert.equal(validateComposition(changeComposition(c, `cursor.custom.${shape}`, { image })).ok, false, image);
    }
    for (const image of ['a.png', 'a.SVG', 'cursors/a.webp']) assert.equal(validateComposition(changeComposition(c, `cursor.custom.${shape}`, { image })).ok, true, image);
    for (const axis of ['x', 'y']) for (const value of [0, 1, -0.1, 1.1, null, '0', Infinity]) {
      assert.equal(validateComposition(changeComposition(c, `cursor.custom.${shape}`, { image: 'a.png', hotspot: { x: 0, y: 0, [axis]: value } })).ok, value === 0 || value === 1);
    }
  }
  for (const height of [1, 8, 0, 8.1, null, '3']) assert.equal(validateComposition(changeComposition(c, 'cursor.custom.heightPct', height)).ok, height === 1 || height === 8);
});
test('paths configure custom images before switching style, with set/reset', () => {
  let c = changeComposition(composition(), 'cursor.custom', null);
  c = changeComposition(c, 'cursor.style', 'arrow');
  const paths = compositionPaths(c);
  for (const shape of ['arrow', 'hand', 'text']) for (const field of ['image', 'hotspot.x', 'hotspot.y']) assert.ok(`cursor.custom.${shape}.${field}` in paths);
  assert.ok('cursor.custom.heightPct' in paths);
  c = changeComposition(c, 'cursor.custom', { arrow: { image: 'arrow.png' } });
  c = changeComposition(c, 'cursor.style', 'custom');
  assert.equal(validateComposition(c).ok, true);
  c = changeComposition(c, 'cursor.custom.arrow.hotspot.x', 0.5);
  assert.equal(validateComposition(c).ok, true);
  assert.equal(resolveComposition(changeComposition(c, 'cursor.custom.arrow.hotspot.x', null, { reset: true })).cursor.custom.arrow.hotspot.x, 0);
});
test('omitted shapes use arrow; loading failures warn once and allow vector fallback', async () => {
  const plan = planRender(input(composition())), arrow = { naturalWidth: 32, naturalHeight: 32 };
  assert.equal(customCursorSpec(plan.cursor, 'hand'), plan.cursor.custom.arrow);
  assert.equal(customCursorSpec(plan.cursor, 'text'), plan.cursor.custom.arrow);
  const urls = { 'cursors/arrow.png': 'assets/custom.png' };
  const loaded = await loadCustomCursorImages(plan, urls, async (url) => { assert.equal(url, 'assets/custom.png'); return arrow; });
  assert.equal(loaded.get(plan.cursor.custom.arrow.image), arrow);
  const fail = async () => { throw new Error('decode failed'); };
  assert.equal((await loadCustomCursorImages(plan, urls, fail)).size, 0);
  await loadCustomCursorImages(plan, urls, fail);
  assert.equal(plan.warnings.filter((w) => /vector arrow/.test(w)).length, 1);
  plan.cursor.custom.hand = { image: 'hand.webp', hotspot: { x: 0.4, y: 0.2 } };
  plan.cursor.custom.text = { image: 'text.svg', hotspot: { x: 0.5, y: 0.5 } };
  assert.equal(customCursorSpec(plan.cursor, 'hand').image, 'hand.webp');
  assert.equal(customCursorSpec(plan.cursor, 'text').image, 'text.svg');
  assert.equal(customCursorSpec(plan.cursor, 'arrow').image, 'cursors/arrow.png');
  plan.cursor.style = 'arrow';
  assert.equal((await loadCustomCursorImages(plan, urls, () => assert.fail('must not load'))).size, 0);
  assert.equal(imageAssetUrl('cursors/a b.png'), 'assets/cursors/a%20b.png');
});
test('custom assets enforce containment and formats; missing files add portable plan warnings', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'showreel-cursor-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const project = path.join(dir, 'project'); await mkdir(path.join(project, 'cursors'), { recursive: true });
  await writeFile(path.join(project, 'cursors/arrow.png'), 'png');
  const c = composition();
  assert.equal((await resolveImageAssets(c, project)).get('cursors/arrow.png').type, 'image/png');
  c.cursor.custom.arrow.image = 'missing.png';
  const assets = await resolveImageAssets(c, project);
  assert.equal(assets.size, 0); assert.match(assets.warnings[0], /vector arrow/);
  const plan = planRender({ ...input(c), assetWarnings: assets.warnings });
  assert.ok(plan.warnings.includes(assets.warnings[0])); assert.ok(!JSON.stringify(plan).includes(project));
  for (const image of ['../outside.png', '/outside.png', 'a.jpg']) {
    c.cursor.custom.arrow.image = image;
    await assert.rejects(resolveImageAssets(c, project), /inside the project|Unsupported cursor/);
  }
  await writeFile(path.join(dir, 'outside.png'), 'outside');
  await symlink(path.join(dir, 'outside.png'), path.join(project, 'link.png'));
  c.cursor.custom.arrow.image = 'link.png';
  await assert.rejects(resolveImageAssets(c, project), /inside the project/);
  await writeFile(path.join(project, 'bad.txt'), 'bad');
  await symlink('bad.txt', path.join(project, 'bad.png'));
  c.cursor.custom.arrow.image = 'bad.png';
  await assert.rejects(resolveImageAssets(c, project), /Unsupported cursor/);
});
test('all styles press with no click effect; custom height follows the size rule', () => {
  for (const style of ['arrow', 'pointer', 'dot', 'ring', 'crosshair', 'custom']) {
    const c = composition(); c.cursor.style = style;
    const plan = planRender(input(c));
    assert.equal(stateAt(plan, 0.8).cursor.press, 1);
    assert.ok(Math.abs(stateAt(plan, 1.045).cursor.press - 0.86) < 1e-9, style);
    assert.equal(stateAt(plan, 1.045).ripple, null);
    assert.equal(plan.cursor.sizePx, c.output.height * c.cursor.sizePct / 100);
  }
  const c = composition(); c.cursor.custom.heightPct = 5;
  assert.equal(planRender(input(c)).cursor.sizePx, c.output.height * 0.05);
});
