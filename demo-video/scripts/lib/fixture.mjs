// Playwright fixture that turns an ordinary test into a human-paced demo.
// record.mjs rewrites the scenario's `@playwright/test` import to this file
// and passes its settings in the DEMO_RECORD env var (JSON):
//   {runDir, baseURL, voice, voiceName, voiceRate, voiceEngine, voiceboxUrl, pace, allowWrites, allowWebSockets, allowDevSockets, blur, busySelector, maxWaitMs, stopOn, rehearse}
// With `rehearse` the scenario runs unpaced (no glide, typing, holds or voice)
// behind the same guard. Without DEMO_RECORD the fixture is a plain pass-through.
import { test as base, request, mergeTests as baseMergeTests } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { KEEP_MS, stepFloorMs, RULE_HEADER } from './timeline.mjs';

export * from '@playwright/test';

const R = process.env.DEMO_RECORD ? JSON.parse(process.env.DEMO_RECORD) : null;
// Only these methods pass without an allowWrites match: any other one, a
// custom verb included, may change data on the server.
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
const FRAME_MS = 16;
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

// ---- pure helpers (exported for tests) ----

// allowWrites entries are URL substrings; a regex needs the "re:" prefix
// ("re:^https://api\\.example\\.com/" as written in the JSON config), so a
// path such as "/api/" is never read as a pattern matching ".../capi-events".
// Rules see origin + path only: the query string is the sender's to choose,
// so "?next=/api/" must not make any URL writable.
// A rule ending in " [Next-Action=<id>]" (or " [header:<name>=<value>]") also
// needs that request header to hold exactly that value: a Next.js page takes
// every server action as a POST to its own path, so the path alone would let
// all of them through. `headers` is the request's, any case, any form Headers takes.
export function isAllowedWrite(url, rules = [], headers = null) {
  let u;
  try { u = new URL(url); } catch { return false; }
  const target = u.origin + u.pathname;
  const sent = headerMap(headers);
  return rules.some((rule) => {
    const m = rule.match(RULE_HEADER);
    const r = m ? rule.slice(0, m.index) : rule;
    if (m && sent.get(m[1] ?? 'next-action') !== m[2]) return false;
    return r.startsWith('re:') ? new RegExp(r.slice(3)).test(target) : target.includes(r);
  });
}
// Headers in any form a sender passes them; unreadable ones count as absent,
// so a header rule then does not match and the request stays blocked.
function headerMap(h) {
  try { return new Headers(h ?? undefined); } catch { return new Headers(); }
}

// Development live-reload sockets: Next.js (webpack and turbopack),
// sockjs, and Vite (its socket sits at the dev server's
// root with a `token` query). Blocking one makes the dev page reload itself in
// a loop. Only on a loopback host, where a dev server runs; the same path on a
// deployed app may carry writes.
// Plain `/ws` is left out on purpose: apps commonly use it for their own data
// socket, so allowing it would let real writes through.
// Vite's `/?token=` shape is generic enough that another local service could
// use it, so it counts only on the app's own host:port (`appOrigin`).
const DEV_SOCKET_PATHS = ['/_next/webpack-hmr', '/_next/hmr', '/sockjs-node'];
export function isDevSocket(url, appOrigin = null) {
  let u;
  try { u = new URL(url); } catch { return false; }
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (!(host === 'localhost' || host.endsWith('.localhost') || host === '::1' || /^127\./.test(host))) return false;
  let appHost = null;
  try { appHost = new URL(appOrigin).host; } catch {}
  return DEV_SOCKET_PATHS.some((p) => u.pathname === p || u.pathname.startsWith(`${p}/`))
    || (u.pathname === '/' && u.searchParams.has('token') && u.host === appHost);
}

// More loads of the SAME address than this within one step is a reload loop;
// a step that clicks through several different pages is not.
export const MAX_LOADS_PER_STEP = 5;
export const RELOAD_MESSAGE = 'page keeps reloading (dev server live reload?); keep allowDevSockets on so its live-reload socket connects, or record a production build';

// Minimum-jerk profile: the velocity curve of a human reaching movement.
export const ease = (k) => k * k * k * (10 - 15 * k + 6 * k * k);

