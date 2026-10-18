import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const directory = await mkdtemp(path.join(os.tmpdir(), 'showreel-render-browser-'));
process.env.SHOWREEL_HOME = path.join(directory, 'home');
const { syntheticRun, inspectionPage } = await import('./helpers/synthetic-run.mjs');
const { renderRun } = await import('../scripts/lib/compose/render.mjs');
const { buildComposition } = await import('../scripts/lib/compose/composition.mjs');
const { planRender, stateAt } = await import('../scripts/lib/compose/plan.mjs');
const serializable = (value) => JSON.parse(JSON.stringify(value));
const center = (box) => ({ x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 });
function point(plan, t, position) {
  const { camera: c } = stateAt(plan, t), f = plan.layout.frame;
  const w = plan.sourceSize.width / plan.scale / c.z, h = plan.sourceSize.height / plan.scale / c.z;
  return { x: f.x + (position.x - c.cx + w / 2) * f.w / w,
    y: f.y + (position.y - c.cy + h / 2) * f.h / h };
}
const near = (actual, expected, tolerance, label) => assert.ok(Math.abs(actual - expected) <= tolerance,
  `${label}: ${actual}, expected ${expected} ± ${tolerance}`);

test('synthetic offline compositor and exporter', { timeout: 300000 }, async (t) => {
  let browser, counter = 0;
  const sessions = new Set();
  try {
    browser = await chromium.launch({ headless: true });
    const run = await syntheticRun(browser);
    const baseline = await renderRun({ name: run.name, log() {} });
    const plan = baseline.plan;
    const sessionFor = async (rawFile) => {
      const file = path.join(directory, `transport-${counter++}.mp4`);
      const session = await inspectionPage(browser, rawFile, file);
      session.file = file; sessions.add(session); return session;
    };
    const inspect = async (file, timestamps, probes = []) => {
      const session = await sessionFor(file);
      try {
        return await session.page.evaluate(({ url, timestamps, probes }) => window.inspectFrames(url, timestamps, probes),
          { url: session.url, timestamps, probes });
      } finally { sessions.delete(session); await session.close(); }
    };
    const render = async (composition) => {
      const nextPlan = planRender({ ...run, composition, sourceSize: { width: 1280, height: 720 } });
      const session = await sessionFor(run.rawFile);
      try {
        const result = await session.page.evaluate((plan) => window.renderComposition(plan, { audio: null }), serializable(nextPlan));
        await session.server.finish();
        const png = await session.page.evaluate((plan) => window.renderStill(plan, 0.3), serializable(nextPlan));
        return { plan: nextPlan, result, png, file: session.file };
      } finally { sessions.delete(session); await session.close(); }
    };
    const composition = buildComposition(run);
    await t.test('codec, size, cadence, duration and caption sidecars', async () => {
      const info = await inspect(baseline.finalFile, [0.3]);
      assert.equal(info.codec, baseline.codec); assert.ok(['avc', 'vp9'].includes(info.codec));
      assert.deepEqual([info.width, info.height], [1920, 1080]); near(info.fps, 60, 0.1, 'fps');
      near(info.duration, plan.timemap.outputDuration, 0.1, 'duration');
      assert.equal(baseline.frames, Math.round(plan.timemap.outputDuration * 60));
      for (const ext of ['srt', 'vtt']) assert.match(await readFile(path.join(baseline.renderDir, `final.${ext}`), 'utf8'), /Open the report/);
    });
    await t.test('full view geometry, rounded corners and settled zoom', async () => {
      const f = plan.layout.frame;
      const info = await inspect(baseline.finalFile, [0.3, 2.3], [[{ x: f.x, y: f.y }, { x: f.x - 3, y: f.y - 3 }]]);
      const red = center(info.frames[0].boxes.red), expected = point(plan, 0.3, { x: 230, y: 130 });
      near(red.x, expected.x, 3, 'red x'); near(red.y, expected.y, 3, 'red y');
      const [corner, outside] = info.frames[0].samples.map((s) => s.pixels[0]);
      corner.forEach((v, i) => near(v, outside[i], 24, 'rounded corner background'));
      assert.ok(corner.some((v) => Math.abs(v - 128) > 24), 'corner is outside the source rectangle');
      const before = info.frames[0].boxes.blue, after = info.frames[1].boxes.blue;
      near((after.x1 - after.x0 + 1) / (before.x1 - before.x0 + 1), 1.7, 1.7 * 0.05, 'zoom depth');
      const blue = center(after);
      near(blue.x, f.x + f.w / 2, f.w * 0.08, 'zoom focus x');
      near(blue.y, f.y + f.h / 2, f.h * 0.08, 'zoom focus y');
    });
    await t.test('cursor tip, ripple radius and expiration', async () => {
      const times = [1, 1.85, 2.7];
      const probes = times.map((time, index) => {
        const s = stateAt(plan, time);
        if (!index) return [{ ...point(plan, time, s.cursor), radius: 6, color: [255, 255, 255] }];
        const p = point(plan, time, { x: 940, y: 540 });
        const h = plan.cursor.sizePx * (1 + 0.35 * (s.camera.z - 1));
        // Compare against the faded ring over the blue target rather than the opaque theme colour.
        const alpha = 1 - 0.15 / 0.55;
        const color = [15, 118, 110].map((v, channel) => Math.round(v * alpha + [0, 0, 255][channel] * (1 - alpha)));
        return [{ x: p.x - h * (0.3 + 2.9 * (0.15 / 0.55)), y: p.y, radius: 3, color }];
      });
      const info = await inspect(baseline.finalFile, times, probes);
      assert.ok(info.frames[0].samples[0].matches > 0, 'white cursor near predicted tip');
      assert.ok(info.frames[1].samples[0].matches > 0, 'ripple near predicted radius');
      assert.equal(info.frames[2].samples[0].matches, 0, 'ripple has expired');
    });
    await t.test('caption band has text only during the cue', async () => {
      const r = plan.layout.caption, probe = { x: r.x + r.w / 2, y: r.y + r.h / 2, radius: 55, color: [255, 255, 255] };
      const info = await inspect(baseline.finalFile, [1, 3.95], [[probe], [probe]]);
      assert.ok(info.frames[0].samples[0].matches > 10);
      assert.equal(info.frames[1].samples[0].matches, 0);
      const background = await inspect(baseline.finalFile, [3.95], [[{ x: r.w / 2, y: r.y + r.h / 2 }]]);
      background.frames[0].samples[0].pixels[0].forEach((v, i) => near(v, [46, 52, 62][i], 24, 'flat band'));
    });
    await t.test('cards hide the main view and crossfade into it', async () => {
      const c = structuredClone(composition); c.cards.title.enabled = true;
      const rendered = await render(c), p = point(rendered.plan, 2, { x: 230, y: 130 });
      const info = await inspect(rendered.file, [0.5, 2, 2.7], [[], [p]]);
      assert.equal(info.frames[0].boxes.red.count, 0);
      assert.ok(info.frames[2].boxes.red.count > 0);
      const crossfade = info.frames[1].samples[0].pixels[0];
      assert.ok(crossfade[0] > 220 && crossfade[1] > 30 && crossfade[1] < 220, 'red square mixed with card background');
    });
    await t.test('speed and trim edits preserve source timing and shorten output', async () => {
      for (const [edits, shortening, chosen] of [
        [{ speeds: [{ start: 1, end: 3, rate: 2 }], trims: [] }, 1, 1.2],
        [{ speeds: [], trims: [{ start: 3, end: 3.5 }] }, 0.5, 3.2],
      ]) {
        const c = structuredClone(composition); c.edits = edits;
        c.zoom.enabled = false; c.cursor.visible = false;
        const rendered = await render(c), info = await inspect(rendered.file, [chosen]);
        near(info.duration, plan.timemap.outputDuration - shortening, 0.1, 'edited duration');
        const sourceT = stateAt(rendered.plan, chosen).sourceT;
        const decodedT = Math.floor((sourceT + 1e-8) * 30) / 30;
        const expected = point(rendered.plan, chosen, { x: 60 + 280 * decodedT, y: 670 });
        const green = center(info.frames[0].boxes.green);
        near(green.x, expected.x, 3, 'green x under edit'); near(green.y, expected.y, 3, 'green y under edit');
      }
    });
    await t.test('custom frame, top band, vector cursor and intro colors in stills', async () => {
      const c = structuredClone(composition);
      c.zoom.enabled = false;
      Object.assign(c.frame, { paddingXPct: 12, paddingYPct: 4, radiusPx: 0,
        background: { type: 'solid', colors: ['#123456'] }, border: { enabled: true, color: '#ff00ff', widthPx: 8 } });
      Object.assign(c.captions, { position: 'top', bandHeightPct: 20, background: '#112233', color: '#ffffff', align: 'left' });
      Object.assign(c.cursor, { style: 'dot', sizePct: 4, fill: '#ffff00', shadow: false, scaleWithZoom: false });
      c.cursor.clickEffect.style = 'none';
      const custom = planRender({ ...run, composition: c, sourceSize: { width: 1280, height: 720 } });
      const session = await sessionFor(run.rawFile);
      const pixels = async (p, time, points) => session.page.evaluate(async ({ p, time, points }) => {
        const img = new Image(); img.src = await window.renderStill(p, time); await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
        return points.map(({x,y}) => [...ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data].slice(0,3));
      }, { p: serializable(p), time, points });
      try {
        const f = custom.layout.frame;
        const samples = await pixels(custom, 1, [{x:10,y:300}, {x:10,y:10},
          point(custom,1,stateAt(custom,1).cursor), {x:f.x,y:f.y+f.h/2}]);
        assert.deepEqual(samples.slice(0,2), [[18,52,86],[17,34,51]]);
        assert.deepEqual(samples.slice(2), [[255,255,0],[255,0,255]]);
        assert.ok(f.y >= custom.layout.caption.h, 'top band never intersects the frame');
        c.cards.title.enabled = true; c.cards.title.background = {type:'solid',colors:['#654321']};
        c.cards.title.accent.shape = 'none';
        const intro = planRender({ ...run, composition:c, sourceSize:{width:1280,height:720} });
        assert.deepEqual(await pixels(intro,0.5,[{x:10,y:10}]),[[101,67,33]]);
      } finally { sessions.delete(session); await session.close(); }
    });
    await t.test('directed hand silhouette and centred text beam in stills', async () => {
      const c = structuredClone(composition);
      c.zoom.enabled = false; c.captions.enabled = false;
      c.cards.title.enabled = false; c.cards.outro.enabled = false;
      Object.assign(c.cursor, { fill: '#ffff00', shadow: false, entrance: false, hideWhenIdleSec: 0, scaleWithZoom: false });
      c.cursor.clickEffect.style = 'none';
      const p = planRender({ ...run, composition: c, sourceSize: { width: 1280, height: 720 } });
      const session = await sessionFor(run.rawFile);
      const probe = async (plan, time, x, y, dark = false) => {
        const state = stateAt(plan, time), tip = point(plan, time, state.cursor);
        const unit = plan.cursor.sizePx * state.cursor.press * state.cursor.pop / 24;
        return session.page.evaluate(async ({ plan, time, x, y, dark }) => {
          const img = new Image(); img.src = await window.renderStill(plan, time); await img.decode();
          const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(Math.round(x)-1, Math.round(y)-1, 3, 3).data;
          let yellow = 0;
          for (let i=0; i<data.length; i+=4) if (dark ? data[i]<50 && data[i+1]<50 && data[i+2]<65 : data[i]>220 && data[i+1]>220 && data[i+2]<35) yellow++;
          return yellow;
        }, { plan: serializable(plan), time, x: tip.x+x*unit, y: tip.y+y*unit, dark });
      };
      try {
        // The hand palm extends left of its fingertip; the arrow lies entirely right of its tip.
        assert.equal(stateAt(p, 1).cursor.shape, 'arrow');
        assert.equal(await probe(p, 1, -3, 14), 0);
        assert.equal(stateAt(p, 1.7).cursor.shape, 'hand');
        assert.ok(await probe(p, 1.7, -3, 14) > 0, 'yellow hand palm left of fingertip');
        const textRun = { ...run, events: structuredClone(run.events) };
        textRun.events.targets[0].cursor = 'text';
        const text = planRender({ ...textRun, composition: c, sourceSize: { width: 1280, height: 720 } });
        // The I-beam's top cap is centred 12 vector units above the hotspot.
        assert.ok(await probe(text, 1.7, 0, -12, true) > 0, 'text beam extends above its centred hotspot');
      } finally { sessions.delete(session); await session.close(); }
    });
    await t.test('stills have canvas dimensions and repeated renders decode identically', async () => {
      const repeated = await render(composition);
      assert.match(repeated.png, /^data:image\/png;base64,/);
      const png = Buffer.from(repeated.png.split(',')[1], 'base64');
      assert.equal(png.subarray(1, 4).toString(), 'PNG');
      assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1920, 1080]);
      const times = [0.3, 1.85, 3.8];
      const original = await inspect(baseline.finalFile, times), again = await inspect(repeated.file, times);
      assert.deepEqual(again.frames.map((f) => f.digest), original.frames.map((f) => f.digest));
    });
  } finally {
    try { for (const session of sessions) await session.close(); }
    finally { try { await browser?.close(); } finally { await rm(directory, { recursive: true, force: true }); } }
  }
});
