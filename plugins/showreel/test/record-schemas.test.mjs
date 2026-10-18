import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEvents, validateRecord } from '../scripts/lib/record/schemas.mjs';

const events = () => ({
  version: 1, viewport: { width: 1920, height: 1080 }, scale: 1.33,
  steps: [{ id: 's1', tStart: 0, holdStart: 1, tEnd: 2 }],
  cursor: [{ t: 0, x: -1, y: 20 }, { t: 0.1, x: 20, y: 30 }],
  clicks: [{ t: 0.1, x: 20, y: 30, stepId: 's1', tab: 0 }],
  keys: [{ t: 0.2, stepId: 's1', count: 5 }],
  targets: [{ t: 0.1, stepId: 's1', kind: 'fill', box: { x: -1, y: 10, w: 20, h: 30 }, sensitive: true }],
  moves: [{ t: 0.1, x: 20, y: 30 }],
  blocked: [{ t: 0.5, method: 'POST', url: 'https://example.test/api' }],
  tabs: [{ t: 0, index: 0, url: 'https://example.test' }],
});
const record = () => ({
  version: 1, projectName: 'demo', runId: '20261018-120000', startedAt: '2026-10-18T12:00:00.000Z',
  scale: { requested: 'auto', used: 1.33, reason: 'benchmark' },
  fps: { nominal: 60, effective: 59.5, dropped: 0, maxBacklog: 2 },
  video: { file: 'raw.mp4', width: 2554, height: 1436, durationSec: 2.1, bytes: 12345 },
  durationSec: 2.1, warnings: [],
});

function set(value, key, replacement, remove = false) {
  const parts = key.split('.');
  const last = parts.pop();
  const parent = parts.reduce((node, part) => node[part], value);
  if (remove && !Array.isArray(parent)) delete parent[last];
  else parent[last] = replacement;
}

function invalidFields(validate, fresh, cases) {
  for (const [key, values] of cases) {
    for (const value of [...values, undefined]) {
      const input = fresh();
      set(input, key, value, value === undefined);
      const result = validate(input);
      assert.equal(result.ok, false, `${key}=${value}`);
      assert.ok(result.errors.some((error) => error.includes(`"${key}"`)), `${key}: ${result.errors}`);
    }
  }
}

test('version-1 events and records validate without mutation, including empty event arrays', () => {
  for (const [validate, fresh] of [[validateEvents, events], [validateRecord, record]]) {
    const input = fresh(), original = structuredClone(input);
    assert.deepEqual(validate(input), { ok: true, errors: [] });
    assert.deepEqual(input, original);
    for (const value of [null, [], 1, 'x', {}]) assert.equal(validate(value).ok, false);
  }
  const input = events();
  for (const key of Object.keys(input)) if (Array.isArray(input[key])) input[key] = [];
  assert.deepEqual(validateEvents(input), { ok: true, errors: [] });
});

test('events validate every required field, numeric boundary and nested object', () => {
  const badNumber = [NaN, Infinity, -Infinity, null, '0'];
  invalidFields(validateEvents, events, [
    ['version', [0, 2, '1']], ['scale', [0.99, 2.01, ...badNumber]],
    ['viewport', [null, [], 1]], ['viewport.width', [0, -1, 1.5, ...badNumber]],
    ['viewport.height', [0, ...badNumber]],
    ['steps.0.id', ['', ' ', 1, null]],
    ...['tStart', 'holdStart', 'tEnd'].map((key) => [`steps.0.${key}`, [-1, ...badNumber]]),
    ...['cursor', 'clicks', 'moves'].flatMap((key) => ['x', 'y'].map((axis) => [`${key}.0.${axis}`, badNumber])),
    ['clicks.0.stepId', ['', null, 1]], ['clicks.0.tab', [-1, 0.5, ...badNumber]],
    ['keys.0.stepId', ['', null, 1]], ['keys.0.count', [-1, 0.5, ...badNumber]],
    ['targets.0.stepId', ['', null, 1]], ['targets.0.kind', ['goto', 'wait', null]],
    ['targets.0.sensitive', [null, 0, 'true']], ['targets.0.box', [null, [], 'x']],
    ...['x', 'y'].map((key) => [`targets.0.box.${key}`, badNumber]),
    ...['w', 'h'].map((key) => [`targets.0.box.${key}`, [0, -1, ...badNumber]]),
    ['blocked.0.method', ['', null, 1]], ['blocked.0.url', ['', null, 1]],
    ['tabs.0.index', [-1, 0.5, ...badNumber]], ['tabs.0.url', ['', null, 1]],
  ]);
  for (const key of ['steps', 'cursor', 'clicks', 'keys', 'targets', 'moves', 'blocked', 'tabs']) {
    invalidFields(validateEvents, events, [[key, [null, {}, 'x']], [`${key}.0`, [null, [], 1]]]);
  }
  for (const scale of [1, 2]) {
    const input = events(); input.scale = scale;
    assert.equal(validateEvents(input).ok, true);
  }
  for (const kind of ['click', 'fill', 'press']) {
    const input = events(); input.targets[0].kind = kind;
    assert.equal(validateEvents(input).ok, true);
  }
});

