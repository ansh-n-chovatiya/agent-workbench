---
name: demo-video
description: Turn a web feature into a client-ready demo video (real recording, smooth cursor, captions, subtitles, optional narration and phone clip). Use when asked to make a demo video, record a demo, show the client a feature, or produce a walkthrough video of a web app.
---

# Demo video

One Playwright test in, a finished video out. The test's `test.step` titles
become the captions; everything after that is deterministic code.
Run `node <skill>/scripts/demo.mjs <command>` from the **project being demoed**,
or from anywhere with `--config <file>`. Not for native apps or music edits.

## Setup

`doctor` lists what is missing and the fix for each; every command runs it.
Needed: Node ^20.19 or >= 22.12, ffmpeg + ffprobe, unzip, and in the skill
folder `npm install` then `npx playwright install chromium`. Optional: Recordly
(macOS, recordly.dev) to edit the video; `say` (macOS) or `espeak-ng` for voice.

## Where files go

Nothing is written into the project. Everything lives in two places:
- `~/.demo-video/`: `configs/<project>.json`, `auth/<project>.json` (login),
  `runs/<project>/<run>/` (raw/, edit/, out/, record.json). `<project>` is the
  project folder's name.
- **One deliverables folder per render**: `<root>/<scenario>-<YYYY-MM-DD-HHMM>/`
  with `<scenario>.mp4`, `-short.mp4` (720p), `.srt`, `.vtt`, `-poster.png`,
  `-contact-sheet.png`, and `for-recordly/` when Recordly was used. A re-render
  goes to `<folder>-2`, `-3`, ... `render` ends with one line
  `Final video: <absolute path> (<s> s, <W>x<H>, <fps> fps)` and reveals it in
  Finder (`--no-open` skips that). Give the user that path.

`<root>` is `DEMO_VIDEO_DELIVER`, else the config's `deliverDir`, else
`~/Desktop/Demo Videos`. Before the first render: if `deliverDir` is unset, ask
the user whether `~/Desktop/Demo Videos` is fine and set `deliverDir` to the answer.
Config: `--config <file>`, `./demo.config.json`, or `~/.demo-video/configs/<project>.json`;
only `baseURL` is required; keys in `reference/config.md`.

## Commands, in order

1. `init` writes the config (`init --here`: `./demo.config.json`). Set `baseURL`.
2. `login` (only if the app needs one): **the user** logs in in the browser that
   opens; the session is saved. Never type or store a password yourself.
3. `record <scenario.spec.ts> [--grep <title>] [--voice] [--show] [--no-rehearse] [--allow-hooks] [--no-recordly] [--detach]`:
   a fast unpaced rehearsal (a broken locator stops it in seconds, naming the
   step), then the paced laptop clip (and phone clip when `phone.enabled`).
   Exits non-zero if a clip fails; a failed run is kept as `<run>-failed/`.
   One test per recording. The scenario may import files beside or below it.
4. `render [runDir] [--recordly] [--no-recordly] [--recordly-export <file>] [--no-voice] [--no-phone] [--no-open] [--re-edit] [--detach]`:
   the newest good recording unless `runDir` is given. One line per stage.
5. `recaption [runDir] [--no-voice] [--no-phone] [--no-recordly] [--no-open]`:
   re-renders fast after editing `<run>/edit/<clip>/captions.json` (kept by
   `render` too; `render --re-edit` rebuilds them from the recording).

`--detach` runs `record`/`render` in the background with a log; `status [runDir]`
shows whether it still runs and its last lines. Also: `codegen <out.spec.ts>`,
`selftest` (whole pipeline in a temp HOME; run it after changing the skill).

## Writing the scenario

- **Written steps**: start from `templates/scenario.example.ts`. One `test.step`
  per thing the viewer should notice, accessible locators (`getByRole`,
  `getByLabel`), an `expect` ending each step. Make the first step check the data
  the demo needs is there, so the rehearsal fails in seconds if it changed.
- **Clicks**: `codegen <out.spec.ts>`, then wrap lines in `test.step('<caption>', ...)`.
- **An existing Playwright test**: `record` it as is. From `playwright.config.*`
  only these `use` keys carry over: testIdAttribute, locale, timezoneId,
  colorScheme, extraHTTPHeaders, ignoreHTTPSErrors, geolocation, permissions.

Plain actions (`click`, `fill`, `check`); the recorder adds human pacing. `blur` hides data.
Captions: one plain sentence per top-level step, at most 70 characters, what
the viewer sees and why it matters; no selectors, tickets or names.
Layout (`caption.mode`): `band` (default, a caption band under the app, never
covering it), `overlay` (pills over the picture) or `off`. All write `.srt`/`.vtt`.

## Voice

`record --voice` speaks each caption at `voice.rate` (160 words a minute),
`pace.voiceLeadMs` (250 ms) after the caption appears, with at least
`pace.breathMs` (450 ms) of silence before the next sentence and no pause
beyond what the step needs. `render` includes it; `render --no-voice` drops it.

## Real apps: blocked writes, server actions, slow backends

- Every request except GET/HEAD/OPTIONS is blocked unless its URL contains an
  `allowWrites` entry, so Save changes nothing (browser, Playwright request
  contexts, Node fetch/http/https; not database clients or child processes, so
  scenarios must not seed or clean up data).
