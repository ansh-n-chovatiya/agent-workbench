# Showreel benchmark

Manual Claude Code measurements. Fresh tokens = input + output + cache creation; cache reads are reported separately. Medians use passing videos only (exit success, valid usage, and `Final video:` or a nonempty exported MP4). Even-sized samples use the mean of the two central values. Step counts are requested, not independently verified.

## simple (5 steps)

Baseline: historical B0 (different target URL; fixture comparison still needed).

| Skill / model | Passing | Fresh tokens | Budget | Baseline | Delta | Cost | Budget | Baseline | Delta | Wall median | Wall baseline | Budget result | Below baseline |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| Unmeasured | 0 | — | 25000 | 42380 | — | — | $0.1200 | $0.2100 | — | — | 61.0 s | PENDING | PENDING |

## hard (12 steps)

Baseline: unmeasured; run the old skill on this fixture.

| Skill / model | Passing | Fresh tokens | Budget | Baseline | Delta | Cost | Budget | Baseline | Delta | Wall median | Wall baseline | Budget result | Below baseline |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| Unmeasured | 0 | — | 45000 | — | — | — | $0.2500 | — | — | — | — | PENDING | PENDING |

## How to reproduce

From `plugins/showreel`, with dependencies already installed, network access and a logged-in Claude Code:

```sh
node scripts/benchmark/run-claude.mjs --scenario simple --runs 3 --model sonnet --out simple.json
node scripts/benchmark/run-claude.mjs --scenario hard --runs 3 --model sonnet --out hard.json
node scripts/benchmark/run-claude.mjs --scenario hard --runs 3 --skill demo-video --model sonnet --out hard-old.json
node scripts/benchmark/report.mjs simple.json hard.json hard-old.json --write-doc
```

Use the same model and environment for both skills. Run `--scenario simple --skill demo-video` for a fixture-matched simple baseline too. Historical B0 used a public portfolio site, rather than this deterministic fixture. Comparisons use old-skill runs with the same model; other models are never pooled into a measured baseline.

The runner discovers local Claude permission flags through `claude --help`; it prefers `dontAsk` with explicit Bash/Read/Write/Edit/Skill allowances. If unavailable, permission bypass requires `BENCH_ALLOW_SKIP_PERMS=1`, is restricted to a generated temporary working directory, and prints a warning. The directory restriction is not an OS sandbox.

The hard login command currently opens a browser and waits for a person to log in and close it (both skills). An unattended hard run may time out; do not replace this with fabricated auth. Recording is headless. The harness supplies a disposable `SHOWREEL_SECRET_S2` unless provided by the caller; do not print it. Submitted fixture values are discarded. Transcripts are never copied into reports. Claude may retain its own session logs outside this report.

Current CLI gaps may also prevent the hard auto flow: guide resolution does not load saved auth, and guide add exposes neither sensitive fills nor scroll actions. The benchmark records failures rather than patching plugin code or weakening the requested scenario.

Each run gets isolated SHOWREEL_HOME, DEMO_VIDEO_HOME and exports, retained in a temporary showreel-bench directory for inspection. No real measurement runs in unit tests or CI. Missing Phase 8 T1 surface-meter support is recorded as unavailable. Failed runs remain in per-run tables and never contribute to medians. A budget PASS alone does not establish improvement over an unmeasured baseline.
