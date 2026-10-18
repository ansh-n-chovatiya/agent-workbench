# Showreel Phase 4 plan: compositor and exporter

Status: executing from 2026-10-18. Spec: `docs/40-showreel-design.md` (sections 4, 6, 7, 22 to 27). Evidence: `docs/42-showreel-spike-findings.md` (S3, S7, S8, Phase 3),
`docs/43-openscreen-extraction-report.md`. Operating model as before: Claude writes briefs and reviews every diff; Codex writes code and unit tests (no browser, no
local ports, no `~/.npm` writes); Claude runs everything that launches a browser and fixes what it finds.

**Goal.** `showreel render --name N` turns a recording (`raw.mp4` plus `events.json`) into a finished video: styled frame on a background, a smoothly drawn cursor with a click
effect, **zoom to the clicked area**, captions, title and outro cards, exported as H.264 at 1080p60 (4K opt-in), plus `.srt`, `.vtt` and a poster. No audio yet (Phase 6).

## Design decisions (and why)

1. **Plan in Node, draw in the browser.** Pure, unit-tested modules plan every track (time map, zoom regions, camera path, cursor, ripples, caption cues, layout). The browser
   page receives the plan as JSON and only draws. The same pure modules will run in the Phase 5 editor for live preview, so what is tested is what runs.
2. **Canvas 2D, no extra libraries.** Draw with Canvas 2D; decode the source and encode the output with mediabunny (already a dependency). OpenScreen code is **not** copied in this phase (its
   pieces are small enough to write cleanly, and nothing needs attribution); revisit if the editor needs its timeline UI.
3. **Zoom is element-aware.** Regions come from `events.targets` (the clicked or typed-into element's box), not from guessing at the cursor. The camera follows a **critically damped spring** (no overshoot,
   about 0.7 s settle) toward the current focus and depth, and eases back to the full view after a hold.
4. **Zoom depth is limited by sharpness.** `maxSharpZoom = sourceWidth / frameWidthInOutput`; deeper zoom is allowed but produces a warning in the render output (and later in the editor).
5. **Time-map first.** All edits (trims, speed changes) and the title and outro cards go through one bidirectional time map, so captions, cursor and zoom stay in sync under any edit. This
   is the API OpenScreen did not have (S3).
6. **Deterministic fonts.** Inter (SIL OFL 1.1) woff2 files are bundled in `assets/fonts/` so captions and cards render the same on every OS.
7. **Output is offline, not real time.** Frames are drawn at exact output timestamps (not screen-captured), so quality never depends on machine speed; speed only changes how long the render takes.

## Global constraints

All earlier constraints apply (Node range, Playwright 1.63.0, ES modules, no ffmpeg or OS speech tools, MIT, stage before scanning, no home paths or emails in test data (use `example.com`), `fileURLToPath` never `.pathname`,
LF line endings). Times are seconds; source coordinates are CSS pixels at capture scale 1 unless a name says `Px` (output pixels). Pure modules under `scripts/lib/compose/` must not import Node-only or browser-only APIs
(they run in both). Codex: no git commands, only the paths named, never touch `plugins/skills-demo/`, no `npm install`, no browser, no ports.

## File structure (new under `plugins/showreel/`)

```
scripts/lib/compose/timemap.mjs       buildTimeMap
scripts/lib/compose/zoom.mjs          suggestZoomRegions, maxSharpZoom, validateRegions
scripts/lib/compose/camera.mjs        planCamera, cameraAt
scripts/lib/compose/cursor-track.mjs  cursorAt, pressAmount, rippleAt
scripts/lib/compose/captions.mjs      cuesFromRun, captionAlpha, wrapLines, toSrt, toVtt
scripts/lib/compose/themes.mjs        THEMES (clean, dark)
scripts/lib/compose/layout.mjs        layoutFor
scripts/lib/compose/composition.mjs   DEFAULT_COMPOSITION, validateComposition, buildComposition
scripts/lib/compose/plan.mjs          planRender(input) -> everything the page draws
scripts/lib/compose/render-page.js    browser: draw functions and the render loop
scripts/lib/compose/render.mjs        Node: server, page, chunk writer, progress, srt/vtt/poster
assets/fonts/Inter-Regular.woff2  Inter-SemiBold.woff2  OFL.txt
dist/render-page.js                   committed bundle (build + freshness test extended)
scripts/showreel.mjs                  add: render, composition (show/validate)
test/compose-*.test.mjs  test-browser/render.browser.mjs  test-browser/helpers/synthetic-run.mjs
```

