# Showreel Phase 3 plan: the recorder

Status: executing from 2026-10-18. Spec: `docs/40-showreel-design.md` (sections 4, 6, 22 to 26). Evidence: `docs/42-showreel-spike-findings.md`
(S1, S2, S2b, S2c, S8, Phase 1 smoke results). Operating model as before: Claude writes briefs and reviews every diff; Codex writes code and unit tests
(no browser, no local ports, no `~/.npm` writes); Claude runs everything that launches a browser and fixes what it finds.

**Goal.** `showreel record --name N` runs `scenario.json` in a real browser with human-like cursor motion and produces, in
`~/.showreel/projects/N/runs/<runId>/`, an H.264 `raw.mp4` plus `events.json` (everything the compositor will need to draw cursor, zoom and captions) and
`record.json` (what happened). Nothing here composes the final video.

> **Cursor motion revised 2026-10-18 after owner feedback** ("smooth, not robotic, easy to follow, visually good"): no overshoot, no jitter, one one-sided arc, duration `clamp(220 + 120 log2(1 + D/40), 320, 1300) x (0.97 to 1.03)`, speed `jerk(tau^0.8)` (peak near 42%), target point in the central 30% of the element. The Task A cursor section below describes the first version.

## Design decisions (and why)

1. **The cursor is drawn in post from a planned path.** The real page mouse only needs coarse moves (about 20 Hz) so hover states fire. Scripted input
   lowers the screencast rate by itself (about 42 versus 60 fps on this Mac, S2c), so dense moves would cost frames; a drawn cursor can be perfectly smooth,
   restyled and re-timed in the editor. `events.json` carries the dense planned path (60 Hz) and the real dispatch times.
2. **Real-time encoding with a bounded queue.** Screencast JPEG frames stream to a hidden encoder page (WebCodecs through mediabunny), which writes H.264
   chunks back to disk. If the encoder lags, new frames are **dropped** (counted), never spooled: the video is variable frame rate with timestamps, so a
   dropped frame cannot desync it. Raw JPEG storage is ruled out (about 500 MB to 1.2 GB per minute).
3. **Frames travel over loopback HTTP, not base64 through `evaluate`.** The encoder page long-polls `GET /next` (binary JPEG, header `x-ts` in seconds) and
   posts `POST /chunk` (binary). No new dependency, secure context (loopback), efficient.
4. **Pages bundled at release time, not at run time.** The encoder page imports mediabunny; a `scripts/build.mjs` bundles it with esbuild into
   `dist/encoder-page.js` which is committed, and a test fails if `dist/` is older than its sources (same rule as the editor bundle). `esbuild` stays a
   dev dependency.
5. **Capture scale is decided per run:** config `captureScale` a number, or `auto` = the stored benchmark choice (`HOME_DIR/benchmark.json`), else a quick
   pipeline benchmark at record start; then a **layout guard** compares element boxes at scale 1 and at the chosen scale against the scale-1 noise floor and
   falls back to 1 when the excess drift is above 0.02.
6. **Safety first, as in the old skill:** non-GET/HEAD/OPTIONS requests are blocked unless an `allowWrites` rule allows them; pending secrets stop the run
   before the browser opens; the skill never types a password it does not have (secrets come from `SHOWREEL_SECRET_<STEPID>` environment variables).
7. **Out of this phase:** phone/vertical recording (Phase 7), the 2x hybrid zoom layer (Phase 4 follow-up), Next.js `Next-Action-Name` rule resolution and
   other old-skill parity features (Phase 9), the compositor and editor.

## Global constraints

All earlier constraints apply (Node range, Playwright 1.63.0 exactly, ES modules, no ffmpeg or OS speech tools, MIT, stage before scanning, no home paths or
emails in committed files, `fileURLToPath` instead of `.pathname`). Times in files are **seconds from the first encoded frame**; coordinates are **CSS pixels
at scale 1** (frame pixel = CSS pixel x capture scale). Seeded randomness only (same seed gives the same motion): seed = a string hash of
`<stepId>:<actionIndex>`. Codex: no git commands, only the paths named, never touch `plugins/skills-demo/`, no `npm install`, no browser, no ports.

