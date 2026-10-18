> Produced by a Codex delegate on 2026-10-18 and spot-checked by Claude against the source (commit `ca8104c`). File:line references are into that snapshot of `siddharthvaddem/openscreen` (MIT). Local paths are shortened to `~`.

# S3: OpenScreen extractability

Snapshot: `ca8104c279da0d4b4481ec992ff103949e22c772` (the scanner's `git rev-parse HEAD` output recorded in `../results/s3-extract.json`, field `commit`). All OpenScreen paths below are relative to `scratch/openscreen/`; `src/…:N` refers to that snapshot. Numbered source is also saved in `scratch/s3-source-evidence.txt`.

## Commands and observed results

1. Read `briefs/s3-extract.md` and Task 4 of `docs/41-showreel-phase0-plan.md` with `cat`/`rg`. The plan was read only. No root git commands or commits were run.
2. `git clone --depth 1 https://github.com/siddharthvaddem/openscreen spikes/showreel/scratch/openscreen` printed `Cloning into 'spikes/showreel/scratch/openscreen'...` and exited 0. This is the only clone. The required scanner subsequently ran `git rev-parse HEAD` inside this clone (`s3-extract/scan.mjs:27`).
3. Python copied the JavaScript fenced block from Task 4 Step 2 verbatim into `s3-extract/scan.mjs`. `node scan.mjs`, cwd `spikes/showreel/s3-extract`, exited 0 and printed:

   ```text
   52 files, 14605 lines; 46 files with no electron/gsap/window.electronAPI reference
   external packages used: dnd-timeline, gif.js, lucide-react, mediabunny, motion, pixi-filters/motion-blur, pixi.js, react, sonner, uuid, web-demuxer
   ```

4. `nl -ba` read LICENSE/package.json and the cited source; `rg` located cursor, zoom, trim/speed and audio implementations. Python created a recursive file-size inventory (`scratch/s3-assets.json`) and searched public-file bytes for ASCII license/copyright/credits markers (`scratch/s3-asset-markers.log`). It printed `public files: 60`. A filename walk found `LICENSE`, `README.md`, and `electron/native/README.md` as license/licence/credits/readme-named files. The later repository text search also found `CONTRIBUTING.md:53-55` (contributions under MIT).
5. Each `npm view <package> license` used `npm_config_cache="$PWD/spikes/showreel/scratch/npm-cache"` from the repo root. Exact output and exit codes: `scratch/s3-licenses.log`. No packages were installed.
6. Python recursively copied `videoExporter.ts` and only its relative import closure, preserving relative paths, into `scratch/extract-test/`. It printed the copied filenames; the subsequent count printed `Copied relative dependency files: 11`. No alias imports, assets or package dependencies were copied. The copies are unmodified.
7. `npm_config_cache="$PWD/spikes/showreel/scratch/npm-cache" npm exec --prefix spikes/showreel/scratch/extract-test --offline -- esbuild --version` printed `0.25.12`, exit 0. The actual extraction command and failure are below; it was run alone, before the npm licence queries started.

Scanner limits: the exact prescribed scanner counts textual matches, skips tests and missing focus paths, excludes `@/` and relative imports from its package list, and does not capture dynamic imports. It reports zero GSAP matches across its scanned files, not proof of a dependency-free application (`s3-extract/scan.mjs:5-25`; package.json:73 lists GSAP). Its `assets` array uses immediate `public/` children and `stat.size`, including directory metadata sizes (`s3-extract/scan.mjs:26`). The JSON remains exactly the scanner output; use the recursive inventory below for actual individual public files. The 46 textual matches classified as clean by the scanner are not 46 proven standalone modules.

Incidental read-only discovery errors, not bundle results: `rg: .agents: No such file or directory (os error 2)`; later a guessed-file search printed `rg: spikes/showreel/scratch/openscreen/src/lib/cursor/cursorSmoothing.ts: No such file or directory (os error 2)` and the same error for `cursorAssets.ts`. The actual files were located with `rg --files` and are cited below.

## Licence findings

OpenScreen source: `LICENSE:1-21` states MIT, copyright (c) 2025 Siddharth Vaddem; lines 12-13 require retaining the copyright and permission notice. `README.md:174-176` states the project is MIT. `package.json:47-89` lists runtime dependencies; it is not a licence grant for those dependencies.

The registry queries printed the following, all exit 0. They queried the registry without a version specifier; these are not a verification of every locked version or every transitive dependency. `pixi-filters/motion-blur` is queried as its owning package `pixi-filters`.

| Package | `npm view … license` output |
| --- | --- |
| dnd-timeline | MIT |
| gif.js | MIT |
| lucide-react | ISC |
| mediabunny | MPL-2.0 |
| motion | MIT |
| pixi-filters | MIT |
| pixi.js | MIT |
| react | MIT |
| sonner | MIT |
| uuid | MIT |
| web-demuxer | no value printed; unverified |
| @xenova/transformers (supplemental dynamic import) | Apache-2.0 |

`transcribe.worker.ts:51` dynamically imports `@xenova/transformers`, missed by the prescribed scanner; its supplemental query is in `scratch/s3-licenses.log`. The worker also loads `Xenova/whisper-tiny` (`src/lib/captioning/transcribe.worker.ts:68-71`); the model's licence was not verified by querying the JavaScript package.

Public assets: **unverified** means no asset-specific reuse permission was established from this snapshot. The project-wide MIT statement is recorded above; it is not substituted for missing third-party asset provenance. `src/lib/cursor/cursorThemes.ts:24-28` defines attribution, and individual theme entries name `sweezy-cursors.com` (e.g. lines 43-55). The complete per-file table below records those source lines. Embedded copyright text is not a reuse licence: the byte scan printed Apple text in preview3.png and wallpaper10.jpg, Hewlett-Packard text in wallpaper1.jpg and wallpaper13.jpg, and generic copyright/ASF_License_URL markers in web-demuxer.wasm (`scratch/s3-asset-markers.log`). No font file appears in the recursive public inventory.

## Borrowable as is

These are source-inspection classifications for the named routines/files under the MIT notice above, not successful browser execution claims. Where adjacent type/helper files are needed, preserve that local layout or supply compatible types; no Electron/GSAP/artwork replacement is indicated in the cited implementation.

| Code | Evidence and scope |
| --- | --- |
| Easing math | `src/components/video-editor/videoPlayback/mathUtils.ts:1-84`: clamp, cubic Bézier solver, exponential/cubic/smooth-step functions; no imports. |
| Cursor dwell detection and auto-zoom suggestions | `src/components/video-editor/timeline/zoomSuggestionUtils.ts:1-156`: only a relative type import; normalize, detect dwells, rank/space and reject overlaps. Keep the compatible types from `../types`. |
| Cursor focus following | `src/components/video-editor/videoPlayback/cursorFollowUtils.ts:1-114`: relative type import, interpolation, smoothing and adaptive follow factors. |
| Zoom strength/region selection | `src/components/video-editor/videoPlayback/zoomRegionUtils.ts:1-6,37-60,285-353`: keep sibling constants/math/focus/cursor utilities and region types. No external runtime import in this file. |
| Async frame queue | `src/lib/exporter/asyncVideoFrameQueue.ts:1-77`: queue, consumer resolution and frame disposal; browser WebCodecs `VideoFrame` contract. |
| Timestamped webcam frame queue | `src/lib/exporter/timestampedVideoFrameQueue.ts:1-110`: timestamp selection and frame ownership; no imports. |
| Gradient parsing | `src/lib/exporter/gradientParser.ts:1-236`: standalone gradient parser and geometry helpers, no imports. |
| MP4 size/bitrate calculations | `src/lib/exporter/mp4ExportSettings.ts:1,25,111`: only relative type import; functions compute dimensions/settings. |
| Webcam image drawing | `src/lib/exporter/webcamFrameDrawing.ts:1-43`: supplied canvas context/image and crop/destination rectangles. |
| Region data declarations | `src/components/video-editor/types.ts:29-32,69-82,211-215,378-383`: ZoomFocus/ZoomRegion/TrimRegion/SpeedRegion declarations can be copied as declarations. The whole file has a type alias dependency at line 1; do not mistake these declarations for a self-contained editor. |

## Borrowable with edits

| Group | Required adaptation, with source evidence |
| --- | --- |
| Export orchestration | `src/lib/exporter/videoExporter.ts:9-18` imports project aliases and decoder/renderer/muxer; `:708-719` contains local-file Electron reading. Supply browser file/Blob/URL loading, browser platform detection (`src/utils/platformUtils.ts:6-26`), and host-compatible renderer/muxer dependencies. Bundle failure below prevents a claim it already bundles. |
| Decoder and trim/speed math | `src/lib/exporter/streamingDecoder.ts:138-150,173-196` selects Electron local-file IO; `:224` sets the WASM URL; `:642-727` contains reusable keep-segment and speed partition logic. Replace IO/WASM resolution, resolve the type alias import at line 2, and extract pure time helpers if a bidirectional mapping API is needed. `web-demuxer` licence remains unverified by the query. |
| Offline cursor path smoothing | `src/lib/cursor/cursorPathSmoothing.ts:1-2,80-97,116-145,176-236`: rewrite project aliases to the host's motion config and recording contracts. The smoothing implementation itself operates on supplied samples; it does not require capturing them through Electron. |
| Live cursor smoothing/zoom springs | `src/components/video-editor/videoPlayback/motionSmoothing.ts:1,46-89,92-149` uses `motion.spring`, not GSAP. `zoomSpring.ts:1-16,74-85` needs its local constants/config helpers. Keep Motion or replace its spring evaluator; adapting aliases/types may be necessary in the new layout. |
| Cursor artwork and click rendering | `src/lib/cursor/nativeCursor.ts:2-20` imports SVG art/theme resolution. Replace the artwork provider and project contracts while retaining position/click arithmetic (`:290-330`). `src/components/video-editor/videoPlayback/cursorRenderer.ts:172-202` tries system assets through Electron; inject browser-owned art and remove that call. `uploadedCursorAssets.ts:1-8` imports SVGs, so zero Electron text is insufficient to classify it as asset-free. |
| Pixi compositor / zoom transform / 3D | `src/lib/exporter/frameRenderer.ts:1-74` needs Pixi/filter packages, aliases, cursor assets, wallpaper, masks and annotations. Replace cursor/background asset sources (e.g. use host-owned art or colors), wire the remaining helpers. `src/components/video-editor/videoPlayback/zoomTransform.ts:1-2,137` uses Pixi/filter objects; `src/lib/exporter/threeDPass.ts:1-6,159` uses project rotation helpers and WebGL. No standalone success was measured. |
| Audio processing | `src/lib/exporter/audioEncoder.ts:1-3,213-251` needs WebDemuxer/type resolution. `:406-434,503-558,611` uses DOM audio playback, AudioContext, playbackRate/trim skipping and WASM loading. Replace asset URLs/host media loading; this speed-aware path is browser playback/recording rather than a demonstrated offline audio render. |
| MP4 muxer | `src/lib/exporter/muxer.ts:1-9,28-69` uses Mediabunny plus a relative config type. The implementation does not show Electron calls, but the query printed MPL-2.0, so do not describe its dependency as MIT; retain/assess that dependency's licence or replace the muxer adapter. |
| Timeline UI | `src/components/video-editor/timeline/TimelineEditor.tsx:1-38` imports dnd-timeline/React, icons/toast/UUID, app UI, contexts, hooks, shortcuts/platform helpers and relative lanes. Replace host UI/context/hooks/platform imports and keep compatible millisecond region props (`:48-80`). Clean scanner counts do not prove this whole UI can be dropped into another editor. |
| Captions | `src/lib/captioning/annotationsFromCaptions.ts:1-3`, `transcribeCore.ts:1-2`, `leadingSilence.ts:2` require host type imports. `extractMono16k.ts:32-33` needs local-file IO replacement; `transcribe.ts:90-94` resolves Electron asset base; `transcribe.worker.ts:51-71` needs independent model/WASM sourcing and licence checks. Do not copy model assets on the strength of the OpenScreen MIT file. |
| Annotations | `src/lib/exporter/annotationRenderer.ts:1-9` needs project text animation/blur helpers and region types; resolve or replace those imports before reuse. |

## Not borrowable

This category means unsuitable unchanged for the requested browser/no-assets extraction, not a claim that all adaptation is impossible or that a third-party asset is legally prohibited.

- Electron IPC/file and system-cursor acquisition as written: `src/lib/exporter/streamingDecoder.ts:191`, `src/lib/exporter/videoExporter.ts:708-709`, `src/components/video-editor/videoPlayback/cursorRenderer.ts:178-187`, and `src/utils/platformUtils.ts:10` call Electron APIs. Replace these boundary calls; do not import Electron into the browser.
- Bundled wallpaper/cursor/demo/logo/WASM assets are excluded from the no-assets extraction and have unverified asset-specific reuse permission in the inventory below. Cursor SVGs outside public are also excluded: `src/lib/cursor/nativeCursor.ts:2-17` and `src/components/video-editor/videoPlayback/uploadedCursorAssets.ts:1-8`.
- A click-ring implementation cannot be borrowed from `src/components/video-editor/videoPlayback/cursorRenderer.ts:494-500`: the function discards all parameters and draws nothing. Click bounce exists separately at `:627-630` and in `src/lib/cursor/nativeCursor.ts:290-330`.
- Native Windows audio mixing is a native capture implementation, not browser editor code: `electron/native/wgc-capture/src/audio_sample_utils.cpp:377-415` consumes system/microphone queues and mixes samples; native setup is in `electron/native/wgc-capture/src/main.cpp:673-729`.

## The exporter bundling result

Working directory: `spikes/showreel/scratch/extract-test/`. Python invoked the requested command with the writable npm cache and offline mode to use the installed tool without installing anything:

```sh
npm_config_cache="~/Desktop/Personal/agent-workbench/spikes/showreel/scratch/npm-cache" npm_config_offline=true npx esbuild videoExporter.ts --bundle --platform=browser --outfile=out.js
```

**Failed, exit 1.** Exact output is reproduced below from `scratch/s3-bundle.log`. Esbuild printed six diagnostics and `6 of 21 errors shown`; the remaining diagnostics were not printed and are not inferred here. No retry, stubbed build, output-size measurement or browser execution was performed after failure.

Proposed stubs/adapters, not tested fixes: a browser `getPlatform` provider (`src/utils/platformUtils.ts:6-26`); a `BackgroundLoadError`/wallpaper adapter with host-owned backgrounds (`src/lib/wallpaper.ts:3-10,47-77`); file reading via fetch/Blob instead of IPC (`videoExporter.ts:708-719`, `streamingDecoder.ts:138-150,173-196`); an injected cursor artwork provider (`nativeCursor.ts:2-20`). Resolve the other alias helpers listed in `frameRenderer.ts:11-65` and `annotationRenderer.ts:1-9`. WebDemuxer, Pixi, filters and Mediabunny are functional dependencies to provide or replace, not proven trivial stubs. The attempt did not establish that this bundle is Electron-free or usable.

## The (a) to (d) locations

### (a) Cursor smoothing and click-effect rendering

- Offline path: `src/lib/cursor/cursorPathSmoothing.ts:80-97` spring integration; `:116-145` resampling; `:220-236` cached access. **Needs edits** to aliases/config/contracts at `:1-2`.
- Live smoothing: `src/components/video-editor/videoPlayback/cursorRenderer.ts:417-492`; underlying `motionSmoothing.ts:46-89` evaluates a Motion spring. **Needs edits** to package/artwork/IPC dependencies described above.
- Native click bounce: `src/lib/cursor/nativeCursor.ts:290-330`; export applies its scale at `src/lib/exporter/frameRenderer.ts:598-602` and draws the cursor at `:636`. **Needs edits** to remove imported artwork/provider dependencies; the arithmetic is reusable.
- Older Pixi bounce at `src/components/video-editor/videoPlayback/cursorRenderer.ts:627-630`; Canvas variant at `:726-765`. `drawClickRing` at `:494-500` is a no-op. **Needs edits** for actual rings and replacement art; the system asset acquisition at `:178-187` is **Electron-bound**.

### (b) Zoom model, easing and auto suggestions

- Model: `src/components/video-editor/types.ts:29-32,69-82`; **as-is declarations** with compatible supporting types.
- Easing: `src/components/video-editor/videoPlayback/mathUtils.ts:15-49,61-62`; applied by `zoomRegionUtils.ts:41-60`, connected pan at `:37-38`. **As is with local helpers/types**; no GSAP import in these cited files. Spring settling at `zoomSpring.ts:74-85` and `motionSmoothing.ts:141-149` needs the Motion dependency/local wiring.
- Suggestions: `src/components/video-editor/timeline/zoomSuggestionUtils.ts:39-82` finds cursor dwell candidates, `:95-155` ranks/spaces candidates and excludes overlapping regions. **As is with relative types**; receives telemetry rather than acquiring it through Electron.

### (c) Trim and per-segment speed time mapping

- Data: `src/components/video-editor/types.ts:211-215,378-383`. Keep-segment creation: `src/lib/exporter/streamingDecoder.ts:642-667`; trims are removed intervals (the code skips them), despite the decode method's misleading “regions to keep” comment at `:302`. Speed partition: `:698-727`; continuous effective duration: `:674-690` divides each kept segment's duration by speed.
- Output grid to source time: `streamingDecoder.ts:489-496` and `:556-568` computes `segment.startSec + segmentFrameIndex / targetFrameRate * segment.speed`, and emits output timestamp `exportFrameIndex * frameDurationUs` with source milliseconds. Source-frame selection and skipped trim timestamps: `:500-539`; nearest-frame handoff: `:548-568`.
- Source to output in this exporter is the resampling/emission loop, not an exported arbitrary bidirectional time-map helper. Source frames route by timestamp (`:504-539`), while emitted frames receive monotonically counted output times (`:566-568`). Audio trim-only remap explicitly subtracts completed trim durations (`src/lib/exporter/audioEncoder.ts:373-375,812-819`). The search for `sourceTo`, `outputTo`, `sourceTimeTo`, `outputTimeTo` and time-map names did not print a named bidirectional helper in `src/`.
- **Needs edits**: lift segment arithmetic out of the decoder and expose a mapping API if the editor needs arbitrary source→output and output→source queries. The existing calculations can inform it, but no general inverse helper was found or tested. Browser preview uses source time, seeking past trims and setting playbackRate (`src/components/video-editor/videoPlayback/videoEventHandlers.ts:70-95`), not that inverse API.

### (d) Export frame loop and audio mixing

- Export callback: `src/lib/exporter/videoExporter.ts:334-433`, especially output timestamp `:350`, rendering at source timestamp `:358-359`, encode backpressure `:387-404` and encode `:407-410`. Decoded-frame loop: `src/lib/exporter/streamingDecoder.ts:472-594`. **Needs edits** to dependencies/file/platform/artwork boundaries listed above; not intrinsically an Electron-only frame algorithm.
- Export audio dispatch: `videoExporter.ts:466-479`; channel downmix `src/lib/exporter/audioEncoder.ts:25-49,119-154`, trim timestamp adjustment `:373-375`, speed-aware AudioContext graph `:430-434`, playback/trim/speed handling `:503-558`. MP4 track insertion is **muxing**, at `src/lib/exporter/muxer.ts:44-46,62-69`; it does not demonstrate a multitrack music/voiceover mixer. **Needs edits** for media/dependency/WASM integration.
- Actual browser system+microphone mix occurs during capture at `src/hooks/useScreenRecorder.ts:1277-1290`: two MediaStream sources feed a destination, mic via gain. **Borrowable graph with edits** to accept host-supplied streams; this is not an export-time multitrack mixer. Native Windows mixing is at `electron/native/wgc-capture/src/audio_sample_utils.cpp:377-415` (**native capture-bound**, not a browser lift).

## Recursive public asset inventory

Every row's path and bytes came from a recursive `Path.rglob`/`stat().st_size` inventory, saved in `scratch/s3-assets.json`. “unverified” denotes asset-specific licence status. Attribution and embedded markers are evidence, not permission grants. Repository-wide MIT references: `LICENSE:1-21`, `README.md:174-176`.

| File | Bytes | Asset-specific licence | Attribution / embedded marker evidence |
| --- | ---: | --- | --- |
| `public/cursors/among-us-sus-knife-and-red-animated/arrow.png` | 1482 | unverified | src/lib/cursor/cursorThemes.ts:66: source: "sweezy-cursors.com", |
| `public/cursors/among-us-sus-knife-and-red-animated/pointer.png` | 2345 | unverified | src/lib/cursor/cursorThemes.ts:66: source: "sweezy-cursors.com", |
| `public/cursors/black-and-rainbow-stroke-gradient-animated/arrow.png` | 2792 | unverified | src/lib/cursor/cursorThemes.ts:87: source: "sweezy-cursors.com", |
| `public/cursors/black-and-rainbow-stroke-gradient-animated/pointer.png` | 3031 | unverified | src/lib/cursor/cursorThemes.ts:87: source: "sweezy-cursors.com", |
| `public/cursors/black-pixel/arrow.png` | 484 | unverified | src/lib/cursor/cursorThemes.ts:108: source: "sweezy-cursors.com", |
| `public/cursors/black-pixel/pointer.png` | 490 | unverified | src/lib/cursor/cursorThemes.ts:108: source: "sweezy-cursors.com", |
| `public/cursors/christmas-miles-morales/arrow.png` | 3339 | unverified | src/lib/cursor/cursorThemes.ts:129: source: "sweezy-cursors.com", |
| `public/cursors/christmas-miles-morales/pointer.png` | 4664 | unverified | src/lib/cursor/cursorThemes.ts:129: source: "sweezy-cursors.com", |
| `public/cursors/hello-kitty-watermelon/arrow.png` | 8136 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/cursors/hello-kitty-watermelon/pointer.png` | 8919 | unverified | src/lib/cursor/cursorThemes.ts:45: source: "sweezy-cursors.com", |
| `public/cursors/hollow-knight-and-game-arrow/arrow.png` | 5326 | unverified | src/lib/cursor/cursorThemes.ts:150: source: "sweezy-cursors.com", |
| `public/cursors/hollow-knight-and-game-arrow/pointer.png` | 6046 | unverified | src/lib/cursor/cursorThemes.ts:150: source: "sweezy-cursors.com", |
| `public/cursors/hollow-knight-nail-sword-and-mask/arrow.png` | 2888 | unverified | src/lib/cursor/cursorThemes.ts:171: source: "sweezy-cursors.com", |
| `public/cursors/hollow-knight-nail-sword-and-mask/pointer.png` | 4670 | unverified | src/lib/cursor/cursorThemes.ts:171: source: "sweezy-cursors.com", |
| `public/cursors/mickey-mouse-black-hand-inflated-glove/arrow.png` | 2082 | unverified | src/lib/cursor/cursorThemes.ts:339: source: "sweezy-cursors.com", |
| `public/cursors/mickey-mouse-black-hand-inflated-glove/pointer.png` | 2534 | unverified | src/lib/cursor/cursorThemes.ts:339: source: "sweezy-cursors.com", |
| `public/cursors/naruto-akatsuki-cloud-arrow/arrow.png` | 6400 | unverified | src/lib/cursor/cursorThemes.ts:192: source: "sweezy-cursors.com", |
| `public/cursors/naruto-akatsuki-cloud-arrow/pointer.png` | 7270 | unverified | src/lib/cursor/cursorThemes.ts:192: source: "sweezy-cursors.com", |
| `public/cursors/old-roblox/arrow.png` | 3382 | unverified | src/lib/cursor/cursorThemes.ts:213: source: "sweezy-cursors.com", |
| `public/cursors/old-roblox/pointer.png` | 3636 | unverified | src/lib/cursor/cursorThemes.ts:213: source: "sweezy-cursors.com", |
| `public/cursors/pink-glossy-arrow-and-hand-3d/arrow.png` | 5628 | unverified | src/lib/cursor/cursorThemes.ts:234: source: "sweezy-cursors.com", |
| `public/cursors/pink-glossy-arrow-and-hand-3d/pointer.png` | 6820 | unverified | src/lib/cursor/cursorThemes.ts:234: source: "sweezy-cursors.com", |
| `public/cursors/pinky-pixel/arrow.png` | 4179 | unverified | src/lib/cursor/cursorThemes.ts:255: source: "sweezy-cursors.com", |
| `public/cursors/pinky-pixel/pointer.png` | 5262 | unverified | src/lib/cursor/cursorThemes.ts:255: source: "sweezy-cursors.com", |
| `public/cursors/pokemon-neon-gengar/arrow.png` | 3154 | unverified | src/lib/cursor/cursorThemes.ts:276: source: "sweezy-cursors.com", |
| `public/cursors/pokemon-neon-gengar/pointer.png` | 8058 | unverified | src/lib/cursor/cursorThemes.ts:276: source: "sweezy-cursors.com", |
| `public/cursors/sanrio-gudetama-and-arrow-kawaii/arrow.png` | 5675 | unverified | src/lib/cursor/cursorThemes.ts:297: source: "sweezy-cursors.com", |
| `public/cursors/sanrio-gudetama-and-arrow-kawaii/pointer.png` | 5646 | unverified | src/lib/cursor/cursorThemes.ts:297: source: "sweezy-cursors.com", |
| `public/cursors/sanrio-kuromi-skull-arrow/arrow.png` | 6193 | unverified | src/lib/cursor/cursorThemes.ts:360: source: "sweezy-cursors.com", |
| `public/cursors/sanrio-kuromi-skull-arrow/pointer.png` | 8841 | unverified | src/lib/cursor/cursorThemes.ts:360: source: "sweezy-cursors.com", |
| `public/cursors/solo-leveling-sung-jinwoo-dark-flames/arrow.png` | 6293 | unverified | src/lib/cursor/cursorThemes.ts:381: source: "sweezy-cursors.com", |
| `public/cursors/solo-leveling-sung-jinwoo-dark-flames/pointer.png` | 8284 | unverified | src/lib/cursor/cursorThemes.ts:381: source: "sweezy-cursors.com", |
| `public/cursors/spring-gradient/arrow.png` | 3304 | unverified | src/lib/cursor/cursorThemes.ts:318: source: "sweezy-cursors.com", |
| `public/cursors/spring-gradient/pointer.png` | 3439 | unverified | src/lib/cursor/cursorThemes.ts:318: source: "sweezy-cursors.com", |
| `public/demo.png` | 2876033 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/openscreen.png` | 873590 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/preview3.png` | 1420008 | unverified | `scratch/s3-asset-markers.log`: (tEXticc:copyright; Copyright Apple Inc., 2026 |
| `public/preview4.png` | 1668680 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/rec-button.png` | 726 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/sample.png` | 2607414 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/vite.svg` | 1497 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wallpapers/wallpaper1.jpg` | 270053 | unverified | `scratch/s3-asset-markers.log`: Copyright (c) 1998 Hewlett-Packard Company |
| `public/wallpapers/wallpaper10.jpg` | 4367517 | unverified | `scratch/s3-asset-markers.log`: Copyright Apple Inc., 2017 |
| `public/wallpapers/wallpaper11.jpg` | 533457 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wallpapers/wallpaper12.jpg` | 573883 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wallpapers/wallpaper13.jpg` | 1032442 | unverified | `scratch/s3-asset-markers.log`: Copyright (c) 1998 Hewlett-Packard Company |
| `public/wallpapers/wallpaper14.jpg` | 1196578 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wallpapers/wallpaper15.jpg` | 240087 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wallpapers/wallpaper16.jpg` | 2150877 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wallpapers/wallpaper17.jpg` | 3115670 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wallpapers/wallpaper18.jpg` | 507531 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wallpapers/wallpaper2.jpg` | 537226 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wallpapers/wallpaper3.jpg` | 3268347 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wallpapers/wallpaper4.jpg` | 2020470 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wallpapers/wallpaper5.jpg` | 846662 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wallpapers/wallpaper6.jpg` | 536327 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wallpapers/wallpaper7.jpg` | 551305 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wallpapers/wallpaper8.jpg` | 918422 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wallpapers/wallpaper9.jpg` | 2170681 | unverified | No asset-specific statement located in the README/LICENSE/credits filename and ASCII-marker searches; `scratch/s3-assets.json` row. |
| `public/wasm/web-demuxer.wasm` | 3150317 | unverified | `scratch/s3-asset-markers.log`: copyright; ASF_License_URL; Copyright |

## Exact exporter command output

```text
$ npm_config_cache="~/Desktop/Personal/agent-workbench/spikes/showreel/scratch/npm-cache" npm_config_offline=true npx esbuild videoExporter.ts --bundle --platform=browser --outfile=out.js
✘ [ERROR] Could not resolve "@/lib/wallpaper"

    videoExporter.ts:10:36:
      10 │ import { BackgroundLoadError } from "@/lib/wallpaper";
         ╵                                     ~~~~~~~~~~~~~~~~~

  You can mark the path "@/lib/wallpaper" as external to exclude it from the bundle, which will remove this error and leave the unresolved path in the bundle.

✘ [ERROR] Could not resolve "@/utils/platformUtils"

    videoExporter.ts:12:28:
      12 │ import { getPlatform } from "@/utils/platformUtils";
         ╵                             ~~~~~~~~~~~~~~~~~~~~~~~

  You can mark the path "@/utils/platformUtils" as external to exclude it from the bundle, which will remove this error and leave the unresolved path in the bundle.

✘ [ERROR] Could not resolve "web-demuxer"

    streamingDecoder.ts:1:27:
      1 │ import { WebDemuxer } from "web-demuxer";
        ╵                            ~~~~~~~~~~~~~

  You can mark the path "web-demuxer" as external to exclude it from the bundle, which will remove this error and leave the unresolved path in the bundle.

✘ [ERROR] Could not resolve "web-demuxer"

    audioEncoder.ts:1:27:
      1 │ import { WebDemuxer } from "web-demuxer";
        ╵                            ~~~~~~~~~~~~~

  You can mark the path "web-demuxer" as external to exclude it from the bundle, which will remove this error and leave the unresolved path in the bundle.

✘ [ERROR] Could not resolve "pixi.js"

    frameRenderer.ts:9:7:
      9 │ } from "pixi.js";
        ╵        ~~~~~~~~~

  You can mark the path "pixi.js" as external to exclude it from the bundle, which will remove this error and leave the unresolved path in the bundle.

