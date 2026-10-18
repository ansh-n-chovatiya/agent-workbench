import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isWriteAllowed, installWriteGuard } from '../scripts/lib/record/write-guard.mjs';

const request = (overrides = {}) => ({
  method: 'POST', url: 'https://example.test/api/save?x=1', headers: {}, ...overrides,
});

test('safe methods are case insensitive; all other methods need matching rules', () => {
  for (const method of ['GET', 'get', 'Head', 'oPtIoNs']) {
    assert.equal(isWriteAllowed(request({ method }), []), true);
  }
  for (const method of ['POST', 'post', 'PUT', 'DELETE', 'PATCH', 'CONNECT', 'TRACE']) {
    assert.equal(isWriteAllowed(request({ method }), []), false);
    assert.equal(isWriteAllowed(request({ method }), ['/api/save']), true);
  }
});

test('plain targets use substring matches and regex targets apply to the full URL', () => {
  const cases = [
    ['/api/save', true], ['example.test', true], ['save?x=1', true],
    ['/api/other', false], ['/API/save', false],
    ['re:^https://example\\.test/api/save\\?x=1$', true],
    ['re:^/api/save', false], ['re:save\\?x=\\d', true],
  ];
  for (const [rule, expected] of cases) assert.equal(isWriteAllowed(request(), [rule]), expected, rule);
  assert.equal(isWriteAllowed(request(), ['/wrong', '/api/save']), true);
  assert.equal(isWriteAllowed(request(), ['re:other$', '/wrong']), false);
});

test('header conditions match exact values and case insensitive header names for every target form', () => {
  for (const target of ['/api/save', 'example.test', 're:/api/save\\?']) {
    for (const [suffix, name, value] of [
      ['Next-Action=abc123', 'NeXt-AcTiOn', 'abc123'],
      ['header:X-Token=a=b c', 'x-tOkEn', 'a=b c'],
      ['header:content-type=application/json', 'Content-Type', 'application/json'],
    ]) {
      const rule = `${target} [${suffix}]`;
      assert.equal(isWriteAllowed(request({ headers: { [name]: value } }), [rule]), true, rule);
      for (const headers of [{}, { [name]: value.toUpperCase() }, { [name]: value + ' ' }]) {
        assert.equal(isWriteAllowed(request({ headers }), [rule]), false, rule);
      }
      assert.equal(isWriteAllowed(request({ url: 'https://other.test/no', headers: { [name]: value } }), [rule]), false);
    }
  }
  assert.equal(isWriteAllowed(request({ headers: { 'next-action': 'abc' } }), [
    '/api/save [Next-Action-Name=abc]',
    're:.* [Next-Action-Name=abc]',
  ]), false);
  assert.equal(isWriteAllowed(request({ headers: { 'next-action': 'abc' } }), [
    '/api/save [Next-Action-Name=abc]', '/api/save',
  ]), true);
});

function fakeContext({ webSockets = true } = {}) {
  const handlers = {};
  const context = {
    async route(pattern, handler) { assert.equal(pattern, '**/*'); handlers.http = handler; },
  };
  if (webSockets) context.routeWebSocket = async (pattern, handler) => {
    assert.equal(pattern, '**/*'); handlers.socket = handler;
  };
  async function http(info) {
    const calls = [];
    await handlers.http({
      request: () => ({ method: () => info.method, url: () => info.url, headers: () => info.headers }),
      continue: async () => calls.push('continue'),
      abort: async (reason) => calls.push(reason),
    });
    return calls;
  }
  async function socket(url) {
    const calls = [];
    await handlers.socket({
      url: () => url, connectToServer: () => calls.push('connect'), close: () => calls.push('close'),
    });
    return calls;
  }
  return { context, http, socket };
}

test('installation continues allowed requests, aborts writes and reports defensive snapshots', async () => {
  const fake = fakeContext({ webSockets: false });
  const seen = [];
  const guard = await installWriteGuard(fake.context, { allowWrites: ['/api/save'], onBlocked: (e) => seen.push(e) });
  assert.deepEqual(await fake.http(request()), ['continue']);
  assert.deepEqual(await fake.http(request({ method: 'GET', url: 'https://other.test' })), ['continue']);
  assert.deepEqual(await fake.http(request({ url: 'https://example.test/blocked' })), ['blockedbyclient']);
  assert.deepEqual(await fake.http(request({ method: 'DELETE', url: 'https://example.test/other' })), ['blockedbyclient']);
  const blocked = guard.blocked();
  assert.deepEqual(blocked, seen);
  assert.equal(blocked.length, 2);
  assert.equal(blocked[0].method, 'POST');
  assert.equal(blocked[0].url, 'https://example.test/blocked');
  assert.ok(Number.isFinite(blocked[0].t) && blocked[0].t >= 0);
  assert.ok(blocked[1].t >= blocked[0].t);
  blocked[0].url = 'changed';
  blocked.pop();
  seen[0].url = 'changed again';
  assert.equal(guard.blocked()[0].url, 'https://example.test/blocked');
  assert.equal(guard.blocked().length, 2);
});

test('WebSocket defaults allow only local dev paths; options independently control bypasses', async () => {
  const dev = ['localhost', '127.0.0.1'].flatMap((host) =>
    ['/_next/webpack-hmr', '/sockjs-node', '/__vite_hmr', '/ws'].map((p) => `ws://${host}:3000${p}?a=1`));
  const other = [
    'wss://example.test/ws', 'ws://localhost/api', 'ws://127.0.0.1/?path=/ws',
    'ws://localhost.evil.test/ws', 'ws://[::1]/ws', 'invalid',
  ];
  for (const options of [{}, { allowDevSockets: false }, { allowWebSockets: true, allowDevSockets: false }]) {
    const fake = fakeContext();
    const guard = await installWriteGuard(fake.context, { allowWrites: [], ...options });
    let count = 0;
    for (const url of [...dev, ...other]) {
      const allowed = options.allowWebSockets || (options.allowDevSockets !== false && dev.includes(url));
      assert.deepEqual(await fake.socket(url), [allowed ? 'connect' : 'close'], url);
      if (!allowed) count++;
    }
    assert.equal(guard.blocked().length, count);
    assert.ok(guard.blocked().every((e) => e.method === 'WEBSOCKET' && e.t >= 0));
  }
  const fake = fakeContext();
  await installWriteGuard(fake.context, { allowWrites: [] });
  assert.deepEqual(await fake.socket(dev[0]), ['connect']);
  assert.deepEqual(await fake.socket(other[0]), ['close']);
});
