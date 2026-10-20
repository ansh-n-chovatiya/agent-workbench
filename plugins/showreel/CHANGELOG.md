## 0.1.0

First Showreel release: turn a web flow into a locally edited demo video.

### Capture and production

- Guide mode records a human walkthrough and resolves it into repeatable steps.
- Auto mode builds steps from browser snapshots and explicit targets.
- `showreel make` orchestrates the production pipeline from a prepared brief.
- Recorder produces browser footage with cinematic cursor motion and click cues.
- Compositor adds zooms, captions, framing and camera motion.
- Export supports 1080p60 and 4K, subject to browser codec and hardware support.
- Local browser editor previews the composition and exports to a chosen folder.
- Timeline controls cover cuts, speed, zooms, captions and audio.
- Kokoro provides optional local voice-over after a separate engine install.
- User-supplied music can be mixed beneath narration with ducking.
- Audio mastering targets -16 LUFS with true-peak limiting.
- Themes include clean and bold treatments with bundled Inter and Space Grotesk.
- Reusable brand kits carry colours, fonts and branding across projects.
- Scenes combine recordings into a single composition.
- Phone capture and vertical export support portrait demos.
- Optional token meter reports usage by project and production stage.

### Measured results

- Phase 8 simple-flow benchmark produced 3/3 passing videos on Sonnet.
- Median fresh tokens: 34,277 total; 3,806 above the activation floor.
- Median cost: $0.1551; median wall time: 91.5 seconds; five turns.
- Historical B0 comparison: 19.1% fewer fresh tokens and 26.1% lower cost.
- Cache reads fell 54.4%; wall time increased 50.0% against that baseline.
- Simple-flow token, cache-read and turn budgets passed; cost and time failed.
- B0 used a different target URL; a fixture-matched baseline is still needed.
- Full methodology and measurement limits: `docs/54-showreel-benchmark.md`.

### Known limitations

- No bundled music; supply your own audio.
- Harder login flow has not been headless-benchmarked; manual login is required.
- Windows/Linux voice engine remains untested outside CI.
- Overlays and templates are intentionally not included.
- Browser codec availability and machine resources constrain export performance.
- Release engineering does not establish Phase 9 demo quality acceptance.