## File structure (new under `plugins/showreel/` unless noted)

```
scripts/lib/record/rng.mjs               seeded PRNG (mulberry32) and string hash
scripts/lib/record/cursor-path.mjs       planMove, dwellMs, pressMs, typingDelays, holdMs
scripts/lib/record/write-guard.mjs       isWriteAllowed, installWriteGuard
scripts/lib/record/hygiene.mjs           hygieneScript, dismissCookieBanners
scripts/lib/record/schemas.mjs           validateEvents, validateRecord (versioned)
scripts/lib/record/scale.mjs             chooseScale (pure)
scripts/lib/record/preflight.mjs         secrets, disk, scenario checks (pure parts)
scripts/lib/record/frame-sink.mjs        startEncoder: loopback HTTP + hidden encoder page
scripts/lib/record/encoder-page.js       browser code (bundled into dist/)
scripts/lib/record/recorder.mjs          orchestrates a run
scripts/lib/record/cursor-demo.mjs       page that plays planned cursor moves for review
scripts/build.mjs                        esbuild bundles into dist/ (committed)
dist/encoder-page.js                     committed bundle
scripts/showreel.mjs                     add: record, login, runs, cursor-demo; doctor --benchmark gains pipeline mode
fixtures/demo-app/                       add POST /api/choose (server), nextjs-portal test element page
test/*.test.mjs  test-browser/*.browser.mjs
```

---

## Task A: pure logic and schemas (Codex)

All files pure (no browser, no network), each with unit tests in `test/record-*.test.mjs`.

### `rng.mjs`
`hashString(s)` -> unsigned 32-bit (FNV-1a); `mulberry32(seed)` -> `() => number in [0,1)`; `rngFor(key)` = `mulberry32(hashString(key))`.

### `cursor-path.mjs` (the heart; every number below is a requirement)
- `planMove(from, to, { key, hz = 60 })` returns `{ durationMs, samples: [{ t, x, y }] }` (`t` in ms from 0).
  - `D` = distance. If `D < 2`: one sample at `to`, duration 0.
  - Duration `T = clamp(180 + 110 * log2(1 + D / 40), 280, 1100) * (0.9 + 0.2 * rng())` (Fitts-style, seeded).
  - Curve: cubic Bezier from `from` to the move target with control points at 30% and 70% of the way plus a perpendicular offset each, magnitude
    `D * 0.06 * (rng() * 2 - 1)` capped at 40 px (so the path arcs gently, never a straight line unless the offset is tiny).
  - Progress along the curve uses **minimum-jerk** `s(tau) = 10 tau^3 - 15 tau^4 + 6 tau^5`.
  - **Overshoot** when `D > 350`: the first segment ends `min(18, 0.03 D)` px beyond `to` along the move direction after 88% of `T`, then a short
    minimum-jerk correction segment returns to `to` over the last 12%.
  - **Jitter**: two low-frequency sine components with seeded phase, total amplitude at most 0.6 px, tapering to exactly 0 over the last 15% so the last
    sample equals `to` exactly. The first sample equals `from` exactly.
  - Samples every `1000 / hz` ms; the final sample is at `t = durationMs` exactly; `t` strictly increasing.
- `dwellMs(key)`: 110 to 230 (before a click). `pressMs(key)`: 60 to 110 (button held). `settleAfterClickMs(key)`: 250 to 450.
- `typingDelays(text, { cps = 14, key })`: array (one per character) of ms delays: base `1000 / cps` times `(0.65 + 0.7 * rng())`; add 60 to 140 ms after a space or
  `, . ; : ! ?`; with probability 0.03 add a 150 to 300 ms hesitation; every delay at least 25 ms.
