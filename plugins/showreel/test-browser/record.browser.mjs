import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { startFixtureServer } from '../scripts/lib/fixture-server.mjs';
import { startEncoder } from '../scripts/lib/record/frame-sink.mjs';
import { validateEvents, validateRecord } from '../scripts/lib/record/schemas.mjs';

const directory = await mkdtemp(path.join(os.tmpdir(), 'showreel-record-browser-'));
process.env.SHOWREEL_HOME = path.join(directory, 'home');
const { recordScenario } = await import('../scripts/lib/record/recorder.mjs');
const { benchmarkPipeline, recommendScale } = await import('../scripts/lib/capture-benchmark.mjs');
after(() => rm(directory, { recursive: true, force: true }));

const step = (id, actions, holdMs = 500) => ({
  id, caption: 'Explore the demo', narration: null, zoom: 'auto', highlight: true, holdMs, actions,
});
const click = (selector) => ({ type: 'click', selector });
const go = (url) => ({ type: 'goto', url });
const fill = (selector, value) => ({ type: 'fill', selector, value });
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

async function project(name, url, steps, config = {}) {
  const dir = path.join(process.env.SHOWREEL_HOME, 'projects', name);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'brief.json'), JSON.stringify({ baseURL: url, targetSeconds: 60 }));
  await writeFile(path.join(dir, 'config.json'), JSON.stringify({ baseURL: url, ...config }));
  await writeFile(path.join(dir, 'scenario.json'), JSON.stringify({ version: 1, baseURL: url, steps }));
  return dir;
}

function fixtureSteps(url) {
  return [
    step('s1', [go(`${url}/index.html`)]),
    step('s2', [click('nav a:text-is("Home")')]),
    step('s3', [click('a:text-is("Learn more") >> nth=1'), click('nav a:text-is("Contact")')]),
    step('s4', [fill('input[name="name"]', 'Demo Visitor'), fill('input[name="email"]', ['demo', 'example.test'].join('@'))]),
    step('s5', [go(`${url}/pricing.html`), click('[data-plan="Studio"]')]),
    step('s6', [click('nav a:text-is("Home")')]),
  ];
}

async function inspectVideo(runDir, inspectPixels = false) {
  const server = await startFixtureServer(runDir);
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(server.url);
    return await page.evaluate(async ({ url, inspectPixels }) => {
      const video = document.createElement('video');
      video.muted = true;
      video.src = url;
      document.body.append(video);
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error('Recorded video did not load'));
      });
      let pixel;
      if (inspectPixels) {
        video.currentTime = Math.min(2, video.duration / 2);
        await new Promise((resolve) => { video.onseeked = resolve; });
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        pixel = [...ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data];
      }
      return { width: video.videoWidth, height: video.videoHeight, duration: video.duration, pixel };
    }, { url: `${server.url}/raw.mp4`, inspectPixels });
  } finally {
    try { await browser?.close(); }
    finally { await server.close(); }
  }
}

function validateRun({ events, record }) {
  assert.deepEqual(validateEvents(events), { ok: true, errors: [] });
  assert.deepEqual(validateRecord(record), { ok: true, errors: [] });
  const gaps = events.cursor.slice(1).map((p, i) => (p.t - events.cursor[i].t) * 1000).sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  assert.ok(median >= 15 && median <= 18, `median cursor spacing: ${median} ms`);
  for (const click of events.clicks) {
    const sample = events.cursor.findLast((p) => p.t <= click.t);
    assert.ok(sample && Math.hypot(sample.x - click.x, sample.y - click.y) <= 1.5);
  }
  for (const { box } of events.targets) {
    assert.ok(box.x >= -0.5 && box.y >= -0.5);
    assert.ok(box.x + box.w <= events.viewport.width + 0.5);
    assert.ok(box.y + box.h <= events.viewport.height + 0.5);
  }
}

test('six-step fixture records a valid playable video and blocks writes unless explicitly allowed',
  { timeout: 240000 }, async () => {
    const server = await startFixtureServer();
    try {
      await project('fixture', server.url, fixtureSteps(server.url));
      const recorded = await recordScenario({ name: 'fixture', scale: 1, log() {} });
      validateRun(recorded);
      const { runDir, events, record } = recorded;
      assert.ok((await stat(path.join(runDir, 'raw.mp4'))).size > 1000);
      assert.equal(record.fps.effective >= 20, true, JSON.stringify(record.fps));
      assert.equal(events.steps.length, 6);
      assert.ok(events.blocked.some((event) => event.method === 'POST' && event.url.endsWith('/api/choose')));
      const video = await inspectVideo(runDir);
      assert.deepEqual([video.width, video.height], [1920, 1080]);
      assert.ok(Math.abs(video.duration - record.durationSec) <= 0.6);
      assert.deepEqual(await readJson(path.join(runDir, 'events.json')), events);
      assert.deepEqual(await readJson(path.join(runDir, 'record.json')), record);
      await project('allowed', server.url, fixtureSteps(server.url), { allowWrites: ['/api/choose'] });
      const allowed = await recordScenario({ name: 'allowed', scale: 1, log() {} });
      assert.deepEqual(allowed.events.blocked, []);
    } finally { await server.close(); }
  });

