# Showreel Phase 1 plan: scaffold `plugins/showreel` side by side

Status: executing from 2026-10-18. Spec: `docs/40-showreel-design.md` (sections 17, 22 to 24). Evidence: `docs/42-showreel-spike-findings.md`.
Operating model: Claude writes these briefs and reviews every diff; Codex writes code and tests (no browser, no real network); Claude runs anything that
launches a browser, measures timing or touches CI.

**Goal.** A new `plugins/showreel` plugin that validates, installs and tests on Mac, Windows and Linux, with a `doctor` command, a local fixture app and three
CI smoke tests that settle whether capture, H.264 export and 4K memory behave on every OS. `plugins/skills-demo` is not touched.

## Global constraints (copied from the spec)

- Node `^20.19.0 || >=22.12.0`; Playwright exactly `1.63.0`; ES modules; no TypeScript in Phase 1.
- Mac, Windows and Linux. No `say`, `espeak`, `ffmpeg`, Recordly or Voicebox anywhere. No GPL, AGPL or GSAP dependency. No Recordly code.
- State lives in `~/.showreel/` (override with `SHOWREEL_HOME`); nothing is written into a demoed project.
- Plugin name `showreel` (must not start with `claude-` or `anthropic-`); licence MIT; author Ansh Chovatiya.
- No home paths, usernames or emails in committed files. Stage first, then run `python3 scripts/scan-personal-data.py`.
- Codex briefs: do not run git commands; do not edit files outside the paths named in the task.

## File structure

```
plugins/showreel/
  .claude-plugin/plugin.json        manifest (name showreel, version 0.1.0, license MIT)
  LICENSE  CHANGELOG.md  README.md  package.json  package-lock.json
  skills/showreel/SKILL.md          short preview stub (under 40 lines)
  scripts/showreel.mjs              CLI: doctor, init, --help
  scripts/lib/env.mjs               run, which, log, warn, slug, isWindows, PLUGIN_ROOT
  scripts/lib/paths.mjs             HOME_DIR, abs, expandHome, projectDir
  scripts/lib/config.mjs            DEFAULTS, mergeConfig, readConfigFile, template
  scripts/lib/write-rules.mjs       RULE_HEADER, ACTION_NAME, validateAllowWrites
  scripts/lib/doctor.mjs            checks and recommendations
  scripts/lib/fixture-server.mjs    startFixtureServer
  scripts/lib/capture-benchmark.mjs capture-scale benchmark (CSS zoom method)
  scripts/smoke/{export,capture,memory}.mjs
  fixtures/demo-app/                static multi-page site for tests and CI
  test/*.test.mjs                   node:test unit tests (no browser)
```

---

## Task 1: skeleton, manifest and marketplace (Codex)

**Files:** everything under `plugins/showreel/` except `scripts/` and `fixtures/`; modify `.claude-plugin/marketplace.json`, `THIRD_PARTY_NOTICES.md`, root `README.md`.

- `plugin.json`: `{ "name": "showreel", "displayName": "Showreel", "version": "0.1.0", "description": "Turn a web flow into a production-grade demo video with cinematic cursor motion, zoom, captions and narration. Preview release.", "author": { "name": "Ansh Chovatiya" }, "keywords": ["video","demo","playwright"], "license": "MIT" }`.
- `LICENSE`: copy `plugins/skills-demo/LICENSE` unchanged. `CHANGELOG.md`: `## 0.1.0` with one line "Scaffold: doctor, init, fixture app, smoke tests."
- `package.json`: `{ "name":"showreel","private":true,"type":"module","version":"0.1.0","engines":{"node":"^20.19.0 || >=22.12.0"},"scripts":{"test":"node --test test/","smoke":"node scripts/smoke/run-all.mjs"},"dependencies":{"playwright":"1.63.0"},"devDependencies":{"esbuild":"^0.25.0","mediabunny":"^1.40.1"} }`; then run `npm install` with `npm_config_cache` pointed inside the workspace (your sandbox cannot write `~/.npm`) and commit-ready `package-lock.json`.
- `skills/showreel/SKILL.md`: front matter `name: showreel`, `description: Preview of the Showreel demo-video skill (under development). Use only when the user names "showreel" explicitly; for ordinary demo videos use demo-video.` Body (under 40 lines): says it is a preview; lists `node <skill>/scripts/showreel.mjs doctor` and `init`; points to `docs/40-showreel-design.md` of the repository.
- `marketplace.json`: add `{ "name": "showreel", "source": "./plugins/showreel", "description": "<same as plugin.json>" }`.
- `THIRD_PARTY_NOTICES.md`: add rows for `playwright` 1.63.0 (Apache-2.0), `esbuild` (MIT, dev only), `mediabunny` (MPL-2.0, dev only for now).
- Root `README.md`: add `showreel` (preview) to the plugin table with install lines `claude plugin install showreel@agent-workbench`.