- `holdMs({ caption, narration, explicit })`: `explicit` when a number (0 to 10000); else `max(1800, caption.length * 55)`, raised to `words(narration) * 400` when narration exists; capped at 15000.
- `targetPoint(box, { key })`: a point inside `box` ({x,y,w,h}) within its central 50% in each axis (seeded), at least 4 px inside every edge; boxes smaller than 8 px use the centre.

### `write-guard.mjs`
- `isWriteAllowed({ method, url, headers }, rules)`: GET, HEAD, OPTIONS always allowed (case-insensitive method). Otherwise allowed when any rule matches:
  `/path` or any plain string: `url.includes(rule)`; `re:<regex>`: `new RegExp(regex).test(url)`; `<target> [Next-Action=<id>]`: target matches by the rules above and header
  `next-action` equals `<id>`; `<target> [header:<name>=<value>]`: target matches and that header equals the value (header names case-insensitive). `[Next-Action-Name=...]` rules never
  match at run time in this phase (documented limitation). Reuse `RULE_HEADER` from `write-rules.mjs`.
- `installWriteGuard(context, { allowWrites, allowWebSockets = false, allowDevSockets = true, onBlocked })`: `context.route('**/*', ...)` continues allowed requests, aborts blocked
  ones with `blockedbyclient` and calls `onBlocked({ method, url, t })`; also `context.routeWebSocket` (when available) blocks WebSockets unless allowed (a dev-socket URL is one
  whose path contains `/_next/webpack-hmr`, `/sockjs-node`, `/__vite_hmr`, `/ws` on localhost or 127.0.0.1). Returns `{ blocked: () => [...] }`. Unit-test `isWriteAllowed` exhaustively; the install function takes a minimal fake context in tests.

### `hygiene.mjs`
- `hygieneScript(options)` returns a string for `context.addInitScript` that (when each option is true; defaults all true): injects CSS hiding known dev overlays
  (`nextjs-portal`, `#__next-build-watcher`, `[data-nextjs-toast]`, `[data-nextjs-dialog-overlay]`, `#vite-plugin-checker-error-overlay`, `[data-radix-toast-viewport] ~ .rq-devtools`,
  `.tsqd-parent-container`, `#react-refresh-overlay`) and scrollbars (`::-webkit-scrollbar{display:none!important}` and `*{scrollbar-width:none!important}`); installs nothing else. Pure string builder, unit-tested for the selectors and for each option switching its part off.
- `dismissCookieBanners(page)`: runs in the page once after load: looks for visible `[role=dialog], [id*=cookie i], [class*=cookie i], [id*=consent i], [class*=consent i]` elements and clicks the first visible button inside whose text matches `/^(accept( all)?|agree|allow all|got it|ok(ay)?|i understand)$/i`; returns the clicked text or null. (Browser code: keep it in a function exported for Task B to call; unit-test only the text regex through an exported `ACCEPT_TEXT`.)

### `schemas.mjs`
- `validateEvents(e)` and `validateRecord(r)` return `{ ok, errors }` (collect all errors). `events.json` (version 1): `{ version, viewport: {width,height}, scale, steps: [{ id, tStart, tEnd, holdStart }], cursor: [{ t, x, y }], clicks: [{ t, x, y, stepId, tab }], keys: [{ t, stepId, count }], targets: [{ stepId, t, kind: 'click'|'fill'|'press', box: {x,y,w,h}, sensitive }], moves: [{ t, x, y }], blocked: [{ t, method, url }], tabs: [{ t, index, url }] }`. Rules: all `t` are finite numbers >= 0 and non-decreasing within each array; steps ordered with `tStart <= holdStart <= tEnd`; `scale` in 1 to 2; boxes have positive width and height; `keys` never carry text. `record.json` (version 1): `{ version, projectName, runId, startedAt (ISO), scale: { requested, used, reason }, fps: { nominal, effective, dropped, maxBacklog }, video: { file, width, height, durationSec, bytes }, durationSec, warnings: string[] }`.

