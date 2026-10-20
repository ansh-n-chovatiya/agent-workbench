# Showreel Phase 9 plan: parity, release, retire the old skill

Status: executing from 2026-10-20. Spec: `docs/40-showreel-design.md` sections 17 (phase 9), 19 (removed), 21 (quality bar). Acceptance: showreel passes the quality bar on the acceptance subject (the owner's public portfolio), tag `showreel-v0.1.0`, the first demo video is made with showreel, and ONLY THEN `plugins/skills-demo` is removed and its marketplace entry dropped.

## Quality bar (section 21) and how each row is evidenced
| Measure | Evidence |
|---|---|
| Frame rate steady, no dropped frames | `record.json` fps/dropped plus the audit's frame-timestamp check on the export (constant frame duration) |
| A/V drift <= 40 ms over 3 min | the audit compares audio and video durations and checks narration clip placement against caption starts on the export; S7 measured 2.4 ms/min |
| Loudness -16 +- 1 LUFS | the audit decodes the exported audio and measures it with our own BS.1770 meter, plus true peak <= -1 dBTP |
| Caption overlap, frozen frames: zero | the audit parses the .srt (no overlaps, positive durations) and scans decoded frames for unintended frozen runs (identical frames longer than 0.6 s outside intentional holds/cards) |
| Preview versus export | the audit renders stills through the same draw code used by the editor preview at three times and compares to the decoded export frames within a tolerance (mean abs diff per channel) |
| Cursor motion | owner approved the motion on 2026-10-18 and again on real renders; no formal blind test (owner decision) |
| Token cost | Phase 8: below baseline on every token and cost measure |
| Platforms | three-OS CI: unit tests, browser tests, `make` browser test, audit smoke |

## Tasks
- **Q1 (Codex): quality audit** `showreel audit --video F [--srt F] [--project N] [--json]` (script under scripts/audit/, browser-side decode through mediabunny in a headless page, Node-side meter); exit code 1 on any failed row; unit tests for every pure check with synthetic inputs; a browser test on a synthetic export.
- **Q2 (Codex): release engineering**: release workflow job for `showreel-v*` tags (tag equals plugin.json version, install + build freshness + unit tests, GitHub Release with notes from plugins/showreel/CHANGELOG.md and a plugin zip asset), CHANGELOG.md for showreel, a licence audit script (production dependency licences allowed list, third-party notices coverage for bundled fonts and libraries) wired into CI, README and marketplace wording (drop 'Preview release').
- **Q3 (Claude): the first demo** made with `showreel make` on the portfolio with voice-over, music-less, bold or clean theme, exported to the chosen folder; run the audit on it; owner reviews.
- **Q4 (Claude, after owner confirmation): retire the old skill**: delete `plugins/skills-demo`, its marketplace entry, its CI job, README row, release job; keep history; update docs; the owner's installed `demo-video` plugin must be uninstalled by the owner (`claude plugin uninstall skills-demo@agent-workbench`).
- **Q5 (Claude): tag and release** `showreel-v0.1.0` after CI is green.

## Exit criteria
Audit passes on the demo; CI green on three OS; release job dry-run reasoning verified; owner approves the demo; old skill removed; tag pushed and GitHub Release created.