---

## Task A: pure planning modules and schemas (Codex)

All pure, each with property tests in `test/compose-*.test.mjs` (seeded where random inputs are used; no randomness in the modules themselves).

### `timemap.mjs`: `buildTimeMap({ duration, trims = [], speeds = [], lead = 0, tail = 0, fade = 0 })`
- `duration` is the source length. `trims`: `[{ start, end }]` removed intervals; `speeds`: `[{ start, end, rate }]` with `rate` in 0.25 to 8. Validation (throw `Error` with the offending index): trims and speeds sorted, non-overlapping, inside `[0, duration]`, `start < end`; a speed range may not intersect a trim.
- Model: title card occupies output `[0, lead]`; the main (edited source) starts at `mainStart = max(0, lead - fade)`; its length is the sum over kept source segments of `length / rate`; the outro occupies `[mainEnd - fade', mainEnd - fade' + tail]` with `fade' = tail > 0 ? fade : 0`, i.e. it overlaps the end of the main by `fade` for a crossfade. `outputDuration` is the end of the outro (or `mainEnd` when `tail` is 0).
- Returns `{ outputDuration, mainStart, mainEnd, titleEnd (= lead or 0), outroStart, toSource(tOut), toOutput(tSrc), segments }`:
  - `toSource(tOut)` returns `{ t, rate, section }` where `section` is `'title'`, `'main'` or `'outro'` (the **last** section a time belongs to in an overlap is `'main'` for the crossfade, with `alphaTitle` and `alphaOutro` in `[0,1]` returned too: `alphaTitle` ramps 1 to 0 across `[mainStart, lead]`, `alphaOutro` ramps 0 to 1 across the outro overlap); `t` is the source time clamped to the main range (a time inside a title or outro that precedes or follows the main maps to the first or last kept source time).
  - `toOutput(tSrc)` returns the output time, or `null` when `tSrc` lies in a trimmed interval.
- Properties to test: with no edits, `toSource(mainStart + x).t = x`; `toOutput(toSource(t).t) = t` for every main time (round trip, tolerance 1e-9) under random edits; `toSource` is non-decreasing; a trim of length L shortens the output by exactly L; a speed of rate r over length L shortens it by `L - L/r`; rates are reported correctly inside each range; boundaries are continuous (no jump); invalid edits throw with the index.

