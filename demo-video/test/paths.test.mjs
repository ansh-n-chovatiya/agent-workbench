import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// HOME_DIR is read at import: point it at a temp folder first so no test
// touches the real ~/.demo-video.
const home = await mkdtemp(path.join(tmpdir(), 'demo-home-'));
process.env.DEMO_VIDEO_HOME = home;
delete process.env.DEMO_VIDEO_CONFIG;
delete process.env.DEMO_VIDEO_DELIVER;
const { HOME_DIR, resolveProject, deliverFolder, laptopViewport } = await import('../scripts/lib/paths.mjs');
const { mergeConfig } = await import('../scripts/lib/config.mjs');
const { SKILL_ROOT } = await import('../scripts/lib/env.mjs');
const { laptopRect } = await import('../scripts/lib/compose.mjs');

const cfg = (file, baseURL) => writeFile(file, JSON.stringify({ baseURL }));

test('config lookup: --config beats DEMO_VIDEO_CONFIG beats the project file beats the home file (else the wrong app is recorded)', async (t) => {
  const cwd = path.join(await mkdtemp(path.join(tmpdir(), 'demo-proj-')), 'shop');
  await mkdir(cwd);
  t.after(() => { delete process.env.DEMO_VIDEO_CONFIG; return rm(path.dirname(cwd), { recursive: true, force: true }); });
  const found = async () => (await resolveProject({ cwd })).config.baseURL;

  await assert.rejects(found(), (err) => {
    assert.ok(!err.message.includes('\n'));
    assert.ok(err.message.includes(path.join(cwd, 'demo.config.json')) && err.message.includes(path.join(HOME_DIR, 'configs', 'shop.json')), err.message);
    return true;
  });
  await mkdir(path.join(HOME_DIR, 'configs'), { recursive: true });
  await cfg(path.join(HOME_DIR, 'configs', 'shop.json'), 'http://home');
  const p = await resolveProject({ cwd });
  assert.equal(p.config.baseURL, 'http://home');
  assert.equal(p.project, 'shop');
  assert.equal(p.runsDir, path.join(HOME_DIR, 'runs', 'shop'));
  assert.equal(p.authFile, path.join(HOME_DIR, 'auth', 'shop.json'));
  await cfg(path.join(cwd, 'demo.config.json'), 'http://local');
  assert.equal(await found(), 'http://local');
  await cfg(path.join(cwd, 'env.json'), 'http://env');
  process.env.DEMO_VIDEO_CONFIG = path.join(cwd, 'env.json');
  assert.equal(await found(), 'http://env');
  await cfg(path.join(cwd, 'flag.json'), 'http://flag');
  assert.equal((await resolveProject({ cwd, configFlag: 'flag.json' })).config.baseURL, 'http://flag');
});

test('layout: band mode shrinks the recorded viewport by the band (else captions cover the UI)', () => {
  const at = (mode) => laptopViewport(mergeConfig({ baseURL: 'http://x', caption: { mode, bandHeight: 120 } }));
  assert.deepEqual(at('band'), { width: 1920, height: 960, band: 120 });
  assert.deepEqual(at('overlay'), { width: 1920, height: 1080, band: 0 });
  assert.deepEqual(at('off'), { width: 1920, height: 1080, band: 0 });
  assert.throws(() => mergeConfig({ baseURL: 'http://x', caption: { mode: 'bottom' } }), /caption.mode/);
  // A smaller laptop gives up the same share of its height, keeping the 1920x960
  // shape; subtracting 120 px outright made the clip too wide and cropped its sides.
  const small = laptopViewport(mergeConfig({ baseURL: 'http://x', laptop: { width: 1280, height: 720 }, caption: { mode: 'band', bandHeight: 120 } }));
  assert.equal(small.width / small.height, 1920 / 960);
});

test('layout: a non-16:9 laptop is recorded in the video area\'s shape, so composing it crops nothing (else 1440x900 or 1280x1024 lose rows of UI)', () => {
  for (const [width, height] of [[1440, 900], [1280, 1024]]) {
    for (const mode of ['band', 'overlay']) {
      const v = laptopViewport(mergeConfig({ baseURL: 'http://x', laptop: { width, height }, caption: { mode, bandHeight: 120 } }));
      assert.equal(v.width / v.height, 1920 / (1080 - v.band), `${width}x${height} ${mode}: ${v.width}x${v.height}`);
      const r = laptopRect({ w: v.width, h: v.height }, v.band);
      assert.ok(Math.abs(r.h - (1080 - v.band)) < 1e-9 && Math.abs(r.w - 1920) < 1e-9, `${width}x${height} ${mode} crops: ${JSON.stringify(r)}`);
    }
  }
});

test('deliver: one folder per render named <slug>-<YYYY-MM-DD-HHMM> under the deliver root', () => {
  const when = new Date(2026, 8, 5, 7, 3);
  assert.equal(deliverFolder({ deliverDir: '/tmp/out' }, 'checkout-flow', when), '/tmp/out/checkout-flow-2026-09-05-0703');
  process.env.DEMO_VIDEO_DELIVER = '/tmp/redirect';
  try { assert.equal(deliverFolder({ deliverDir: '/tmp/out' }, 'a', when), '/tmp/redirect/a-2026-09-05-0703'); }
  finally { delete process.env.DEMO_VIDEO_DELIVER; }
});

test('init: writes into the home configs folder, never into the project unless --here', async (t) => {
  const cwd = path.join(await mkdtemp(path.join(tmpdir(), 'demo-init-')), 'app');
  await mkdir(cwd);
  t.after(() => rm(path.dirname(cwd), { recursive: true, force: true }));
  const cli = (...args) => spawnSync(process.execPath, [path.join(SKILL_ROOT, 'scripts', 'demo.mjs'), ...args], { cwd, encoding: 'utf8', env: { ...process.env, DEMO_VIDEO_HOME: home } });

  const r = cli('init');
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.deepEqual(await readdir(cwd), []);
  assert.match(r.stdout, new RegExp(`Created ${path.join(home, 'configs', 'app.json').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.equal(cli('init', '--here').status, 0);
  assert.deepEqual(await readdir(cwd), ['demo.config.json']);
});
