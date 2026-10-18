# Brief S7: editor preview A/V sync
You are a delegate. Claude reviews your work and re-runs your numbers, so report only what commands printed; never invent a figure. Work only under `spikes/showreel/`. No git commands. Do not touch `docs/` or `plugins/`. Run measurements alone (no other heavy processes). If a command is blocked or fails, report the exact error and stop that part; a failed attempt is a valid result.

Question: does a single audio clock keep a video element and scheduled audio in sync over a long run, and what happens under CPU load?
Do **Task 8 of docs/41-showreel-phase0-plan.md** (read it): create `s7-sync/page.html` and `s7-sync/run.mjs` exactly as shown (it uses `scratch/s1.mp4`, which exists).
Run `node run.mjs 180` (idle) and record the result. Then add a second run mode: `node run.mjs 180 --load` which, before starting, injects a CPU
load into the page (a busy loop in the main thread of about 30 percent duty cycle: spin for 10 ms out of every 33 ms using setInterval) and writes
`results/s7-sync-load.json` with the same fields. Both runs must use the page unchanged apart from the injected load.
Done when: `results/s7-sync.json` and `results/s7-sync-load.json` exist with { seconds, maxDriftMs, p95DriftMs, resyncs }. Final message: the files, the commands, both JSONs, and one sentence each on what the numbers mean for a 40 ms target.