### `zoom.mjs`
- `maxSharpZoom({ sourceWidthPx, frameWidthPx })` returns `sourceWidthPx / frameWidthPx` (at least 1).
- `suggestZoomRegions({ events, record, options })` with `options = { depth = 1.7, kinds = ['click','fill'], leadIn = 0.1, holdAfterClick = 0.9, holdAfterTyping = 0.6, minGap = 0.8, maxBoxFraction = 0.6 }`:
  - For each `events.targets` entry of an allowed kind (skip `sensitive` ones' focus detail? no: zoom is still fine; skip none) compute the region start `tStart = target.t + leadIn` (the camera begins easing as the cursor starts moving) and end: for `click` the matching click time (the first `events.clicks` entry of that `stepId` at or after `target.t`) plus `holdAfterClick`; for `fill` the last `events.keys` time of that step plus `holdAfterTyping` (or the click time plus `holdAfterClick` when there is no key event). Focus = centre of `target.box`.
  - Skip a target whose box covers more than `maxBoxFraction` of the viewport area (the whole page is already in view).
  - **No zoom thrash:** a region that starts less than `minGap` seconds after the previous region ends is merged into it as an extra keyframe (the camera pans between focuses without zooming out); the merged region ends at the later end.
  - Region shape: `{ id: 'z1', tStart, tEnd, depth, keyframes: [{ t, x, y }], stepIds: [..], source: 'auto' }` (`keyframes[0].t = tStart`). Clip to `[0, record.durationSec]`; drop regions shorter than 0.4 s.
- `validateRegions(regions, { duration, maxSharp })` returns `{ ok, errors, warnings }`: sorted and non-overlapping; `depth` in 1.05 to 4; keyframes inside the region; warning `region zN depth D exceeds the sharp limit S` when `depth > maxSharp`.
- Tests: example scenarios (single click; click then a click 0.3 s later merges; click then a click 3 s later stays separate; a fill region ends after the last key; a huge box is skipped; the first target near `t = 0` clips correctly); property: regions never overlap and are ordered; every keyframe focus lies inside the viewport.

### `camera.mjs`
- `planCamera({ regions, duration, source: { width, height }, hz = 60, omega = 7 })` returns `{ hz, samples: [{ t, cx, cy, z }] }` where `(cx, cy)` is the centre of the visible source rectangle (CSS px) and `z >= 1` the zoom. Outside every region the target is the full view (`cx = width/2`, `cy = height/2`, `z = 1`); inside a region the target is the current keyframe focus (the keyframe whose `t` is the latest at or before now) at `region.depth`. The state `(cx, cy, ln z)` follows a **critically damped spring** `x'' = omega^2 (target - x) - 2 omega x'`, integrated at 240 Hz substeps (semi-implicit Euler), recorded at `hz`; starts at rest on the full view. After the spring, clamp the centre so the crop rectangle (`width/z` by `height/z`) stays inside the source, and clamp `z` to `[1, maxDepth]`.
- `cameraAt(plan, t)` linearly interpolates between samples.
- Tests: no regions gives a constant full view; reaches 98% of the target depth within 1.4 s of a region start and returns to within 2% of 1 within 1.4 s of its end; **never exceeds the region depth by more than 0.5%** and never goes below 1 (no overshoot); the crop rectangle is always inside the source; per-sample change of `z` and of the centre is bounded (continuity, no jumps); the same input gives identical output.

### `cursor-track.mjs`
- `cursorAt(events, t)`: binary search over `events.cursor` (sorted by `t`) with linear interpolation; before the first sample returns the first position, after the last the last; empty `cursor` returns the viewport centre (`events.viewport`).
- `pressAmount(events, t)`: `1` normally; for each click at `c`: scale eases `1 -> 0.86` over `[c, c + 0.045]` and back to `1` over `[c + 0.045, c + 0.12]` using smoothstep; returns the scale factor.
- `rippleAt(events, t)`: for the most recent click at `c` with `0 <= t - c < 0.55` returns `{ x, y, progress: (t - c) / 0.55 }` else `null`.
- Tests: exact values at samples, interpolation midpoints, clamping at the ends, ripple window edges, press curve extremes and continuity.

### `captions.mjs`
- `cuesFromRun({ storyboard, events, captionsEnabled })` returns `[{ id, text, start, end }]` in **source time**: for each storyboard step that has a caption, find the matching `events.steps` entry by `id` (storyboard step id equals scenario step id); `start = step.tStart + 0.15`, `end = step.tEnd - 0.1`, at least 1.0 s long (extend `end` up to the next cue start minus 0.05, else keep); drop cues when `captionsEnabled` is false; no overlaps.
- `captionAlpha(cue, t)`: 0 outside, ramps 0 to 1 over the first 0.2 s and 1 to 0 over the last 0.2 s (smoothstep).
- `wrapLines(text, maxWidth, measure, { maxLines = 2 })`: greedy word wrap using the injected `measure(text) -> width`; when it does not fit in `maxLines`, returns `{ lines, scale }` with `scale` stepping down 1, 0.9, 0.8 until it fits, and at the smallest scale truncates the last line with an ellipsis; never splits inside a word unless a single word is wider than `maxWidth` (then break it).
- `toSrt(cues, timemap)` and `toVtt(cues, timemap)`: convert each cue's start and end with `timemap.toOutput` (drop a cue whose start maps to `null`; clamp an end that maps to `null` to the last kept time inside the cue); format `HH:MM:SS,mmm` (SRT) and `HH:MM:SS.mmm` (VTT with the `WEBVTT` header), numbered, blank line separated, `\n` line endings.
- Tests: timing rules, overlap prevention, alpha envelope, wrapping cases (fits, wraps, shrinks, truncates, long word), SRT and VTT exact output for a small example with a trim and a speed change.

### `themes.mjs`, `layout.mjs`, `composition.mjs`, `plan.mjs`
- `THEMES = { clean, dark }`, each `{ name, background: { type: 'gradient', angle, colors: [..] }, frame: { radiusPx, shadow: { blurPx, offsetYPx, color } }, cursor: { fill, stroke }, ripple: { color }, caption: { background, color, fontWeight }, card: { background: {type, colors}, titleColor, subtitleColor, accent }, font: 'Inter' }` (concrete values: `clean` light cool-grey gradient `#eef2f7 -> #dbe4f0`, dark text `#111827`, caption pill `rgba(17,24,39,0.86)` on white text, accent `#0f766e`; `dark` navy gradient `#0b1220 -> #172033`, light text, caption `rgba(255,255,255,0.14)` with white text, accent `#2dd4bf`).
- `layoutFor({ output: { width, height }, source: { width, height }, composition })` returns `{ canvas, frame: {x,y,w,h}, caption: {x,y,w,h} | null, scaleFramePx (frame width / source width) }`. Frame width is `output.width * (1 - 2 * paddingPct/100)` (default 5%), centred; in `captions.mode: 'band'` the bottom `13%` of the canvas height is reserved for the caption band and the frame is fitted above it (aspect preserved, centred in the remaining area); in `overlay` mode the frame is centred vertically and the caption rect is a pill region at the frame's bottom inside it (`x` centred, width up to 80% of the frame, height 0.075 of canvas height, 4% of the canvas height above the frame's bottom edge). All rects are integers.
- `DEFAULT_COMPOSITION` (frozen), `validateComposition(c)` (collect all errors, unknown keys rejected, ranges) and `buildComposition({ brief, storyboard, events, record, edits = {}, overrides = {} })` which fills the schema:
  `{ version: 1, run: { id }, output: { width: 1920, height: 1080, fps: 60 }, theme: brief.theme, frame: { paddingPct: 5 }, cursor: { visible: true, sizePct: 1.35, clickEffect: true }, zoom: { enabled: true, depth: 'medium', autoSuggest: true, regions: [] }, captions: { enabled: brief.captions.enabled, mode: brief.captions.mode }, cards: { title: { enabled: brief.titleCard.enabled, title: brief.titleCard.title ?? brief.topic, subtitle: brief.titleCard.subtitle, duration: 2.2 }, outro: { enabled: brief.outroCard.enabled, text: brief.outroCard.text, duration: 2.0 }, fade: 0.4 }, edits: { trims: [], speeds: [] } }`; `depth` words map to numbers `subtle 1.35`, `medium 1.7`, `strong 2.1` (a number is used as is); when `zoom.autoSuggest` and `regions` is empty, `buildComposition` fills `regions` with `suggestZoomRegions` results (marked `source: 'auto'`).