// A cursor trip from `from` to `to`: duration grows with distance from 450 ms
// (a short hop) to 900 ms (the viewport diagonal); the path bows sideways by up
// to ~12% of its length so it is not a ruler-straight line.
export function travelPlan(from, to, diag, rand = Math.random) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const duration = 450 + 450 * Math.min(1, dist / diag);
  const bow = dist * 0.12 * (0.4 + 0.6 * rand()) * (rand() < 0.5 ? -1 : 1);
  const cx = from.x + dx / 2 - (dist ? (dy / dist) * bow : 0);
  const cy = from.y + dy / 2 + (dist ? (dx / dist) * bow : 0);
  const at = (k) => {
    const e = ease(k), u = 1 - e;
    return { x: u * u * from.x + 2 * u * e * cx + e * e * to.x, y: u * u * from.y + 2 * u * e * cy + e * e * to.y };
  };
  return { duration, dist, at };
}

// ---- recording state ----

const pages = new WeakMap(); // page -> {x, y, busy}
let currentPage = null;
let clip = null;
let mobile = false;
let stepDepth = 0;
let stepIndex = 0;
let narration = [];
let holds = [];
let failedStep = null;
let runningStep = null; // title of the top-level step running now, for a timeout's message
let failError = null; // a cause the fixture found itself (reload loop), for failed.json
let allowed = []; // [{method, url, clip}] dev sockets let through
let loads = { step: undefined, byUrl: new Map() }; // page loads per address in the running step
let cutOwedMs = 0; // what edit will cut from the current step's timed waits
let blocked = [];
let pauses = []; // [{step, from, to}] ms from the step's start: the fixture left the page still
let stepAt = null; // {index, t0} of the running top-level step
let testBase = null; // the running test's baseURL (test.use / project), for relative request URLs
const orig = {}; // unpatched Locator methods
const now = () => performance.now();
const rawDir = () => path.join(R.runDir, 'raw', clip);

// edit cuts any single action or wait longer than maxWaitMs down to its first
// KEEP_MS, so that much of the step's screen time will not survive the edit.
function owe(ms) {
  if (ms > R.maxWaitMs) cutOwedMs += ms - KEEP_MS;
}
// Runs one trace action (the unit edit decides to cut) and owes its time.
async function timed(fn) {
  const t = now();
  try { return await fn(); } finally { owe(now() - t); }
}

// Called as a method of a throwaway child so Playwright's error names the real
// API ("locator.click: ...") rather than how it was invoked.
function act(loc, name, args) {
  const h = Object.create(loc);
  h[name] = orig[name];
  return timed(() => h[name](...args));
}

function stateOf(page) {
  let s = pages.get(page);
  if (!s) {
    const vp = page.viewportSize() || { width: 1280, height: 720 };
    s = { x: vp.width / 2, y: vp.height / 2, busy: false };
    pages.set(page, s);
  }
  return s;
}

// Moves the real mouse along a travel plan, one event per frame. `stop` lets a
// wait end the glide early.
async function glide(page, s, to, duration, stop) {
  const vp = page.viewportSize();
  const plan = travelPlan(s, to, Math.hypot(vp.width, vp.height));
  const dur = duration ?? plan.duration;
  if (plan.dist < 2) return;
  const t0 = now();
  for (;;) {
    const k = Math.min(1, (now() - t0) / dur);
    const p = plan.at(k);
    await page.mouse.move(p.x, p.y);
    s.x = p.x; s.y = p.y;
    if (k >= 1 || stop?.()) return;
    await sleep(FRAME_MS);
  }
}

// Gentle idle movement near the current point for `ms` (or until `stop()`):
// short eased moves within ~36 px, never more than ~300 ms at rest.
async function drift(page, ms, stop) {
  const end = now() + ms;
  if (!page || mobile || page.isClosed()) {
    // No pointer to move: the page holds still, on purpose. Logged so render's
    // phone freeze check can tell these pauses from a stuck recording.
    const t = now();
    while (now() < end && !stop?.()) await sleep(Math.min(50, end - now()));
    logPause(t);
    return;
  }
  const s = stateOf(page);
  const vp = page.viewportSize();
  const anchor = { x: s.x, y: s.y };
  try {
    while (now() < end - 60 && !stop?.()) {
      const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 24;
      const to = {
        x: Math.min(vp.width - 4, Math.max(4, anchor.x + Math.cos(a) * r)),
        y: Math.min(vp.height - 4, Math.max(4, anchor.y + Math.sin(a) * r)),
      };
      await glide(page, s, to, Math.min(end - now(), 500 + Math.random() * 400), () => now() >= end || stop?.());
      await sleep(Math.min(end - now(), 80 + Math.random() * 200));
    }
  } catch {
    // Page navigated or closed mid-drift: the hold is still owed, the motion is not.
  }
  if (!stop) await sleep(end - now());
}

