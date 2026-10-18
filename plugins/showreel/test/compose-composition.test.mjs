import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BRIEF } from '../scripts/lib/brief.mjs';
import { DEFAULT_COMPOSITION, buildComposition, validateComposition } from '../scripts/lib/compose/composition.mjs';
const fresh = () => ({ brief: { ...structuredClone(DEFAULT_BRIEF), topic: 'Report walkthrough' }, storyboard: { steps: [] }, events: { viewport: { width: 1280, height: 720 }, targets: [{ t: 1, stepId: 's1', kind: 'click', sensitive: false, box: { x: 800, y: 400, w: 100, h: 40 } }], clicks: [{ t: 1.3, stepId: 's1', x: 850, y: 420 }], keys: [] }, record: { runId: '20261018-120000', durationSec: 10 } });
test('build uses real brief and record fields, deep merges overrides, suggests regions and leaves inputs untouched', () => {
  const input = fresh(), before = structuredClone(input), c = buildComposition(input);
  assert.deepEqual(input, before); assert.equal(c.run.id, input.record.runId);
  assert.equal(c.cards.title.title, input.brief.topic); assert.equal(c.cards.title.duration, 2.2);
  assert.equal(c.cards.outro.text, 'Thank you'); assert.equal(c.zoom.regions[0].source, 'auto');
  assert.deepEqual(validateComposition(c), { ok: true, errors: [], warnings: [] });
  for (const [depth, expected] of [['subtle', 1.35], ['medium', 1.7], ['strong', 2.1], [2.5, 2.5]]) {
    const modified = buildComposition({ ...input, overrides: { zoom: { depth }, output: { fps: 30 } } });
    assert.equal(modified.zoom.regions[0].depth, expected); assert.equal(modified.output.width, 1920);
  }
  const edits = { trims: [{ start: 5, end: 6 }] };
  const result = buildComposition({ ...input, edits, overrides: { zoom: { autoSuggest: false }, cards: { title: { enabled: false } } } });
  assert.equal(result.zoom.regions.length, 0); assert.deepEqual(result.edits.trims, edits.trims);
  result.edits.trims[0].start = 4; assert.equal(edits.trims[0].start, 5);
  const manual = { ...c.zoom.regions[0], source: 'manual' };
  assert.deepEqual(buildComposition({ ...input, overrides: { zoom: { regions: [manual] } } }).zoom.regions, [manual]);
  assert.ok(Object.isFrozen(DEFAULT_COMPOSITION.zoom.regions));
  assert.throws(() => { DEFAULT_COMPOSITION.cards.title.duration = 4; });
});
test('validation collects errors, rejects unknown keys at all depths and handles malformed objects', () => {
  for (const value of [null, [], 1, {}, { cards: { title: { enabled: true, title: 2 } } }]) {
    assert.equal(validateComposition(value).ok, false);
  }
  const c = buildComposition(fresh());
  c.unknown = true; c.output.extra = true; c.output.width = 0; c.output.height = NaN;
  c.cursor.visible = 'yes'; c.cursor.sizePct = 100; c.frame.paddingPct = 90;
  c.theme = 'bold'; c.zoom.depth = 'huge'; c.cards.title.duration = -1;
  c.edits.trims = [{ start: 1, end: 2, extra: true }];
  const errors = validateComposition(c).errors.join('\n');
  for (const field of ['unknown', 'output.extra', 'output.width', 'output.height', 'cursor.visible', 'cursor.sizePct', 'frame.paddingPct', 'theme', 'zoom.depth', 'cards.title.duration', 'edits.trims.0.extra']) assert.ok(errors.includes(field), field);
  assert.throws(() => buildComposition({ ...fresh(), overrides: { output: { fps: 24 } } }), /output.fps/);
  assert.throws(() => buildComposition({ ...fresh(), edits: { trims: [{ start: 9, end: 11 }] } }), /trims\[0\]/);
  assert.throws(() => buildComposition({ ...fresh(), overrides: JSON.parse('{"__proto__":{"extra":true}}') }), /unknown key/);
});
test('boundary values validate and invalid scalar ranges fail independently', () => {
  const cases = [
    ['output.width', [2, 7680], [1, 7681, 2.5]], ['output.height', [2, 4320], [1, 4321]],
    ['frame.paddingPct', [0, 25], [-1, 26]], ['cursor.sizePct', [0.1, 10], [0, 11]],
    ['zoom.depth', [1.05, 4], [1, 4.1]], ['cards.fade', [0, 5], [-1, 6]],
    ['cards.title.duration', [0, 30], [-1, 31]], ['cards.outro.duration', [0, 30], [-1, 31]],
  ];
  for (const [path, good, bad] of cases) for (const value of [...good, ...bad, null, Infinity, '1']) {
    const c = buildComposition(fresh()), keys = path.split('.'), last = keys.pop();
    keys.reduce((node, key) => node[key], c)[last] = value;
    assert.equal(validateComposition(c).ok, good.includes(value), `${path}=${value}`);
  }
});