- `planRender({ composition, brief, storyboard, events, record, sourceSize })` returns the full drawing plan: `{ output, layout, theme, timemap, camera (samples), cues, cursor: { samples, sizePx, color }, clicks, ripples (the events clicks list), sourceSize, warnings, cards: { title, outro, fade } }` plus per-frame helpers used by the page: `stateAt(plan, tOut)` returning `{ section, alphaTitle, alphaOutro, sourceT, camera: { cx, cy, z }, cursor: { x, y, press }, ripple, caption: { text, lines?, alpha } | null }` (all pure). Test `stateAt` on a small hand-built run (before, during and after a zoom region; during a speed change; in the title card; in a caption; at the crossfade).
- `sourceSize` is the real `raw.mp4` size in pixels; cursor and region coordinates are CSS px at scale 1, so source pixels = CSS px x `record.scale.used`.

**Acceptance:** `cd plugins/showreel && npm test` passes (Phase 1 fixture-server tests may fail only if your sandbox cannot bind a port: say so).

---

## Task B: browser compositor, exporter, fonts, CLI and browser tests (Codex writes, Claude runs)

Reference code (read, do not import): `plugins/showreel/scripts/lib/record/{encoder-page.js,frame-sink.mjs,chunk-writer.mjs,session.mjs}` (mediabunny output, loopback HTTP chunk transport), `scripts/build.mjs`, `scripts/lib/record/bundle-hash.mjs`,
`spikes/showreel/s8-memory/page.js`. Check the installed `mediabunny` typings in `node_modules/mediabunny` for reading (`Input`, `BlobSource` or `UrlSource`, `CanvasSink`, `canvasesAtTimestamps`) and writing (`Output`, `Mp4OutputFormat`, `StreamTarget`, `CanvasSource`) instead of guessing; a monotonic list of timestamps with `canvasesAtTimestamps` is the intended access pattern.