// Waits for the page to stop reporting busy, drifting meanwhile (bounded 15 s).
async function waitNotBusy(page) {
  if (!R.busySelector || page.isClosed()) return;
  let done = false;
  const t = now();
  const wait = page.waitForFunction((sel) => !document.querySelector(sel), R.busySelector, { timeout: 15000, polling: 100 })
    .catch(() => {}).finally(() => { done = true; });
  await drift(page, 15000, () => done);
  await wait;
  owe(now() - t);
}

// Box of a visible target scrolled into view, or null for hidden, detached or
// ambiguous targets (the original method then runs and reports its own error).
async function targetBox(loc, args) {
  const timeout = Math.min(5000, args.find((a) => a && typeof a === 'object' && 'timeout' in a)?.timeout || 5000);
  try {
    await timed(() => loc.waitFor({ state: 'visible', timeout }));
    const page = loc.page();
    const vp = page.viewportSize();
    let box = await loc.boundingBox({ timeout: 2000 });
    if (box && (box.y < 0 || box.y + box.height > vp.height || box.x < 0 || box.x + box.width > vp.width)) {
      await timed(() => loc.evaluate((el) => new Promise((done) => {
        document.addEventListener('scrollend', done, { once: true, capture: true });
        setTimeout(done, 1000);
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }), undefined, { timeout: 2000 }));
      box = await loc.boundingBox({ timeout: 2000 });
    }
    return box;
  } catch {
    return null;
  }
}

// Logs a pause from `t` to now on the running step. On the phone, render's
// freeze check allows a still page only inside these.
function logPause(t) {
  if (stepAt) pauses.push({ step: stepAt.index, from: Math.round(t - stepAt.t0), to: Math.round(now() - stepAt.t0) });
}

// Types one character at a time at ~typeCps, with a little human unevenness.
// On the phone a typed character changes too few pixels to count as motion,
// so the typing is logged as a pause.
async function typeText(page, text, delay) {
  const t = now();
  const base = delay ?? 1000 / R.pace.typeCps;
  let due = now(); // scheduled on the clock so per-key latency does not slow the rate
  for (const ch of text) {
    await page.keyboard.type(ch);
    due += delay != null ? delay : base * (0.7 + Math.random() * 0.6);
    await sleep(due - now());
  }
  // Typing is activity the viewer watches, but it changes too few pixels for a
  // full-frame freeze check to see, so it is logged like a deliberate pause.
  logPause(t);
}

const UNTYPEABLE = new Set(['date', 'time', 'datetime-local', 'month', 'week', 'color', 'range', 'file']);

async function perform(loc, name, args, page) {
  switch (name) {
    case 'fill': {
      const [value, opts] = args;
      const kind = await loc.evaluate((el) => (el.isContentEditable ? 'contenteditable' : el.tagName === 'INPUT' ? el.type : el.tagName.toLowerCase())).catch(() => null);
      if (!value || UNTYPEABLE.has(kind)) return act(loc, 'fill', [value, opts]);
      // The scenario's options reach the click too: `force` gets past an
      // overlay here as it would for fill, and `timeout` bounds both.
      const clickOpts = Object.fromEntries(['force', 'timeout', 'noWaitAfter', 'trial'].filter((k) => opts?.[k] !== undefined).map((k) => [k, opts[k]]));
      await act(loc, mobile ? 'tap' : 'click', [clickOpts]);
      // The rehearsal fills at once, unpaced. Typing a newline presses Enter,
      // which submits a single-line input, so there the value is filled too.
      if (R.rehearse || (String(value).includes('\n') && kind !== 'textarea' && kind !== 'contenteditable')) return act(loc, 'fill', [value, opts]);
      await act(loc, 'fill', ['', opts]);
      return typeText(page, String(value));
    }
    case 'type':
    case 'pressSequentially': {
      const [text, opts] = args;
      await act(loc, 'focus', [{ timeout: opts?.timeout }]);
      return typeText(page, String(text), opts?.delay);
    }
    case 'click':
      if (mobile && !args[0]) return act(loc, 'tap', []);
    // falls through
    default:
      return act(loc, name, args);
  }
}

