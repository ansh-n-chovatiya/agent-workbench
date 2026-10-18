# Showreel: design

Status: **proposed, awaiting owner review (2026-10-18).** No code exists for this yet. Showreel is built side by side as `plugins/showreel` and replaces the
`demo-video` skill in `plugins/skills-demo` only after it passes the quality bar. Decisions below were made by the owner in conversation on 2026-10-18; items marked
*spike* are facts to be verified before they are relied on.

## 1. Goal

Turn a web feature or flow into a production-grade, client-ready demo video with cinematic cursor motion, zoom, captions,
narration and motion graphics, using as few Claude tokens as possible, on any Mac, Windows or Linux PC, for free.

## 2. Non-negotiables

| Rule | Meaning |
|---|---|
| Independent | No other application or skill is needed at run time. No Recordly, Voicebox, ffmpeg install, `say` or `espeak`. The skill installs what it needs itself (npm packages, a Playwright browser, the voice model). Node is the only prerequisite. |
| Free forever | No paid service, account, API key or telemetry. No cloud voices. Every dependency has a permissive licence (MIT, Apache-2.0, BSD, MPL-2.0 file-level). No GPL or AGPL, and not GSAP (its licence bars use in competing animation builders). |
| One local model | Text-to-speech only. No local LLM, no speech recognition. Captions come from the script; timing comes from voice-clip lengths. |
| Low hardware | No GPU needed. A tiny fallback voice for slow PCs. `doctor` reports the machine's fit before any download. |
| Token-lean | Claude writes small JSON only. Everything else is deterministic code. A per-run token meter proves it. |
| Production grade | Deterministic rendering, golden-frame tests, three-OS CI, security review of the local editor, licence audit in CI. |

## 3. Scope

In: web apps (desktop and mobile-viewport emulation); 16:9 up to 4K; vertical 9:16 from a separate phone-viewport
recording; one or many scenes per video; brand kit; background music with ducking and loudness normalisation; recording
your own voice in the editor.