**Acceptance:** `claude plugin validate plugins/showreel` passes; `claude plugin validate .` passes; `python3 scripts/check-manifests.py` exits 0; `python3 -m unittest discover -s scripts -p 'test_*.py'` passes.

## Task 2: core libraries with tests (Codex)

**Reuse source (read, then port; do not import from it):** `plugins/skills-demo/skills/demo-video/scripts/lib/{env,paths,config,timeline}.mjs` and `test/{foundation,paths}.test.mjs`. Port only what is listed; drop everything about Recordly, Voicebox, `say`, ffmpeg, captions, pace and rendering.

- `env.mjs`: `PLUGIN_ROOT` (two levels above the lib folder), `isWindows`, `run(cmd, args, opts)` (as old, returns `{code, stdout, stderr}`), `which(bin)` (cross-platform: use `where` on Windows), `log`, `warn`, `slug(s)`.
- `paths.mjs`: `HOME_DIR = path.resolve(process.env.SHOWREEL_HOME || path.join(os.homedir(), '.showreel'))`, `expandHome(p)`, `abs(p)`, `projectDir(name)` returning `<HOME_DIR>/projects/<slug(name)>` and throwing on a name that contains a path separator or is `.` or `..`.
- `write-rules.mjs`: export `RULE_HEADER` and `ACTION_NAME` exactly as in the old `timeline.mjs` (lines 155 and 158) and `validateAllowWrites(rules, label)`, which contains the old `allowWrites` loop from `config.mjs` (non-empty strings, a path before any header condition, a valid `re:` regex, a clear error when a trailing `[x=y]` is not a recognised header form). Throw `Error` with the same message style: `${label}: allowWrites entry ... `.
- `config.mjs`: `DEFAULTS` (frozen) with exactly these keys: `baseURL: null` (required), `project: null`, `viewport: { width: 1920, height: 1080 }`, `captureScale: 'auto'` (one of `'auto'`, `1`, `1.33`, `1.67`, `2`), `fps: 60` (30 or 60), `allowWrites: []`, `allowWebSockets: false`, `allowDevSockets: true`, `blur: []` (CSS selectors), `readyTimeoutMs: 30000`, `settleMs: 2000`, `hygiene: { hideDevOverlays: true, hideScrollbars: true, dismissCookieBanners: true }`, `stopOn: []`. `mergeConfig(user, name)` validates like the old one (unknown top-level or nested keys throw `name: unknown key "x"`; type checks with one-line messages naming the key; `baseURL` must be an http(s) URL; `captureScale` and `fps` enums; positive numbers; `allowWrites` via `validateAllowWrites`). `readConfigFile(file)` and `configTemplate()` returning a JSON string with `baseURL` set to `"http://localhost:3000"` and every default shown.
- Tests (`test/env.test.mjs`, `test/paths.test.mjs`, `test/config.test.mjs`, `test/write-rules.test.mjs`) using `node:test` and `node:assert/strict`; at minimum: defaults are frozen; unknown key rejected with the exact message; each enum and type rule has a passing and a failing case; `projectDir` rejects `../x`, `a/b`, `.`; `HOME_DIR` honours `SHOWREEL_HOME`; every old `allowWrites` rule form (`/path`, `re:...`, `/path [Next-Action=id]`, `/path [Next-Action-Name=x]`, `/path [header:x-y=z]`) validates and each malformed form fails.

