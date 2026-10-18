import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DEFAULTS, mergeConfig, configTemplate, readConfigFile } from '../scripts/lib/config.mjs';

const cfg = (user = {}) => mergeConfig({ baseURL: 'http://localhost:3000', ...user }, 'sample');
const nested = (key, value) => {
  const [parent, child] = key.split('.');
  return child ? { [parent]: { [child]: value } } : { [parent]: value };
};

test('defaults are deeply frozen and template includes every default', () => {
  for (const value of [DEFAULTS, ...Object.values(DEFAULTS).filter((v) => v && typeof v === 'object')]) assert.ok(Object.isFrozen(value));
  assert.deepEqual(JSON.parse(configTemplate()), { ...structuredClone(DEFAULTS), baseURL: 'http://localhost:3000' });
  const merged = cfg({ viewport: { width: 1280 } });
  assert.deepEqual(merged.viewport, { width: 1280, height: 1080 });
  merged.hygiene.hideScrollbars = false;
  merged.allowWrites.push('/api');
  assert.equal(DEFAULTS.hygiene.hideScrollbars, true);
  assert.deepEqual(DEFAULTS.allowWrites, []);
});

test('unknown keys fail with the exact label, including inherited object keys', () => {
  for (const [user, key] of [[{ colour: 'red' }, 'colour'], [{ viewport: { typo: 1 } }, 'viewport.typo'], [{ hygiene: { typo: true } }, 'hygiene.typo'], [{ constructor: 1 }, 'constructor'], [JSON.parse('{"__proto__":1}'), '__proto__']]) {
    assert.throws(() => cfg(user), { message: `sample: unknown key "${key}"` });
  }
  for (const user of [null, [], 'text', 1]) assert.throws(() => mergeConfig(user, 'sample'), { message: 'sample must contain a JSON object' });
});

test('baseURL is required and must be http(s)', () => {
  for (const value of ['http://localhost:3000', 'https://example.com/path']) assert.equal(cfg({ baseURL: value }).baseURL, value);
  assert.throws(() => mergeConfig({}), /"baseURL" is required/);
  for (const value of [null, '', 1, 'file:///tmp/a', 'not a URL', 'https://', 'http://a b']) assert.throws(() => cfg({ baseURL: value }), /"baseURL"/);
});

test('captureScale and fps accept only their enum values', () => {
  for (const captureScale of ['auto', 1, 1.33, 1.67, 2]) assert.equal(cfg({ captureScale }).captureScale, captureScale);
  for (const captureScale of ['1', 0, 1.5, null, true]) assert.throws(() => cfg({ captureScale }), /"captureScale"/);
  for (const fps of [30, 60]) assert.equal(cfg({ fps }).fps, fps);
  for (const fps of ['60', 0, 24, null, true]) assert.throws(() => cfg({ fps }), /"fps"/);
});

test('numeric settings must be finite and positive', () => {
  for (const key of ['viewport.width', 'viewport.height', 'readyTimeoutMs', 'settleMs']) {
    assert.doesNotThrow(() => cfg(nested(key, 1)));
    for (const value of [0, -1, Infinity, NaN, '1', null]) assert.throws(() => cfg(nested(key, value)), (err) => err.message.includes(`"${key}"`));
  }
});

test('boolean settings reject coercion', () => {
  for (const key of ['allowWebSockets', 'allowDevSockets', 'hygiene.hideDevOverlays', 'hygiene.hideScrollbars', 'hygiene.dismissCookieBanners']) {
    for (const value of [true, false]) assert.doesNotThrow(() => cfg(nested(key, value)));
    for (const value of [null, 0, 'true']) assert.throws(() => cfg(nested(key, value)), (err) => err.message.includes(`"${key}"`));
  }
});

test('nested objects, project names and string arrays validate types', () => {
  for (const key of ['viewport', 'hygiene']) {
    assert.doesNotThrow(() => cfg({ [key]: {} }));
    for (const value of [null, [], 1]) assert.throws(() => cfg({ [key]: value }), /must be an object/);
  }
  for (const project of [null, 'My app']) assert.equal(cfg({ project }).project, project);
  for (const project of ['', ' ', 1, {}, '../x', 'a/b', 'a\\b', '.', '..']) assert.throws(() => cfg({ project }), /"project"/);
  for (const key of ['allowWrites', 'blur', 'stopOn']) {
    assert.doesNotThrow(() => cfg({ [key]: [] }));
    assert.doesNotThrow(() => cfg({ [key]: ['/path'] }));
    for (const value of [null, 'x', {}]) assert.throws(() => cfg({ [key]: value }), /must be an array/);
    for (const value of ['', null, 1]) assert.throws(() => cfg({ [key]: [value] }), new RegExp(key));
  }
  assert.throws(() => cfg({ allowWrites: ['/api [x=y]'] }), /allowWrites entry/);
});

test('readConfigFile validates contents and explains missing or malformed files', async (t) => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'showreel-config-'));
  process.env.SHOWREEL_HOME = home;
  t.after(() => rm(home, { recursive: true, force: true }));
  const file = path.join(home, 'config.json');
  await assert.rejects(readConfigFile(file), /config file not found/);
  await writeFile(file, '{');
  await assert.rejects(readConfigFile(file), /not valid JSON/);
  await writeFile(file, configTemplate());
  assert.deepEqual(await readConfigFile(file), cfg());
  await writeFile(file, '{"baseURL":"file:///tmp"}');
  await assert.rejects(readConfigFile(file), /"baseURL"/);
});
