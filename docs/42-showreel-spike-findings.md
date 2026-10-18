# Showreel spike findings

Status: **complete, 2026-10-18.** B0, S1 to S8 (with S2b and S2c) are done. Gate below. Numbers come from
`spikes/showreel/results/*.json`. Test machine: Apple M4, 16 GB, macOS; Playwright 1.63.0; Node 24.

## Summary and go/no-go gate

| Spike | Verdict | Decision it forced |
|---|---|---|
| B0 baseline | measured | Old skill: about 42,380 fresh tokens, $0.21 and 60 s for a simple 5-step video; metric to beat is fresh tokens and cost, not total processed |
| S1 browser H.264 export | **go** | WebCodecs needs a secure context (serve the editor from 127.0.0.1); all four engines encode on macOS; Windows and Linux untested |
| S2 / S2b / S2c capture | **go, with changes** | No built-in video; stream-encode while recording; screencast is capped at the CSS viewport size, so sharp capture uses CSS zoom on a larger viewport (1.0x to 2.0x, picked per machine) plus an optional 2x hybrid zoom layer |
| S3 OpenScreen | **go, narrower** | Borrow about ten pure modules and adapt the exporter and compositor; write our own time-map API and click effect; exclude all assets and Whisper captioning; editor is React plus Vite |
| S4 Guide mode | **go, redesign** | Capture facts in the page at click time, resolve selectors by replaying in order |
| S5 voices | **go** | Kokoro default (owner chose it as clearest); Kitten limited to draft and slow-PC fallback via a vendored, patched copy |
| S6 loudness | **go, plus limiter** | JavaScript BS.1770 meter verified; add a true-peak limiter |
| S7 A/V sync | **go** | One audio clock; calibrate the start offset; compensate for output latency |
| S8 4K export | **go, with changes** | Stream to disk; default 1080p60; show progress and ETA |

**Phase 8 token budget (proposed):** at or below **42,380 fresh tokens and $0.21** for the same 5-step flow with default settings, with all
tweaking done in the editor at zero tokens. A harder-flow baseline (multi-page, login) is still unmeasured: measure it at the start of Phase 8 and
set its budget then.

**Revised full-build estimate** (reasoned, not measured, fresh tokens, plus or minus 50%, excluding the finished Phase 0): about **10 to 20 million**,
essentially unchanged from the earlier remaining estimate of 10 to 20.5 million. Capture work grew (scale benchmark, layout guard, stream encoding,
hybrid layer), the voice and export work shrank (now proven), and borrowing is narrower than hoped. Gemini is unavailable, so more of the
mechanical work falls to Codex and Claude: expect Claude's share of roughly 7 to 16 million.

| Phase | Estimate (fresh tokens) |
|---|---|
| 1 Scaffold side by side, plus an early three-OS CI matrix | 0.3 to 0.6M |
| 2 Intake, storyboard, Guide mode | 0.5 to 1.0M |
| 3 Recorder, capture scale, motion, page hygiene | 1.5 to 3.0M |
| 4 Compositor, exporter, time-map | 1.8 to 3.5M |
| 5 Editor (React plus Vite) | 3.5 to 6.5M |
| 6 Voice, music, loudness, own voice | 0.9 to 1.8M |
| 7 Themes, templates, brand kit, multi-scene | 1.0 to 2.0M |
| 8 Token meter and benchmark | 0.3 to 0.6M |
| 9 Parity, release, retire the old skill | 0.6 to 1.2M |

**Recommendation: GO for Phase 1.** Carry these risks forward: Windows and Linux are untested for S1, S2 and S8 (add the three-OS matrix in
Phase 1, not Phase 9); CSS zoom is verified on one site only; real audio-device latency and 4K proxy decode are untested; the harder baseline is
unmeasured; the owner's own sites are the only acceptance subjects so far.

**Spec edits made from these results** (all in `docs/40-showreel-design.md`): sections 22 and 23 (capture design, loudness, sync, export), the
voice tier table (section 8), the borrowed-code table (section 14), and the notes below.

## B0: baseline token cost of the old skill

Prompt: make a 5-step demo video of https://anshchovatiya.vercel.app/ with the old `demo-video` skill, headless, no voice.
Three runs, all produced a 1080p60 video of about 14 to 15 s.

| Measure | Median of 3 runs |
|---|---|
| Input (uncached) tokens | 14 |
| Output tokens | 1,929 |
| Cache-creation tokens | 40,437 |
| Cache-read tokens | 281,835 |
| "Fresh" tokens (input + output + cache creation) | 42,380 |
| Total processed | 324,215 |
| Cost | $0.21 |
| Wall time | 61 s |

