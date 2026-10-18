# Showreel spike findings

Status: **partial, 2026-10-18.** B0, S1, S2, S2b, S2c, S6, S7 and S8 are done; S3 to S8 and the go/no-go gate are not run yet. Numbers come from
`spikes/showreel/results/*.json`. Test machine: Apple M4, 16 GB, macOS; Playwright 1.63.0; Node 24.

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

## Tooling notes (2026-10-18)

- Gemini CLI could not be used: its free API-key quota (20 requests a day) was exhausted in minutes, and Google ended Google-account sign-in for Gemini CLI on 2026-06-18, so the owner's Jio plan cannot power it. Browser spikes were run by Claude directly.
- A test Firefox ("Nightly", Playwright's own build) was left running by a failed Codex run; it was stopped and the Firefox and WebKit test browsers were removed after S1. Spike scripts must close their browsers on failure.

## Follow-ups added

- S2c done (see above); verify the CSS-zoom route on more sites and on Windows and Linux in Phase 3.
- **B0-hard:** baseline on a harder multi-page, login-gated flow.
- Run S1 and S2 on Windows and Linux CI before relying on them.
- **Tooling lesson:** Codex's sandbox cannot launch browsers (every launch failed), so spike results from Codex were sandbox
  artifacts and were discarded. Codex may write spike code, but anything that launches a browser or needs the network is run
  outside its sandbox.
