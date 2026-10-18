import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const home = await mkdtemp(path.join(os.tmpdir(), 'showreel-phase2-'));
process.env.SHOWREEL_HOME = home;
after(() => rm(home, { recursive: true, force: true }));
const { buildScenario, validateScenario } = await import('../scripts/lib/scenario.mjs');
const { draftFromGuide } = await import('../scripts/lib/storyboard.mjs');
const guide = JSON.parse(await readFile(new URL('./fixtures/guide.resolved.sample.json', import.meta.url)));
const brief = { baseURL: guide.url };
const build = (g = guide) => buildScenario({ brief, storyboard: draftFromGuide(g), resolvedGuide: g });
const filled = () => {
  const { scenario } = build();
  scenario.steps[4].actions[0].sensitive = false;
  scenario.steps[4].actions[0].value = 'test-only-value';
  return scenario;
};
test('sample builds the full action sequence, preserves context and blocks missing secrets', () => {
  const { scenario, warnings } = build();
  assert.equal(scenario.baseURL, guide.url);
  assert.deepEqual(scenario.steps[0].actions, [
    { type: 'goto', url: guide.url },
    { type: 'click', selector: guide.steps[0].selector, tab: 0, frameUrl: guide.url },
  ]);
  assert.deepEqual(scenario.steps[2].actions, [
    { type: 'fill', selector: 'input[name="name"]', value: 'Sam Example', sensitive: false, tab: 0, frameUrl: 'http://localhost:3000/contact.html' },
    { type: 'wait', ms: 400 },
  ]);
  assert.deepEqual(scenario.steps[4].actions, [
    { type: 'fill', selector: '#password', value: null, sensitive: true, tab: 0, frameUrl: 'http://localhost:3000/contact.html' },
    { type: 'wait', ms: 400 },
  ]);
  assert.deepEqual(scenario.steps.map((s) => s.actions.map((a) => a.type)), [['goto', 'click'], ['click'], ['fill', 'wait'], ['fill', 'wait'], ['fill', 'wait'], ['click']]);
  assert.deepEqual(warnings, []);
  // a sensitive value is never stored: the scenario is valid, and the step is reported as pending until a secret is supplied at run time
  assert.deepEqual(validateScenario(scenario).errors, []);
  assert.deepEqual(validateScenario(scenario).pending, ['step s5 needs a secret at run time']);
  assert.deepEqual(validateScenario(scenario, { secrets: { s5: 'supplied-at-run-time' } }).pending, []);
  assert.equal(validateScenario(filled()).ok, true);
});
test('scenario inserts goto after a non-click URL change and maps press and popup context', () => {
  const g = { steps: [
    { action: 'fill', selector: '#search', value: 'demo', url: 'https://example.com/a' },
    { action: 'press', selector: '#search', key: 'Enter', url: 'https://example.com/b', tab: 1, frameUrl: 'https://example.com/frame' },
    { action: 'click', selector: '#pay', name: 'Confirm purchase', url: 'https://example.com/b' },
    { action: 'click', selector: '#next', name: 'Next', url: 'https://example.com/c' },
  ] };
  const { scenario, warnings } = build(g);
  assert.deepEqual(scenario.steps[0].actions, [{ type: 'goto', url: 'https://example.com/a' }, { type: 'fill', selector: '#search', value: 'demo' }, { type: 'wait', ms: 400 }]);
  assert.deepEqual(scenario.steps[1].actions, [{ type: 'goto', url: 'https://example.com/b' }, { type: 'press', selector: '#search', key: 'Enter', tab: 1, frameUrl: 'https://example.com/frame' }]);
  assert.deepEqual(scenario.steps[3].actions, [{ type: 'click', selector: '#next' }]);
  assert.deepEqual(warnings, ['step s3 clicks "Confirm purchase", which may write data; writes are blocked during recording unless allowed']);
  assert.equal(validateScenario(scenario).ok, true);
  const storyboard = draftFromGuide(g); storyboard.steps[0].guideSteps = [99];
  assert.throws(() => buildScenario({ brief, storyboard, resolvedGuide: g }), /guideSteps/);
});
test('scenario validates required action fields, bounds, optional context and all errors', () => {
  const cases = [
    [{ type: 'goto', url: 'https://example.com' }, 'url', ['file:///tmp', null, '']],
    [{ type: 'click', selector: '#go' }, 'selector', ['', null, 1]],
    [{ type: 'fill', selector: '#name', value: '' }, 'value', [null, 1]],
    [{ type: 'press', selector: '#name', key: 'Enter' }, 'key', ['', null, 1]],
    [{ type: 'wait', ms: 0 }, 'ms', [-1, 60001, NaN, Infinity, '0']],
    [{ type: 'click', selector: '#go', tab: 0 }, 'tab', [-1, 0.5, '0', null]],
    [{ type: 'click', selector: '#go', frameUrl: 'https://example.com/frame' }, 'frameUrl', ['', 1, null]],
    [{ type: 'fill', selector: '#name', value: 'Demo', sensitive: false }, 'sensitive', ['true', 1, null]],
  ];
  for (const [action, key, bad] of cases) {
    const sc = filled(); sc.steps[0].actions = [action];
    assert.equal(validateScenario(sc).ok, true, JSON.stringify(action));
    for (const value of [...bad, undefined]) {
      sc.steps[0].actions = [{ ...action, [key]: value }];
      if (value === undefined) delete sc.steps[0].actions[0][key];
      if (value === undefined && ['tab', 'frameUrl', 'sensitive'].includes(key)) continue;
      assert.ok(validateScenario(sc).errors.some((e) => e.includes(`actions.0.${key}`)), `${key}=${value}`);
    }
  }
  const sc = filled(); sc.steps[0].actions = [{ type: 'wait', ms: 60000 }]; assert.equal(validateScenario(sc).ok, true);
  sc.version = 2; sc.baseURL = ''; sc.steps[0].actions = [{ type: 'click' }, { type: 'invalid' }, null];
  const errors = validateScenario(sc).errors.join('\n');
  for (const key of ['version', 'baseURL', 'selector', 'type', 'actions.2']) assert.ok(errors.includes(key));
  for (const v of [null, {}, { ...sc, steps: [] }]) assert.equal(validateScenario(v).ok, false);
  sc.steps[0].actions = []; assert.match(validateScenario(sc).errors.join(), /actions/);
});
test('a sensitive fill must keep a null value, even when someone writes one in', () => {
  const { scenario } = build();
  scenario.steps[4].actions[0].value = 'test-only-value';
  assert.equal(validateScenario(scenario).ok, false);
  assert.match(validateScenario(scenario).errors.join('\n'), /must be null for a sensitive field/);
});