Reading: the old skill is already cheap for a simple flow. Almost all volume is cache reads. The metric to beat is **cost in
USD and fresh tokens**, not total processed. Caveats: one simple scenario; the session also loads other plugins (ctx, a
session-start hook), a constant overhead; two earlier runs were discarded because my script's plugin path was wrong (the skill was
found by filesystem search in the others), and the script now only counts runs that print `Final video:`. A harder scenario
(multi-page app, login, many steps) is still needed to measure the long exploratory dry run the owner described. **Proposed
Phase 8 budget:** at or below 42,380 fresh tokens and $0.21 for this same flow, and a separate budget for the harder flow
once it is measured.

## S1: H.264 export in browsers: **go, with caveats**

WebCodecs needs a **secure context**: from `about:blank` every Chromium engine reported no encoder; served from `http://127.0.0.1`
all of them work. (The editor is served from loopback, so this matches the design.) Results, all producing playable MP4:

| Engine | H.264 | VP9 | AV1 |
|---|---|---|---|
| Playwright Chromium (headless shell) | yes | yes | yes |
| Installed Google Chrome | yes | yes | yes |
| Playwright WebKit | yes | yes | yes |
| Playwright Firefox 155 | yes | yes | yes |
| Microsoft Edge | not installed here, untested | | |

ffprobe on the bundled-Chromium output: `h264`, 1280x720, 30/1, 90 frames. Caveats: **macOS only**; Windows and Linux (especially
headless Chromium H.264) are untested and must be covered by the CI matrix in Phase 4. File sizes differ a lot for the same
content and bitrate (651 KB bundled Chromium versus about 165 KB elsewhere), so encoder rate control differs and output quality
must be checked, not assumed. VP9 and AV1 are available everywhere tested, so a fallback exists.

## S2: capture quality and disk: **go, with changes**

1920x1080, 15 s of scrolling the live site:

| Method | fps | Dropped frames | Disk per minute |
|---|---|---|---|
| CDP screencast, JPEG q90 | 59.5 | 0 | about 490 MB |
| CDP screencast, JPEG q100 | 59.5 | 0 | about 990 MB |
| CDP screencast, q90, deviceScaleFactor 2 | 59.2 | 0 | about 490 MB (frames still 1920x1080) |
| Playwright `recordVideo` | VP8 at 25 | not measured | about 7 to 12 MB |

Findings:
1. **Real-time 60 fps capture works** on this machine with no dropped frames, so the 60 fps default is feasible here.
2. **Raw frame storage is impossible**: about 490 MB per minute. Frames must be stream-encoded while recording (confirms the gap
   listed in spec section 20).
3. **Playwright's built-in video is rejected for production**: 25 fps VP8, visibly softer text with compression smudging.
4. **Screencast is capped at the page's CSS viewport size**: with `deviceScaleFactor: 2` and explicit `maxWidth` and `maxHeight` the
   frames were still 1920x1080. A zoom animation magnifies pixels, so 1x capture will look soft when zoomed in. This
   threatens the quality bar and needs follow-up spike **S2b** before Phase 3.
5. Screencast emits frames only when the page changes (variable frame rate), so the compositor must treat input as VFR and
   fill to a constant rate.
6. `waitUntil: 'networkidle'` is unreliable on real sites (it timed out on the first load); the recorder should wait for `load`
   plus a short settle or a readiness signal.
7. Measured on an M4 only; a low-end machine may drop frames.

## S2b: capture at true 2x: **no real-time 60 fps route found; options below**

Same workload as S2 (live site, 15 s of scrolling, M4). "Frame pixels" is read from the saved frames with ffprobe, not from the options passed.

| Variant | Works | fps | Dropped | Disk per minute | Real frame pixels |
|---|---|---|---|---|---|
| A: 3840x2160 CSS viewport, dsf 1, screencast | yes | 44.4 | 0 | about 880 MB | **3840x2160** |
| B: dsf 2, `Page.captureScreenshot` loop | yes | 30 (26 in new headless) | 0 (10) | about 255 MB | 1920x1080 |
| C: dsf 2, `page.screenshot` loop | yes | 10.1 | 151 | about 222 MB | **3840x2160** |
| D: dsf 2 via `Emulation.setDeviceMetricsOverride` + screencast | yes | 59.8 | 0 | about 493 MB | 1920x1080 |
| E: BeginFrame-controlled capture | **no** | | | | page never rendered under BeginFrame control (60 s timeout) |

