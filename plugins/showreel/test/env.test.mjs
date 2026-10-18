import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { run, which, slug, isWindows, PLUGIN_ROOT, log, warn } from '../scripts/lib/env.mjs';

test('process helpers preserve output, input, environment and exit status', async () => {
  const result = await run(process.execPath, ['-e', 'process.stdin.pipe(process.stdout); console.error(process.env.SHOWREEL_TEST); process.exitCode = 3'], { input: 'hello', cwd: PLUGIN_ROOT, env: { ...process.env, SHOWREEL_TEST: 'test-value' } });
  assert.deepEqual(result, { code: 3, stdout: 'hello', stderr: 'test-value\n' });
  await assert.rejects(run('showreel-missing-binary-123'), { code: 'ENOENT' });
});

test('which finds node and returns null for an absent executable', async () => {
  assert.ok(await which('node'));
  assert.equal(await which('showreel-missing-binary-123'), null);
  assert.equal(isWindows, process.platform === 'win32');
  assert.equal(PLUGIN_ROOT, path.resolve(import.meta.dirname, '..'));
});

test('slug keeps project names portable', () => {
  assert.equal(slug(' Café / Demo! '), 'cafe-demo');
  assert.equal(slug('!!!'), 'demo');
  assert.equal(typeof log, 'function');
  assert.equal(typeof warn, 'function');
});