- **Next.js server actions** send reads as POST, so expect the first rehearsal
  to fail listing `<path> [Next-Action-Name=<file>#<export>]` (or
  `[Next-Action=<id>]` when the build does not list it). **Ask the user** whether
  each only reads; add exactly the confirmed entries to `allowWrites`, then
  `record` again. Prefer the name form (ids change every build). Never a plain
  `"/path"`: every action on the page posts there, writes included.
- Dev servers work (`allowDevSockets`). Slow apps: raise `rehearsalActionTimeoutMs`
  (5000) or `actionTimeoutSec` (60). `stopOn: ["No matches"]` stops a run on that text.

## Recordly (ask first)

Recordly lets the user shape the video; the skill then fits captions and voice
to whatever they made. **Ask:** "Recordly can add cursor animation, zoom and
any edits you like; it needs you to edit, export and save, a few minutes. Use
it?" Only on yes pass `render --recordly` (a person at a terminal is offered it
when installed and config `recordly` is not false).

The clip goes to the deliverables folder's `for-recordly/`, Recordly opens and a
boxed prompt gives absolute paths. Tell the user: **edit anything, then 1)
export and 2) save the project (Cmd+S)**. Every edit is respected: cuts,
speed-ups, slow-downs, per-clip speeds, crop and shape, padding, zoom, cursor
styles, annotations, webcam, background, added audio (kept, 10 dB lower under
the narration). With Recordly's auto-captions on, they replace ours (full frame,
no band; `.srt`/`.vtt` still written). GIF export works, MP4 is recommended.
Clips cannot be reordered: moved clips still export in recording order.

The export is any new .mp4/.gif in `for-recordly/`, `~/Downloads` or `~/Movies`
that is not a copy of the clip (or a pasted path). The project is then looked
for 20 s (and again at render) in `for-recordly/`, Downloads, Documents, Movies
and Recordly's recent projects; it must be saved after the handoff and open this
clip. **With the project** the edits are read exactly (trusted when it predicts
the export's length within 0.3 s). **Without it** the export is aligned to the
recording frame by frame and given a confidence: 0.8 or more is used; below,
a terminal user is asked, otherwise the video is made without the export and
says why. `run.json` records `render.timeMap` (source, confidence, reason).

Captions and narration are then re-planned onto the edited timeline: a cut
step loses its caption and voice (listed); a shortened step keeps its reading
time and pushes the next later; captions never overlap; each voice clip ends at
least `pace.breathMs` before the next, sped up at most 1.1x, else the next
waits. After `recordlyTimeoutMin` (10) minutes without an export, or Ctrl+C, the
render uses its own drawn cursor. Recordly exports at its own frame rate
(often 30 fps); the summary line says so.

## Checking the result

Look at `<scenario>-contact-sheet.png` (12 frames) first; open the video only
when it shows a problem. `render` refuses a video that holds still over 1.2 s,
whose subtitles miss the captions, that shows captions twice, or whose length
is not the clip (or export) plus the cards (kept as `out/demo.failed.mp4`).

## Troubleshooting

| Message (start) | Cause and fix |
|---|---|
| `no config found at ...` | Run `init`, or pass `--config <file>`. |
| `<file>: unknown key "<key>"` | Typo in the config; see `reference/config.md`. |
| `rehearsal failed in step "<step>" (<clip>): TimeoutError: locator...` | Fix the locator; if the app is only slow, raise `rehearsalActionTimeoutMs`. |
| `scenario failed in step "<step>" ... Timeout 60000ms exceeded` | Fix that step's locator, or raise `actionTimeoutSec`. |
| `page shows "<text>" in step "<step>"` | A `stopOn` text appeared: data or app not in the state the demo needs. |
| `no server action named "<name>" in the Next.js build's ...` | Build or start the app, fix the name, or set `nextBuildDir`. |
| `blocked during the run: POST /x x2` then `"allowWrites": ["/x"]` | A write (or server-action read) was blocked. Ask the user, then add it. |
| `page keeps reloading (dev server live reload?)` | Keep `allowDevSockets` on, or record a production build. |
| `scenario timed out after <n> min in step "<step>"` | Raise `timeoutMin` if the app is slow, else fix that step. |
| `scenario has setup/cleanup hooks` | Remove them, or `--allow-hooks` if they stay in the browser. |
| `<file> has N tests` / `imports "<x>" from outside the scenario's folder` | Pass `--grep "<title>"` / move the helper beside the scenario. |
| `frozen video in demo.mp4 at <times>` | A step where nothing changes: add an action or shorten it. |
| `Not the export: <file> is a copy of the clip given to Recordly` | Export from Recordly; do not copy the input. |
| `project predicts X s but the export is Y s` | That project is not this export's (saved before the last edit, or for another export): save again (Cmd+S) and re-render. Alignment is used meanwhile. |
| `Rendering without the Recordly export: alignment confidence ...` | No usable project and the frames did not match well: save the project (Cmd+S), then `render --recordly-export <export>`. |
| `N captions may be up to X s off ("..."): the page shows no change there` | Without a saved project, those captions sit where the page is still, so the frames cannot tell where a cut or speed change fell. Save the Recordly project (Cmd+S), then `render --recordly-export <export>` for exact timing. |
| `No Recordly export after <n> min; rendering with the drawn cursor instead.` | Nothing to fix; rerun `render --recordly` to try again. |
