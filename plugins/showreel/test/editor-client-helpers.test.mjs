import test from 'node:test';
import assert from 'node:assert/strict';
import { timecode, groupSettings, errorsForPath, parseSSE, createSSEParser } from '../editor/helpers.mjs';
import { SETTINGS } from '../scripts/lib/compose/settings-schema.mjs';

test('timecode formats hours and frame boundaries at 30 and 60 fps', () => {
  assert.equal(timecode(0), '00:00:00:00');
  assert.equal(timecode(3661 + 29 / 30), '01:01:01:29');
  assert.equal(timecode(59 + 59 / 60, 60), '00:00:59:59');
  assert.equal(timecode(60, 60), '00:01:00:00');
  assert.equal(timecode(-1), '00:00:00:00');
  assert.equal(timecode(NaN), '00:00:00:00');
});
test('settings grouping/search matches label words without changing schema or hiding advanced entries', () => {
  const before = JSON.stringify(SETTINGS), groups = groupSettings(SETTINGS);
  assert.deepEqual(Object.keys(groups), ['output', 'look', 'cursor', 'zoom', 'captions', 'cards']);
  assert.equal(Object.values(groups).flat().length, SETTINGS.length);
  const found = Object.values(groupSettings(SETTINGS, ' CURSOR   hotspot ')).flat();
  assert.ok(found.length); assert.ok(found.every(s => s.advanced));
  assert.equal(JSON.stringify(SETTINGS), before);
  assert.deepEqual(groupSettings(SETTINGS, 'does-not-exist'), {});
});
test('validator errors attach to the specific setting and related nested controls only', () => {
  const errors = ['composition.json: "frame.background.colors.0" must be a CSS color', 'composition.json: "cards.title" requires text', 'Unrelated failure'];
  assert.equal(errorsForPath(errors, 'frame.background.colors').length, 1);
  assert.equal(errorsForPath(errors, 'cards.title.title').length, 1);
  assert.equal(errorsForPath(errors, 'cards.titleColor').length, 0);
});
test('SSE handles comments, default events, multiline JSON, and arbitrary chunk boundaries', () => {
  assert.equal(parseSSE(': heartbeat\n'), null);
  assert.deepEqual(parseSSE('data: {"ok":true}'), { event: 'message', data: { ok: true } });
  const blocks = ': hi\r\nevent: progress\r\ndata: {"frame":1,\r\ndata: "total":2}\r\n\r\nevent: complete\ndata: {"finalFile":"/renders/a.mp4"}\n\n';
  const events = [], push = createSSEParser(event => events.push(event));
  for (const char of blocks) push(char);
  assert.deepEqual(events, [{ event: 'progress', data: { frame: 1, total: 2 } }, { event: 'complete', data: { finalFile: '/renders/a.mp4' } }]);
  assert.throws(() => parseSSE('data: nope'), SyntaxError);
});