test('all event times must be finite, nonnegative and non-decreasing; ties are valid', () => {
  for (const key of ['cursor', 'clicks', 'keys', 'targets', 'moves', 'blocked', 'tabs']) {
    invalidFields(validateEvents, events, [[`${key}.0.t`, [-1, NaN, Infinity, null, '0']]]);
    const input = events();
    input[key] = [structuredClone(input[key][0]), structuredClone(input[key][0])];
    input[key][0].t = 1; input[key][1].t = 1;
    assert.equal(validateEvents(input).ok, true, key);
    input[key][1].t = 0.9;
    assert.match(validateEvents(input).errors.join(), new RegExp(`${key}.1.t.*non-decreasing`));
  }
  for (const time of ['tStart', 'holdStart', 'tEnd']) {
    const input = events();
    input.steps = [
      { id: 's1', tStart: 1, holdStart: 2, tEnd: 3 },
      { id: 's2', tStart: 1, holdStart: 2, tEnd: 3 },
    ];
    assert.equal(validateEvents(input).ok, true);
    input.steps[1][time] -= 0.1;
    assert.ok(validateEvents(input).errors.some((error) => error.includes(`steps.1.${time}`)));
  }
});

test('step chronology, unique ids and key privacy are enforced and errors accumulate', () => {
  for (const times of [[2, 1, 3], [0, 3, 2]]) {
    const input = events();
    [input.steps[0].tStart, input.steps[0].holdStart, input.steps[0].tEnd] = times;
    assert.match(validateEvents(input).errors.join(), /tStart <= holdStart <= tEnd/);
  }
  const duplicate = events(); duplicate.steps.push({ ...duplicate.steps[0] });
  assert.match(validateEvents(duplicate).errors.join(), /unique/);
  for (const key of ['text', 'value', 'characters']) {
    const input = events(); input.keys[0][key] = 'must never be stored';
    const result = validateEvents(input);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes(`keys.0.${key}`)));
    assert.ok(!result.errors.join().includes('must never be stored'));
  }
  const input = events();
  input.version = 2; input.scale = 3; input.viewport.width = 0;
  input.cursor[0].t = -1; input.targets[0].box.w = 0; input.keys[0].text = 'secret';
  assert.equal(validateEvents(input).errors.length, 6);
});

test('records validate all required fields, counters, ISO time, bounds and warning entries', () => {
  const badNumber = [NaN, Infinity, null, '0'];
  invalidFields(validateRecord, record, [
    ['version', [0, 2, '1']], ['projectName', ['', null, 1]], ['runId', ['', null, 1]],
    ['startedAt', [
      '', 'yesterday', '2026-10-18', '2026-13-18T00:00:00Z',
      '2026-02-29T00:00:00Z', '2026-02-30T00:00:00Z', null, 1,
    ]],
    ['durationSec', [-1, ...badNumber]], ['scale', [null, [], 1]],
    ['scale.requested', [0, 1.5, '1', null]], ['scale.used', [0.99, 2.01, ...badNumber]],
    ['scale.reason', ['', null, 1]], ['fps', [null, [], 1]],
    ['fps.nominal', [0, -1, ...badNumber]], ['fps.effective', [-1, ...badNumber]],
    ...['dropped', 'maxBacklog'].map((key) => [`fps.${key}`, [-1, 0.1, ...badNumber]]),
    ['video', [null, [], 1]], ['video.file', ['', null, 1]],
    ...['width', 'height'].map((key) => [`video.${key}`, [0, -1, 0.1, ...badNumber]]),
    ['video.durationSec', [-1, ...badNumber]], ['video.bytes', [-1, 0.1, ...badNumber]],
    ['warnings', [null, {}, 'x']], ['warnings.0', [null, 1, {}]],
  ]);
  for (const requested of ['auto', 1, 1.33, 1.67, 2]) {
    const input = record(); input.scale.requested = requested;
    assert.equal(validateRecord(input).ok, true);
  }
  for (const startedAt of ['2024-02-29T00:00:00Z', '2026-10-18T12:00:00+05:30']) {
    const input = record(); input.startedAt = startedAt;
    assert.equal(validateRecord(input).ok, true);
  }
  const input = record();
  input.durationSec = 0; input.video.durationSec = 0; input.video.bytes = 0; input.fps.effective = 0;
  input.warnings = [''];
  assert.equal(validateRecord(input).ok, true);
  input.version = 2; input.projectName = ''; input.video.width = 0; input.fps.dropped = -1;
  assert.equal(validateRecord(input).errors.length, 4);
});

 test('optional target cursor accepts CSS strings and rejects nonstrings', () => {
  const input = events();
  for (const cursor of ['pointer', 'text', 'default', 'crosshair', '']) {
    input.targets[0].cursor = cursor; assert.equal(validateEvents(input).ok, true);
  }
  for (const cursor of [null, 1, {}, []]) {
    input.targets[0].cursor = cursor; assert.equal(validateEvents(input).ok, false);
  }
});