### `scale.mjs`
`chooseScale({ requested, benchmarkScale, layoutDriftExcess, minFps50 })`: `requested` a number in the allowed set (1, 1.33, 1.67, 2) is used as is but forced to 1 when `layoutDriftExcess > 0.02`
(reason `layout guard`); `'auto'` uses `benchmarkScale` (reason `benchmark`), else 1 (reason `no benchmark`); returns `{ used, reason }`.

### `preflight.mjs`
`pendingSecrets(scenario, env)`: steps whose sensitive fill has no `env['SHOWREEL_SECRET_' + stepId.toUpperCase()]`; `checkDisk(freeBytes, expectedMinutes, scale)`: estimates `expectedMinutes * 60 * 80 MB * scale^2` of encoded output headroom worst case (video is H.264, far smaller than JPEG) and returns `{ ok, needBytes }` failing under 2 GB free; `checkScenario(scenario)` returns the list of steps (with ids) to run and rejects an empty scenario. Unit-test each.

**Acceptance:** `cd plugins/showreel && npm test` passes (Phase 1 fixture-server tests may fail only if your sandbox cannot bind a port; say so).

---

## Task B: encoder pipeline, recorder, CLI, fixture additions, browser tests (Codex writes, Claude runs)

Reference code to read and adapt (do not import): `spikes/showreel/s1-export/page.js` (mediabunny H.264), `spikes/showreel/s2c-capture/run.mjs` and `plugins/showreel/scripts/lib/capture-benchmark.mjs`
(CSS-zoom capture and measurement), `spikes/showreel/s8-memory/page.js` (streaming target), and the Phase 2 recorder `scripts/lib/guide/*`.

### `encoder-page.js` and `frame-sink.mjs`
- `startEncoder({ browser, width, height, outFile, maxBacklog = 8 })` starts a loopback HTTP server (port 0, 127.0.0.1) serving a tiny HTML page that loads `dist/encoder-page.js`, opens it in a **new page of the same browser**, and returns `{ push(jpegBuffer, tsSeconds), finish() }`.
  - The page loops: `fetch('/next')` (long poll; Node answers with the next queued JPEG, header `x-ts`; `204` ends the loop), `createImageBitmap(new Blob([bytes], {type: 'image/jpeg'}))`, `new VideoFrame(bitmap, { timestamp: Math.round(ts * 1e6) })`, encodes with mediabunny `Output` + `Mp4OutputFormat` + `StreamTarget` + `CanvasSource` or `VideoSampleSource` (whichever supports explicit timestamps; verify against the installed `mediabunny` typings), `codec: 'avc'`, bitrate scaled with pixels (`width * height * 6` bit/s, capped at 60 Mbit/s), a keyframe every 2 s; writes each muxer chunk with `POST /chunk` (position in header `x-pos`; Node writes it at that offset with a file handle, because MP4 finalisation patches earlier bytes).
  - **Backlog rule:** `push()` drops the frame when more than `maxBacklog` frames are queued and increments a counter; `finish()` signals `204`, waits for the page to finalise (`window.__done`), closes the file, and returns `{ frames, dropped, maxBacklog, bytes, firstTs, lastTs }`. Timestamps are rebased so the first frame is 0.
  - If `VideoEncoder.isConfigSupported` is false for H.264 at the size, fall back to VP9 inside MP4 and record `codec` in the stats; if neither works, throw `Cannot encode video in this browser`.
- `scripts/build.mjs`: bundles `scripts/lib/record/encoder-page.js` with esbuild (`iife`, `browser`, minify off) into `dist/encoder-page.js`, with a header comment holding the SHA-256 of the source files; `test/dist-current.test.mjs` recomputes the hash and fails with `run npm run build` when it differs. Add `"build": "node scripts/build.mjs"` to `package.json`. Codex cannot run esbuild successfully in its sandbox if it needs a port or write outside the workspace; if the build cannot be run, say so and Claude will run it.

