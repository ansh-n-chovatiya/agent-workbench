# Brief S8: 4K export memory
You are a delegate. Claude reviews your work and re-runs your numbers, so report only what commands printed; never invent a figure. Work only under `spikes/showreel/`. No git commands. Do not touch `docs/` or `plugins/`. Run measurements alone (no other heavy processes). If a command is blocked or fails, report the exact error and stop that part; a failed attempt is a valid result.

Question: does a 4K (3840x2160), 60 fps WebCodecs H.264 export stay within a sane memory ceiling, and does backpressure work?
Create `s8-memory/run.mjs` (reuse the esbuild bundling pattern from `s1-export/run.mjs`, serving the page from `http://127.0.0.1` because WebCodecs needs a secure context; mediabunny names as in `s1-export/page.js`). The bundled page exposes `window.run4k(seconds)`:
- OffscreenCanvas 3840x2160; mediabunny `Output` with `Mp4OutputFormat` and `BufferTarget`, `CanvasSource` with `codec:'avc'`, bitrate 40_000_000;
- for each of seconds*60 frames draw a moving gradient plus a text line, then `await source.add(i/60, 1/60)` (awaiting is the backpressure);
- return { encodedBytes, completed, frames }.
Node side: sample every 500 ms while it runs: JS heap via CDP `Runtime.getHeapUsage` and total resident memory of the Chromium process tree (macOS/Linux: `ps -o rss= -p <pid>` summed over the browser pid and its children found with `pgrep -P`; say so if Windows is untested).
Run `run4k(10)` first; run `run4k(60)` only if the 10 s run stayed under 2 GB resident. Write `results/s8-memory.json` { width, height, fps, seconds, encodedBytes, peakJsHeapMb, peakBrowserRssMb, completed, wallSeconds, encodeFps }.
Also save the 10 s output to `scratch/s8-10s.mp4` and run ffprobe on it (codec, size, nb_frames).
Done when: the JSON exists and the final message lists files, commands, the JSON, the ffprobe output and any crash or error text verbatim.
