# Showreel Phase 8 plan: token meter and benchmark

Status: planned 2026-10-20, execution waits for a session with network and a browser. Spec: `docs/40-showreel-design.md` section 16. Baseline: `docs/42` B0 (old `demo-video` skill, simple 5-step flow: median 42,380 fresh tokens, $0.21, 61 s; the harder multi-page login flow is unmeasured).
Acceptance (spec table): per-video tokens at or under the budget and below the baseline.

## What "tokens" means here
Claude's cost for a showreel video is what Claude READS and WRITES during the flow, not what the tools compute. After intake, almost all work (recording, rendering, editing, voice, export) runs locally at zero Claude tokens, and the person finishes in the editor. So the meter has two layers:
1. **Surface meter (deterministic, in the CLI):** every `showreel` command appends one line to `<project>/surface.jsonl` { t, command, stdoutBytes, stderrBytes, estTokens (ceil(bytes/4)), claudeAuthored: bool }, and the files Claude is asked to write (brief answers, storyboard captions and narration, scenario via `scenario build`) are counted when the CLI validates them (`claudeWrittenBytes`). `showreel tokens --name N [--json]` prints per-stage totals: skill load (SKILL.md + references actually read), CLI output Claude reads, Claude-authored output, and the total vs the budget. No network, no model, identical on every OS, unit-tested.
2. **Real measurement (benchmark):** `scripts/benchmark/run-claude.mjs` runs the same prompt as B0 headless with Claude Code (`claude -p`, plugin dir flag pointing at showreel, JSON output usage) three times and reports median input/output/cache-creation/cache-read tokens, cost, wall time, and whether `Final video:` was printed, exactly like the B0 script, for: (a) the simple 5-step flow, (b) a harder flow on the fixture app (multi-page, login via `showreel login`, form fill with a secret, 12 steps). Needs network and a logged-in Claude; it is a manual/nightly job, never part of CI.

## Budgets (hard, tested)
- Simple 5-step flow: fresh tokens <= 25,000 (40% below the 42,380 baseline) and cost <= $0.12.
- Harder 12-step flow: fresh tokens <= 45,000 (to be re-based once the old skill's harder baseline is measured).
- SKILL.md <= 100 lines and <= 1,800 estimated tokens; every reference file < 1,500 tokens and loaded on demand only.
- Per CLI command the Claude-visible output has a cap: default 1,200 estimated tokens (long listings are summarised with `--json`/`--verbose` for details). A test fails if any command's default output exceeds its cap for the fixture project.

## Work items
- **T1 (Codex): surface meter** in the CLI (logging wrapper around command output, `showreel tokens`, budget check, `--budget` exit code for CI), output-size caps with summaries for verbose commands (doctor, runs, snapshot, guide, storyboard, scenario, voice status, composition show), unit tests.
- **T2 (Codex): benchmark harness**: scripts/benchmark/{run-claude.mjs, scenarios/simple.json, scenarios/hard.json, report.mjs}, the harder fixture flow (login + multi-page + form, extend fixtures/demo-app), median-of-3, JSON + Markdown report written to docs/54-showreel-benchmark.md by a script.
- **T3 (Claude): measure**: run the real benchmark (simple and hard) on the Mac, measure the old skill on the hard flow for a fair baseline, tune SKILL.md and output caps until budgets pass, record results in docs/42 and the spec.

## Exit criteria
`showreel tokens` reports the surface cost of a full simple flow under 6,000 estimated tokens; real benchmark medians meet the budgets above (fresh tokens and cost below the old skill's baseline for the same flows); budgets enforced by unit tests; results documented.