test('a step without a url continues on the current page, and a hash-only change adds no goto', () => {
  const g = structuredClone(guide);
  g.steps = g.steps.slice(0, 3).map((step, i) => ({ ...step, action: 'click', value: undefined, sensitive: false, url: i === 0 ? guide.url : null }));
  const { scenario } = build(g);
  assert.deepEqual(scenario.steps.flatMap((x) => x.actions.map((a) => a.type)), ['goto', 'click', 'click', 'click']);
  const h = structuredClone(g);
  h.steps[1].url = guide.url + '#projects';   // anchor link: same document
  assert.equal(build(h).scenario.steps.flatMap((x) => x.actions).filter((a) => a.type === 'goto').length, 1);
});

test('the first guide step must carry a url to open', () => {
  const g = structuredClone(guide);
  g.steps = g.steps.slice(0, 2).map((step) => ({ ...step, action: 'click', value: undefined, sensitive: false, url: null }));
  assert.throws(() => build(g), /first guide step needs a url/);
});

test('a null frameUrl is omitted from the action instead of copied as null', () => {
  const g = structuredClone(guide);
  g.steps = g.steps.slice(0, 2).map((step, i) => ({ ...step, action: 'click', value: undefined, sensitive: false, url: i === 0 ? guide.url : null, frameUrl: null }));
  const { scenario } = build(g);
  assert.ok(scenario.steps.flatMap((x) => x.actions).filter((a) => a.type === 'click').every((a) => !Object.hasOwn(a, 'frameUrl')));
  assert.equal(validateScenario(scenario).ok, true);
});

