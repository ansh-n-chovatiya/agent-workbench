# Showreel spike findings

Status: **partial, 2026-10-18.** B0, S1 and S2 are done; S3 to S8 and the go/no-go gate are not run yet. Numbers come from
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

## Follow-ups added

- **S2b (new, before Phase 3):** how to capture at 2x. Candidates: a 3840x2160 CSS viewport at deviceScaleFactor 1 (layout
  changes), deterministic BeginFrame-controlled capture in headless Chromium, and a `Page.captureScreenshot` loop. Measure
  fps, sharpness at 2x zoom, and disk.
- **B0-hard:** baseline on a harder multi-page, login-gated flow.
- Run S1 and S2 on Windows and Linux CI before relying on them.
- **Tooling lesson:** Codex's sandbox cannot launch browsers (every launch failed), so spike results from Codex were sandbox
  artifacts and were discarded. Codex may write spike code, but anything that launches a browser or needs the network is run
  outside its sandbox.
