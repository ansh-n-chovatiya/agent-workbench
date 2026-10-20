import test from 'node:test';
import assert from 'node:assert/strict';
import { renameRetry } from '../scripts/lib/fs-retry.mjs';

const fail = (code) => Object.assign(new Error(code), { code });
test('retries a busy rename until it succeeds', async () => {
  let calls = 0;
  await renameRetry('a', 'b', { delayMs: 1, rename: async () => { if (++calls < 4) throw fail('EPERM'); } });
  assert.equal(calls, 4);
});
test('gives up with the original error after the attempts are used', async () => {
  let calls = 0;
  await assert.rejects(renameRetry('a', 'b', { attempts: 3, delayMs: 1, rename: async () => { calls++; throw fail('EBUSY'); } }), /EBUSY/);
  assert.equal(calls, 3);
});
test('other errors are not retried', async () => {
  let calls = 0;
  await assert.rejects(renameRetry('a', 'b', { delayMs: 1, rename: async () => { calls++; throw fail('ENOENT'); } }), /ENOENT/);
  assert.equal(calls, 1);
});