Out for v1: native desktop or mobile apps; auto-reframing desktop recordings to vertical or square; cloud voices; a
user-facing "express" mode (an internal `render <project>` command exists because the editor's Export and CI both need it).

Kept from `demo-video` because they protect real apps: blocked writes with `allowWrites`, Next.js server-action handling,
`stopOn`, data blurring, user-only login (the skill never types a password), rehearsal before recording, frozen-video
checks.

## 4. Architecture: record data, then draw it

The old pipeline bakes effects in with ffmpeg at record time, so it cannot preview, animate richly or be edited. Showreel
records **raw video plus an event track** (cursor path, clicks, typing, scroll, each target element's box) and draws every
visual layer from data with one compositor. The same compositor produces the editor preview and the final export, so
what the user sees is what they get.

```
brief.json ─► guide.json (optional) ─► scenario.spec.ts
                                          │ record (Playwright, real mouse events)
                                          ▼
                         raw.webm + events.json (+ phone clip)
                                          │
        project.json  ◄──── editor (local page, user's browser) ────► voice clips (Kokoro, cached)
 (storyboard, edits,                      │ Export
  theme, brand, music)                    ▼
                         compositor (canvas, WebCodecs) ─► mp4 / gif / srt / vtt / poster
```

### Units (one purpose each)

| Unit | Does | Depends on |
|---|---|---|
| `intake` | Asks the brief questions, writes `brief.json`, skips anything already given | none |
| `guide` | Headed browser where the user clicks through roughly; writes `guide.json` of resolved selectors | Playwright |
| `recorder` | Runs the scenario with human pacing, captures frames at 2x scale and `events.json` | Playwright |
| `motion` | Cursor path generator, spring zoom, easing tokens | none (pure) |
| `retime` | Pure function: steps plus edits give caption and narration timing | none (pure) |
| `voice` | Kokoro text-to-speech, clip cache, pronunciation dictionary, preview | `kokoro-js` |
| `compositor` | Draws video, cursor, zoom, captions, cards, motion graphics at time t | `motion`, `retime` |
| `editor` | Local web app: timeline, settings, preview with audio and subtitles | `compositor`, `voice` |
| `exporter` | WebCodecs encode and offline audio mix | `compositor` |
| `project` | Reads and writes `project.json`, migrations | none |
| `doctor` | Checks Node, disk, RAM, CPU and browser; recommends a voice | none |

## 5. User flow

1. **Brief.** Topic and flow, audience, length, style (theme), text, captions, voice, music. Asked only for what is
   missing. Saved as `brief.json`.
2. **Capture the flow.** The user chooses **Guide mode** (recommended: they click through once) or **Auto mode** (Claude
   explores using a compact accessibility snapshot).
3. **Scenario.** Claude writes the Playwright scenario from `guide.json` and the brief, and a storyboard of one-sentence
   steps with captions and narration. A fast rehearsal catches broken locators in seconds.
4. **Record.** Paced run with human cursor motion. Phone clip when a vertical cut is wanted.
5. **Edit.** The editor opens in the user's browser. All tweaking happens here at no token cost.
6. **Export.** MP4 (H.264), optional GIF, SRT and VTT, poster, a short 720p cut. Claude replies with one summary line.

### Guide mode

A headed browser with a small recorder overlay. For each user action it stores the best selector (role, label, test id,
then CSS fallback), page URL, the element's accessible name and a small crop. The user is not expected to be perfect; the
file only tells Claude where things are and what comes next. Claude reads the compact `guide.json` instead of exploring
the DOM, which removes the expensive dry-run. *Spike:* build on Playwright's own selector generation.

## 6. Motion that does not feel robotic

- **Cursor path.** Curved path (cubic Bezier with a small perpendicular offset), minimum-jerk speed profile, duration from
  distance (Fitts-style), a slight overshoot and correction on long moves, 1 to 2 px jitter at low speed, a dwell before a
  click, a press-and-release effect. Parameters are theme settings. Playwright drives real mouse events along the same
  path, so hover states fire naturally. The cursor is drawn in post from `events.json`, so style, size and smoothing stay
  editable.
- **Element-aware zoom.** Because the recorder knows each target's bounding box, zoom frames the element with padding
  instead of guessing from the cursor. Triggers: click, text entry focus, a step marked "highlight". Spring easing, dwell
  and hold times, no zoom thrash on rapid clicks, smooth follow while the cursor moves inside a zoom.
- **Motion blur** on fast cursor moves and camera moves (optional per theme).

## 7. Editor

Features: timeline with cut and trim; fast-forward and slow-down ramps; custom cursor (style, size, smoothing, click
effect); zoom regions with easing (auto-suggested, hand-adjustable); background, padding, corner radius, shadow, device
frame; editable captions with style; per-step narration (text, voice, speed, language); motion templates and cards; music;
brand kit; multi-scene sequence with transitions and chapters; undo and redo; autosave; keyboard shortcuts; export queue
with progress and cancel.

**Voice sample.** Every voice and speed has a play button that speaks the user's actual caption, so what they hear is what
the export will sound like.

**Preview.** Plays video, narration, music and captions together, driven by one audio clock (Web Audio). Export mixes
audio offline from the same timeline, so preview and export match. A lower-resolution proxy keeps long or 4K clips smooth.

### Edit rules (`retime`, pure and unit-tested)

1. Cut a whole step: its caption and narration drop out; the editor lists what was removed, with undo.
2. Cut part of a step: the caption stays and the narration plays whole. If the remaining video is shorter than the voice,
   the step gets a warning badge with a one-click fix: freeze the last frame, or slow the video to fit.
3. Fast-forward: voice is never sped up beyond about 1.1x. If the video is shorter than the voice, the same warning
   applies. Narrated steps that have been sped up are flagged.
4. Slow-down: narration is unchanged; gaps are silence.
5. Captions follow the narration clip's timing, or the video span when there is no voice, and never overlap.
6. Edit a caption's text: its voice is marked stale with a one-click regenerate; clips are cached by text, voice and speed.

Browsers: Chrome and Edge supported; Safari and Firefox best effort. *Spike:* H.264 encode and AudioContext behaviour per
browser, and the fallback (VP9 in MP4 or WebM) when H.264 is unavailable.

## 8. Voice

| Role | Model | Notes |
|---|---|---|
| Default | Kokoro 82M, quantised, via `kokoro-js` (Apache-2.0) | About 86 MB, CPU, runs in Node, no Python. Best quality for its size. *Spike:* real-time factor and RAM on a low-end 4-core, 8 GB machine; voice licences. |
| Fast tier | Kitten TTS nano 0.8 (fp32, about 56 MB, Apache-2.0 weights) via a vendored, patched copy of `kitten-tts-js` | RTF 0.06 on an M4 (6.5x faster than Kokoro), 8 English voices, no cloning, about 480 MB memory. Used as an instant draft voice in the editor and as the fallback on slow PCs. The npm port is unofficial and needs a one-line fix for Node (force the `cpu` provider), so vendor it with its NOTICE. The 25 MB int8 model is not exposed by the port. Quality pending the owner's blind listen (S5). |
| Other languages | Piper | Only if Kokoro lacks the language. |
| Not in v1 | KittenTTS 2 (1.7B parameters, 506 to 947 MiB, about 6 GB RAM, PyTorch or a native C++ build) | Breaks the low-hardware, no-complicated-model and permissive-licence rules (its Hugging Face weight licence is tagged "other"). Voice cloning is attractive for branded voices; revisit only as an opt-in tier if a lightweight JavaScript path appears and the weight licence is verified. The free KittenTTS cloud API is also excluded (third-party service). |
| Own voice | Microphone recording in the editor | No model. |
| Bring your own audio | A file per step | No model. |

`doctor` recommends one based on disk and CPU and downloads on confirmation, verifying a pinned SHA-256. A pronunciation
dictionary (brand names, acronyms) and pause and emphasis markers are supported. No voice cloning, no cloud voices.

## 9. Music and loudness

Bring your own file, or choose from a small set of bundled CC0 loops. Music ducks under narration. Output is normalised to
a consistent broadcast loudness (EBU R128, -16 LUFS), computed in JavaScript. No sound effects in v1.

## 10. Motion graphics and themes

Free HTML, SVG and canvas templates parameterised by a few JSON fields, so Claude fills in a handful of values and spends
almost no tokens: title card, outro, lower third, step badge, callout arrow, spotlight and dim, highlight box, number
counter, progress bar, animated gradient background, and transitions (crossfade, slide, zoom-through).

Our own easing token table for video (standard easing curves, longer cinematic durations, spring for camera and cursor;
ease-out for entrances, ease-in-out for moves, exits faster than entrances, no scale from zero, bounce off by default).
The third-party `motion-design` skill was reviewed and rejected: wrong domain (interactive UI), no licence, and it adds a
dependency and token cost.

**Three complete themes** for v1 (background, cursor, zoom feel, typography, card and lower-third style, transition):
*clean*, *dark* and *bold*. Open fonts (OFL) only.

## 11. Brand kit and multi-scene

`brand.json` per client: logo, colours, fonts, intro and outro, watermark, default theme. Reused across videos. A video can
be a sequence of scenes (each a recording) with transitions and chapters.

## 12. Project format

A folder (default under `~/.showreel/projects/<name>/`, never inside the demoed project) holding `brief.json`,
`guide.json`, `scenario.spec.ts`, `project.json` (storyboard, edits, theme, brand, music), `events.json`, raw clips, voice
cache and renders. If the app's UI changes, one command re-records and re-applies the stored edits.

## 13. Security

- Editor server binds 127.0.0.1 only, with a per-session token and origin checks; no CORS.
- Model download pinned by URL and SHA-256.
- Saved login sessions stored with owner-only permissions; the skill never types a password.
- Real-app write protection kept as today.
- npm lockfile, Dependabot, and a CI licence audit that fails on GPL, AGPL or GSAP.

## 14. Third-party code

| Source | Licence | Use |
|---|---|---|
| OpenScreen (`siddharthvaddem/openscreen`, archived; maintained fork `getopenscreen/openscreen`) | MIT | Borrow exporter, cursor renderer, timeline and zoom logic from a pinned snapshot, replacing GSAP and Electron IPC; attribution in `THIRD_PARTY_NOTICES.md` |
| Recordly | not MIT (listings say AGPL) | **Never copied.** Removed entirely. |
| `kokoro-js`, Kokoro-82M | Apache-2.0 | Voice |
| `mediabunny` | MPL-2.0 | Encode and mux; file-level copyleft, attribution |
| PixiJS | MIT | Rendering, if kept after the extraction spike |
| Playwright | Apache-2.0 | Browser automation |

## 15. Testing and CI

Golden-frame tests of the deterministic compositor; property tests for cursor paths; unit tests for `retime`; Playwright
tests of the editor itself; a real export test; a three-OS matrix (Mac, Windows, Linux) with Node LTS; licence audit; the
existing personal-data scan.

## 16. Token efficiency

`SKILL.md` under about 100 lines with reference files loaded on demand. Claude writes only the brief, the storyboard and
the scenario. Guide mode replaces exploration. The editor absorbs all tweaking. Screenshots reach Claude only on failure.
**Before anything is deleted, measure the old skill's per-video token cost on a standard scenario** (baseline), then set a
hard budget for showreel and track it with a per-run meter in CI-style benchmarks.

## 17. Phases

| # | Phase | Acceptance |
|---|---|---|
| 0 | Baseline and spikes | Baseline token cost recorded. Spikes S1 to S8 answered in writing (below). |
| 1 | Scaffold `plugins/showreel` side by side | New plugin builds, validates and tests on three OSes; safe code reused from `skills-demo` (config, doctor, recorder safety, write blocking); `skills-demo` keeps working untouched. |
| 2 | Intake, storyboard, Guide mode | A user-guided flow produces a working scenario with no exploration loop. |
| 3 | Recorder and motion | `events.json` captured; cursor paths pass property tests; blind side-by-side beats the old cursor. |
| 4 | Compositor and exporter | Golden frames match; export plays in QuickTime, VLC and browsers. |
| 5 | Editor | All section 7 features work; edit-rule tests pass; preview matches export. |
| 6 | Voice with preview, own voice, music | Real-time factor target met on the reference low-end PC. |
| 7 | Themes, templates, brand kit, multi-scene | Three themes render the same storyboard distinctly. |
| 8 | Token meter and benchmark | Per-video tokens at or under the budget, and below the baseline. |
| 9 | Parity, release, retire the old skill | Showreel passes the quality bar (section 21) on the acceptance corpus; tag `showreel-v0.1.0`; first demo video made with showreel; only then `plugins/skills-demo` is removed and its marketplace entry replaced. |

### Spikes (Phase 0)

| ID | Question |
|---|---|
| S1 | Does H.264 WebCodecs export work in Chrome, Edge and Safari, and what is the fallback in headless or unsupported browsers? |
| S2 | Capture quality: screencast frames at 2x scale, 30 versus 60 fps, versus Playwright's built-in video. **Result: see section 22 and `docs/42`.** |
| S3 | How cleanly do OpenScreen's exporter, cursor renderer and timeline extract from Electron? Is PixiJS needed? |
| S4 | Can Playwright's selector generator drive Guide mode, and what does `guide.json` need to contain? |
| S5 | Kokoro on a low-end CPU: real-time factor, RAM, first-run download; do its voices carry any extra licence terms? Can the Kitten nano/micro ONNX models run in Node (`kitten-tts-js` or `onnxruntime-node` plus a WebAssembly phonemizer), and how do they compare with Kokoro in a blind listen? |
| S6 | Loudness normalisation and offline mixing in JavaScript: accuracy and speed. |
| S7 | A/V sync of the editor preview over long clips with a single audio clock. |
| S8 | Memory behaviour of 4K export, and where a proxy is needed. |

## 18. Risks

OpenScreen is archived (vendor a pinned snapshot). Browser codec support varies. Capture quality is the largest unknown
(S2). Kokoro quality is good but not human; the own-voice path covers that. The editor is a large build; phases 5 and 6
carry most of the effort.

## 19. Removed (at phase 9, after parity; nothing is removed earlier)

`recordly.mjs`, `recordly-project.mjs`, the frame-alignment code (`align.mjs`) and its tests, Voicebox integration, `say` and
`espeak` paths, and the `for-recordly/` folder. The ffmpeg-based compose and render path is replaced by the compositor and
exporter once phase 4 passes.

## 20. Gaps closed on 2026-10-18 (second review)

| Gap | Resolution |
|---|---|
| Replacing in place would break the working skill for months | **Decided:** build side by side as `plugins/showreel` (own tags `showreel-vX.Y.Z`); retire `skills-demo` at phase 9. |
| The editor has a build step but plugins install by git clone | **Decided:** CI builds the editor on each release and commits the bundle into the plugin; CI also checks that the committed bundle is reproducible from source. |
| Capture size and disk use (4K frames are large; machines may have little free disk) | Stream-encode while recording; a retention policy; `showreel clean`. Spike S2 also measures disk footprint per minute of recording. |
| Demos look amateur without page hygiene | On by default, each switchable: hide known dev overlays (Next.js and React indicators), hide scrollbars, hide caret blink, wait for fonts and images, dismiss cookie banners. |
| Waits and spinners waste viewer time | The editor suggests cuts or speed-ups for dead air; nothing is applied automatically. |
| Remote or SSH use | Editor stays loopback-only with a token and prints its URL (works with port forwarding). A `--host` option is a later, explicit opt-in. |
| Borrowed assets may carry different licences from code | Copy OpenScreen code only. Wallpapers, images and fonts are not copied unless S3 verifies their licence. |
| Install footprint | Browser about 170 MB; voice model about 86 MB, downloaded only when voice is enabled; `onnxruntime-node` platform binaries checked on Windows, Mac and Linux, x64 and ARM, in S5. |
| App audio and a webcam bubble | Not in v1. |
| Build cost | Reasoned, not measured: roughly 10 to 20 million Claude tokens in total, with Codex doing much of the mechanical work. Re-estimated after phase 0. |

## 21. Quality bar and acceptance corpus

Acceptance subject: **https://anshchovatiya.vercel.app/** (the owner's public portfolio: no login, no writes, safe to record
repeatedly and from CI). A second, public open-source app can be added later for variety.

A video passes when all of these hold:

| Measure | Target |
|---|---|
| Frame rate | Steady 60 fps (or the chosen rate) with no dropped frames |
| A/V drift | 40 ms or less over a 3-minute video |
| Loudness | -16 LUFS, within 1 |
| Caption overlap and frozen frames | Zero |
| Preview versus export | Golden frames match within a set tolerance |
| Cursor motion | The owner prefers it in a blind side-by-side against the old skill's cursor |
| Token cost | At or under the budget set after the phase 0 baseline, and below the baseline |
| Platforms | Records and exports on Mac, Windows and Linux in CI |

## 22. Capture design (from spikes S2, S2b and S2c, 2026-10-18)

Measured on an Apple M4 (see `docs/42-showreel-spike-findings.md`); verify on Windows and Linux in Phase 3.

- **Do not use Playwright's built-in video** (25 fps VP8, soft text) and **never store raw frames** (about 490 MB per minute at 1080p):
  capture with CDP screencast and stream-encode while recording.
- **CDP screencast frames are capped at the page's CSS viewport size** in headless Chromium (old and new headless), whatever the
  device scale factor. Sharper capture therefore uses a **larger viewport with CSS `zoom`**: viewport = scale x 1920 wide and
  `document.documentElement.style.zoom = scale`, which keeps the desktop layout (layout SSIM about 0.97) at `scale`x pixel density.
- **Capture scale** is chosen per machine, 1.0x to 2.0x: 1.0x holds 59.5 fps, 1.33x 56.9, 1.67x 51, 2.0x 34.7 (worst-case scrolling
  workload). `doctor` benchmarks for 10 s and picks the highest scale at or above 50 fps. Sharp zoom depth equals the capture
  scale; deeper zoom shows a softness warning in the editor.
- **Layout guard:** at record time, compare a 1x reference screenshot with the scaled capture (SSIM). Below about 0.93 the site reacts
  to viewport width, so fall back to 1x or the hybrid layer.
- **Hybrid zoom layer (optional):** the recorder knows each target's bounding box, so it can capture 2x region stills (clip
  screenshots at deviceScaleFactor 2, about 30 fps, 30 to 44 ms each) alongside a 60 fps 1x stream (stream stays at 60 fps, no
  drops) and composite them during zoom holds.
- **Frame rate:** screencast emits frames only when the page changes, so the compositor treats the input as variable frame rate and
  fills to the output rate.
- **Readiness:** wait for `domcontentloaded` plus a settle time (or an explicit readiness signal), never `networkidle`.
- **Open checks:** fixed-position elements, canvas, iframes and `vh` units under CSS zoom; Windows and Linux behaviour.

## 23. Findings applied from S6, S7 and S8 (2026-10-18)

- **Loudness:** after normalising to -16 LUFS, apply a true-peak limiter (about -1 dBTP); validate on real narration in Phase 6. The meter is 48 kHz only, so resample first.
- **Preview sync:** one audio clock drives playback; calibrate the start offset once after playback begins and compensate for the device's `outputLatency`. Natural drift is about 2.4 ms per minute.
- **Export:** write output to disk in chunks (never assemble a whole file in one value); default to 1080p60, 4K opt-in; show progress and an ETA (4K encodes at about 14 to 23 fps on an M4); peak browser memory about 1.7 GB at 4K.