const ACTIONS = ['click', 'dblclick', 'check', 'uncheck', 'setChecked', 'selectOption', 'hover', 'fill', 'type', 'pressSequentially', 'press', 'tap'];

// Each action first carries the real mouse to its target, then acts, then
// settles so its effect is seen. Nested calls (fill -> click) act directly.
function patchLocator(proto) {
  if (orig.click) return;
  for (const name of [...ACTIONS, 'focus']) orig[name] = proto[name];
  // The rehearsal skips the pacing but fills as the recording does (click,
  // then fill), so a target the click cannot reach fails here, in seconds.
  if (R.rehearse) {
    proto.fill = function (...args) { return perform(this, 'fill', args, this.page()); };
    return;
  }
  for (const name of ACTIONS) {
    proto[name] = async function (...args) {
      const page = this.page();
      const s = stateOf(page);
      if (s.busy) return act(this, name, args);
      s.busy = true;
      currentPage = page;
      try {
        const box = await targetBox(this, args);
        if (!box) return await act(this, name, args);
        const pos = ['click', 'dblclick', 'hover', 'tap', 'check', 'uncheck', 'setChecked'].includes(name)
          ? args[name === 'setChecked' ? 1 : 0]?.position : null;
        const to = pos ? { x: box.x + pos.x, y: box.y + pos.y } : { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        if (!mobile) await glide(page, s, to);
        const result = await perform(this, name, args, page);
        s.x = to.x; s.y = to.y;
        if (mobile) await drift(page, R.pace.settleMs);
        else { const t = now(); await sleep(R.pace.settleMs); logPause(t); }
        await waitNotBusy(page);
        return result;
      } finally {
        s.busy = false;
      }
    };
  }
}

// ---- save guard ----
// Installed on prototypes and on every browser context at creation, so no way
// of opening a page or sending a request (fixtures, hooks, browser.newPage(),
// a second context) escapes it; the Node-level part is installed when this
// file loads, before any scenario code runs.

// Logs a request the guard stopped. Before the worker fixture has named the
// clip (module-level scenario code), entries wait in memory for it.
function logBlocked(method, url, headers = null) {
  const action = headerMap(headers).get('next-action');
  blocked.push({ method, url, ...(action ? { action } : {}), clip });
  if (clip) writeFileSync(path.join(rawDir(), 'blocked.json'), JSON.stringify(blocked, null, 2));
}
// True (and logged) when (method, url) may change data and must not go out.
function blocks(method, url, headers = null) {
  method = String(method).toUpperCase();
  if (SAFE.has(method) || isAllowedWrite(url, R.allowWrites, headers)) return false;
  logBlocked(method, url, headers);
  return true;
}
const guarded = new WeakSet(); // prototypes already patched
const refusal = (method, url) => new Error(`demo-video blocked ${String(method).toUpperCase()} ${url} (add it to allowWrites to permit)`);
// A relative URL as it will be sent: against the sender's own baseURL, else
// the running test's, else the config's.
const absolute = (raw, own) => {
  try { return new URL(raw, own ?? testBase ?? R.baseURL).href; } catch { return String(raw); }
};

// Node's own clients: code in the scenario, its helpers and its hooks can send
// with fetch or http(s).request (axios, most SDKs) past every browser-side
// check. Database drivers and raw sockets are not HTTP and stay unguarded.
function guardNode() {
  const fetch = globalThis.fetch;
  // tts.mjs speaks through Voicebox with POST /generate: the skill's own
  // narration, not the scenario's, so it keeps the unguarded fetch.
  globalThis[Symbol.for('demo-video.realFetch')] = fetch;
  globalThis.fetch = function (input, init) {
    const method = init?.method ?? input?.method ?? 'GET';
    const url = absolute(input?.url ?? String(input));
    return blocks(method, url, init?.headers ?? input?.headers) ? Promise.reject(refusal(method, url)) : fetch.call(this, input, init);
  };
  for (const [mod, protocol] of [[http, 'http:'], [https, 'https:']]) {
    for (const name of ['request', 'get']) {
      const fn = mod[name];
      mod[name] = function (...args) {
        const [a, b] = args;
        const opts = (typeof a === 'string' || a instanceof URL ? b : a) ?? {};
        const method = typeof opts === 'object' && opts.method || 'GET';
        const url = typeof a === 'string' || a instanceof URL ? String(a)
          : `${opts.protocol || protocol}//${opts.hostname || opts.host || 'localhost'}${opts.port ? `:${opts.port}` : ''}${opts.path || '/'}`;
        if (blocks(method, url, typeof opts === 'object' ? opts.headers : null)) throw refusal(method, url);
        return fn.apply(this, args);
      };
    }
  }
  // `import { request } from 'node:http'` binds to a separate ES-module copy
  // of the exports, fixed when first imported; this refreshes it (and the
  // namespace object) so such imports get the guarded functions too.
  syncBuiltinESMExports();
}

// APIRequestContext (the `request` fixture, page.request, context.request,
// playwright.request.newContext()) talks to the server directly, never
// through context.route. Every verb helper (get, post, ...) calls fetch.
const apiBase = new WeakMap(); // APIRequestContext -> its own baseURL option
function guardApi(proto) {
  if (guarded.has(proto)) return;
  guarded.add(proto);
  const fn = proto.fetch;
  proto.fetch = function (target, options = {}) {
    const url = absolute(typeof target === 'string' ? target : target.url(), apiBase.get(this));
    const method = options.method ?? (typeof target === 'string' ? 'GET' : target.method());
    if (blocks(method, url, options.headers ?? (typeof target === 'string' ? null : target.headers()))) return Promise.reject(refusal(method, url));
    return fn.call(this, target, options);
  };
}

// Every APIRequestContext outside a browser context comes from
// APIRequest.newContext(); patched at load, so it is guarded before the
// scenario's first line, hooks included. (A throwaway context cannot be
// awaited here: the scenario loads this file with require(), which refuses a
// module with top-level await.)
if (R) {
  guardNode();
  const api = Object.getPrototypeOf(request);
  const newContext = api.newContext;
  api.newContext = async function (options, ...rest) {
    const ctx = await newContext.call(this, options, ...rest);
    if (options?.baseURL) apiBase.set(ctx, options.baseURL);
    guardApi(Object.getPrototypeOf(ctx));
    return ctx;
  };
}

// A route handler the scenario registers runs before the fixture's own context
// route, and its continue() would send a write straight out; route.fetch()
// sends one itself. Route is patched from inside the first handler that runs,
// since Playwright hands out no Route before then.
function guardRoute(proto) {
  if (guarded.has(proto)) return;
  guarded.add(proto);
  const target = (route, options) => [options.method ?? route.request().method(), options.url ?? route.request().url(), options.headers ?? route.request().headers()];
  for (const name of ['continue', 'fallback']) {
    const fn = proto[name];
    proto[name] = function (options = {}) {
      return blocks(...target(this, options)) ? this.abort('blockedbyclient') : fn.call(this, options);
    };
  }
  const fetch = proto.fetch;
  proto.fetch = function (options = {}) {
    const [method, url, headers] = target(this, options);
    return blocks(method, url, headers) ? Promise.reject(refusal(method, url)) : fetch.call(this, options);
  };
}

// A WebSocket handler the scenario registers runs before the fixture's own,
// and connectToServer() would open the real socket. Patched, like Route, from
// inside the first handler that runs.
function guardWebSocket(proto) {
  if (guarded.has(proto)) return;
  guarded.add(proto);
  const connect = proto.connectToServer;
  proto.connectToServer = function () {
    if (devSocketAllowed(this.url())) return connect.call(this);
    logBlocked('WEBSOCKET', this.url());
    this.close({ code: 1008, reason: 'blocked by demo-video' });
    throw new Error(`demo-video blocked WEBSOCKET ${this.url()} (set allowWebSockets to permit)`);
  };
}

// True (and logged once per URL) for a dev live-reload socket that may connect.
// The app's origin is the page's own when it is on one, else the baseURL.
function devSocketAllowed(url) {
  const pageUrl = currentPage && !currentPage.isClosed() ? currentPage.url() : '';
  const origin = /^https?:/.test(pageUrl) ? pageUrl : testBase ?? R.baseURL;
  if (!R.allowDevSockets || !isDevSocket(url, origin)) return false;
  if (!allowed.some((a) => a.url === url)) allowed.push({ method: 'WEBSOCKET', url, clip });
  return true;
}

// Counts main-frame loads per top-level step; past MAX_LOADS_PER_STEP the page
// is closed, which fails the running action, and failed.json gets the cause.
function countLoad(page) {
  const step = stepAt?.index ?? -1;
  if (loads.step !== step) loads = { step, byUrl: new Map() };
  const url = page.url();
  const n = (loads.byUrl.get(url) ?? 0) + 1;
  loads.byUrl.set(url, n);
  if (n <= MAX_LOADS_PER_STEP || failError) return;
  failError = RELOAD_MESSAGE;
  failedStep ??= runningStep;
  page.close().catch(() => {});
}

// A stopOn text showed on `page`: fail now rather than let the running
// action wait out its timeout. Closing the page fails that action, and
// failed.json gets this cause, as for a reload loop.
function stopOnSeen(page, text) {
  if (failError) return;
  failError = `page shows ${JSON.stringify(text)} ${runningStep ? `in step ${JSON.stringify(runningStep)}` : 'outside any test.step'}`;
  failedStep ??= runningStep;
  page.close().catch(() => {});
}

// The context route that aborts every write the page sends.
const GUARD_URL = '**/*';
function guardRequest(route) {
  const req = route.request();
  return blocks(req.method(), req.url(), req.headers()) ? route.abort('blockedbyclient') : route.fallback();
}

// Wraps route() and routeWebSocket() on Page or BrowserContext so every
// handler patches Route / WebSocketRoute before it runs; unroute() is given
// the same wrapper back. On a context, unroute('**/*') and unrouteAll() also
// remove the guard's route, so it goes straight back.
const wrappedHandlers = new WeakMap();
function guardRouting(proto, isContext) {
  if (guarded.has(proto)) return;
  guarded.add(proto);
  const { route, unroute, unrouteAll, routeWebSocket } = proto;
  const wrap = (handler, patch) => {
    if (typeof handler !== 'function') return handler;
    if (!wrappedHandlers.has(handler)) {
      wrappedHandlers.set(handler, function (r, ...rest) { patch(Object.getPrototypeOf(r)); return handler.call(this, r, ...rest); });
    }
    return wrappedHandlers.get(handler);
  };
  proto.route = function (url, handler, ...rest) { return route.call(this, url, wrap(handler, guardRoute), ...rest); };
  proto.unroute = async function (url, handler) {
    await unroute.call(this, url, handler && wrappedHandlers.get(handler) || handler);
    // ponytail: re-added after the removal lands, so a request sent in that
    // gap is unguarded; keeping it in place needs Playwright's private route list.
    if (isContext && !handler && url === GUARD_URL) await route.call(this, GUARD_URL, guardRequest);
  };
  proto.unrouteAll = async function (options) {
    await unrouteAll.call(this, options);
    if (isContext) await route.call(this, GUARD_URL, guardRequest);
  };
  if (!R.allowWebSockets) {
    proto.routeWebSocket = function (url, handler) { return routeWebSocket.call(this, url, wrap(handler, guardWebSocket)); };
  }
}

// The per-context part: aborts page writes, closes WebSockets (a write over
// one is invisible to route()), blurs, and paces and guards each new page.
async function guardContext(context, options) {
  guardApi(Object.getPrototypeOf(context.request));
  if (options?.baseURL) apiBase.set(context.request, options.baseURL);
  guardRouting(Object.getPrototypeOf(context), true);
  const onPage = (page) => {
    guardRouting(Object.getPrototypeOf(page), false);
    patchLocator(Object.getPrototypeOf(page.locator('html')));
    page.on('load', () => countLoad(page));
    currentPage ??= page;
  };
  context.pages().forEach(onPage);
  context.on('page', onPage);
  await context.route(GUARD_URL, guardRequest);
  if (!R.allowWebSockets) {
    await context.routeWebSocket('**', (ws) => {
      if (devSocketAllowed(ws.url())) return ws.connectToServer();
      logBlocked('WEBSOCKET', ws.url());
      return ws.close({ code: 1008, reason: 'blocked by demo-video' });
    });
  }
  if (R.blur?.length) await context.addInitScript(blurStyle, `${R.blur.join(',')}{filter:blur(8px)!important}`);
  if (R.stopOn?.length) {
    await context.exposeBinding('__demoStopOn', ({ page }, text) => stopOnSeen(page, text));
    await context.addInitScript(watchStopOn, R.stopOn);
  }
  return context;
}

// Makes `proto[name]` (a context factory) hand back only guarded contexts.
// `at` is the index of its options argument. Marked per method, since one
// prototype has several factories; a missing one (a private API) is skipped.
function guardFactory(proto, name, at) {
  const fn = proto[name];
  if (typeof fn !== 'function' || guarded.has(fn)) return;
  const wrapped = async function (...args) { return guardContext(await fn.apply(this, args), args[at]); };
  guarded.add(wrapped);
  proto[name] = wrapped;
}

// ---- in-page scripts ----

function blurStyle(css) {
  const add = () => {
    if (!document.documentElement || document.getElementById('__demo_blur')) return;
    const s = document.createElement('style');
    s.id = '__demo_blur';
    s.textContent = css;
    document.documentElement.append(s);
  };
  add();
  document.addEventListener('DOMContentLoaded', add);
}

// Reports the first stopOn text in the page's rendered text (innerText skips
// hidden elements), checked every 250 ms. Runs in the page rather than as
// Playwright calls, which would each show in the trace as a step's action.
function watchStopOn(texts) {
  const timer = setInterval(() => {
    const hit = texts.find((t) => document.body?.innerText.includes(t));
    if (hit && window.__demoStopOn) { clearInterval(timer); window.__demoStopOn(hit); }
  }, 250);
}

// ---- fixtures ----

// One worker records one clip (Playwright never shares a worker between
// projects). Auto and worker-scoped, so it is in place before beforeAll and
// before any context exists: browser.newContext() (which browser.newPage()
// and the `context` fixture call) and launchPersistentContext() return only
// guarded contexts. guard.json proves to record.mjs that this ran.
// demoBase keeps the running test's baseURL for relative request URLs.
const guardedTest = !R ? base : base.extend({
  demoGuard: [async ({ browser }, use, workerInfo) => {
    clip = workerInfo.project.name;
    mobile = !!workerInfo.project.use.isMobile;
    mkdirSync(rawDir(), { recursive: true });
    for (const b of blocked) b.clip = clip;
    writeFileSync(path.join(rawDir(), 'blocked.json'), JSON.stringify(blocked, null, 2));
    guardFactory(Object.getPrototypeOf(browser), 'newContext', 0);
    // With context reuse on (PW_TEST_REUSE_CONTEXT, reuseContext) and video
    // off, the `context` fixture calls this private factory instead.
    guardFactory(Object.getPrototypeOf(browser), '_newContextForReuse', 0);
    guardFactory(Object.getPrototypeOf(browser.browserType()), 'launchPersistentContext', 1);
    writeFileSync(path.join(rawDir(), 'guard.json'), JSON.stringify({ installed: true }));
    await use();
    writeFileSync(path.join(rawDir(), 'narration.json'), JSON.stringify(narration, null, 2));
    writeFileSync(path.join(rawDir(), 'holds.json'), JSON.stringify(holds, null, 2));
    writeFileSync(path.join(rawDir(), 'pauses.json'), JSON.stringify(pauses));
    writeFileSync(path.join(rawDir(), 'allowed.json'), JSON.stringify(allowed, null, 2));
    // A step still running here was cut off by the test timeout.
    const step = failedStep ?? runningStep;
    if (step || failError) writeFileSync(path.join(rawDir(), 'failed.json'), JSON.stringify({ step, ...(failError ? { error: failError } : {}) }));
  }, { scope: 'worker', auto: true }],
  demoBase: [async ({ baseURL }, use) => {
    testBase = baseURL ?? null;
    await use();
  }, { auto: true }],
});

// Speaks a caption into voice/<clip>/<index>; {file, duration}, or null
// without a TTS tool.
async function synthFor(title, index) {
  const { ttsAvailable, synth } = await import('./tts.mjs');
  const opts = { engine: R.voiceEngine, voiceboxUrl: R.voiceboxUrl, voice: R.voiceName || undefined };
  const tts = await ttsAvailable(opts);
  if (!tts) return null;
  // Always .wav except for say; synth converts when a clip falls back mid-run.
  const file = path.join('voice', clip, `${index}.${tts.tool === 'say' ? 'aiff' : 'wav'}`);
  mkdirSync(path.join(R.runDir, 'voice', clip), { recursive: true });
  // The clip carries pace.voiceLeadMs of silence up front: placed at its
  // caption's start, the voice follows the caption. duration is the speech alone.
  const duration = await synth(title, path.join(R.runDir, file), { ...opts, rate: R.voiceRate, leadMs: R.pace.voiceLeadMs });
  return { file, duration };
}

// Narration is an extra: a step waits this long for it, drifting, then goes on without.
const SYNTH_MAX_MS = 30000;
const warnLine = (msg) => console.error(`warning: ${String(msg).split('\n')[0]}`);

// test.step becomes a caption: a short lead before its first action, and a hold
// (spent drifting, never still) until the caption has been on screen long
// enough to read and, with voice, to be spoken. Only top-level steps are paced.
// Every test type made from this one (test.extend(), mergeTests()) is paced too:
// each has its own `step`.
function pace(t) {
  const { step, extend } = t;
  const paced = function (title, body, options) {
    if (stepDepth > 0) return step.call(this, title, body, options);
    const index = stepIndex++;
    return step.call(this, title, async (info) => {
      stepDepth++;
      cutOwedMs = 0;
      let synthJob = null;
      let t0 = now();
      stepAt = { index, t0 };
      runningStep = title;
      // A step that opens the first page is seen only once it paints (edit
      // cuts the blank lead-in), so its hold is measured from then.
      const page = currentPage;
      const onLoad = () => { t0 = now(); };
      if (page?.url() === 'about:blank') page.once('load', onLoad);
      try {
        if (R.rehearse) return await body(info);
        // Narration is synthesized while the step acts, so a slow TTS never
        // holds the screen still before the action; only the hold waits for it.
        let voiced; // undefined while synthesizing, then {file, duration} or null
        if (R.voice) {
          synthJob = synthFor(title, index).then((v) => { voiced = v; }, (err) => {
            voiced = null;
            warnLine(`narration for step ${index + 1} failed (${err.message}); recording it without`);
          });
        } else voiced = null;
        await drift(currentPage, R.pace.captionLeadMs);
        const result = await body(info);
        let spoken = 0;
        const waited = now();
        if (voiced === undefined) await drift(currentPage, SYNTH_MAX_MS, () => voiced !== undefined);
        // drift returns early (by up to 60 ms, or at once when the page
        // closes): only a full wait means the voice was slow.
        if (voiced === undefined) {
          warnLine(now() - waited >= SYNTH_MAX_MS - 100 ? `narration for step ${index + 1} took over ${SYNTH_MAX_MS / 1000} s; recording it without`
            : `narration for step ${index + 1} was not ready when the page closed; recording it without`);
        }
        else if (voiced) {
          narration.push({ index, ...voiced });
          spoken = voiced.duration;
        }
        // +20 ms: timers may fire a millisecond early, and the floor is a minimum.
        // The floor applies to the EDITED step. Edit guarantees it by giving
        // back cut time, but a given-back wait may be a still page; adding the
        // cuts seen here as drift keeps that screen time moving instead.
        const holdMs = Math.max(0, stepFloorMs(title, R.pace, spoken) + 20 + cutOwedMs - (now() - t0));
        holds.push({ index, holdMs: Math.round(holdMs), cutMs: Math.round(cutOwedMs) });
        await drift(currentPage, holdMs);
        return result;
      } catch (err) {
        // info.skip() ends a step early and the trace then drops it as skipped,
        // so it gives its caption index, narration and pauses back.
        if (info.annotations?.some((a) => a.type === 'skip')) {
          // The next step reuses this index and its voice file names, so this
          // step's speech must finish writing first (bounded like any wait).
          if (synthJob) await Promise.race([synthJob, sleep(SYNTH_MAX_MS)]);
          stepIndex--;
          narration = narration.filter((n) => n.index !== index);
          pauses = pauses.filter((p) => p.step !== index);
        } else failedStep ??= title;
        throw err;
      } finally {
        page?.off('load', onLoad);
        stepAt = null;
        runningStep = null;
        stepDepth--;
      }
    }, options);
  };
  // test.step.skip stays unwrapped: a skipped step takes no caption index,
  // just as the trace reader leaves it out.
  for (const k of Object.keys(step)) paced[k] = step[k];
  t.step = paced;
  t.extend = function (...args) { return pace(extend.apply(this, args)); };
  return t;
}

export const test = R ? pace(guardedTest) : guardedTest;
export const mergeTests = R ? (...tests) => pace(baseMergeTests(...tests)) : baseMergeTests;
export default test;
