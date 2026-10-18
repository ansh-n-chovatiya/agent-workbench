# Brief S2b: capture at true 2x

You are a delegate. Claude reviews your work and re-runs your numbers, so report only what commands printed. Work only under
`spikes/showreel/`. No git commands. Do not touch `docs/` or `plugins/`. Run each variant **alone** and keep other heavy
processes off the machine while measuring (timing is the point).

## Question
S2 found that CDP screencast frames are capped at the page's CSS viewport size: with `deviceScaleFactor: 2` and `maxWidth/maxHeight`
of 3840x2160 the frames were still 1920x1080 (see `s2-capture/run.mjs`, `results/s2-capture.json`). Zoom animations magnify pixels, so
we need a capture method with real 2x pixels (3840x2160 for a 1920x1080 CSS viewport). Which method gets there, at what fps and disk?

## Workload (same as S2)
`https://anshchovatiya.vercel.app/`, viewport 1920x1080 CSS, `waitUntil: 'load'` then 2 s settle, then 15 s of smooth scrolling
(`mouse.wheel(0, 40)` every 16 ms). Playwright 1.63.0, bundled headless Chromium (`chromium.launch()`).

## Variants to implement in `s2b-capture/run.mjs` (one function each, one browser per variant)
- **A**: viewport 3840x2160 CSS at deviceScaleFactor 1, CDP screencast JPEG q90, `maxWidth: 3840, maxHeight: 2160` (layout differs; measure anyway).
- **B**: deviceScaleFactor 2, viewport 1920x1080, loop of `Page.captureScreenshot` (jpeg q90, `fromSurface: true`) as fast as it goes for 15 s.
- **C**: same as B but `page.screenshot({type:'jpeg', quality:90})`, for comparison with B.
- **D**: set the device metrics through CDP `Emulation.setDeviceMetricsOverride` `{width:1920,height:1080,deviceScaleFactor:2,mobile:false}` on a context created with dsf 1, then CDP screencast JPEG q90 with `maxWidth:3840,maxHeight:2160`.
- **E**: try deterministic BeginFrame capture: launch with args `--enable-begin-frame-control --run-all-compositor-stages-before-draw --disable-new-content-rendering-timeout --disable-threaded-animation --disable-threaded-scrolling --disable-checker-imaging` and CDP `HeadlessExperimental.beginFrame` with a `screenshot` param (jpeg q90) at dsf 2. If this domain is unsupported in this Chromium, record the exact error and mark E `supported: false` (that is a valid result).

## Measurements per variant (write to `results/s2b-capture.json`)
`{ variant, supported, fps, framesDropped (gaps > 50 ms between frames), bytesPerMinute, framePixelWidth, framePixelHeight, notes }`.
Get `framePixelWidth/Height` by decoding a saved frame with `ffprobe -v error -show_entries stream=width,height -of csv=p=0 <file>`; never infer
it from the options you passed. Save the first frame of every variant to `scratch/s2b/<variant>-first.jpg`. For sharpness, for every variant
save a frame taken **at the same scroll position** (scroll to the "What I Build With" heading with `page.evaluate`, wait 1 s, capture one frame) as
`scratch/s2b/<variant>-still.png` (or `.jpg`), then crop an identical CSS-pixel region 700x380 CSS px (scale the crop by the frame's real scale) to
`scratch/s2b/<variant>-crop.png` using ffmpeg, so Claude can compare them by eye.

## Done when
`results/s2b-capture.json` has one entry per variant A to E, every figure came from a command you ran, and your final message lists: files
created, the exact commands, the full JSON, ffprobe dimensions for each variant's frames, and anything that failed (with the exact error).
Do not write conclusions beyond one sentence per variant; Claude writes the findings.
