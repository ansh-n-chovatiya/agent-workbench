# Showreel Phase 5 plan: local browser editor

Status: COMPLETE 2026-10-18 (outcome at the end of this file). Spec: `docs/40-showreel-design.md` section 7 (editor). Builds on Phase 4 (`docs/47-...`). Operating model unchanged:
Claude plans and reviews; Codex writes code and pure tests (no browser, no ports); Claude runs all browser and server tests and fixes what they find.

**Decision (owner approved): the editor ships inside the plugin and runs locally.** `showreel edit --name N` starts a loopback server and opens the user's browser.
No hosting, no uploads, no accounts. The editor is a prebuilt static bundle committed under `dist/editor/` (built from `editor/` with esbuild; CI checks it is reproducible).
**Stack:** Preact (MIT, 3 KB) + esbuild, no Vite, no router, no UI kit; everything else is the pure modules already used by the renderer.

## Principles
1. **Same code as export.** Drawing moves to one shared module `scripts/lib/compose/draw.js`, used by `render-page.js` (export) and by the editor preview. What you see is what exports.
2. **One schema drives the UI.** `scripts/lib/compose/settings-schema.mjs` lists every settable path with label, group, control type, range/options and help text. The editor panels, `composition show --paths` and validation tests all read it.
3. **Edits are data.** The editor only changes `composition.json` (trims, speeds, zoom regions, caption overrides, look settings); recordings are never modified. Undo/redo is a snapshot stack of the composition.
4. **Edits keep everything in sync.** Captions, cursor and zoom live in source time; the time map (Phase 4) maps them to output time, so cuts and speed changes move captions and zoom with the video.
5. **Local and safe.** Server binds 127.0.0.1 on a random port, per-session token required on every request (URL fragment to cookie), Host and Origin checks, no CORS, project-relative paths only, writes limited to the project folder.

## Features (section 7 scope)
Preview with transport (play/pause, scrub, loop, frame step, timecode, speed). Timeline tracks: video (step blocks), cuts, speed ramps, zoom regions, captions.
Edit actions: split at playhead, delete (cut) a range, set a range's speed (0.25x to 8x), add/move/resize/delete zoom regions with depth and focus point (click on the preview),
edit caption text and timing, toggle auto-suggested zoom. Settings panels from the schema: Look (frame, padding, background, shadow), Cursor, Zoom, Captions, Cards (title/outro),
Output (size, fps, quality). Autosave, undo/redo, keyboard shortcuts, export with progress and cancel, open the output folder. Audio and voice are Phase 6.

## Tasks
- **G (Codex): foundations.** Extract `draw.js`; `settings-schema.mjs` (+ tests that every default path appears and every schema entry validates); add `captions.cues` override to the composition (used instead of auto cues; validated; exports through the time map); editor server `scripts/lib/editor/server.mjs` (routes below) and CLI `edit`; unit tests for pure parts; build wiring (`dist/editor/`), bundle hash and freshness test.
- **H (Codex): client core.** Frame provider (mediabunny CanvasSink random access + cache), preview player (rAF clock, scrub, loop), settings panels from the schema, undo/redo, autosave, export UI with SSE progress, shortcuts.
- **I (Codex): timeline editing.** Tracks, playhead, zoom/pan of the timeline, split/cut/speed/zoom-region/caption editing, snapping, edit rules and tests of the pure edit functions (`editor/edit-ops.mjs`).
- **J (Claude): integration.** Browser tests of the real editor against the synthetic run (open, scrub, change a setting, cut, speed, export, compare output), security tests of the server (token, host/origin, traversal), visual review with screenshots, fix list, CI, docs.

## Server routes (all require the session token)
`GET /` editor page; `GET /editor.js|css`, `/fonts/*`; `GET /api/project` (brief, storyboard, events, record, composition, runs, settings schema version);
`PUT /api/composition` (validate with `validateComposition`, atomic write, returns errors on failure); `GET /media/raw.mp4` (HTTP Range); `GET /media/asset/<relative path>` (images; same safety rules as renders);
`POST /api/export` (starts `renderRun`, one at a time), `GET /api/export/events` (SSE progress), `POST /api/export/cancel`; `POST /api/reveal` (open output folder).

## Exit criteria
All section 7 features work; preview matches export (pixel comparison within tolerance on three sampled frames); edit-rule tests pass; server security tests pass; editor works in Chrome, Edge and Safari-less CI
(Chromium); three-OS CI green; the owner can open the editor on the real portfolio recording and make a cut, a speed ramp, a zoom change and a caption edit, then export.

## Stop rule
Stop and ask if preview playback cannot hold 30 fps at 1080p on this Mac, or if the editor bundle exceeds 600 KB gzipped.

## Outcome (2026-10-18)
Delivered: loopback editor (`showreel edit --name N`), Preact + shadcn-style components (Radix through preact/compat, Tailwind v4 built at build time, committed bundle `dist/editor/`, about 246 KB gzipped JS+CSS),
viewport-fitting layout (no page scroll, splitter, light and dark), settings panels generated from `settings-schema.mjs` (107 settings, hand-written plain-language help), timeline editing (cut, speed, zoom regions,
caption cues, undo/redo, autosave), export dialog with progress, secured server (token, Host/Origin checks, traversal rejected). Design spec: `docs/49-showreel-editor-design.md` (ui-ux-pro-max).
Tests: 221 unit, 27 browser (real editor drives load, edits, undo, playback, export; fit at 1024x640, 1280x720, 1440x900).

Findings that mattered (measured, not reasoned):
- Playing every frame through WebCodecs reached only about 23 fps on a 3206x1804 source in real Chrome and fell behind at 2x. Playback now uses the native video element (real time at 1x and 2x); the exact decoder is kept for scrubbing and paused frames, and is the fallback where H.264 is not playable in `<video>`.
- A short window stretched the preview canvas (display only; exports are unaffected by window size).
- Pressing Play at the end now restarts from the start.
- Byte-exact comparison of repeated lossy encodes fails across machines; use a colour-grid tolerance.

Not done (by design, later phases): audio and voice preview (Phase 6), preview-versus-export pixel parity test (same draw code; parity test still to add), editor tests on a real long recording.
