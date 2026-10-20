import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import os from 'node:os';
import path from 'node:path';
const home = await mkdtemp(path.join(os.tmpdir(), 'showreel-upload-')); process.env.SHOWREEL_HOME = home;
const { startEditorServer } = await import('../scripts/lib/editor/server.mjs');
const { resolveComposition } = await import('../scripts/lib/compose/composition.mjs');
const { imageFileName, looksLikeImage, handleUploadApi, IMAGE_EXTENSIONS, MAX_IMAGE_BYTES } = await import('../scripts/lib/editor/upload-api.mjs');
test.after(() => rm(home, { recursive: true, force: true }));

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR4nGP4z8DwHwyBNAMDiAYAVqoH/4hVzYwAAAAASUVORK5CYII=', 'base64');
test('image names are confined, unique and limited to the whitelist', () => {
  assert.deepEqual(IMAGE_EXTENSIONS, ['png', 'jpg', 'jpeg', 'webp', 'svg']); assert.equal(MAX_IMAGE_BYTES, 10 * 1024 * 1024);
  assert.equal(imageFileName('My Backdrop.PNG', 'abcd1234'), 'my-backdrop-abcd1234.png');
  assert.equal(imageFileName('../../etc/passwd.svg', 'abcd1234'), 'passwd-abcd1234.svg');
  assert.equal(imageFileName('C:\\pics\\Ünïcode café.webp', 'abcd1234'), 'unicode-cafe-abcd1234.webp');
  assert.equal(imageFileName('.jpg', 'abcd1234'), 'image-abcd1234.jpg');
  assert.equal(imageFileName('x'.repeat(100) + '.jpeg', 'ff').length, 'x'.repeat(40).length + '-ff.jpeg'.length);
  for (const bad of ['photo.gif', 'photo', 'photo.png.exe', '', null, 'a.PNG\u0000.exe']) assert.throws(() => imageFileName(bad), /PNG, JPG, WebP or SVG/, String(bad));
  assert.match(imageFileName('a.png'), /^a-[0-9a-f]{8}\.png$/);
});
test('byte sniffing accepts real images and rejects renamed files and scripted SVGs', () => {
  assert.ok(looksLikeImage(PNG, 'png'));
  assert.ok(looksLikeImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]), 'jpg')); assert.ok(looksLikeImage(Buffer.from([0xff, 0xd8, 0xff, 0xe1]), 'jpeg'));
  assert.ok(looksLikeImage(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]), 'webp'));
  assert.ok(looksLikeImage(Buffer.from('<?xml version="1.0"?>\n<!-- hi -->\n<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 'svg'));
  assert.ok(looksLikeImage(Buffer.from('\uFEFF<svg viewBox="0 0 1 1"/>'), 'svg'));
  assert.ok(!looksLikeImage(Buffer.from('<svg><script>alert(1)</script></svg>'), 'svg'));
  assert.ok(!looksLikeImage(Buffer.from('<svg onload="x()"/>'), 'svg'));
  assert.ok(!looksLikeImage(Buffer.from('<svg><a href="javascript:x"/></svg>'), 'svg'));
  assert.ok(!looksLikeImage(Buffer.from('<html><svg/></html>'), 'svg'));
  assert.ok(!looksLikeImage(PNG, 'jpg')); assert.ok(!looksLikeImage(Buffer.from('GIF89a'), 'png')); assert.ok(!looksLikeImage(Buffer.alloc(0), 'png')); assert.ok(!looksLikeImage(PNG, 'gif'));
});
test('the handler ignores other routes and enforces the size cap before touching disk', async () => {
  const dir = path.join(home, 'projects', 'cap'); await mkdir(dir, { recursive: true });
  const fake = (url, chunks, method = 'POST') => Object.assign(Readable.from(chunks), { url, method, headers: {} });
  const sent = []; const send = (status, data) => sent.push({ status, data });
  assert.equal(await handleUploadApi({ request: fake('/api/upload/image?name=a.png', [PNG]), route: '/api/upload/image', method: 'GET', send, dir }), false);
  assert.equal(await handleUploadApi({ request: fake('/api/other', [PNG]), route: '/api/other', method: 'POST', send, dir }), false);
  await assert.rejects(handleUploadApi({ request: fake('/api/upload/image?name=a.png', [Buffer.alloc(600), Buffer.alloc(600)]), route: '/api/upload/image', method: 'POST', send, dir, limit: 1000 }), e => e.statusCode === 413);
  await assert.rejects(handleUploadApi({ request: fake('/api/upload/image?name=a.png', []), route: '/api/upload/image', method: 'POST', send, dir }), /empty/);
  await assert.rejects(handleUploadApi({ request: fake('/api/upload/image?name=a.png', [Buffer.from('not a png')]), route: '/api/upload/image', method: 'POST', send, dir }), /not a PNG/);
  await assert.rejects(handleUploadApi({ request: fake('/api/upload/image', [PNG]), route: '/api/upload/image', method: 'POST', send, dir }), /PNG, JPG/);
  assert.equal(sent.length, 0);
  await assert.rejects(readdir(path.join(dir, 'assets')), { code: 'ENOENT' });
});
test('authenticated upload writes atomically into <project>/assets and the file serves back as a media asset', async () => {
  const dir = path.join(home, 'projects', 'demo'), run = path.join(dir, 'runs', 'run1'); await mkdir(run, { recursive: true });
  for (const [file, data] of Object.entries({ 'brief.json': {}, 'storyboard.json': { steps: [] }, 'composition.json': resolveComposition({ run: { id: 'run1' }, cards: { title: { enabled: false } } }),
    'runs/run1/events.json': { viewport: { width: 100, height: 100 }, cursor: [], clicks: [], steps: [], targets: [], keys: [] }, 'runs/run1/record.json': { runId: 'run1', durationSec: 5, scale: { used: 1 } } })) await writeFile(path.join(dir, file), JSON.stringify(data));
  await writeFile(path.join(run, 'raw.mp4'), '0123');
  const server = await startEditorServer({ name: 'demo', runId: 'run1' });
  try {
    const base = `http://127.0.0.1:${server.port}`, headers = { Authorization: `Bearer ${server.token}` };
    const upload = (name, body, extra = {}) => fetch(`${base}/api/upload/image?name=${encodeURIComponent(name)}`, { method: 'POST', body, headers: { ...headers, 'content-type': 'application/octet-stream', ...extra } });
    assert.equal((await fetch(`${base}/api/upload/image?name=a.png`, { method: 'POST', body: PNG })).status, 401);
    assert.equal((await upload('a.png', PNG, { Origin: 'https://example.com' })).status, 403);
    const ok = await upload('../My Backdrop.png', PNG); assert.equal(ok.status, 200);
    const { file, bytes } = await ok.json();
    assert.match(file, /^assets\/my-backdrop-[0-9a-f]{8}\.png$/); assert.equal(bytes, PNG.length);
    assert.deepEqual(await readFile(path.join(dir, file)), PNG);
    assert.ok(!(await readdir(path.join(dir, 'assets'))).some(f => f.endsWith('.tmp')), 'no temp files left behind');
    const served = await fetch(`${base}/media/asset/${file}`, { headers }); assert.equal(served.status, 200); assert.equal(served.headers.get('content-type'), 'image/png');
    assert.equal((await upload('a.gif', PNG)).status, 400);
    assert.equal((await upload('a.png', Buffer.from('plain text'))).status, 400);
    assert.equal((await upload('a.svg', Buffer.from('<svg><script>1</script></svg>'))).status, 400);
    const svg = await upload('logo.svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')); assert.equal(svg.status, 200);
    // The composition accepts the uploaded path and the server validates it as an image inside the project.
    const composition = resolveComposition({ run: { id: 'run1' }, cards: { title: { enabled: false } }, frame: { background: { type: 'image', image: file } } });
    const saved = await fetch(`${base}/api/composition`, { method: 'PUT', body: JSON.stringify(composition), headers: { ...headers, 'content-type': 'application/json' } });
    assert.equal(saved.status, 200, await saved.text());
    // A symlinked assets folder pointing outside the project is refused.
    const outside = path.join(home, 'outside'); await mkdir(outside); const evil = path.join(home, 'projects', 'demo2'); await mkdir(path.join(evil, 'runs', 'run1'), { recursive: true });
    await symlink(outside, path.join(evil, 'assets'));
    const sent = [];
    await assert.rejects(handleUploadApi({ request: Object.assign(Readable.from([PNG]), { url: '/api/upload/image?name=a.png', method: 'POST', headers: {} }), route: '/api/upload/image', method: 'POST', send: (s, d) => sent.push([s, d]), dir: evil }), /inside the project/);
    assert.deepEqual(await readdir(outside), []);
  } finally { await server.close(); }
});
