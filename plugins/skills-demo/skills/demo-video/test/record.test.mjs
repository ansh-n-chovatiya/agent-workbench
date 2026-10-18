import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';

// paths.mjs reads DEMO_VIDEO_HOME once, at import: set it (and the
// deliverables root) to temp folders first so no test writes to the real home.
const HOME = await mkdtemp(path.join(tmpdir(), 'demo-home-'));
process.env.DEMO_VIDEO_HOME = HOME;
process.env.DEMO_VIDEO_DELIVER = path.join(HOME, 'deliver');
delete process.env.DEMO_VIDEO_CONFIG;
test.after(() => rm(HOME, { recursive: true, force: true }));
const { rewriteImport, runIdFor, newRunDir, SERVER_ACTION_NOTE, blockedSummary, blockedHints, nextActions, resolveActionNames, main: record } = await import('../scripts/lib/record.mjs');
const { mergeConfig } = await import('../scripts/lib/config.mjs');
const { isAllowedWrite, isDevSocket, travelPlan } = await import('../scripts/lib/fixture.mjs');
const { stepFloorMs } = await import('../scripts/lib/timeline.mjs');
const runsOf = (dir) => path.join(HOME, 'runs', path.basename(dir));

test('record: only the @playwright/test import is pointed at the fixture (else the save guard silently never runs)', () => {
  const src = `import { test, expect } from '@playwright/test';\nimport type { Page } from "@playwright/test";\nimport rep from '@playwright/test/reporter';\nconst s = '@playwright/test';`;
  const out = rewriteImport(src, '/skill/scripts/lib/fixture.mjs');
  assert.equal(out, `import { test, expect } from "/skill/scripts/lib/fixture.mjs";\nimport type { Page } from "/skill/scripts/lib/fixture.mjs";\nimport rep from '@playwright/test/reporter';\nconst s = '@playwright/test';`);
  // require(), import() and the playwright/test alias reach the same test object.
  const other = `const { test } = require('@playwright/test');\nconst m = await import("@playwright/test");\nimport { expect } from 'playwright/test';\nconst r = require( "playwright/test" );`;
  assert.equal(rewriteImport(other, '/f.mjs'), `const { test } = require("/f.mjs");\nconst m = await import("/f.mjs");\nimport { expect } from "/f.mjs";\nconst r = require( "/f.mjs" );`);
});

test('record: run id is date, time and scenario name without .spec/.ts (the later stages look for this folder)', () => {
  assert.equal(runIdFor('/x/Checkout Flow.spec.ts', new Date(2026, 0, 5, 9, 4, 7)), '2026-01-05-090407-checkout-flow');
  assert.equal(runIdFor('demo.ts', new Date(2026, 10, 30)), '2026-11-30-000000-demo');
});

test('record: a second recording of the same scenario never replaces the first (else an earlier run is silently deleted)', async (t) => {
  assert.notEqual(runIdFor('flow.spec.ts', new Date(2026, 0, 5, 9, 4, 7)), runIdFor('flow.spec.ts', new Date(2026, 0, 5, 9, 4, 8)));
  const out = await mkdtemp(path.join(tmpdir(), 'demo-runs-'));
  t.after(() => rm(out, { recursive: true, force: true }));
  const first = await newRunDir(out, 'same-id');
  await writeFile(path.join(first, 'record.json'), '{}');
  const second = await newRunDir(out, 'same-id');
  assert.notEqual(second, first);
  assert.ok(existsSync(path.join(first, 'record.json')), 'the earlier run was touched');
});

test('guard: allowWrites entries are substrings of origin + path unless prefixed "re:" (else "/api/" also lets ".../capi-events" or "?next=/api/" write)', () => {
  assert.equal(isAllowedWrite('https://x.com/api/save', ['/api/']), true);
  assert.equal(isAllowedWrite('https://x.com/v2/capi-events', ['/api/']), false);
  assert.equal(isAllowedWrite('https://x.com/orders?next=/api/', ['/api/']), false);
  assert.equal(isAllowedWrite('https://app/track?v=12', ['re:/track$']), true);
  assert.equal(isAllowedWrite('https://app/track/x', ['re:/track$']), false);
  assert.equal(isAllowedWrite('https://app/api/search', []), false);
});