### `recorder.mjs`: `recordScenario({ name, headless = true, scale, fps = 60, log })`
Steps, in order:
1. Read `config.json` (defaults if absent), `brief.json`, `scenario.json`; `validateScenario` must be ok; `pendingSecrets(scenario, process.env)` must be empty, else throw `step s5 needs a secret: set SHOWREEL_SECRET_S5` (list every one); disk check; create `runs/<runId>/` where `runId` = local time `YYYYMMDD-HHMMSS`.
2. Launch Chromium. Decide the capture scale (`scale.mjs`): requested from the flag or config; `auto` reads `HOME_DIR/benchmark.json` (`{ scale, at }`, valid 30 days) else runs `benchmarkPipeline` (see below) for 2 s per scale on the scenario's first URL and stores the result. Layout guard: measure boxes at scale 1 and at the scale as `benchmarkCapture` does and pass `layoutDriftExcess` (excess over the scale-1 noise floor).
3. New context: viewport `round(viewport.width x scale)` by `round(viewport.height x scale)`, `deviceScaleFactor: 1`, `storageState` from `projects/<name>/auth.json` when it exists; `hygieneScript` and (after each navigation) `document.documentElement.style.zoom = scale`; `installWriteGuard`; a `page` listener recording new tabs (`tabs` events, popups get the same zoom and hygiene).
4. **Rehearsal** (skip with `--no-rehearsal`): run every action once without capture at 1x speed with 5 s timeouts to prove each selector resolves (record nothing); on failure throw `rehearsal failed in step sN (selector ...): <message>` before any video is made; then reload the first URL.
5. Start the encoder, then CDP `Page.startScreencast` (JPEG quality 90, `everyNthFrame: 1`, `maxWidth`/`maxHeight` = viewport, ack every frame; for popup tabs switch the screencast to the active tab). Frame timestamps come from `metadata.timestamp`; the event clock is `Date.now() / 1000` minus the first frame's timestamp.
6. Execute the scenario: for each step record `tStart`; for each action: `goto` (navigate, wait for `domcontentloaded`, 1.5 s settle, `dismissCookieBanners`, wait for `document.fonts.ready`); `click`: scroll the target into view smoothly (`scrollIntoView({behavior:'smooth', block:'center'})` then a 600 ms settle), measure its viewport box (divide by scale), choose `targetPoint`, `planMove` from the current cursor position (start at the viewport centre), push every planned sample into `events.cursor` at its scheduled time, dispatch real `page.mouse.move` at most every 50 ms along the path (for hover effects; record them in `events.moves`), wait `dwellMs`, `mouse.down`, record the click, hold `pressMs`, `mouse.up`, wait `settleAfterClickMs`; `fill`: move to and click the field like a click, then type each character with `typingDelays` (`keyboard.type` of one character at a time; never record the text; a sensitive fill uses the env secret), count keys; `press`: `locator.press` after focusing; `wait`: sleep. Every action adds a `targets` entry (box at action time). After the actions, hold for `holdMs` and record `holdStart` and `tEnd`.
7. Stop the screencast, `finish()` the encoder, write `events.json`, `record.json` (validate both with `schemas.mjs`, throw if invalid), print one summary line: `Recorded <dur> s, <W>x<H> (scale <s>, <reason>), <effective fps> fps, <dropped> dropped, <bytes> -> <runDir>`; print blocked writes as `blocked during the run: POST /x x2` with a hint to add an `allowWrites` entry; close everything in `finally`.
- `benchmarkPipeline({ url, scales, seconds })` in `scripts/lib/capture-benchmark.mjs`: like `benchmarkCapture` but each scale also runs the encoder pipeline (frames into `startEncoder` to a temp file) and reports `pipelineFps` (frames encoded per second), `dropped` and `maxBacklog`; `recommendScale` uses `pipelineFps` when present (>= 50 and drift rule), else `fps`. `doctor --benchmark` prints both and stores the choice in `HOME_DIR/benchmark.json`.