**Acceptance:** `cd plugins/showreel && node --test test/` passes on this machine with 0 failures; tests use a temporary `SHOWREEL_HOME`, never the real home; no test needs a browser or the network.

## Task 3: fixture app, doctor (no benchmark) and CLI (Codex)

- `fixtures/demo-app/`: `index.html`, `features.html`, `pricing.html`, `contact.html`, `style.css`, `app.js`. Requirements: plain HTML/CSS/JS, no external requests (no CDN, no web fonts); each page at least 5 screens tall at 1920x1080; a sticky nav with 4 links; on `index.html` a hero with a CSS animation, three cards each with a link labelled exactly `Learn more`, an accordion and a tab switcher (so the Guide-mode resolver gets duplicate labels and interactive widgets); `pricing.html` has three plans each with a `Choose plan` button that shows a toast element (no network); `contact.html` has a form with name, email and message fields whose submit is intercepted by `app.js` (no network) and shows a confirmation. Layout must not depend on viewport width beyond ordinary responsive behaviour (it is used to test the CSS-zoom capture method).
- `scripts/lib/fixture-server.mjs`: `export async function startFixtureServer(dir = <fixtures/demo-app>) { return { url, close } }`: `node:http`, listens on `127.0.0.1` port 0, serves files with correct content types, rejects path traversal (`..`) with 403, `close()` resolves when closed.
- `scripts/lib/doctor.mjs`: `export async function doctor()` returning `{ ok, items, recommendations }`; each item `{ id, level: 'ok'|'warn'|'fail', detail, fix? }` for: `node` (range `^20.19.0 || >=22.12.0`), `platform` (os, arch), `memory` (total RAM; warn under 8 GB), `cpu` (logical cores; warn under 4), `disk` (free space at `HOME_DIR` via `fs.promises.statfs`; warn under 5 GB, fail under 1 GB; create `HOME_DIR` if missing), `home-writable`, `browser` (Playwright Chromium `executablePath()` exists; fix text `npx playwright install chromium`). `recommendations.voiceTier` is `'kokoro'` when RAM is at least 8 GB and cores at least 4, otherwise `'kokoro-low-priority'` (a later phase adds the benchmark). `printDoctor(result)` prints one line per item. Pure functions take their inputs (`{ totalmem, cpus, freeBytes, nodeVersion }`) so they are unit-testable: export `evaluate(inputs)` and unit-test it (`test/doctor.test.mjs`).
- `scripts/showreel.mjs`: `--help`; `doctor [--json]` (exit 1 when any item is `fail`); `init --name <name> --url <baseURL>` writes `<projectDir(name)>/config.json` from `configTemplate()` with the URL filled in, validates it with `readConfigFile`, refuses to overwrite an existing file, prints the path; unknown commands print help and exit 2.
- Tests: `test/fixture-server.test.mjs` (starts the server, fetches `/`, `/features.html`, a missing file (404) and `/../package.json` (403) with Node's `fetch`; no browser), `test/cli.test.mjs` (spawns `node scripts/showreel.mjs` with a temp `SHOWREEL_HOME`: `--help` exit 0, `init` creates a valid config, second `init` fails, unknown command exits 2, `doctor --json` prints parseable JSON).

**Acceptance:** `cd plugins/showreel && node --test test/` passes; `node scripts/showreel.mjs doctor` prints the table on this machine.

## Task 4: capture-scale benchmark and smoke scripts (Codex writes, Claude runs)

Exact method for capture (from spike S2c): viewport `scale x 1920` by `scale x 1080`, deviceScaleFactor 1, then `document.documentElement.style.zoom = String(scale)`; CDP `Page.startScreencast` JPEG quality 90, `everyNthFrame: 1`, `maxWidth/maxHeight` equal to the viewport, ack every frame; the page is scrolled with `mouse.wheel(0, 40)` every 16 ms.

- `scripts/lib/capture-benchmark.mjs`: `export async function benchmarkCapture({ url, scales = [1, 1.33, 1.67, 2], seconds = 4 })` returning `[{ scale, fps, framesDropped (gaps over 50 ms), bytesPerMinute, framePixels: 'WxH' (decode the first JPEG header; no ffmpeg), layoutDrift }]`. `layoutDrift`: for the first element matching each of `nav a`, `h1`, `.card`, `main section` measure `getBoundingClientRect()` at scale 1 and at the scale (divide the scaled box by the scale) and report the mean absolute relative difference of x, y, width and height (0 means identical layout). Export `recommendScale(results)`: the highest scale with `fps >= 50` and `layoutDrift <= 0.02`, else 1. Unit-test `recommendScale` and the JPEG-size reader with fixed inputs (no browser).
- `scripts/smoke/export.mjs`: bundle with esbuild a page script (adapted from `spikes/showreel/s1-export/page.js`: `canEncodeVideo('avc'|'vp9'|'av1')`, then a 3 s 1280x720 30 fps H.264 MP4 through mediabunny `Output`, `Mp4OutputFormat`, `BufferTarget`, `CanvasSource`), serve a blank page from the fixture server origin (secure context), run in bundled Chromium, print and write `{ os, arch, engine, avc, vp9, av1, mp4Bytes, error }` to `smoke-results/export.json` under the plugin folder (git-ignored).
- `scripts/smoke/capture.mjs`: runs `benchmarkCapture` on the fixture server's `/index.html` and writes `smoke-results/capture.json` with `{ os, arch, results, recommended }`.
- `scripts/smoke/memory.mjs`: adapted from `spikes/showreel/s8-memory/` for 3840x2160 at 60 fps for 4 seconds with a `StreamTarget`; writes `smoke-results/memory.json` `{ os, arch, completed, encodeFps, peakJsHeapMb, peakRssMb (null on Windows), error }`; RSS sampling with `ps` on macOS and Linux only.
- `scripts/smoke/run-all.mjs`: runs the three in sequence, never throws on a failed smoke (records the error in its JSON), prints a one-screen summary, exit code 0 always.
- `doctor --benchmark` (extend `scripts/showreel.mjs`): starts the fixture server, runs `benchmarkCapture` with `seconds: 3`, prints the table and `recommended capture scale`.

**Acceptance (Claude runs):** `node scripts/smoke/run-all.mjs` produces the three JSON files on this Mac with `completed` and `avc` true and a recommended scale of 1.33 or higher; unit tests for `recommendScale` pass.

## Task 5: CI three-OS matrix (Claude)

Add a job `showreel` to `.github/workflows/ci.yml`: matrix `os: [ubuntu-latest, macos-latest, windows-latest]`; steps: checkout (pinned SHA already used), `actions/setup-node` (pin to a verified full SHA) with Node 22, `npm ci` in `plugins/showreel`, `npx playwright install --with-deps chromium`, `npm test`, `npm run smoke` with `continue-on-error: true`, upload `plugins/showreel/smoke-results/` as an artifact named `showreel-smoke-${{ matrix.os }}`, and write the JSON to the job summary. Also add the showreel plugin to the `manifests` job checks (already covered by `check-manifests.py`).

**Acceptance:** the three matrix jobs run; unit tests pass on all three; the smoke artifacts exist for all three (a smoke failure is a recorded finding, not a CI failure).

## Task 6: verify, record, push (Claude)

- `claude plugin validate plugins/showreel`, manifest check, root scans, old skill tests unchanged and green, `git status` clean of stray files.
- Write the per-OS smoke findings into `docs/42-showreel-spike-findings.md` (a new "Phase 1: three-OS smoke results" section) and adjust the spec if an OS result contradicts it.
- Commit in logical pieces; scan after staging; push; confirm CI.
- Phase 1 exit criteria: every acceptance line above is satisfied or its failure is recorded with the reason; `skills-demo` untouched.

## Budget and stop rule

0.3 to 0.6M Claude tokens in total. Stop and ask the owner if a task exceeds its share by half, or if any OS shows that H.264 export or capture cannot work (that changes the design).