// A temp project with a local server that logs every request it gets (any
// write the guard let through shows in `hits`), and the scenario `spec(base)`.
async function project(t, spec, { config = {} } = {}) {
  const hits = [];
  const server = createServer((req, res) => {
    hits.push(`${req.method} ${req.url}`);
    res.setHeader('content-type', 'text/html');
    res.end('<!doctype html><title>guard</title><h1>Guard</h1>');
  });
  server.on('upgrade', (req, socket) => { hits.push(`WEBSOCKET ${req.url}`); socket.destroy(); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const dir = await mkdtemp(path.join(tmpdir(), 'demo-guard-'));
  t.after(() => { server.close(); return rm(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  await writeFile(path.join(dir, 'demo.config.json'), JSON.stringify({
    baseURL: base, recordly: false, pace: { minStepMs: 200, msPerChar: 1, captionLeadMs: 0, settleMs: 0 }, ...config,
  }));
  await writeFile(path.join(dir, 'guard.spec.ts'), spec(base));
  return { hits, dir, runs: runsOf(dir) };
}

// Records `spec(base)` in a temp project; see project().
async function recordAgainstServer(t, spec, args = [], opts) {
  const { hits, dir, runs } = await project(t, spec, opts);
  await record(['guard.spec.ts', ...args], { cwd: dir });
  const [run] = (await readdir(runs)).filter((n) => !n.startsWith('.'));
  const rec = JSON.parse(await readFile(path.join(runs, run, 'record.json'), 'utf8'));
  const blocked = rec.blocked.map((b) => `${b.method} ${b.url.replace(/^\w+:\/\/[^/]+/, '')}`).sort();
  return { hits, rec, blocked, dir, runs };
}
const writes = (hits) => hits.filter((h) => !h.startsWith('GET '));

// Each write below takes a different way out: the scenario's own route, the
// `request` fixture, beforeAll's own request context, a second page from
// browser.newPage(), and a WebSocket.
test('guard: writes from routes, request, beforeAll, a browser.newPage() page and WebSockets are blocked and logged (else they reach the real server)', { timeout: 180_000 }, async (t) => {
  const { hits, blocked, runs } = await recordAgainstServer(t, (base) => `import { test, expect } from '@playwright/test';
test.beforeAll(async ({ playwright }) => {
  const api = await playwright.request.newContext({ baseURL: '${base}' });
  await api.post('/before-all-write', { data: 'x' }).catch(() => {});
  await api.dispose();
});
test('guard', async ({ page, request, browser }) => {
  await test.step('Writes stay home', async () => {
    await page.route('**/page-write', (route) => route.continue());
    await page.goto('/');
    await page.evaluate(() => fetch('/page-write', { method: 'POST', body: 'x' }).catch(() => {}));
    await expect(request.post('/api-write', { data: 'x' })).rejects.toThrow(/demo-video blocked POST \\S*\\/api-write/);
    await page.evaluate(() => new Promise((done) => { const ws = new WebSocket('${base.replace('http', 'ws')}/socket'); ws.onclose = ws.onerror = () => done(); }));
    const second = await browser.newPage();
    await second.goto('${base}/');
    await second.evaluate(() => fetch('/second-page-write', { method: 'POST', body: 'x' }).catch(() => {}));
    await second.close();
  });
});
`, ['--allow-hooks']);
  assert.deepEqual(writes(hits), [], 'a write reached the server');
  assert.deepEqual(blocked, ['POST /api-write', 'POST /before-all-write', 'POST /page-write', 'POST /second-page-write', 'WEBSOCKET /socket']);
  // Recordings show the app's real data; a runs folder (possibly inside a repo via outDir) must never be committed.
  assert.equal(await readFile(path.join(runs, '.gitignore'), 'utf8'), '*\n', 'the runs folder is not git-ignored');
});

test('guard: writes from Node code in the scenario (module level, fetch, http.request) and non-standard methods are blocked and logged (else a helper or SDK writes to the real server unseen)', { timeout: 180_000 }, async (t) => {
  const { hits, blocked } = await recordAgainstServer(t, (base) => `import { test } from '@playwright/test';
import http from 'node:http';
fetch('${base}/module-write', { method: 'POST' }).catch(() => {});
test('node', async ({ page, request }) => {
  await test.step('Node code stays home', async () => {
    await page.goto('/');
    await fetch('${base}/fetch-write', { method: 'POST', body: 'x' }).catch(() => {});
    try { http.request('${base}/http-write', { method: 'PUT' }).end(); } catch {}
    await request.fetch('/custom-verb', { method: 'PROPFIND' }).catch(() => {});
    await fetch('${base}/read');
  });
});
`);
  assert.deepEqual(writes(hits), [], 'a write reached the server');
  assert.ok(hits.includes('GET /read'), 'a read was blocked');
  for (const w of ['POST /module-write', 'POST /fetch-write', 'PUT /http-write', 'PROPFIND /custom-verb']) assert.ok(blocked.includes(w), `${w} not logged: ${blocked}`);
});

// Node builds a built-in's ES-module view (what `import { request } from
// "node:http"` binds to) the first time anything imports it that way; one built
// before the fixture loads kept the unpatched functions. Here the view exists
// first, then the fixture loads, then the named import sends.
test('guard: an ES-module named import of node:http made before the guard loads is blocked and logged too (else such a helper or SDK writes past it)', { timeout: 30_000 }, async (t) => {
  const { hits, dir } = await project(t, () => '');
  const base = JSON.parse(await readFile(path.join(dir, 'demo.config.json'), 'utf8')).baseURL;
  const fixture = new URL('../scripts/lib/fixture.mjs', import.meta.url).href;
  await writeFile(path.join(dir, 'esm.mjs'), `import { request } from 'node:http';
process.env.DEMO_RECORD = JSON.stringify({ runDir: ${JSON.stringify(dir)}, baseURL: '${base}', allowWrites: [] });
await import(${JSON.stringify(fixture)});
await new Promise((done) => {
  try { const r = request('${base}/esm-write', { method: 'POST' }, (res) => { res.resume(); done(); }); r.on('error', done); r.end('x'); }
  catch (err) { console.log(err.message); done(); }
});
`);
  // Async: a sync spawn would stall this process's server and the child with it.
  const r = await promisify(execFile)(process.execPath, [path.join(dir, 'esm.mjs')], { timeout: 20_000 });
  assert.deepEqual(writes(hits), [], 'a write reached the server');
  assert.match(r.stdout, /demo-video blocked POST \S*\/esm-write/, r.stderr);
});

test('guard: an allowWrites rule with [Next-Action=<id>] lets only that server action through, and the hint names the blocked action (else a plain page path opens every action on it)', { timeout: 180_000 }, async (t) => {
  const { hits, rec } = await recordAgainstServer(t, () => `import { test } from '@playwright/test';
test('actions', async ({ page }) => {
  await test.step('Only the read action goes out', async () => {
    await page.goto('/');
    for (const id of ['read1', 'save2']) await page.evaluate((id) => fetch('/dashboard', { method: 'POST', headers: { 'Next-Action': id } }).catch(() => {}), id);
  });
});
`, ['--no-rehearse'], { config: { allowWrites: ['/dashboard [Next-Action=read1]'] } });
  assert.deepEqual(writes(hits), ['POST /dashboard'], 'read1 should reach the server and save2 should not');
  assert.deepEqual(rec.blocked.map((b) => [b.method, b.action]), [['POST', 'save2']]);
  assert.deepEqual(blockedHints(blockedSummary(rec.blocked)).paths, ['/dashboard [Next-Action=save2]']);
});

test('guard: a scenario with setup/cleanup hooks is refused unless --allow-hooks (else its database seeding runs unguarded)', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'demo-hooks-'));
  try {
    await writeFile(path.join(dir, 'demo.config.json'), JSON.stringify({ baseURL: 'http://127.0.0.1:9', recordly: false }));
    await writeFile(path.join(dir, 'hooks.spec.ts'), `import { test } from '@playwright/test';
test.afterAll(async () => {});
test('hooks', async ({ page }) => { await page.setContent('<h1>hi</h1>'); });
`);
    await assert.rejects(record(['hooks.spec.ts'], { cwd: dir }), /^Error: scenario has setup\/cleanup hooks.*--allow-hooks$/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('guard: unroute, unrouteAll and a WebSocket handler calling connectToServer() cannot switch the guard off (else later writes go out)', { timeout: 180_000 }, async (t) => {
  const { hits, blocked } = await recordAgainstServer(t, (base) => `import { test } from '@playwright/test';
test('routing', async ({ page, context }) => {
  await test.step('Routing tricks stay guarded', async () => {
    await page.goto('/');
    await context.unroute('**/*');
    await page.evaluate(() => fetch('/after-unroute', { method: 'POST' }).catch(() => {}));
    await context.unrouteAll();
    await page.evaluate(() => fetch('/after-unroute-all', { method: 'POST' }).catch(() => {}));
    await page.routeWebSocket('**', (ws) => { try { ws.connectToServer(); } catch {} });
    await page.evaluate(() => new Promise((done) => { const ws = new WebSocket('${base.replace('http', 'ws')}/socket'); ws.onclose = ws.onerror = () => done(); }));
  });
});
`);
  assert.deepEqual(writes(hits), [], 'a write reached the server');
  assert.deepEqual(blocked, ['POST /after-unroute', 'POST /after-unroute-all', 'WEBSOCKET /socket']);
});

test('pace: steps of a test.extend() or mergeTests() test are paced and held like test.step (else their captions flash past)', { timeout: 180_000 }, async (t) => {
  const { rec } = await recordAgainstServer(t, () => `import { test as base, mergeTests } from '@playwright/test';
const withFoo = base.extend({ foo: async ({}, use) => use(1) });
const test = mergeTests(withFoo, base.extend({ bar: async ({}, use) => use(2) }));
test('paced', async ({ page, foo, bar }) => {
  await test.step('Merged step', async () => { await page.goto('/'); });
  await withFoo.step('Extended step', async () => {});
});
`);
  assert.deepEqual(rec.holds.laptop.map((h) => h.index), [0, 1]);
});

test('guard: a scenario that takes `test` around the rewritten import fails the recording (else it records with no save guard at all)', { timeout: 180_000 }, async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'demo-bypass-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'demo.config.json'), JSON.stringify({ baseURL: 'http://127.0.0.1:9', recordly: false }));
  // By file path: the same Playwright, but not the import record rewrites.
  const direct = createRequire(import.meta.url).resolve('@playwright/test');
  await writeFile(path.join(dir, 'bypass.spec.ts'), `const { test } = require(${JSON.stringify(direct)});
test('bypass', async ({ page }) => { await page.setContent('<h1>hi</h1>'); });
`);
  await assert.rejects(record(['bypass.spec.ts'], { cwd: dir }), /save guard never ran for laptop/);
});

test('pace: a silent step lasts its reading time or the minimum; a voiced one its narration + breath', () => {
  const pace = { msPerChar: 55, minStepMs: 1800, breathMs: 450, voiceLeadMs: 250 };
  assert.equal(stepFloorMs('Short', pace), 1800);
  assert.equal(stepFloorMs('x'.repeat(60), pace), 3300);
  assert.equal(stepFloorMs('Short', pace, 2.5), 2950);
});

test('motion: a trip starts where the cursor is, lands exactly on target, and takes 450-900 ms by distance', () => {
  const from = { x: 100, y: 100 }, to = { x: 1700, y: 900 };
  const diag = Math.hypot(1920, 1080);
  const plan = travelPlan(from, to, diag, () => 0.9);
  assert.deepEqual(plan.at(0), from);
  const end = plan.at(1);
  assert.ok(Math.abs(end.x - to.x) < 1e-9 && Math.abs(end.y - to.y) < 1e-9);
  const mid = plan.at(0.5), straight = { x: 900, y: 500 };
  assert.ok(Math.hypot(mid.x - straight.x, mid.y - straight.y) > 20, 'path should bow, not run ruler-straight');
  assert.equal(travelPlan(from, { x: 110, y: 100 }, diag).duration > 450, true);
  assert.ok(travelPlan(from, { x: 110, y: 100 }, diag).duration < 460);
  assert.equal(travelPlan({ x: 0, y: 0 }, { x: 1920, y: 1080 }, diag).duration, 900);
  assert.equal(travelPlan({ x: 0, y: 0 }, { x: 5000, y: 5000 }, diag).duration, 900);
});

// Every file under `dir`, relative.
const filesUnder = async (dir) => (await readdir(dir, { recursive: true }).catch(() => [])).map(String);

test('rehearsal: a broken locator stops the run in seconds, naming the step, before any video is recorded (else a full paced recording runs, or hangs, first)', { timeout: 60_000 }, async (t) => {
  const { dir, runs } = await project(t, () => `import { test } from '@playwright/test';
test('broken', async ({ page }) => {
  await test.step('Open the page', async () => { await page.goto('/'); });
  await test.step('Click the missing button', async () => { await page.locator('#missing').click(); });
});
`);
  const t0 = Date.now();
  await assert.rejects(record(['guard.spec.ts'], { cwd: dir }), /rehearsal failed in step "Click the missing button" \(laptop\): .*locator\.click/);
  const took = (Date.now() - t0) / 1000;
  assert.ok(took < 15, `took ${took.toFixed(1)} s`);
  const files = await filesUnder(runs);
  assert.equal(files.filter((f) => /video\.webm$|trace\.zip$/.test(f)).length, 0, `recorded before rehearsal passed: ${files}`);
  const [run] = (await readdir(runs)).filter((n) => !n.startsWith('.'));
  assert.match(run, /-guard-failed$/);
});

test('rehearsal: a fill on an input covered by an overlay fails the rehearsal, naming the step (else it passes there and the recording\'s click fails later)', { timeout: 60_000 }, async (t) => {
  const { dir, runs } = await project(t, () => `import { test } from '@playwright/test';
test('covered', async ({ page }) => {
  await test.step('Type the name', async () => {
    await page.setContent('<input id="n" style="position:absolute;top:20px;left:20px"><div style="position:fixed;inset:0"></div>');
    await page.locator('#n').fill('Ada');
  });
});
`, { config: { actionTimeoutSec: 5 } });
  await assert.rejects(record(['guard.spec.ts'], { cwd: dir }), /rehearsal failed in step "Type the name" \(laptop\): .*locator\.click/);
  const files = await filesUnder(runs);
  assert.equal(files.filter((f) => /video\.webm$/.test(f)).length, 0, `recorded before rehearsal failed: ${files}`);
});

test('failure: a scenario failing after a blocked POST exits non-zero, and failed.json names the blocked path with an allowWrites fix (else the user sees only "step failed")', { timeout: 120_000 }, async (t) => {
  const { dir, runs } = await project(t, () => `import { test, expect } from '@playwright/test';
test('save', async ({ page }) => {
  await test.step('Save the draft', async () => {
    await page.goto('/');
    await page.evaluate(() => Promise.all([1, 2].map(() => fetch('/api/save?x=1', { method: 'POST' }).catch(() => {}))));
    await expect(page.locator('#saved')).toBeVisible({ timeout: 500 });
  });
});
`);
  await assert.rejects(record(['guard.spec.ts', '--no-rehearse'], { cwd: dir }), /scenario failed in step "Save the draft" \(laptop\)/);
  const [run] = (await readdir(runs)).filter((n) => !n.startsWith('.'));
  assert.match(run, /-failed$/);
  const failed = JSON.parse(await readFile(path.join(runs, run, 'failed.json'), 'utf8'));
  assert.equal(failed.step, 'Save the draft');
  assert.match(failed.error, /toBeVisible/);
  assert.deepEqual(failed.blocked, [{ method: 'POST', path: '/api/save', count: 2 }]);
  assert.ok(failed.hints.some((h) => h.includes('"allowWrites": ["/api/save"]')), failed.hints.join(' | '));
  assert.ok(failed.hints.includes(SERVER_ACTION_NOTE));
});

test('guard: a dev live-reload socket connects and is logged as allowed while any other socket stays blocked (else a dev server reloads in a loop, or a real socket opens)', { timeout: 120_000 }, async (t) => {
  const { hits, rec, blocked } = await recordAgainstServer(t, (base) => `import { test } from '@playwright/test';
test('sockets', async ({ page }) => {
  await test.step('Open sockets', async () => {
    await page.goto('/');
    const open = (url) => page.evaluate((u) => new Promise((done) => { const ws = new WebSocket(u); ws.onclose = ws.onerror = () => done(); setTimeout(done, 2000); }), url);
    await open('${base.replace('http', 'ws')}/_next/webpack-hmr');
    await open('${base.replace('http', 'ws')}/socket');
  });
});
`);
  assert.ok(hits.includes('WEBSOCKET /_next/webpack-hmr'), `HMR socket never reached the server: ${hits}`);
  assert.ok(!hits.includes('WEBSOCKET /socket'), 'a non-HMR socket reached the server');
  assert.deepEqual(blocked, ['WEBSOCKET /socket']);
  assert.deepEqual(rec.allowed.map((a) => new URL(a.url).pathname), ['/_next/webpack-hmr']);
});

test('record: a scenario importing a project package and a tsconfig path alias still loads from the run copy (else any real project test fails to list)', { timeout: 120_000 }, async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'demo-deps-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const put = async (rel, body) => { await mkdir(path.dirname(path.join(dir, rel)), { recursive: true }); await writeFile(path.join(dir, rel), body); };
  await put('demo.config.json', JSON.stringify({ baseURL: 'http://127.0.0.1:9', recordly: false, pace: { minStepMs: 200, msPerChar: 1, captionLeadMs: 0, settleMs: 0 } }));
  await put('node_modules/only-here/package.json', '{"name":"only-here","main":"index.js"}');
  await put('node_modules/only-here/index.js', 'module.exports = "pkg";');
  await put('tsconfig.json', JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/lib/*': ['src/lib/*'] } } }));
  await put('src/lib/word.ts', 'export const word = "alias";');
  await put('e2e/deps.spec.ts', `import { test, expect } from '@playwright/test';
import pkg from 'only-here';
import { word } from '@/lib/word';
test('deps', async ({ page }) => {
  await test.step('Both imports resolve', async () => {
    await page.setContent('<h1>hi</h1>');
    expect(pkg + word).toBe('pkgalias');
  });
});
`);
  await record(['e2e/deps.spec.ts', '--no-rehearse'], { cwd: dir });
  const [run] = await readdir(runsOf(dir));
  assert.doesNotMatch(run, /-failed$/);
});

test('record: an existing project folder used as outDir gets no .gitignore, a folder the skill creates does (else `*` silently hides the project\'s own files from git)', async (t) => {
  const project = await mkdtemp(path.join(tmpdir(), 'demo-outdir-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  await newRunDir(project, 'run');
  assert.equal(existsSync(path.join(project, '.gitignore')), false, 'wrote a .gitignore into an existing folder');
  const fresh = path.join(project, 'new-runs');
  await newRunDir(fresh, 'run');
  assert.equal(await readFile(path.join(fresh, '.gitignore'), 'utf8'), '*\n');
});

// A temp project holding `files` ({relative path: contents}) and a demo config.
async function projectWith(t, files) {
  const dir = await mkdtemp(path.join(tmpdir(), 'demo-proj-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  files = { 'demo.config.json': JSON.stringify({ baseURL: 'http://127.0.0.1:9', recordly: false, pace: { minStepMs: 200, msPerChar: 1, captionLeadMs: 0, settleMs: 0 } }), ...files };
  for (const [rel, body] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
    await writeFile(path.join(dir, rel), body);
  }
  return dir;
}
const OK_SPEC = `import { test, expect } from '@playwright/test';
test('ok', async ({ page }) => {
  await test.step('The page shows', async () => { await page.setContent('<h1>hi</h1>'); await expect(page.locator('h1')).toHaveText('hi'); });
});
`;
const recordedOk = async (dir) => {
  const [run] = await readdir(runsOf(dir));
  assert.doesNotMatch(run, /-failed$/);
};

test('record: another spec\'s hooks in the scenario\'s folder do not block recording it (else any real e2e folder needs --allow-hooks)', { timeout: 120_000 }, async (t) => {
  const dir = await projectWith(t, {
    'e2e/target.spec.ts': OK_SPEC,
    'e2e/other.spec.ts': `import { test } from '@playwright/test';\ntest.beforeEach(async () => {});\ntest('other', async () => {});\n`,
  });
  await record(['e2e/target.spec.ts', '--no-rehearse'], { cwd: dir });
  await recordedOk(dir);
});

test('record: another spec importing from above the scenario\'s folder does not block recording it (else a sibling\'s ../src import stops every recording)', { timeout: 120_000 }, async (t) => {
  const dir = await projectWith(t, {
    'src/lib/db.ts': 'export const db = 1;',
    'e2e/target.spec.ts': OK_SPEC,
    'e2e/other.spec.ts': `import { test } from '@playwright/test';\nimport { db } from '../src/lib/db';\ntest('other', async () => { void db; });\n`,
  });
  await record(['e2e/target.spec.ts', '--no-rehearse'], { cwd: dir });
  await recordedOk(dir);
});

test('record: a scenario in a "type": "module" project records as ESM (else import.meta.url throws when it runs as CommonJS)', { timeout: 120_000 }, async (t) => {
  const dir = await projectWith(t, {
    'package.json': '{"type":"module"}',
    'e2e/esm.spec.ts': `import { test, expect } from '@playwright/test';
import { helper } from './helper.ts';
const here = new URL('.', import.meta.url).href;
test('esm', async ({ page }) => {
  await test.step('The page shows', async () => { await page.setContent('<h1>' + helper() + '</h1>'); expect(here).toMatch(/^file:/); });
});
`,
    'e2e/helper.ts': 'export const helper = () => "hi";\n',
  });
  await record(['e2e/esm.spec.ts', '--no-rehearse'], { cwd: dir });
  await recordedOk(dir);
});

test('record: the project\'s playwright.config use settings such as testIdAttribute reach the recording (else getByTestId finds nothing)', { timeout: 120_000 }, async (t) => {
  const dir = await projectWith(t, {
    'playwright.config.ts': `const config: { use: Record<string, unknown> } = { use: { testIdAttribute: 'data-test', viewport: { width: 200, height: 200 } } };\nexport default config;\n`,
    'e2e/testid.spec.ts': `import { test, expect } from '@playwright/test';
test('testid', async ({ page }) => {
  await test.step('The button shows', async () => { await page.setContent('<button data-test="go">Go</button>'); await expect(page.getByTestId('go')).toBeVisible({ timeout: 2000 }); });
});
`,
  });
  await record(['e2e/testid.spec.ts', '--no-rehearse'], { cwd: dir });
  await recordedOk(dir);
});

// The Playwright VS Code extension sets PW_TEST_REUSE_CONTEXT; with video off
// (the rehearsal) Playwright then builds the context with a private factory.
test('guard: a rehearsal run with PW_TEST_REUSE_CONTEXT set still blocks a POST (else the rehearsal writes to the real server)', { timeout: 120_000 }, async (t) => {
  process.env.PW_TEST_REUSE_CONTEXT = '1';
  t.after(() => { delete process.env.PW_TEST_REUSE_CONTEXT; });
  const { hits } = await recordAgainstServer(t, () => `import { test } from '@playwright/test';
test('reuse', async ({ page }) => {
  await test.step('Save the draft', async () => {
    await page.goto('/');
    await page.evaluate(() => fetch('/reuse-write', { method: 'POST' }).catch(() => {}));
  });
});
`);
  assert.deepEqual(writes(hits), [], 'a write reached the server');
});

test('guard: Vite\'s token socket counts as a dev socket only on the app\'s own host:port (else any localhost service with ?token= connects)', () => {
  assert.equal(isDevSocket('ws://localhost:8080/?token=x', 'http://localhost:3000'), false);
  assert.equal(isDevSocket('ws://localhost:8080/?token=x', 'http://localhost:8080'), true);
});

test('failure: a click whose accessible name differs from the page\'s text names the locator in the message and failed.json (else the user sees only "Timeout 5000ms exceeded")', { timeout: 60_000 }, async (t) => {
  const { dir, runs } = await project(t, () => `import { test } from '@playwright/test';
test('name', async ({ page }) => {
  await test.step('Pick the feed', async () => {
    await page.setContent('<button>Site-feed</button>');
    await page.getByRole('button', { name: 'Site feed' }).click();
  });
});
`);
  const locator = "getByRole('button', { name: 'Site feed' })";
  await assert.rejects(record(['guard.spec.ts'], { cwd: dir }), (err) => err.message.includes(locator) && err.message.includes('check the exact text on the page'));
  const [run] = (await readdir(runs)).filter((n) => !n.startsWith('.'));
  const failed = JSON.parse(await readFile(path.join(runs, run, 'failed.json'), 'utf8'));
  assert.equal(failed.step, 'Pick the feed');
  assert.equal(failed.locator, locator);
  assert.equal(failed.action, 'locator.click');
  assert.equal(failed.timeoutMs, 5000);
  assert.ok(failed.callLog.some((l) => l.includes(`waiting for ${locator}`)), failed.callLog.join(' | '));
});

test('allowWrites: a [Next-Action-Name=...] entry resolves through the Next.js build manifest to every current id of that action, and a blocked action is hinted by name (else every rebuild makes an approved [Next-Action=<id>] stale)', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'demo-next-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const entry = (filename, exportedName) => ({ workers: {}, filename, exportedName });
  const manifest = async (sub, node) => {
    await mkdir(path.join(root, '.next', sub), { recursive: true });
    await writeFile(path.join(root, '.next', sub, 'server-reference-manifest.json'), JSON.stringify({ node, edge: {}, encryptionKey: 'x' }));
  };
  // The production build and the dev server each have their own id for the same action.
  await manifest('server', { id1: entry('src/app/page.tsx', 'searchProducts'), id2: entry('src/app/page.tsx', 'saveList'), id4: entry('src/app/other.tsx', 'saveList') });
  await manifest('dev/server', { id3: entry('src/app/page.tsx', 'searchProducts') });
  await mkdir(path.join(root, 'e2e'));
  const actions = await nextActions(path.join(root, 'e2e', 'demo.spec.ts'));
  mergeConfig({ baseURL: 'http://x', allowWrites: ['/ [Next-Action-Name=searchProducts]'] });
  assert.deepEqual(resolveActionNames(['/ [Next-Action-Name=searchProducts]', '/api/x'], actions), ['/ [Next-Action=id1]', '/ [Next-Action=id3]', '/api/x']);
  assert.deepEqual(resolveActionNames(['/ [Next-Action-Name=src/app/other.tsx#saveList]'], actions), ['/ [Next-Action=id4]']);
  assert.throws(() => resolveActionNames(['/ [Next-Action-Name=saveList]'], actions), /2 files/);
  assert.throws(() => resolveActionNames(['/ [Next-Action-Name=nope]'], actions), /no server action named "nope"/);
  assert.deepEqual(blockedHints([{ method: 'POST', path: '/', action: 'id2', count: 1 }], actions).paths, ['/ [Next-Action-Name=src/app/page.tsx#saveList]']);
});

test('rehearsal: rehearsalActionTimeoutMs sets how long an action may wait, and the timeout message says to raise it (else a slow app fails every rehearsal)', { timeout: 60_000 }, async (t) => {
  const { dir } = await project(t, () => `import { test } from '@playwright/test';
test('slow', async ({ page }) => {
  await test.step('Click the late button', async () => { await page.goto('/'); await page.locator('#late').click(); });
});
`, { config: { rehearsalActionTimeoutMs: 1500 } });
  await assert.rejects(record(['guard.spec.ts'], { cwd: dir }), /Timeout 1500ms exceeded.*raise rehearsalActionTimeoutMs/s);
});

test('stopOn: a listed text appearing on the page fails the run at once, naming the text and the step (else a stuck step waits out the whole timeout)', { timeout: 60_000 }, async (t) => {
  const { dir, runs } = await project(t, () => `import { test } from '@playwright/test';
test('empty', async ({ page }) => {
  await test.step('Search the feed', async () => {
    await page.goto('/');
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<p>No matches for "shoes"</p>'));
    await page.locator('#results').click({ timeout: 30_000 });
  });
});
`, { config: { stopOn: ['No matches'] } });
  const t0 = Date.now();
  await assert.rejects(record(['guard.spec.ts'], { cwd: dir }), /page shows "No matches" in step "Search the feed"/);
  assert.ok(Date.now() - t0 < 20_000, `took ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const [run] = (await readdir(runs)).filter((n) => !n.startsWith('.'));
  assert.equal(JSON.parse(await readFile(path.join(runs, run, 'failed.json'), 'utf8')).step, 'Search the feed');
});