### CLI
`record --name N [--headed] [--no-rehearsal] [--scale S] [--fps N]`; `login --name N [--url U]` (headed window, the user logs in and closes it, saves `auth.json` with owner-only permissions where the OS supports it, never reads or prints credentials); `runs --name N` lists runs (id, duration, size); `cursor-demo [--headed]` serves a page that plays eight planned moves (short, long, diagonal, with overshoot) over a grid with the cursor drawn as an arrow with a trailing fade, next to a **linear robotic version** for comparison, labelled `planned` and `linear`, and opens it in a headed Chromium (print the URL for any browser).

### Fixture additions
`fixtures/demo-app/` and the fixture server: `POST /api/choose` (reply 204) called by the pricing page's `Choose plan` button (the toast still shows when the request is blocked); `dev-overlay.html` containing an element `<nextjs-portal>` and a tall page (for the hygiene test). Keep every Phase 1 and 2 property.

### Tests (browser tests in `test-browser/*.browser.mjs`, run through `scripts/run-browser-tests.mjs`)
(1) record a 6-step fixture scenario (goto, click a nav link, click the second `Learn more`, fill name and email, click `Choose plan`, final click) at scale 1: `raw.mp4` exists, loads in a `<video>` with the expected size and `duration` within 0.6 s of `record.json.durationSec`, `events.json` and `record.json` validate, cursor samples are 60 Hz spaced (median spacing between 15 and 18 ms), every click's cursor position is within 1.5 px of its click point, every target box lies inside the viewport, effective fps at least 20; (2) the `Choose plan` POST is blocked and listed in `events.blocked`, and recording again with `allowWrites: ["/api/choose"]` lists none; (3) a scenario with a sensitive fill and no secret refuses to start; with `SHOWREEL_SECRET_S3` set it records and the text is nowhere in the output files; (4) hygiene: a page with `<nextjs-portal>` is not visible while recording; (5) rehearsal failure reports the step and selector without producing a video; (6) at scale 1.33 the video dimensions are `round(1920 x 1.33)` by `round(1080 x 1.33)` (skip on CI when the benchmark says the machine cannot hold it; assert only dimensions and validity); (7) `startEncoder` alone encodes 60 synthetic JPEG frames and reports `dropped` below 5.

**Acceptance (Claude runs):** `npm test`, `npm run build` then `npm run test:browser` pass on this Mac; a real recording of the fixture scenario has an effective frame rate of at least 30; `cursor-demo` opens and plays.

---

## Task C: review, tuning, CI and docs (Claude)

- Review every diff; run the browser tests; run `record` on the live portfolio scenario (4 steps built in Phase 2) and report fps, drops and size.
- **Cursor review with the owner:** run `cursor-demo`, ask what feels robotic, tune the constants (all in `cursor-path.mjs`) until approved, record the final constants in the spec.
- CI: add `npm run build` check (dist current) to the unit tests job (already a unit test) and the new browser tests (3 OS); a recording smoke on CI at scale 1 uploads `record.json` as an artifact.
- Update `docs/42`, the spec (new section), this plan's status; commit in pieces; scan after staging; push; confirm CI on three OS.

## Exit criteria

Fixture scenario records on Mac, Ubuntu and Windows (CI) with valid outputs; writes are blocked unless allowed; pending secrets stop the run; the owner approves the
cursor motion; the live portfolio scenario records; `skills-demo` untouched.

## Budget and stop rule

1.5 to 3.0M Claude tokens. Stop and ask the owner if the real-time encoder cannot sustain 30 fps at scale 1 on this Mac, or if any OS cannot record the fixture scenario at all.
