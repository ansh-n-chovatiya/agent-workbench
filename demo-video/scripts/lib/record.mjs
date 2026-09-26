// `record <scenario> [--grep <title>] [--show] [--no-recordly] [--voice] [--allow-hooks] [--no-rehearse]`:
// rehearses an unmodified Playwright test unpaced, then records it through the
// demo fixture and collects raw/<clip>/ + record.json. A failed run keeps
// failed.json in a folder renamed <runId>-failed.
import { existsSync, statSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SKILL_ROOT, run, log, warn, playwrightCli, ensureGitignore, inGitRepo } from './env.mjs';
import { resolveProject, deliverFolder, laptopViewport, scenarioSlug, abs } from './paths.mjs';
import { ttsAvailable } from './tts.mjs';
import { ACTION_NAME } from './timeline.mjs';

export const FIXTURE = path.join(SKILL_ROOT, 'scripts', 'lib', 'fixture.mjs');

// Points only the scenario's `@playwright/test` (or `playwright/test`) import
// at the fixture, whether by `from`, `require()` or `import()`; nothing else in
// the file changes. guard.json catches any other way in.
export function rewriteImport(source, fixturePath = FIXTURE) {
  const target = JSON.stringify(fixturePath.split(path.sep).join('/'));
  return source.replace(/(\bfrom\s*|\b(?:require|import)\s*\(\s*)(['"])@?playwright\/test\2/g, `$1${target}`);
}

// YYYY-MM-DD-HHMMSS-<scenario name without .spec/.test and extension>, local
// time, so a second recording of the same scenario gets its own folder.
export function runIdFor(scenarioFile, date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const d = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
  return `${d}-${scenarioSlug(scenarioFile)}`;
}

// Creates and returns a new run folder; an existing one is never reused or
// deleted (earlier runs are the user's), a numeric suffix is added instead.
// outDir is git-ignored whole: recordings show the app's real data.
export async function newRunDir(outDir, runId) {
  // mkdir returns undefined when outDir already existed (a project folder).
  const created = (await mkdir(outDir, { recursive: true })) !== undefined;
  await ensureGitignore(outDir, { created });
  for (let n = 1; ; n++) {
    const dir = path.join(outDir, n === 1 ? runId : `${runId}-${n}`);
    try { await mkdir(dir); return dir; } catch (err) { if (err.code !== 'EEXIST') throw err; }
  }
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// h264 in yuv420p needs even dimensions, so an odd size (a 375x667 phone) is
// rounded up here, before recording, rather than failing at edit time.
const even = (n) => Math.ceil(n / 2) * 2;

// The laptop clip leaves room for the caption band (laptopViewport).
export function clipsFor(config) {
  const { width, height } = laptopViewport(config);
  const clips = [{ name: 'laptop', width, height, mobile: false }];
  if (config.phone.enabled) clips.push({ name: 'phone', width: even(config.phone.width), height: even(config.phone.height), mobile: true });
  return clips;
}

// JSON-report variables are dropped too: they would move Playwright's report
// away from where record reads it, and every recording would then look empty.
const PW_REUSE_ENV = ['PW_TEST_REUSE_CONTEXT', 'PW_TEST_CONNECT_WS_ENDPOINT', 'PW_TEST_CONNECT_HEADERS', 'PW_TEST_CONNECT_EXPOSE_NETWORK',
  'PLAYWRIGHT_JSON_OUTPUT_FILE', 'PLAYWRIGHT_JSON_OUTPUT_NAME', 'PLAYWRIGHT_JSON_OUTPUT_DIR'];

// The project's own `use` settings that change what a locator or the page
// means, not how the recording is made; everything else (viewport, video,
// trace, baseURL, storageState, timeouts, projects) stays the skill's.
export const PROJECT_USE_KEYS = ['testIdAttribute', 'locale', 'timezoneId', 'colorScheme', 'extraHTTPHeaders', 'ignoreHTTPSErrors', 'geolocation', 'permissions'];

function playwrightConfig({ scenarioDir, testFile, pwDir, clips, config, storageState, show, rehearse, esm, projectConfig }) {
  const projects = clips.map((c) => {
    const size = { width: c.width, height: c.height };
    return {
      name: c.name,
      outputDir: path.join(pwDir, c.name),
      use: {
        viewport: size,
        video: rehearse ? 'off' : { mode: 'on', size },
        ...(c.mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {}),
      },
    };
  });
  const cfg = {
    testDir: scenarioDir,
    outputDir: pwDir,
    workers: 1,
    retries: 0,
    fullyParallel: false,
    timeout: config.timeoutMin * 60 * 1000,
    expect: { timeout: rehearse ? config.rehearsalActionTimeoutMs : config.actionTimeoutSec * 1000 },
    reporter: [['list'], ['json', { outputFile: path.join(pwDir, 'report.json') }]],
    use: {
      baseURL: config.baseURL,
      ...(storageState ? { storageState } : {}),
      // Only what edit reads: steps, actions and input points come with any
      // trace; screenshots are needed for the screencast frames that align the
      // video. No DOM snapshots or sources, less of the app kept on disk.
      trace: rehearse ? 'off' : { mode: 'on', snapshots: false, screenshots: true, sources: false },
      // A rehearsal gives an action or expect rehearsalActionTimeoutMs, so a
      // broken locator stops it in seconds. The recording gives one
      // actionTimeoutSec, so a stuck step fails in about a minute, not at
      // timeoutMin; page loads get at least 60 s, as slow pages need.
      ...(rehearse ? { actionTimeout: config.rehearsalActionTimeoutMs }
        : { actionTimeout: config.actionTimeoutSec * 1000, navigationTimeout: Math.max(config.actionTimeoutSec, 60) * 1000 }),
      headless: rehearse || !show,
      serviceWorkers: 'block', // a worker could send writes past the save guard
    },
    projects,
  };
  // Exactly the copied scenario: a glob like **/<name> would also run a
  // same-named spec in a subfolder.
  const match = `^${escapeRe(path.join(scenarioDir, testFile))}$`;
  const q = (f) => JSON.stringify(f.split(path.sep).join('/'));
  // The fixture is loaded first so its Node-level save guard is in place in
  // every Playwright process before any scenario file (or what it imports)
  // runs, and the way the scenario loads it: Playwright's require hook
  // compiles a require()d file to CommonJS and serves that same output to a
  // later import, so an ESM scenario then finds no exports in it; the other
  // way round, a CommonJS scenario's require() would get a second copy.
  const load = esm ? (f) => `await import(${JSON.stringify(pathToFileURL(f).href)})` : (f) => `require(${q(f)})`;
  // The project's config imports its own copy of @playwright/test, which
  // refuses to load beside the skill's (process.__pw_initiator__); only
  // defineConfig and devices are used from it here, so the check is lifted
  // while it loads. Its top-level `use`, then that of its first project
  // that runs every test (no testMatch, testIgnore or grep), supply
  // PROJECT_USE_KEYS. Warned once, from the main process, if it fails.
  const inherit = !projectConfig ? 'const inherited = {};\n' : `let inherited = {};
{
  const saved = process.__pw_initiator__;
  delete process.__pw_initiator__;
  try {
    const m = ${load(projectConfig)};
    const c = (await (m?.default?.default ?? m?.default ?? m)) ?? {};
    const p = (c.projects ?? []).find((p) => !p.testMatch && !p.testIgnore && !p.grep && !p.grepInvert);
    const use = { ...c.use, ...p?.use };
    inherited = Object.fromEntries(${JSON.stringify(PROJECT_USE_KEYS)}.filter((k) => use[k] !== undefined).map((k) => [k, use[k]]));
  } catch (err) {
    if (!process.env.TEST_WORKER_INDEX) console.warn('demo-video: could not load ' + ${q(projectConfig)} + ' (' + String(err?.message ?? err).split('\\n')[0] + '); recording without its use settings');
  } finally {
    process.__pw_initiator__ = saved;
  }
}
`;
  return `// Generated by record.mjs for this run only.\n`
    + `import { createRequire } from 'node:module';\n`
    + `const require = createRequire(import.meta.url);\n`
    + `${load(FIXTURE)};\n`
    + inherit
    + `const cfg = ${JSON.stringify(cfg, null, 2)};\n`
    + `export default { ...cfg, use: { ...inherited, ...cfg.use }, testMatch: new RegExp(${JSON.stringify(match)}) };\n`;
}

const SKIP_DIRS = new Set(['node_modules', 'demo-videos']);
const CODE = /\.[cm]?[jt]sx?$/;

// Relative specifiers in import/export-from, import() and require().
// Type-only imports are erased before running, so they are left out.
const RELATIVE_IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['"])(\.\.?\/[^'"]*)\1/g;
const TYPE_ONLY = /\b(?:import|export)\s+type\b[^;]*?\bfrom\s*(['"])[^'"]*\1/g;
const EXTS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

// The code file a relative specifier loads, as Node and Playwright find it:
// the exact file, the name plus an extension, `.js` written for a `.ts`
// source, or the folder's index file. null for data files and misses.
function resolveCode(file) {
  const noJs = file.replace(/\.[cm]?jsx?$/, '');
  const tries = [file, ...EXTS.map((e) => file + e), ...(noJs !== file ? EXTS.map((e) => noJs + e) : []), ...EXTS.map((e) => path.join(file, `index${e}`))];
  return tries.find((f) => CODE.test(f) && existsSync(f) && statSync(f).isFile()) ?? null;
}

// The scenario and every code file it loads through relative imports,
// transitively: {absolute path: source}. Only these run, so only these are
// checked for hooks and climbing imports and have their `@playwright/test`
// import rewritten; another spec in the same folder is none of the
// recording's business. A relative import above `root` would not resolve in
// the copy, so it stops the recording here with the file named.
export async function scenarioGraph(scenarioPath, root = path.dirname(scenarioPath)) {
  const graph = new Map();
  const walk = async (file) => {
    if (graph.has(file)) return;
    const source = await readFile(file, 'utf8');
    graph.set(file, source);
    for (const [, , spec] of source.replace(TYPE_ONLY, '').matchAll(RELATIVE_IMPORT)) {
      const target = path.resolve(path.dirname(file), spec);
      if (path.relative(root, target).startsWith('..')) {
        throw new Error(`${path.relative(root, file)} imports "${spec}" from outside the scenario's folder; only that folder is copied for recording, so move the scenario up or the helper in`);
      }
      const code = resolveCode(target);
      if (code) await walk(code);
    }
  };
  await walk(scenarioPath);
  return graph;
}

// Copies the scenario's folder (and its subfolders) so sibling files it
// imports or reads (JSON, uploads) are still there, and writes the files in
// `graph` with their `@playwright/test` import pointed at the fixture. Dot
// entries are skipped: .git, saved sessions in .demo, .env files.
// ponytail: copies the whole folder; a scenario at a big project's root copies
// all its sources (not node_modules), fine until someone records from a monorepo root.
export async function copyScenarioTree(srcDir, destDir, graph) {
  await mkdir(destDir, { recursive: true });
  for (const e of await readdir(srcDir, { withFileTypes: true })) {
    const from = path.join(srcDir, e.name);
    const to = path.join(destDir, e.name);
    if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
    if (e.isDirectory()) await copyScenarioTree(from, to, graph);
    else if (graph.has(from)) await writeFile(to, rewriteImport(graph.get(from)));
    else if (e.isFile()) await copyFile(from, to);
  }
}

// Nearest `name` (or first of the names) in `dir` or a folder above it, or null.
function findUp(dir, name) {
  for (let d = dir; ; d = path.dirname(d)) {
    const hit = [].concat(name).map((n) => path.join(d, n)).find(existsSync);
    if (hit) return hit;
    if (d === path.dirname(d)) return null;
  }
}
const PW_CONFIGS = ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs'].map((e) => `playwright.config.${e}`);

// The copy sits outside the project, so bare imports ('@faker-js/faker') and
// tsconfig path aliases ('@/lib/x') would no longer resolve. A node_modules
// symlink puts the project's packages back on Node's lookup path (ESM and CJS
// both walk up into it); `@playwright/test` still reaches the fixture because
// rewriteImport made that import an absolute path. A tsconfig that extends the
// original by absolute path keeps its baseUrl/paths relative to the original.
// fs.rm removes the symlink itself, never its target. Returns whether the
// scenario is ESM.
async function linkProject(srcDir, destDir) {
  const modules = findUp(srcDir, 'node_modules');
  if (modules) await symlink(modules, path.join(destDir, 'node_modules'), 'dir');
  const tsconfig = findUp(srcDir, 'tsconfig.json');
  if (tsconfig) await writeFile(path.join(destDir, 'tsconfig.json'), JSON.stringify({ extends: tsconfig }));
  // Node picks ESM or CommonJS for .js/.ts by the nearest package.json's
  // "type"; the copy has none above it, so it would run an ESM project's
  // scenario as CommonJS (import.meta throws). Nothing else from it is needed.
  const pkg = findUp(srcDir, 'package.json');
  const type = pkg ? (await readJson(pkg, {})).type : null;
  await writeFile(path.join(destDir, 'package.json'), JSON.stringify({ type: type === 'module' ? 'module' : 'commonjs' }));
  return type === 'module';
}

// Setup and cleanup hooks are where scenarios seed and delete data, often
// with a database client the save guard cannot see.
const HOOK = /\b(?:beforeAll|afterAll|beforeEach|afterEach)\s*\(/;
const hasHooks = (graph) => [...graph.values()].some((source) => HOOK.test(source));

const USAGE = 'usage: demo.mjs record <scenario.spec.ts> [--grep <title>] [--show] [--no-recordly] [--voice] [--allow-hooks] [--no-rehearse]';

function parseArgs(argv) {
  const known = ['--show', '--no-recordly', '--voice', '--allow-hooks', '--no-rehearse'];
  const flags = new Set();
  const rest = [];
  let grep = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--grep') { grep = argv[++i]; if (!grep) throw new Error(USAGE); }
    else if (argv[i].startsWith('--')) {
      if (!known.includes(argv[i])) throw new Error(`record: unknown option ${argv[i]} (use --grep, ${known.join(', ')})`);
      flags.add(argv[i]);
    } else rest.push(argv[i]);
  }
  const [scenario] = rest;
  if (!scenario) throw new Error(USAGE);
  return { scenario, grep, show: flags.has('--show'), noRecordly: flags.has('--no-recordly'), voice: flags.has('--voice'), allowHooks: flags.has('--allow-hooks'), rehearse: !flags.has('--no-rehearse') };
}

// [{title, project}] of every test in a Playwright JSON report; the title is
// the test's own, as --grep takes it.
function reportedTests(report) {
  const out = [];
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) for (const t of spec.tests ?? []) out.push({ title: spec.title, project: t.projectName });
    (suite.suites ?? []).forEach(walk);
  };
  (report.suites ?? []).forEach(walk);
  return out;
}

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}

// Playwright names result folders after the test; the single one holding a video is ours.
async function findResult(dir) {
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (e.isDirectory() && existsSync(path.join(dir, e.name, 'video.webm'))) return path.join(dir, e.name);
  }
  return null;
}


// Blocked requests grouped by method, path (origin and query dropped) and
// server-action id (the Next-Action header, when sent), in the order first seen.
export function blockedSummary(blocked) {
  const out = new Map();
  for (const b of blocked) {
    let p = b.url;
    try { p = new URL(b.url).pathname; } catch {}
    const key = `${b.method} ${p} ${b.action ?? ''}`;
    if (out.has(key)) out.get(key).count++;
    else out.set(key, { method: b.method, path: p, ...(b.action ? { action: b.action } : {}), count: 1 });
  }
  return [...out.values()];
}

export const SERVER_ACTION_NOTE = 'frameworks such as Next.js server actions send reads as POST, so a blocked POST may be a read the page needs';

// What to change for each blocked address: one allowWrites entry per distinct
// write path (per server action, when the request named one), the
// server-action note for a POST, and the WebSocket switch. A server action's
// entry names it: every action on a page posts to that page's path, so the
// path alone would let the page's writes through with its reads. By
// "<file>#<export>" when the build's manifest (`actions`, from nextActions)
// knows the id, since ids change with every build; else by the id.
export const actionRule = (b, actions = new Map()) => (!b.action ? b.path
  : actions.has(b.action) ? `${b.path} [Next-Action-Name=${actions.get(b.action)}]` : `${b.path} [Next-Action=${b.action}]`);
export function blockedHints(summary, actions = new Map()) {
  const paths = [...new Set(summary.filter((b) => b.method !== 'WEBSOCKET').map((b) => actionRule(b, actions)))];
  const hints = paths.map((p) => `if ${p} is safe to send, allow it: "allowWrites": [${JSON.stringify(p)}]`);
  if (summary.some((b) => b.action)) hints.push('a server action is allowed by its [Next-Action-Name=<file>#<export>] (or [Next-Action=<id>]) entry; the plain path would allow every action on that page, writes included');
  if (summary.some((b) => b.method === 'POST')) hints.push(SERVER_ACTION_NOTE);
  if (summary.some((b) => b.method === 'WEBSOCKET')) hints.push('a WebSocket was blocked; "allowWebSockets": true lets it connect, but writes over it cannot be guarded');
  return { paths, hints };
}

// The build's server actions, from the server reference manifests of the
// production build and the dev server: Map id -> "<file>#<export>". The build
// folder is `buildDir` (config nextBuildDir), else the nearest .next above the
// scenario; empty when there is none. An action declared inline (a "use
// server" function inside a component) is listed by its order in the file,
// "$$RSC_SERVER_ACTION_<n>"; one exported from a "use server" file by its name.
const NEXT_MANIFESTS = [['server', 'server-reference-manifest.json'], ['dev', 'server', 'server-reference-manifest.json']];
export async function nextActions(scenarioPath, buildDir = findUp(path.dirname(scenarioPath), '.next')) {
  const out = new Map();
  if (!buildDir) return out;
  for (const parts of NEXT_MANIFESTS) {
    const m = await readJson(path.join(buildDir, ...parts), {});
    for (const [id, a] of Object.entries({ ...m.node, ...m.edge })) {
      if (a?.filename && a.exportedName) out.set(id, `${a.filename}#${a.exportedName}`);
    }
  }
  return out;
}

// Swaps each "<path> [Next-Action-Name=<name>]" allowWrites entry for one
// "<path> [Next-Action=<id>]" entry per id `actions` has for that action, so an
// approved action stays approved across rebuilds. <name> is "<file>#<export>"
// or a bare export name found in one file only: two files may export the same
// name, and one of them may write. A name the build does not know stops the
// run, since the entry would otherwise silently allow nothing.
export function resolveActionNames(rules, actions) {
  return rules.flatMap((rule) => {
    const m = rule.match(ACTION_NAME);
    if (!m) return [rule];
    const hits = [...actions].filter(([, key]) => key === m[1] || key.endsWith(`#${m[1]}`));
    const files = new Set(hits.map(([, key]) => key));
    if (!hits.length) throw new Error(`allowWrites entry ${JSON.stringify(rule)}: no server action named "${m[1]}" in the Next.js build's server-reference-manifest.json; build or start the app first, check the name, or set nextBuildDir`);
    if (files.size > 1) throw new Error(`allowWrites entry ${JSON.stringify(rule)}: "${m[1]}" names actions in ${files.size} files (${[...files].join(', ')}); use "<file>#<export>"`);
    return hits.map(([id]) => `${rule.slice(0, m.index)} [Next-Action=${id}]`);
  });
}

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

// {action, locator, timeoutMs, callLog} from the first of Playwright's error
// messages that is an action timing out ("locator.click: Timeout 5000ms
// exceeded" in a rehearsal, "...: Test timeout of ..." in a recording), with
// its "Call log:" lines; the locator is what the first "waiting for" line
// names. null when no message is one.
function waitDetail(messages) {
  for (const m of messages) {
    const text = stripAnsi(m ?? '');
    const head = text.match(/^(?:\w*Error: )?([\w.]+): (?:Test timeout of|Timeout) (\d+)ms exceeded/m);
    if (!head) continue;
    // The call log runs up to the blank line before Playwright's code frame.
    const callLog = (text.split(/\nCall log:\n/)[1] ?? '').split('\n\n')[0].split('\n')
      .map((l) => l.trim().replace(/^- /, '')).filter(Boolean);
    const locator = callLog.map((l) => l.match(/^waiting for (.+?)(?: to be \w+)?$/)?.[1]).find(Boolean) ?? null;
    return { action: head[1], locator, timeoutMs: Number(head[2]), callLog };
  }
  return null;
}

// A locator that picks its element by visible text or accessible name: when
// it matches nothing, the usual cause is text that differs slightly on the
// page ("Site-feed" for "Site feed").
const BY_TEXT = /\{ name: |getBy(?:Text|Label|Placeholder|AltText|Title)\(|hasText|text=/;
const waitNote = (w) => (!w?.locator ? ''
  : ` waiting for ${w.locator}${BY_TEXT.test(w.locator) ? `; no element matched ${w.locator}; check the exact text on the page` : ''}`);

// [{title, project, status, error, messages}] of every test in a Playwright
// JSON report; `error` is the first line, `messages` every error in full.
function reportedResults(report) {
  const out = [];
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const r = t.results?.at(-1);
        const error = r?.error?.message ?? r?.errors?.[0]?.message;
        const messages = [r?.error?.message, ...(r?.errors ?? []).map((e) => e.message)].filter(Boolean);
        out.push({ title: spec.title, project: t.projectName, status: r?.status, error: error && stripAnsi(error).trim().split('\n')[0], messages });
      }
    }
    (suite.suites ?? []).forEach(walk);
  };
  (report.suites ?? []).forEach(walk);
  return out;
}

// What the fixture left in <dir>/raw/<clip>/ for every clip.
async function collect(dir, clips) {
  const got = { blocked: [], allowed: [], failure: null, unguarded: [] };
  for (const c of clips) {
    const raw = path.join(dir, 'raw', c.name);
    if (!existsSync(path.join(raw, 'guard.json'))) got.unguarded.push(c.name);
    got.blocked.push(...await readJson(path.join(raw, 'blocked.json'), []));
    got.allowed.push(...await readJson(path.join(raw, 'allowed.json'), []));
    const failed = await readJson(path.join(raw, 'failed.json'), null);
    if (failed && !got.failure) got.failure = { clip: c.name, ...failed };
  }
  return got;
}

// {clip, step, error} when the run failed, else null. `what` names the run in
// the message ("scenario" or "rehearsal").
function problemOf({ result, report, got, clips, config, what }) {
  const results = reportedResults(report);
  if (got.unguarded.length && results.length) {
    return { error: `the save guard never ran for ${got.unguarded.join(', ')}: the scenario must take \`test\` from its own "@playwright/test" import, not another route in, so its writes may have gone out` };
  }
  const bad = results.find((r) => r.status && r.status !== 'passed' && r.status !== 'skipped');
  if (result.code !== 0 || bad) {
    const f = got.failure ?? {};
    const clip = f.clip ?? bad?.project;
    const where = f.step ? `in step "${f.step}" (${clip})` : `outside any test.step${clip ? ` (${clip})` : ''}`;
    // What a timed-out action was waiting for, kept whole for failed.json.
    const wait = f.error ? null : waitDetail(bad?.messages ?? []);
    const detail = wait ? { ...wait } : {};
    if (!f.error && (bad?.status === 'timedOut' || /Test timeout/.test(bad?.error ?? ''))) {
      const on = wait ? `: ${wait.action} was${waitNote(wait)}` : '';
      return { clip, step: f.step, ...detail, error: `${what} timed out after ${config.timeoutMin} min ${where}${on}; raise timeoutMin if the app is only slow` };
    }
    const error = f.error || bad?.error
      || (result.stdout + result.stderr).split('\n').map((l) => stripAnsi(l).trim()).find((l) => /^(\w*Error|Test timeout)/.test(l))
      || `playwright exited ${result.code}`;
    const slow = /Timeout \d+ms exceeded|Timed out \d+ms waiting/.test(error);
    const slowHint = !slow ? ''
      : what === 'rehearsal' ? '; if the app is only slow, raise rehearsalActionTimeoutMs (or record with --no-rehearse)'
        : '; if the app is only slow, raise actionTimeoutSec';
    const shown = wait ? `${error.replace(/\.$/, '')}${waitNote(wait)}` : error;
    return { clip, step: f.step, ...detail, error: `${what} failed ${where}: ${shown}${slowHint}` };
  }
  const perProject = clips.map((c) => [c.name, results.filter((t) => t.project === c.name).length]).filter(([, n]) => n !== 1);
  if (perProject.length) return { error: `expected exactly one test per clip, Playwright ran ${perProject.map(([c, n]) => `${n} for ${c}`).join(', ')}` };
  return null;
}

// Writes failed.json, drops what could leak (traces with request headers and
// cookies, the scenario copy), renames the run <runId>-failed, prints the
// cause in at most four lines and throws.
// `detail` is a timed-out action's {action, locator, timeoutMs, callLog}.
async function failRun(runDir, clips, { clip = null, step = null, error, ...detail }, blockedList, actions) {
  const blocked = blockedSummary(blockedList);
  const { paths, hints } = blockedHints(blocked, actions);
  await writeFile(path.join(runDir, 'failed.json'), JSON.stringify({ clip, step, error, ...detail, blocked, hints }, null, 2));
  for (const c of clips) await rm(path.join(runDir, 'raw', c.name, 'trace.zip'), { force: true });
  for (const d of ['scenario', 'pw', 'rehearse']) await rm(path.join(runDir, d), { recursive: true, force: true });
  const failedDir = `${runDir}-failed`;
  await rename(runDir, failedDir);
  if (blocked.length) {
    warn(`blocked during the run: ${blocked.map((b) => `${b.method} ${b.path} x${b.count}`).join(', ')}`);
    if (paths.length) warn(`if these are safe to send, add to the config: "allowWrites": ${JSON.stringify(paths)}`);
    if (blocked.some((b) => b.action)) warn(hints.find((h) => h.startsWith('a server action')));
    warn(blocked.some((b) => b.method === 'POST') ? SERVER_ACTION_NOTE : hints.at(-1));
  }
  throw new Error(`${error} (details: ${path.join(failedDir, 'failed.json')})`);
}

export async function main(argv, ctx) {
  const args = parseArgs(argv);
  const { cwd } = ctx;
  const { config, runsDir, authFile, nextBuildDir } = await resolveProject({ cwd, configFlag: ctx.configFlag });
  const scenarioPath = path.resolve(cwd, args.scenario);
  if (!existsSync(scenarioPath)) throw new Error(`scenario not found: ${abs(scenarioPath)}`);
  const actions = await nextActions(scenarioPath, nextBuildDir ?? undefined);
  const allowWrites = resolveActionNames(config.allowWrites, actions);
  // Each run copies the scenario's folder into the run; runs kept inside that
  // folder would be copied into every later run, nested ever deeper.
  if (!path.relative(path.dirname(scenarioPath), runsDir).startsWith('..')) {
    throw new Error(`outDir ${abs(runsDir)} is inside the scenario's folder ${abs(path.dirname(scenarioPath))}, which every run copies; set outDir to a folder outside it`);
  }

  const recordly = args.noRecordly ? false
    : config.recordly === 'auto' ? !!ctx.doctor?.items?.find((i) => i.name === 'Recordly')?.ok
      : config.recordly;
  let voice = args.voice;
  if (voice && !(await ttsAvailable())) {
    log('No text-to-speech tool found (say, espeak-ng or espeak); recording without narration.');
    voice = false;
  }

  const date = new Date();
  const runDir = await newRunDir(runsDir, runIdFor(scenarioPath, date));
  const runId = path.basename(runDir);
  const scenarioDir = path.join(runDir, 'scenario');
  const pwDir = path.join(runDir, 'pw');

  const testFile = path.basename(scenarioPath);
  let esm;
  try {
    const graph = await scenarioGraph(scenarioPath);
    if (!args.allowHooks && hasHooks(graph)) {
      throw new Error('scenario has setup/cleanup hooks, which can write with code the guard cannot see (e.g. database clients); remove them or pass --allow-hooks');
    }
    await copyScenarioTree(path.dirname(scenarioPath), scenarioDir, graph);
    esm = await linkProject(path.dirname(scenarioPath), scenarioDir);
  } catch (err) {
    await rm(runDir, { recursive: true, force: true }); // only the folder made just above
    throw err;
  }
  // The saved session holds login cookies; one kept inside the project must stay out of git.
  if (existsSync(authFile) && !path.relative(cwd, authFile).startsWith('..')) {
    if (path.dirname(authFile) === path.resolve(cwd)) { if (inGitRepo(cwd)) warn(`${abs(authFile)} holds login cookies; add it to .gitignore`); }
    else await ensureGitignore(path.dirname(authFile), { file: abs(authFile) });
  }
  const clips = clipsFor(config);
  const projectConfig = findUp(path.dirname(scenarioPath), PW_CONFIGS);
  const writeConfig = async (name, dir, rehearse) => {
    const file = path.join(scenarioDir, name);
    await writeFile(file, playwrightConfig({
      scenarioDir, testFile, pwDir: path.join(dir, 'pw'), clips, config, show: args.show, rehearse, esm, projectConfig,
      storageState: existsSync(authFile) ? authFile : null,
    }));
    return file;
  };
  const configFile = await writeConfig('playwright.config.mjs', runDir, false);

  // Set by the Playwright VS Code extension in its terminals: reuse would
  // build contexts outside the recording's own settings, and a connect
  // endpoint would record in another, possibly remote, browser.
  const childEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !PW_REUSE_ENV.includes(k)));
  const pw = (file, extra = [], quiet = false) => run(process.execPath, [playwrightCli(), 'test', '--config', file, ...(args.grep ? ['--grep', escapeRe(args.grep)] : []), ...extra], { cwd: scenarioDir, quiet, env: childEnv() });

  // Set before listing: listing runs the scenario's module-level code, which
  // the fixture must already guard.
  const setEnv = (over = {}) => {
    process.env.DEMO_RECORD = JSON.stringify({
      runDir, baseURL: config.baseURL, voice, voiceName: config.voice.name, voiceRate: config.voice.rate, pace: config.pace,
      allowWrites, allowWebSockets: config.allowWebSockets, allowDevSockets: config.allowDevSockets,
      blur: config.blur, busySelector: config.busySelector, maxWaitMs: config.maxWaitMs, stopOn: config.stopOn, ...over,
    });
  };
  setEnv();
  process.env.DEMO_SELFTEST_URL = pathToFileURL(path.join(SKILL_ROOT, 'templates', 'selftest', 'index.html')).href;

  // One recording is one test: a spec with several would record them all into
  // one run and mix their steps, so pick one with --grep.
  const listed = await pw(configFile, ['--list', '--reporter=json'], true);
  let report = null;
  // The project's config and the scenario load in this process, so a line they
  // print (dotenv, a banner) can sit in front of the report: parse from the
  // first line that opens the JSON object.
  const start = listed.stdout.search(/^\{/m);
  try { report = JSON.parse(start >= 0 ? listed.stdout.slice(start) : listed.stdout); } catch {}
  const titles = [...new Set(reportedTests(report ?? {}).map((t) => t.title))];
  if (titles.length !== 1) {
    await rm(runDir, { recursive: true, force: true }); // only the folder made above
    // A --grep that matches nothing is reported as "No tests found"; any
    // other error is the file failing to load, and is the real cause.
    const loadError = report ? report.errors?.map((e) => e.message).find((m) => !/^Error: No tests found/.test(stripAnsi(m ?? '').trim())) : listed.stderr || listed.stdout;
    if (loadError) throw new Error(`could not list the tests in ${args.scenario}: ${loadError.trim().split('\n')[0]}`);
    const names = titles.map((t) => `"${t}"`).join(', ') || 'none';
    throw new Error(args.grep
      ? `--grep "${args.grep}" must match exactly one test in ${args.scenario}; it matched ${titles.length}: ${names}`
      : `${args.scenario} has ${titles.length} tests; record one with --grep "<title>": ${names}`);
  }

  if (config.allowWebSockets) warn('allowWebSockets is on: writes sent over a WebSocket cannot be guarded.');

  // Rehearsal: the same scenario behind the same guard, unpaced, with no
  // video or trace and short action timeouts, so a broken locator or assertion
  // stops the run in seconds instead of after a full paced recording.
  if (args.rehearse) {
    // Names the scenario so a run that fails here is still matched, and
    // deleted, by the cleanup after a later good recording of it.
    await writeFile(path.join(runDir, 'record.json'), JSON.stringify({ scenario: args.scenario }, null, 2));
    const dir = path.join(runDir, 'rehearse');
    const file = await writeConfig('playwright.rehearse.mjs', dir, true);
    setEnv({ runDir: dir, rehearse: true, voice: false });
    log(`Rehearsing ${args.scenario} (unpaced; --no-rehearse skips this)`);
    const t0 = Date.now();
    const result = await pw(file, [], true);
    const got = await collect(dir, clips);
    const problem = problemOf({ result, report: await readJson(path.join(dir, 'pw', 'report.json'), {}), got, clips, config, what: 'rehearsal' });
    if (problem) await failRun(runDir, clips, problem, got.blocked, actions);
    await rm(dir, { recursive: true, force: true });
    log(`Rehearsal passed in ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
    setEnv();
  }

  const startedAt = new Date().toISOString();
  log(`Recording ${args.scenario} -> ${abs(runDir)}`);
  const result = await pw(configFile);

  const narration = {};
  const holds = {};
  const missing = [];
  for (const c of clips) {
    const raw = path.join(runDir, 'raw', c.name);
    await mkdir(raw, { recursive: true });
    const res = await findResult(path.join(pwDir, c.name));
    for (const f of ['video.webm', 'trace.zip']) {
      if (res && existsSync(path.join(res, f))) await rename(path.join(res, f), path.join(raw, f));
      else missing.push(`${c.name}/${f}`);
    }
    if (voice) narration[c.name] = await readJson(path.join(raw, 'narration.json'), []);
    holds[c.name] = await readJson(path.join(raw, 'holds.json'), []);
  }
  const got = await collect(runDir, clips);
  const pwReport = await readJson(path.join(pwDir, 'report.json'), {});
  // pw/ holds Playwright's own copies (traces with network headers and
  // cookies, error pages); what is needed was moved to raw/ above.
  await rm(pwDir, { recursive: true, force: true });

  const { band } = laptopViewport(config);
  const record = {
    version: 1,
    scenario: args.scenario,
    runId,
    startedAt,
    clips,
    layout: { mode: config.caption.mode, band },
    deliver: deliverFolder(config, scenarioSlug(scenarioPath), date),
    blocked: got.blocked,
    allowed: got.allowed,
    holds,
    recordly,
    // render skips Recordly for a run recorded with --no-recordly.
    ...(args.noRecordly ? { noRecordly: true } : {}),
    voice,
    config,
    ...(voice ? { narration } : {}),
  };
  await writeFile(path.join(runDir, 'record.json'), JSON.stringify(record, null, 2));

  const problem = problemOf({ result, report: pwReport, got, clips, config, what: 'scenario' })
    ?? (missing.length ? { error: `recording finished but ${missing.join(', ')} is missing` } : null);
  if (problem) await failRun(runDir, clips, problem, got.blocked, actions);

  // This scenario now has a good run; its earlier failed ones only confuse.
  const failedRun = new RegExp(`^\\d{4}-\\d{2}-\\d{2}-\\d{6}-${escapeRe(scenarioSlug(scenarioPath))}(-\\d+)?-failed$`);
  for (const name of await readdir(runsDir)) {
    if (!failedRun.test(name)) continue;
    // The name alone cannot tell "signup" from "signup-2"; the run's own record can.
    const rec = await readJson(path.join(runsDir, name, 'record.json'), {});
    if (rec.scenario === args.scenario) await rm(path.join(runsDir, name), { recursive: true, force: true });
  }
  log(`Recorded ${clips.map((c) => c.name).join(' + ')} -> ${abs(runDir)}; ${got.blocked.length} write request(s) blocked${got.allowed.length ? `, ${got.allowed.length} dev socket(s) allowed` : ''}.`);
  return 0;
}