test('pending secrets refuse before capture; supplied secret stays out of output payloads; overlay stays hidden',
  { timeout: 90000 }, async () => {
    const server = await startFixtureServer();
    const previous = process.env.SHOWREEL_SECRET_S3;
    try {
      const url = `${server.url}/dev-overlay.html`;
      const steps = [step('s1', [go(url)]), step('s2', [click('#check')]),
        step('s3', [{ type: 'fill', selector: '#secret', sensitive: true, value: null }])];
      const dir = await project('secret', url, steps);
      delete process.env.SHOWREEL_SECRET_S3;
      await assert.rejects(recordScenario({ name: 'secret', scale: 1, log() {} }),
        /step s3 needs a secret: set SHOWREEL_SECRET_S3/);
      await assert.rejects(stat(path.join(dir, 'runs')), { code: 'ENOENT' });
      process.env.SHOWREEL_SECRET_S3 = 'test-only-private-value';
      const result = await recordScenario({ name: 'secret', scale: 1, log() {} });
      for (const file of await readdir(result.runDir)) {
        assert.equal((await readFile(path.join(result.runDir, file))).includes(
          Buffer.from(process.env.SHOWREEL_SECRET_S3)), false, file);
      }
      const video = await inspectVideo(result.runDir, true);
      assert.ok(!(video.pixel[0] > 220 && video.pixel[1] < 40 && video.pixel[2] < 40),
        'development overlay is absent from the recorded frame');
      await project('overlay-control', url, steps, { hygiene: { hideDevOverlays: false } });
      await assert.rejects(recordScenario({ name: 'overlay-control', scale: 1, log() {} }),
        /rehearsal failed in step s2/);
    } finally {
      if (previous === undefined) delete process.env.SHOWREEL_SECRET_S3;
      else process.env.SHOWREEL_SECRET_S3 = previous;
      await server.close();
    }
  });

test('rehearsal error names the step and selector without making a video', { timeout: 30000 }, async () => {
  const server = await startFixtureServer();
  try {
    const url = `${server.url}/index.html`;
    const dir = await project('bad-selector', url, [step('s1', [go(url)]),
      step('s2', [click('#does-not-exist')])]);
    await assert.rejects(recordScenario({ name: 'bad-selector', scale: 1, log() {} }),
      /rehearsal failed in step s2 \(selector #does-not-exist\)/);
    for (const run of await readdir(path.join(dir, 'runs'))) {
      await assert.rejects(stat(path.join(dir, 'runs', run, 'raw.mp4')), { code: 'ENOENT' });
    }
  } finally { await server.close(); }
});

test('scale 1.33 records the rounded physical dimensions', { timeout: 180000 }, async (t) => {
  const server = await startFixtureServer();
  try {
    const url = `${server.url}/index.html`;
    if (process.env.CI) {
      const benchmark = await benchmarkPipeline({ url, scales: [1, 1.33], seconds: 2 });
      if (recommendScale(benchmark) < 1.33) { t.skip('CI pipeline benchmark cannot hold scale 1.33'); return; }
    }
    await project('scaled', url, [step('s1', [go(url), click('nav a:text-is("Home")')])]);
    const result = await recordScenario({ name: 'scaled', scale: 1.33, log() {} });
    assert.equal(validateEvents(result.events).ok, true);
    assert.equal(validateRecord(result.record).ok, true);
    const video = await inspectVideo(result.runDir);
    assert.deepEqual([video.width, video.height], [Math.round(1920 * 1.33), Math.round(1080 * 1.33)]);
  } finally { await server.close(); }
});

test('encoder accepts sixty paced synthetic JPEG frames with fewer than five drops',
  { timeout: 60000 }, async () => {
    let browser, encoder;
    try {
      browser = await chromium.launch();
      const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
      await page.setContent('<body style="background:teal"><h1>Synthetic frame</h1></body>');
      const jpeg = await page.screenshot({ type: 'jpeg' });
      encoder = await startEncoder({ browser, width: 640, height: 360,
        outFile: path.join(directory, 'synthetic.mp4') });
      for (let i = 0; i < 60; i++) {
        encoder.push(jpeg, 100 + i / 60);
        await new Promise((resolve) => setTimeout(resolve, 1000 / 60));
      }
      const stats = await encoder.finish(101);
      encoder = null;
      assert.ok(stats.dropped < 5, JSON.stringify(stats));
      assert.equal(stats.frames + stats.dropped, 60);
      assert.equal(stats.firstTs, 100);
      assert.ok(stats.bytes > 1000);
    } finally {
      try { await encoder?.finish().catch(() => {}); }
      finally { await browser?.close(); }
    }
  });