✘ [ERROR] Could not resolve "pixi-filters/motion-blur"

    frameRenderer.ts:10:33:
      10 │ import { MotionBlurFilter } from "pixi-filters/motion-blur";
         ╵                                  ~~~~~~~~~~~~~~~~~~~~~~~~~~

  You can mark the path "pixi-filters/motion-blur" as external to exclude it from the bundle, which will remove this error and leave the unresolved path in the bundle.

6 of 21 errors shown (disable the message limit with --log-limit=0)

exit_code=1
```

## Exact registry command output

```text
$ npm_config_cache="$PWD/spikes/showreel/scratch/npm-cache" npm view dnd-timeline license
MIT
exit_code=0
$ npm_config_cache="$PWD/spikes/showreel/scratch/npm-cache" npm view gif.js license
MIT
exit_code=0
$ npm_config_cache="$PWD/spikes/showreel/scratch/npm-cache" npm view lucide-react license
ISC
exit_code=0
$ npm_config_cache="$PWD/spikes/showreel/scratch/npm-cache" npm view mediabunny license
MPL-2.0
exit_code=0
$ npm_config_cache="$PWD/spikes/showreel/scratch/npm-cache" npm view motion license
MIT
exit_code=0
$ npm_config_cache="$PWD/spikes/showreel/scratch/npm-cache" npm view pixi-filters license
MIT
exit_code=0
$ npm_config_cache="$PWD/spikes/showreel/scratch/npm-cache" npm view pixi.js license
MIT
exit_code=0
$ npm_config_cache="$PWD/spikes/showreel/scratch/npm-cache" npm view react license
MIT
exit_code=0
$ npm_config_cache="$PWD/spikes/showreel/scratch/npm-cache" npm view sonner license
MIT
exit_code=0
$ npm_config_cache="$PWD/spikes/showreel/scratch/npm-cache" npm view uuid license
MIT
exit_code=0
$ npm_config_cache="$PWD/spikes/showreel/scratch/npm-cache" npm view web-demuxer license
exit_code=0
$ npm_config_cache="$PWD/spikes/showreel/scratch/npm-cache" npm view @xenova/transformers license
Apache-2.0
exit_code=0
```

## Files created

- `s3-extract/scan.mjs` (verbatim prescribed scanner).
- `results/s3-extract.json` (unmodified scanner result).
- `scratch/s3-report.md` (this report).
- `scratch/s3-assets.json` (recursive 60-file inventory, bytes, unverified licence status, attribution and marker evidence).
- `scratch/s3-licenses.log`, `scratch/s3-bundle.log`, `scratch/s3-asset-markers.log`, `scratch/s3-source-evidence.txt`.
- `scratch/extract-test/`: the 11 relative-dependency TypeScript copies listed by the copy command; no `out.js` was listed by the subsequent directory check.
- `scratch/openscreen/` (shallow source clone) and `scratch/npm-cache/` (npm writable cache).