### `render-page.js` (browser; bundled to `dist/render-page.js`)
Exports a global `window.renderComposition(plan, options)` and `window.renderStill(plan, tOut)`. Drawing, in order, for each output frame at time `tOut` (state from `stateAt`):
1. Background (gradient from the theme at the theme's angle) over the whole canvas.
2. If `section` includes main: the **styled frame**: a rounded rectangle (`frame.radiusPx` scaled by output height / 1080) with the theme shadow, clipped, then the source frame drawn so the visible crop `(cx - w/2 .. cx + w/2, cy - h/2 .. cy + h/2)` (source CSS px times `record.scale.used`) fills the frame rect; `imageSmoothingQuality = 'high'`.
3. **Cursor** (when `cursor.visible`): an arrow sprite drawn as a vector path (white fill, dark 1.5 px stroke, soft shadow) with its tip at the cursor position mapped through the camera into the frame, height `sizePct` of the output height multiplied by `1 + 0.35 * (z - 1)`, scaled by the press amount about the tip. **Click ripple** (when `cursor.clickEffect`): a ring from radius 0.3 to 3.2 cursor-heights, stroke 3 px fading with `1 - progress`, theme ripple colour, centred at the click position through the camera.
4. **Captions** from `state.caption`: band mode draws the text centred in the band rect (no pill); overlay draws a rounded pill (theme caption colours) sized to the wrapped text; font Inter, size `0.034 * canvas height`, weight from the theme; alpha from the envelope; wrapped with `wrapLines` using `ctx.measureText`.
5. **Cards:** title and outro full-canvas card (theme card background, accent bar, title in Inter SemiBold at `0.07` canvas height, subtitle in Inter Regular at `0.036`), drawn with `alphaTitle` and `alphaOutro`.
Fonts: load `assets/fonts/Inter-Regular.woff2` and `Inter-SemiBold.woff2` with the `FontFace` API from URLs given in `options.fonts` and `await` them before the first frame.
`renderComposition`: sequentially for `k` in `0 .. round(outputDuration * fps) - 1` (a **monotonic** source timestamp list, so decode with one `canvasesAtTimestamps` pass), draw, `source.add(k / fps, 1 / fps)` on a `CanvasSource` (`codec: 'avc'`, bitrate `min(60e6, width * height * fps * 0.1)`, keyframe every 2 s, fall back to VP9 inside MP4 if H.264 is unsupported and report the codec), stream chunks with `POST /chunk` (`x-pos` header) exactly like the encoder page, report progress with `POST /progress` `{ frame, total }` at most every 250 ms, honour an abort flag, and return `{ frames, codec, bytes }`. No audio track in this phase; keep a clearly named hook (`options.audio === null`).
`renderStill(plan, tOut)` draws one frame and returns a PNG data URL (poster and tests).

### `render.mjs` (Node) and CLI
- `renderRun({ name, runId, size = '1080', fps = 60, out, log })`: read the project files (`brief`, `storyboard`, run `events.json` and `record.json`, `config.json`), read or create `projects/<name>/composition.json` via `buildComposition` (an existing file is used as is, so Phase 5 edits persist; `--rebuild` regenerates it), size `4k` sets 3840x2160, `1080` sets 1920x1080 (the composition's `output` is overridden by the flags), build the plan with the real `raw.mp4` size (probe it in the page or read the MP4 header through mediabunny in the page and pass it back; do **not** use ffprobe), start a loopback server (port 0, 127.0.0.1) serving: the render page HTML, `dist/render-page.js`, the fonts, `raw.mp4` with **HTTP Range support**, `/chunk` and `/progress`; launch headless Chromium, run `renderComposition`, write chunks at their positions into `renders/<renderId>/final.mp4` (`renderId` is local time `YYYYMMDD-HHMMSS`), write `final.srt`, `final.vtt` from `captions.mjs`, `poster.png` from `renderStill` at 35% of the main section, print progress once per second as `rendering 37%  ETA 14 s` and a last line `Final video: <path> (<seconds> s, <W>x<H>, <fps> fps)`, print every plan warning, and close everything in `finally`. Refuse when the run folder has no `raw.mp4`.
- CLI: `render --name N [--run ID] [--size 1080|4k] [--fps 30|60] [--out FILE] [--rebuild]`; `composition show --name N` prints the file; `composition validate --name N` prints errors and warnings (exit 1 on errors). `runs` already lists runs; `render` defaults to the newest.
- `scripts/build.mjs` also bundles `scripts/lib/compose/render-page.js` into `dist/render-page.js`; the hash inputs (`bundle-hash.mjs`) include every file the page imports (`compose/*.mjs`, `render-page.js`); extend `test/dist-current.test.mjs` accordingly (both bundles).
- **Fonts:** reference `assets/fonts/Inter-Regular.woff2` and `Inter-SemiBold.woff2`; **Claude will place the files** (your sandbox has no network): write the code and tests to expect them, and a unit test that the files exist and start with the `wOF2` signature.

### Browser tests (`test-browser/render.browser.mjs`, with `test-browser/helpers/synthetic-run.mjs`)
`synthetic-run.mjs` creates a run folder with no recorder involved: a 1280x720 30 fps 4.0 s `raw.mp4` produced in the browser with mediabunny (background `#808080`, a solid red 60x60 square at (200,100), a solid blue 80x80 square at (900,500), a green 40x40 square sliding left to right along y = 650, nothing else), plus hand-written `events.json` (viewport 1280x720, scale 1, a cursor path from (100,100) to (940,540) between t = 0.5 and 1.6 sampled at 60 Hz, a click at t = 1.7 at (940,540), one target box around the blue square, one step `s1` covering 0.1 to 3.8, a `holdStart`), `record.json` and a one-step storyboard with the caption `Open the report`. Assertions (decode the output MP4 in a page into canvases and sample pixels; the tolerance for geometry is 3 px at 1080p; colours are compared with a tolerance of 24 per channel):
1. Output is H.264 (or VP9 fallback reported), 1920x1080, 60 fps, with duration equal to `outputDuration` of the plan within 0.1 s; `final.srt` and `.vtt` exist and contain the caption.
2. Before any zoom (t = 0.3 s into the main section): the red square's centre lies at the position predicted by `layoutFor`; the frame's rounded corner pixels are background-coloured.
3. At the zoom hold (about 0.6 s after the click): the blue square is larger than at zoom 1 by `depth` within 5% and its centre is within 8% of the frame's centre.
4. The cursor arrow's fill colour is found within 6 px of its predicted tip at one sampled time; at the click time plus 0.15 s a ring of the ripple colour is found at about the predicted radius; at the click time plus 1.0 s it is gone.
5. The caption area shows non-background pixels at t inside the cue and background only after the cue ends (the band region is a flat colour outside the cue).
6. Title card at t = 0.5 s shows no red square; at t = `lead + 0.5` it does (with a title card enabled in a second render); the crossfade frame lies between.
7. Speed edit: with `edits.speeds = [{ start: 1, end: 3, rate: 2 }]` the output is 1.0 s shorter than without; with `edits.trims = [{ start: 3, end: 3.5 }]` it is 0.5 s shorter; the green square position at a chosen output time matches `toSource`.
8. `renderStill` returns a PNG whose size is the canvas size.
9. Rendering the same plan twice gives frames that are pixel-identical at three sampled times.
Browsers are closed in `finally` everywhere. If a test fails on one OS only because of anti-aliasing, widen only that tolerance and say why.

**Acceptance (Claude runs):** `npm test`, `npm run build`, `npm run test:browser` pass on this Mac; `showreel render` on the real portfolio recording produces `final.mp4` with the right size and duration.

---

## Task C: fonts, review, visual tuning, CI and docs (Claude)

- Install Inter woff2 files under `assets/fonts/` from the OFL-licensed `@fontsource/inter` package with its licence text; add a `THIRD_PARTY_NOTICES.md` row.
- Review every diff; run browser tests; render the real portfolio recording; extract frames and look: zoom depth and timing, cursor size, caption legibility, card styling; tune constants (all named in `themes.mjs` and `zoom.mjs` defaults).
- **Show the owner a finished video** (opened locally) and collect feedback on zoom (depth, speed, how often), cursor size and caption style; apply it.
- CI: the render browser tests run on three OS (plus a render smoke artifact `final.srt`), the freshness test covers both bundles.
- Update `docs/42`, the spec (new section), this plan's status; commit in pieces; scan after staging; push; confirm CI on three OS.

## Exit criteria

A finished 1080p60 video of the real portfolio recording with zoom to the clicked areas, a smooth cursor with click effect, captions and cards; the render browser tests pass on Mac, Ubuntu and Windows; the time map keeps captions, cursor and zoom in sync under trims and speed changes; the owner has seen the video and approved or listed changes.

## Budget and stop rule

1.8 to 3.5M Claude tokens. Stop and ask the owner if offline rendering of a 17 s 1080p60 video takes longer than 90 s on this Mac, or if H.264 export fails on any CI OS.
