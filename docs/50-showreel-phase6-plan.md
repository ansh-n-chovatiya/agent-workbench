# Showreel Phase 6 plan: voice, music, loudness

Status: COMPLETE 2026-10-19 (outcome at the end of this file). Spec: `docs/40-showreel-design.md` sections 7 (edit rules), 8, 9, 23; evidence: `docs/42` S5 (voices), S6 (loudness), S7 (sync). Owner stop rule: stop after this phase.
Operating model unchanged (Claude plans/reviews and runs everything that needs a browser, network or a real model; Codex writes code and pure tests).

## Decisions
1. **Kokoro only in this phase.** Kokoro-82M q8 via `kokoro-js` 1.2.1 (Apache-2.0). The Kitten draft tier is deferred: the owner found it clearly less clear, and Kokoro at RTF 0.37 to 0.47 is fast enough for drafts. `doctor --benchmark` warns when the machine's RTF exceeds 1.
2. **The engine is not part of the plugin install.** `showreel voice install` creates `<SHOWREEL_HOME>/engines/kokoro/` with pinned `kokoro-js@1.2.1` and downloads the model into `<SHOWREEL_HOME>/models/` (SHA-256 verified). Nothing heavy is installed until the user chooses voice-over. Free, local, no account.
3. **Voice runs in a worker process** (JSON lines over stdin/stdout): isolates its ~700 MB, is reused for many clips, and is replaced by a deterministic fake engine in tests (`SHOWREEL_VOICE_ENGINE=fake`).
4. **Mixing is pure JavaScript on Float32Arrays** (48 kHz stereo): clip placement, music loop and fades, ducking envelope, BS.1770 loudness, gain, true-peak limiter. Pure code runs identically in Node tests, the editor preview and the export page. The browser only decodes audio files (WebAudio) and encodes the result (mediabunny, AAC if `canEncodeAudio('aac')`, else Opus in MP4 with a warning).
5. **Narration follows the edit rules in spec section 7** through one pure `retime` module on top of the Phase 4 time map: cut a whole step drops its narration; cut part of a step keeps the narration whole and warns if the video is shorter (fix: freeze last frame or slow the video); fast-forward never speeds the voice beyond 1.1x and warns; captions follow the narration span (extend only, never overlap).
6. **Clips are cached by content:** key = sha256 of engine, model hash, voice, speed and prepared text. Editing a caption's narration marks the clip stale; regenerating reuses cached clips for unchanged text.
7. **Own voice and files:** record in the editor (MediaRecorder, decoded to WAV in the browser) or import a file per step; stored as clips with `source: 'own' | 'file'`.
8. **Music:** bring your own file (WAV, MP3, M4A, OGG; decoded in the browser). Bundled CC0 loops are deferred until licences can be verified offline-safe; this is a known gap.
9. **Loudness:** target -16 LUFS integrated (EBU R128 style), true-peak ceiling -1 dBTP, both settable. The render prints the measured result.

## Data
- `projects/<name>/voice/clips.json` index and `voice/clips/<hash>.wav` (24 kHz mono 16-bit PCM from Kokoro; own/file clips stored as 48 kHz mono or stereo 16-bit PCM WAV). `voice/pronunciations.json` word map.
- Composition gains `audio` (schema owned by task N): `voice { enabled, voiceId, speed, gainDb }`, `music { enabled, file, gainDb, loop, fadeInSec, fadeOutSec, duck { enabled, depthDb, attackMs, releaseMs } }`, `loudness { enabled, targetLufs, truePeakDb }`, `narration { steps: { <stepId>: { text?, clip?, muted } } }`. Storyboard `narration` stays the Claude-written default text.

## Tasks
- **M (Codex): voice engine and CLI** (`scripts/lib/voice/*`, CLI `voice install|list|samples|generate|status|import|clean`, doctor additions, fake engine, WAV utilities, text preparation, pronunciation, cache). 
- **N (Codex): audio core and export** (`scripts/lib/audio/*`: retime, loudness, limiter, duck, mix, decode helpers; composition `audio` schema and plan integration; render-page audio track; render summary of loudness).
- **O (Codex): editor audio UI** (Voice and Music panels, voice picker with sample playback, per-step narration list with status and regenerate, own-voice recording, import, timeline voice and music tracks, retime warnings with fixes, preview audio with one audio clock, server routes).
- **P (Claude): integration** (real Kokoro install and generation, SHA pin, listening and loudness measurements on real narration, A/V sync measurement in real Chrome, browser tests, CI, docs).

## Exit criteria
Voice-over of a real recording generated locally with Kokoro; every voice in the picker has a playable sample; own-voice and file clips work; music ducks under narration; the exported file measures -16 LUFS (+-0.5) with true peak at or below -1 dBTP; edits (cut, speed) keep narration, captions and video aligned with warnings and one-click fixes; editor preview audio stays within 80 ms of the video over a 60 s clip; three-OS CI green.

## Outcome (2026-10-19)
Delivered: Kokoro voice engine (`showreel voice install|list|samples|generate|status|import|clean`, worker process, content-addressed clip cache, pronunciations, pause markers, doctor checks); audio core (`scripts/lib/audio/*`: BS.1770 meter, 4x oversampled true-peak limiter, ducking, mixer, narration retime with edit-rule warnings); holds in the time map (freeze last frame); export with AAC (Opus fallback) and a printed loudness line; editor Voice and Music panels (voice picker with samples, per-step script, own-voice recording, file import, music upload, voice and music timeline tracks, preview audio on one audio clock, export checklist).

Measured on this Mac with the real engine:
- Install: 31 s, 490 MB on disk (kokoro-js 1.2.1 plus 88 MB q8 model). The model SHA-256 pin (`fbae9257...1478`) was checked against the LFS hash Hugging Face publishes for `onnx/model_quantized.onnx`.
- Benchmark: RTF 0.46 for a 26-word sentence; real narration of the portfolio tour (4 steps, 16.6 s of audio): RTF 0.44 to 0.95 including model load.
- Export of the real recording with narration and a synthetic music bed: **-16.0 LUFS integrated, true peak -1.0 dBTP**; retime warnings fired for narration longer than its step (0.86 s and 0.11 s) and for an overlap (shifted 0.81 s); the final line is covered by a 0.8 s freeze at the end.
- Tests: 325 unit and 31 browser (including a real export with narration and music, re-decoded and re-measured in the browser).

Defects found only by running it (all fixed): the Voice panel crashed after generation because three components used `<>` without importing `Fragment` (now guarded by a unit test); the three-voice editor tests had assumed UI shortcuts the real flow does not have.
Environment lesson: a background Claude session whose helper process outlived the login state loses DNS, launchd and the ability to start any browser (`bootstrap_check_in` error 141); the cure is to kill that helper and start the session from a normal Terminal.

Known gaps, deferred on purpose: bundled CC0 music loops (licences cannot be verified offline); Kitten draft tier; preview/export loudness parity test; A/V sync over 60 s measured by clock arithmetic only (the video follows the audio clock by construction, no external capture); voice on Windows and Linux is covered by the fake engine in CI, the real engine has run on macOS only.