Findings:
1. In headless Chromium, both screencast and `captureScreenshot` return frames **capped at the CSS viewport size**, whatever the device scale factor (also true for Playwright's new headless mode, channel `chromium`, tested for B and D).
2. Only two routes deliver real 4K pixels: a 4K CSS viewport (A, 44 fps) or `page.screenshot` (C, 10 fps). Neither gives 60 fps at true 2x.
3. A changes the page layout (the app sees a 3840 px wide viewport), so a desktop layout designed for 1920 px will not look the same.
4. Raw JPEG at 4K is about 880 MB per minute, which reinforces stream-encoding while recording.

Implication for the quality bar: zoom animations magnify pixels, so capture scale limits the sharp zoom depth. **Follow-up S2c (before Phase 3):**
(a) screencast at 2560x1440 and 3200x1800 CSS viewports to find the highest scale that holds 60 fps;
(b) root `zoom` (CSS) on a 4K viewport to keep the desktop layout, and check for media-query differences;
(c) hybrid capture: 60 fps screencast at 1x plus high-resolution stills (route C with `clip`) of the zoom target for the zoom hold;
(d) accept 1x capture with a maximum zoom of about 1.5x and judge perceived softness by eye.

## S2c: sharp capture routes: **go: a tunable capture scale plus an optional hybrid zoom layer**

Same workload (live site, 15 s of scrolling, M4). Raw data: `spikes/showreel/results/s2c-capture.json` and `s2c-capture-2.json`.

**CSS `zoom` on a larger viewport keeps the desktop layout at higher pixel density.** Set the viewport to scale x 1920 wide and
`document.documentElement.style.zoom = scale`. Layout fidelity is measured by SSIM against a plain 1920x1080 screenshot (a noise floor
of two identical captures is 1.0; a plain 4K viewport without zoom scores only 0.77, i.e. the layout changes):

| Capture scale | Viewport | Layout SSIM | fps | Dropped | Real pixels | Raw disk per minute |
|---|---|---|---|---|---|---|
| 1.0x (S2) | 1920x1080 | 1.0 | 59.5 | 0 | 1920x1080 | about 490 MB |
| 1.33x | 2560x1440 | 0.977 | 56.9 | 0 | 2560x1440 | about 700 MB |
| 1.67x | 3200x1800 | 0.975 | 51.0 | 0 | 3200x1800 | about 860 MB |
| 2.0x | 3840x2160 | 0.972 | 34.7 | 0 | 3840x2160 | about 760 MB |

(One earlier run of a plain 2560x1440 viewport without zoom gave 51 fps and 25 dropped frames, so single runs vary; repeat before relying on
a number.) The page sees the larger viewport width (`innerWidth` 3840 at 2x), so sites with media queries or `vw` units may lay out
differently; this site did not.

**Hybrid capture is free for the stream.** A 960x540 CSS clip screenshot at deviceScaleFactor 2 (1920x1080 real pixels, true 2x)
takes about 30 to 44 ms; looped, it runs at about 30 fps, and while it runs the 1x screencast still delivers **60.1 fps with zero
dropped frames**.

**Visual check (same CSS region, true 2x versus 1x upscaled 2x):** real 2x is crisp, including small caps text and icons; upscaled 1x is
clearly softer, especially small text. Large headings survive upscaling.

### Capture design this implies (applied to the spec, section 22)

1. Record at a **capture scale** chosen per machine (1.0x to 2.0x), using the CSS zoom route, so every zoom region is sharp up to
   that scale without re-recording.
2. At record time, compare a reference 1x screenshot with the scaled one (SSIM). If fidelity is below a threshold (about 0.93), fall
   back to 1x capture, because the site's layout reacts to viewport width.
3. Optional **hybrid zoom layer** for auto-zoom targets (the recorder knows each target's box): 2x region stills at about 30 fps,
   composited over the stream during zoom holds.
4. `doctor` runs a 10-second benchmark and picks the highest scale that holds 50 fps or better.
5. The sharp zoom depth equals the capture scale; beyond it, the editor shows a "softness" warning on that zoom region.
6. Still to verify: sites with fixed-position elements, canvas, iframes and `vh` units under CSS zoom, and behaviour on Windows and Linux.

## S6: loudness and offline mixing: **go, with one addition (a limiter)**

- A plain-JavaScript ITU-R BS.1770-4 meter (K-weighting plus gating, `spikes/showreel/s6-loudness/lufs.mjs`, written by Codex, verified
  by me) reads the EBU reference (stereo 1 kHz sine at -23 dBFS) at **-22.993 LUFS**, a 6 dB louder signal exactly 6 LU louder, and
  a one-channel-silent signal 3.010 LU lower (theory 3.01). Six tests pass; no tolerance was changed.
- Offline mix in the browser (`OfflineAudioContext`: two narration clips plus a music bed, ducked to 25% with 150 ms attack and 400 ms
  release): measured **-22.13 LUFS**; a gain of +6.13 dB gives **-16.00 LUFS** (target met within 0.01); ducking depth **12.04 dB**
  (theory for 0.25 gain: 12.04 dB).
- Caveats: the meter supports 48 kHz only (resample first); the test used synthetic tones, not speech. Speech has a high crest factor,
  so raising a mix to -16 LUFS can push peaks past 0 dBFS: **add a true-peak limiter (about -1 dBTP) after the gain stage** and test it
  on real narration in Phase 6.

## S7: editor preview A/V sync: **go (calibrate the start offset)**

3-minute run, 30 fps test video, audio-clock mapping per presented frame (`requestVideoFrameCallback` against `getOutputTimestamp`):

| Mode | Start offset (median) | Drift p95 around the median | Max around median | Slope | Corrections |
|---|---|---|---|---|---|
| Free-running, idle | 38.7 ms | 3.4 ms | 3.7 ms | 2.4 ms per minute | none |
| Free-running, 30% main-thread load | 24.5 ms | 3.4 ms | 3.7 ms | 2.4 ms per minute | none |
| Corrected (rate nudges), same load | 16.5 ms | 3.4 ms | 29.8 ms | 0.75 ms per minute | 26 nudges, 0 seeks |

Reading: a single audio clock keeps video and audio together: natural drift is about 2.4 ms per minute (about 7 ms over 3 minutes),
unaffected by main-thread load. The remaining error is a **constant start offset** that varies from run to run (16 to 39 ms), so the
editor should **calibrate once after playback starts** (measure the offset over the first second, then nudge or seek once) and
compensate for the device's `outputLatency` (Bluetooth headphones add 100 ms or more). Corrected playback kept absolute error p95 at
19.7 ms against the 40 ms target. Caveat: headless Chromium has no real audio device, so real output latency and decode load of a 4K
proxy still need a check in Phase 5.

## S8: 4K export memory: **go, with changes**

3840x2160, 60 fps, H.264 at a 40 Mbps target, WebCodecs through mediabunny, headless Chromium:

| Run | Completed | Output | Peak browser memory | Encode speed |
|---|---|---|---|---|
| 10 s, buffered | yes (ffprobe: h264 3840x2160, 600 frames) | 96 MB | 1,422 MB | 22.9 fps |
| 60 s, buffered | yes | 580 MB | 1,646 MB | 16.4 fps |
| 60 s, streamed | yes | 580 MB | 1,492 MB | 13.9 fps |

Findings: (1) memory stays below 1.7 GB, mostly in the encoder and canvas pipeline (JS heap about 5 MB); streaming output saves only
about 150 MB. (2) Returning the 580 MB file to Node as one string failed (`RangeError: Invalid string length`), so **the editor must write
exports to disk in chunks** (File System Access API or a streamed download), never assemble them in one value. (3) 4K export runs at
14 to 23 fps, about 0.25 to 0.4 times real time on this machine, so a 3-minute 4K export would take roughly 10 to 13 minutes: **default to
1080p60, offer 4K as opt-in, and show progress with an ETA**. The synthetic frame drawing is CPU-bound, so this is a pessimistic upper
bound for the real compositor. Windows and Linux are untested.

## S5: voice models in Node: **go: Kokoro default; Kitten as a fast tier, with caveats**

Same 25-word sentence (about 10 s of audio), M4, CPU only, ONNX Runtime in Node. RTF is generation time divided by audio length (lower is faster; below 1 is faster than real time).
`spikes/showreel/results/s5-tts.json`.

| Model | RTF (median) | Peak memory | Download | Notes |
|---|---|---|---|---|
| Kokoro-82M q8, default threads | 0.405 | 717 MB | 96 MB model cache | first run 47 s including download; Apache-2.0 |
| Kokoro, 2 threads | 0.371 | 715 MB | | extra threads barely help (single-thread bound) |
| Kokoro, 1 thread | 0.467 | 701 MB | | still 2.1x real time on one M4 core |
| Kitten nano 0.8 (fp32) | **0.062** | 477 MB | about 56 MB | 16x real time; 8 English voices |
| Kitten micro 0.8 | 0.130 | 662 MB | about 41 MB | |
| Kitten mini 0.8 | 0.250 | 922 MB | about 80 MB | |

(All Kitten models together are 178 MB in the cache; the three Kitten sizes are from the package's model list.)

Findings:
1. **Kokoro works in Node as designed** and is fast enough even on one thread. A slower PC core (say 3x slower than an M4 core) would land near real time, so `doctor` must benchmark on the user's machine and fall back to a faster tier when RTF exceeds about 1.
2. **Kitten runs in Node, but not out of the box.** `kitten-tts-js` 0.1.2 (an unofficial hobbyist port: Apache-2.0, 62 KB, no install scripts, uses the same WebAssembly `phonemizer` as Kokoro, so **no system tool is needed**) fails under Node with "no available backend found: [wasm] backend not found". Cause: `src/kitten-tts.js` line 84 requests the `wasm` provider whenever `ort.env.wasm` exists, which is also true in Node. Forcing the `cpu` provider from outside (patching `InferenceSession.create`) fixes it. The package also whitelists only `nano-0.8` (fp32), `micro-0.8` and `mini-0.8`; the 25 MB int8 model is not exposed.
3. **Kitten is not lighter in memory** (477 to 922 MB versus 717 MB), only faster. Its value is speed: nano is about 6.5x faster than Kokoro.
4. **Licences:** Kokoro-82M, its ONNX build and Kitten nano int8 model cards are Apache-2.0; provenance of the voices' training data was not audited.
5. **Process exit:** calling `process.exit()` while ONNX Runtime threads are alive aborts with "mutex lock failed" after the work completes; the real skill must dispose sessions or use a worker process. Also `audio.save()` is asynchronous: await it before exiting.

Proposed role: **Kokoro as the default voice; Kitten nano as an instant draft voice** in the editor (hear the script immediately, then render the final with Kokoro) and as the fallback tier for slow PCs. Because the Kitten port is unofficial and needs a patch, vendor the 62 KB package (Apache-2.0, keep its NOTICE) and fix the one line, rather than depending on npm.
**Quality verdict (owner's blind listen, 2026-10-18): Kokoro was clearly the best and clearest.** Of four anonymised samples (A Kokoro, B Kitten micro, C Kitten mini, D Kitten nano) the owner picked A. Consequences: Kokoro stays the default and the voice for every final render; the Kitten models are less clear, so they are limited to an optional instant *draft* preview and the slow-PC fallback, and the fallback must warn that clarity is lower. If draft clarity proves too poor in the editor, drop Kitten and use Kokoro alone (its 1-thread RTF of 0.47 is already fast enough for drafts on this machine).

## S4: Guide mode selector capture: **go, with a design change (resolve at replay, not at capture)**

First attempt (the plan's design: Node checks each candidate selector for uniqueness when the event arrives), with the owner clicking five things on the
portfolio: 4 of 5 steps had a unique selector at capture, and **only 3 of 5 resolved on replay**. Two failure classes:
1. **Uniqueness was checked after the click had already acted** (events reach Node asynchronously), so the page had changed: step 0 ("View my work") had no unique candidate even though a fresh load matches it exactly once.
2. **The URL was recorded after the navigation** (`page.url()` in the callback), so replay opened the wrong page for the next step and the selector matched nothing.

Redesign (now `spikes/showreel/s4-guide/{recorder,guide,resolve}.mjs`): the in-page listener captures everything **synchronously at click time** (all ordered candidate selectors, accessible name, role, tag, `location.href`, and the element's box in page coordinates); nothing is judged at capture. A **resolver replays the steps in order** and, at each step, picks the first candidate that matches exactly one element at that moment; if only multi-match candidates exist it picks the match nearest the recorded box (`candidate >> nth=k`, accepted only within 40 px).

| Test | Result |
|---|---|
| Live portfolio, automated clicker (4 link clicks, incl. the two that failed before) | **4 of 4 resolved uniquely and replayed** |
| Local page with three identical "Read more" links and "Save" buttons, plus a search box | **3 of 3 resolved, and each selector points at the element used** (checked by href and enclosing card heading) |

Also found: **a crash in the CSS-path fallback on shallow pages** (it walked up to `<html>`, which has no parent); fixed. The deep live site had hidden it.

`guide.json` needs per step: `action`, ordered `candidates`, `name`, `role`, `tag`, `url` at click time, `box` (page coordinates), and `value` for fills; the resolver adds `selector` and `how`. Improvements to build in Phase 2: prefer scoped semantic selectors (for example by the enclosing card heading) over long structural CSS paths, which resolved correctly here but are brittle; capture hover, keyboard and scroll actions; handle new tabs and external links (the owner's first run clicked a link to another site); iframes, shadow DOM and canvas are untested.

## S3: OpenScreen extractability: **go, with a narrower scope than "borrow the editor"**

Snapshot `ca8104c` of `siddharthvaddem/openscreen` (MIT, copyright 2025 Siddharth Vaddem; retain the notice). Full classification with file:line
references: `docs/43-openscreen-extraction-report.md` (written by Codex, spot-checked by Claude: the click-ring no-op, type-only imports, the
Electron call in the exporter, the `motion` spring library, the absence of GSAP in the focus code, the Whisper dependency, the cursor-art
source and the failing bundle all matched the source). Scanner: 52 files and 14,605 lines in the focus directories; 46 files have no direct
Electron, GSAP or `window.electronAPI` reference. **But** the exporter does not bundle on its own: esbuild failed with 21 errors (6 shown),
all unresolved project aliases (`@/lib/wallpaper`, `@/utils/platformUtils`) and `web-demuxer`.

**Borrow as is** (pure logic, only type imports, small): easing math and cubic-Bezier solver (`mathUtils.ts`), cursor-dwell auto-zoom
suggestions (`zoomSuggestionUtils.ts`), cursor focus following (`cursorFollowUtils.ts`), zoom region strength and selection
(`zoomRegionUtils.ts`), the frame queues (`asyncVideoFrameQueue.ts`, `timestampedVideoFrameQueue.ts`), gradient parsing, MP4 size and bitrate
settings, webcam frame drawing, and the zoom, trim and speed region type declarations.

**Borrow with edits:** export orchestration and the frame loop (`videoExporter.ts`: replace Electron file reads, aliases, wallpaper and platform
providers), the decoder's trim and speed segment arithmetic (`streamingDecoder.ts`), offline cursor smoothing and the live spring smoothing
(`cursorPathSmoothing.ts`, `motionSmoothing.ts`, uses the MIT `motion` package, not GSAP), the Pixi compositor and zoom transform
(`frameRenderer.ts`), audio processing and the MP4 muxer, the timeline UI (`TimelineEditor.tsx`, depends on React and `dnd-timeline`), and annotations.
Trim and speed time mapping exists only as decoder loop arithmetic: **we must write an explicit bidirectional source-to-output time-map API**
(which our `retime` unit needs anyway).

**Do not borrow:** Electron IPC and system-cursor capture; native capture code; **all bundled assets** (wallpapers, cursor artwork, demo
media, logos, WASM): their asset-specific licences are unverified, and the cursor artwork cites a third-party site; **captioning and
transcription**, which load a local speech-recognition model (`Xenova/whisper-tiny` through `@xenova/transformers`), breaking our rule of one
local model (TTS only); and the click ring, which is an empty function in the source (we build our own).

**Dependencies seen:** `mediabunny` MPL-2.0 (already planned; file-level copyleft, attribute), `pixi.js` MIT, `motion` MIT, `dnd-timeline` MIT, `react` MIT,
`gif.js` MIT, `lucide-react` ISC, `sonner` MIT, `uuid` MIT; `web-demuxer` printed no licence (unverified; avoid or verify before use).

Consequences for the plan: (1) the editor stack is **React plus Vite**, which matches the borrowed code and fits the committed-prebuilt-bundle
decision; (2) the borrow is roughly ten small pure modules plus adapted exporter and compositor files, **not** the editor UI (the two largest UI files
are 83 to 93 KB and tied to the host app), so Phase 5 UI work is mostly ours; (3) write the time-map API and the click effect ourselves; (4) all
art (cursors, backgrounds, themes) is created or sourced under a verified licence.

## Phase 1: three-OS smoke results (CI, 2026-10-18)

The Phase 1 smoke tests ran on GitHub's CPU-only runners (Ubuntu, macOS and Windows, Playwright's bundled headless Chromium, Node 22) against the fixture app,
unattended, in run 39119947503. They answer the main risk carried out of Phase 0: does it work off a Mac?

| Check | Ubuntu | macOS | Windows |
|---|---|---|---|
| H.264 (and VP9, AV1) WebCodecs export | yes (643 KB MP4) | yes (642 KB) | yes (645 KB) |
| 4K / 60 fps export, 4 s | completed, 16.6 fps, 1,066 MB peak | completed, 14.1 fps, 861 MB | completed, 22.3 fps, memory not sampled |
| Capture fps at scale 1 / 1.33 / 1.67 / 2 | 59.7 / 59.1 / 42.5 / 22.5 | 36.7 / 43.2 / 52.5 / 39.4 (noisy) | 59.7 / 58.3 / 47.7 / 34.9 |
| Layout drift at every scale | below 0.003 | below 0.003 | below 0.002 |
| Benchmark's recommended capture scale | 1.33 | 1.67 | 1.33 |

Findings:
1. **H.264 export works on all three operating systems**, so the exporter design (WebCodecs through mediabunny) stands, with VP9 and AV1 as fallbacks that also work everywhere tested.
2. **CSS-zoom capture keeps the layout on all three** (drift below 0.003 on the fixture) and the capture scale genuinely depends on the machine: CPU-only runners cannot hold 2x, and `doctor --benchmark` picks 1.33x or 1.67x for them. The adaptive capture scale in section 22 of the spec is therefore necessary, not optional.
3. **Runners are noisy.** The macOS runner showed 36.7 fps at scale 1 with 19 dropped frames but 52.5 fps at 1.67, which is not monotonic. The benchmark needs a warm-up pass and the median of two runs before it recommends a scale (a Phase 3 item).
4. **Benchmark method lessons (all fixed in `scripts/lib/capture-benchmark.mjs`):** (a) screencast emits a frame only when the page changes, so a heartbeat animation is needed to measure capture capacity; (b) scripted Playwright input lowers the screencast rate by itself (about 42 fps versus 60 on this Mac), so capacity is measured with no input and the recorder's input load is a separate Phase 3 concern; (c) layout drift is judged against the scale-1 noise floor, because an animated page differs from itself (0.077 on the real portfolio); (d) content complexity matters: the simple fixture allows 2x on this Mac while the real portfolio holds only 1.67x (44 fps at 2x), so the benchmark should run against the user's own app when a URL is given.
5. **Still untested:** machines with a GPU or hardware video encoder on Windows and Linux, a real audio device, and sites with heavy canvas or iframes.

## Phase 2: Guide mode, intake and scenario (2026-10-18)

Built `brief`, `storyboard` and `scenario` (pure logic, Codex) and the Guide-mode recorder, ordered resolver and page snapshot (Codex wrote, Claude ran every browser test). Results:

- **Browser tests pass on real Chromium** (2 tests, about 81 s): a mixed flow resolves duplicate "Learn more" links (scoped selectors pointing at the right card), tabs, native accordions, a form, a password field (marked sensitive, value never stored), a new-tab link (the resolver follows the popup) and an iframe button, with **zero failures**; the fixture-page snapshot lists 12+ interactive elements with unique selectors in under 4 KB.
- **End to end on the live portfolio, Auto mode through the real CLI:** `snapshot` (1,423 bytes, about 350 tokens) -> four `guide add` steps -> `guide resolve` **4 of 4** -> `storyboard draft` (936 bytes) -> captions written -> `storyboard validate` -> `scenario build` (1,541 bytes) -> `scenario validate`, all passing.
- **Claude's token footprint for intake through scenario** (bytes divided by four, rough): the SKILL.md (about 800 tokens), the snapshot (about 350), a handful of short commands (about 300) and four captions (about 30 to 250 with edit overhead): **about 2 to 3 thousand tokens**, against the old skill's 42,380 fresh tokens for a whole video. Recording and rendering add almost none (deterministic code), so the Phase 8 budget looks very achievable.

Defects found by running it (all fixed, with tests):
1. **Resolver reloaded the site on every step** when a step's URL differed from the page's by a hash or when Auto-mode steps repeated one address; two reloads timed out on the live site (resolve 2 of 4). Fix: `sameDocument` (ignores hash and trailing slash); a step with `url: null` means "the page the previous step left you on"; `guide add` gives only the first step a URL; the scenario builder honours both.
2. A null `frameUrl` was copied into scenario actions and failed validation; null now means the top frame and is omitted.
3. Two contradictions in my own plan, caught by Codex and left failing rather than bent: `voice.enabled` defaulted to false so intake could not tell unanswered from answered (now `null` until asked), and a sensitive fill had to be both null and valid once filled (now a **pending secret**: valid, reported as pending, and the Phase 3 recorder refuses to start until each is supplied at run time).
4. The personal-data scan caught a reserved-domain test email (`example.test`) that its allowlist does not cover; test data now uses `example.com`.

## Phase 3: the recorder (2026-10-18)

`showreel record --name N` runs `scenario.json` and writes `raw.mp4` (H.264), `events.json` and `record.json`. Frames stream from CDP screencast over loopback HTTP to a hidden encoder page
(WebCodecs through mediabunny) that writes H.264 chunks to disk behind a bounded queue (frames beyond the queue are dropped and counted, never spooled).

Results:
- **Live recording of the real portfolio** (4 steps, Auto-mode scenario): 16.7 s, **3206x1804 (capture scale 1.67, chosen by the benchmark)**, 792 frames, **47.5 fps effective, 0 dropped, max backlog 2**, 10.7 MB, valid H.264 High profile. The desktop layout is intact at 1.67x and every navigation is zoomed correctly from its first frame; no browser chrome, scrollbars or cursor in the raw video (the cursor is drawn in post).
- **`events.json`:** 60 Hz planned cursor path (16.7 ms spacing), 4 clicks at exact positions, about 20 Hz real mouse moves for hover, per-step target boxes and hold times; tab and URL changes.
- **CI on Ubuntu, macOS and Windows:** unit tests and the browser tests (including recording the six-step fixture scenario, playback in a `<video>`, blocked and allowed writes, pending secrets, rehearsal failure, scale 1.33 dimensions, 60-frame encoder test) all pass: 20 of 20 jobs.
- **Safety:** non-GET writes are blocked unless an `allowWrites` rule allows them; pending secrets refuse before any browser opens and secret values never appear in output files; rehearsal reports the step and selector before any video is made.
- **Cursor motion (owner-approved):** one smooth stroke: gentle one-sided arc, skewed bell-shaped speed with a soft landing, 320 ms to 1.3 s, a still dwell before the click; no overshoot, tremor or wobble. Verified jolt-free (no speed step above 2% of peak at 1000 Hz, 0.5 to 1.4% measured). Owner's words after reviewing `cursor-demo`: acceptable.

Defects found by running or reviewing (all fixed, with tests):
1. Two tests built a script path with a file URL's `.pathname`, which is `/D:/...` on Windows (a guard test now fails any source that does it).
2. The committed encoder bundle's header hash changed under Windows CRLF checkouts, failing the freshness test only on Windows; the hash now normalises line endings and `plugins/showreel/.gitattributes` pins LF.
3. The disk-headroom estimate (from my plan) assumed 80 MB per *second*; it is now the capped encoder bitrate with 50% margin (a 5-minute recording at the top scale needs about 3.4 GB).
4. The click target box was measured after a fixed 600 ms, so a long smooth scroll could misplace the click; it now waits until the box stops moving.
5. My first smoothness test (a 12% per-frame speed step at 60 Hz) was wrong for short strokes (a 320 ms stroke has about 19 frames); smoothness is now tested on the continuous curve at 1000 Hz.
6. A test email on a reserved domain tripped the personal-data scanner again; test data uses `example.com`.

Known limits carried forward: a plain `allowWrites` string matches anywhere in a URL, including other hosts (parity with the old skill; tighten in Phase 9); `Next-Action-Name` rules do not resolve yet (Phase 9); the optional 2x hybrid zoom layer, the phone and vertical profile (Phase 7), the benchmark warm-up and median, and `login` against a real authenticated app are not done or not exercised; JPEG ringing is faintly visible around very large headings at 1.67x (quality 90).

## Tooling notes (2026-10-18)

- Gemini CLI could not be used: its free API-key quota (20 requests a day) was exhausted in minutes, and Google ended Google-account sign-in for Gemini CLI on 2026-06-18, so the owner's Jio plan cannot power it. Browser spikes were run by Claude directly.
- Codex's sandbox also cannot run `npm install` against the default cache (EPERM on `~/.npm`); a delegate needs `npm_config_cache` pointed inside the workspace, or Claude installs the dependency first.
- A test Firefox ("Nightly", Playwright's own build) was left running by a failed Codex run; it was stopped and the Firefox and WebKit test browsers were removed after S1. Spike scripts must close their browsers on failure.

## Follow-ups added

- S2c done (see above); verify the CSS-zoom route on more sites and on Windows and Linux in Phase 3.
- **B0-hard:** baseline on a harder multi-page, login-gated flow.
- Run S1 and S2 on Windows and Linux CI before relying on them.
- **Tooling lesson:** Codex's sandbox cannot launch browsers (every launch failed), so spike results from Codex were sandbox
  artifacts and were discarded. Codex may write spike code, but anything that launches a browser or needs the network is run
  outside its sandbox.
