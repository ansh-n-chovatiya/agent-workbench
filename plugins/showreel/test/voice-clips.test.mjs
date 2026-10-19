import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clipKey, stepStatus, computeStatuses, setClip, emptyIndex, referencedKeys } from '../scripts/lib/voice/clips.mjs';
import { orderVoices, FALLBACK_VOICES, normalizeVoices } from '../scripts/lib/voice/voices.mjs';

const base = { engine: 'kokoro', modelHash: 'abc', voice: 'af_heart', speed: 1, preparedText: 'Hello there.' };
test('cache keys are stable and sensitive to every field', () => {
  assert.equal(clipKey(base), clipKey({ ...base })); assert.match(clipKey(base), /^[0-9a-f]{64}$/);
  for (const [k, v] of [['engine', 'fake'], ['modelHash', 'x'], ['voice', 'am_adam'], ['speed', 1.1], ['preparedText', 'Hello there!']]) assert.notEqual(clipKey({ ...base, [k]: v }), clipKey(base), k);
});
const entry = (key, stepId, source = 'tts') => ({ key, stepId, text: 't', voice: 'af_heart', speed: 1, engine: 'kokoro', durationSec: 1, sampleRate: 24000, source, createdAt: 'now' });
test('status: fresh, stale, missing, own, file, muted', () => {
  const k = clipKey(base), wanted = { key: k };
  let index = setClip(emptyIndex(), entry(k, 's1'));
  assert.equal(stepStatus({ index, stepId: 's1', wanted }), 'fresh');
  assert.equal(stepStatus({ index, stepId: 's1', wanted: { key: 'other' } }), 'stale');
  assert.equal(stepStatus({ index, stepId: 's2', wanted }), 'missing');
  assert.equal(stepStatus({ index, stepId: 's1', wanted, muted: ['s1'] }), 'muted');
  assert.equal(stepStatus({ index, stepId: 's1', wanted: null }), 'stale');
  index = setClip(index, entry('own1', 's3', 'own')); index = setClip(index, entry('file1', 's4', 'file'));
  assert.equal(stepStatus({ index, stepId: 's3', wanted }), 'own'); assert.equal(stepStatus({ index, stepId: 's4', wanted }), 'file');
  assert.deepEqual([...referencedKeys(index)].sort(), ['file1', 'own1', k].sort());
});
test('computeStatuses reports none for steps without narration or clip', () => {
  const index = setClip(emptyIndex(), entry('k1', 's1'));
  const rows = computeStatuses({ index, steps: [{ id: 's1', narration: 'x' }, { id: 's2', narration: null }, { id: 's3', narration: 'y' }], wantedByStep: { s1: { key: 'k1' }, s3: { key: 'k3' } } });
  assert.deepEqual(rows.map((r) => r.status), ['fresh', 'none', 'missing']);
});
test('voice ordering puts American English first, then British, default first', () => {
  const ids = orderVoices(FALLBACK_VOICES.slice().reverse()).map((v) => v.id);
  assert.equal(ids[0], 'af_heart'); assert.ok(ids.indexOf('am_adam') < ids.indexOf('bf_alice'));
  assert.equal(normalizeVoices({ ef_x: { name: 'X', language: 'es', gender: 'Female', overallGrade: 'B' }, af_heart: { name: 'Heart', language: 'en-us' } })[0].id, 'af_heart');
});
