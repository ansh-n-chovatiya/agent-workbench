import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startFixtureServer } from '../scripts/lib/fixture-server.mjs';

const rawStatus = (url, target) => new Promise((resolve, reject) => {
  const request = http.get(new URL(url), { path: target }, (response) => {
    response.resume();
    response.on('end', () => resolve(response.statusCode));
  });
  request.on('error', reject);
});

test('fixture server serves pages and assets with content types, and missing files return 404', async (t) => {
  const server = await startFixtureServer();
  t.after(server.close);
  for (const file of ['/', '/features.html', '/pricing.html', '/contact.html']) {
    const response = await fetch(server.url + file);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/html/);
    assert.match(await response.text(), /<nav/);
  }
  for (const [file, type] of [['/style.css', 'text/css'], ['/app.js', 'text/javascript']]) {
    const response = await fetch(server.url + file);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type').startsWith(type));
    await response.text();
  }
  const missing = await fetch(server.url + '/missing.html');
  assert.equal(missing.status, 404);
  await missing.text();
});

test('fixture server rejects traversal sent as an unnormalized HTTP request target', async (t) => {
  const server = await startFixtureServer();
  t.after(server.close);
  for (const target of ['/../package.json', '/%2e%2e/package.json', '/..%5cpackage.json', '/%2e%2e%2fpackage.json']) assert.equal(await rawStatus(server.url, target), 403, target);
  assert.equal(await rawStatus(server.url, '/%ZZ'), 400);
});
