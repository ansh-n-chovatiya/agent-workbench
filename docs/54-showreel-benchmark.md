# Showreel benchmark

How to read this: each headless Claude session carries an environment floor for the system prompt, plugins and skill list. Skill activation also re-injects the full user skill list (about 9.7k cache-creation tokens in the observed trace); both skills pay this overhead. Fresh tokens = input + output + cache creation. The runner measures “Invoke the {{skill}} skill, do nothing else, then reply with the single word OK.” once per invocation with the same model, plugin and permission flags, using showreel or the old skill name demo-video, and stores that skill-activation floor in the JSON report. An empty-session floor omits activation overhead; rerun older measurements for comparison. Marginal fresh tokens = max(0, run fresh − floor fresh); only marginal tokens have a token budget. Cost, cache reads, turns and wall time are whole-run measurements. Cache reads are a proxy for conversation repetition. Turns use Claude num_turns when available; surface-command fallback is partial and excludes the harness query. Missing measurements stay unknown.

Medians include successful videos only (exit success, valid usage, and `Final video:` or a nonempty exported MP4). Even samples average the two central values. Each metric uses available successful measurements; unavailable metrics remain PENDING. Step counts are requested, not independently verified. Baseline deltas are (measured − baseline) / baseline; negative is better. Baseline verdicts require a strict reduction. Historical marginal usage is unknown without its own same-environment floor.

## simple (5 steps)

### showreel / sonnet

Passing videos: 3/3. Budget result: FAIL.

Baseline: historical B0 (different target URL; fixture comparison still needed).

| Metric | Median (passing) | Budget | vs budget | Baseline | Delta | vs baseline |
|---|---:|---:|---|---:|---:|---|
| Floor fresh tokens | 30471 | — | — | — | — | PENDING |
| Fresh tokens (total) | 34277 | — | — | 42380 | -19.1% | PASS |
| Marginal fresh tokens | 3806 | 4000 | PASS | — | — | PENDING |
| Cost | $0.1551 | $0.1500 | FAIL | $0.2100 | -26.1% | PASS |
| Cache-read tokens | 128491 | 250000 | PASS | 281835 | -54.4% | PASS |
| Turns | 5 | 5 | PASS | — | — | PENDING |
| Wall time | 91.5 s | 90.0 s | FAIL | 61.0 s | 50.0% | FAIL |

Batch wall time: 276.0 s. Auth preflight and floor are excluded.

| Run | Result | Input | Output | Cache creation | Cache read | Fresh | Floor fresh | Marginal fresh | Cost | Turns | Turns source | Wall | Claude duration | API duration | Failure |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|
| 1 | PASS | 8 | 793 | 32837 | 130910 | 33638 | 30471 | 3167 | $0.1524 | 5 | num_turns | 97.2 s | 92.2 s | 16.8 s |  |
| 2 | PASS | 8 | 865 | 33404 | 128491 | 34277 | 30471 | 3806 | $0.1551 | 5 | num_turns | 91.5 s | 88.0 s | 12.4 s |  |
| 3 | PASS | 8 | 967 | 33486 | 127914 | 34461 | 30471 | 3990 | $0.1564 | 5 | num_turns | 86.8 s | 83.3 s | 15.4 s |  |

Surface meter totals (raw `showreel tokens --json`, per project; unavailable values are never treated as zero):

| Run | Status | Project | Totals |
|---|---|---|---|
| 1 | ok | bench-simple-1 | {"stages":{"intake":{"claudeReadTokens":0,"claudeWrittenTokens":0},"guide":{"claudeReadTokens":0,"claudeWrittenTokens":0},"storyboard":{"claudeReadTokens":0,"claudeWrittenTokens":0},"scenario":{"claudeReadTokens":0,"claudeWrittenTokens":0},"record":{"claudeReadTokens":0,"claudeWrittenTokens":0},"edit/render":{"claudeReadTokens":0,"claudeWrittenTokens":0},"voice":{"claudeReadTokens":0,"claudeWrittenTokens":0},"other":{"claudeReadTokens":78,"claudeWrittenTokens":120}},"claudeReadTokens":78,"claudeWrittenTokens":120,"skillLoadTokens":0,"totalTokens":198,"budget":6000,"pass":true} |
| 2 | ok | bench-simple-2 | {"stages":{"intake":{"claudeReadTokens":0,"claudeWrittenTokens":0},"guide":{"claudeReadTokens":0,"claudeWrittenTokens":0},"storyboard":{"claudeReadTokens":0,"claudeWrittenTokens":0},"scenario":{"claudeReadTokens":0,"claudeWrittenTokens":0},"record":{"claudeReadTokens":0,"claudeWrittenTokens":0},"edit/render":{"claudeReadTokens":0,"claudeWrittenTokens":0},"voice":{"claudeReadTokens":0,"claudeWrittenTokens":0},"other":{"claudeReadTokens":78,"claudeWrittenTokens":135}},"claudeReadTokens":78,"claudeWrittenTokens":135,"skillLoadTokens":0,"totalTokens":213,"budget":6000,"pass":true} |
| 3 | ok | bench-simple-3 | {"stages":{"intake":{"claudeReadTokens":0,"claudeWrittenTokens":0},"guide":{"claudeReadTokens":0,"claudeWrittenTokens":0},"storyboard":{"claudeReadTokens":0,"claudeWrittenTokens":0},"scenario":{"claudeReadTokens":0,"claudeWrittenTokens":0},"record":{"claudeReadTokens":0,"claudeWrittenTokens":0},"edit/render":{"claudeReadTokens":0,"claudeWrittenTokens":0},"voice":{"claudeReadTokens":0,"claudeWrittenTokens":0},"other":{"claudeReadTokens":78,"claudeWrittenTokens":116}},"claudeReadTokens":78,"claudeWrittenTokens":116,"skillLoadTokens":0,"totalTokens":194,"budget":6000,"pass":true} |

## hard (12 steps)

### Unmeasured

Passing videos: 0/0. Budget result: PENDING.

Baseline: unmeasured; run the old skill on this fixture.

| Metric | Median (passing) | Budget | vs budget | Baseline | Delta | vs baseline |
|---|---:|---:|---|---:|---:|---|
| Floor fresh tokens | — | — | — | — | — | PENDING |
| Fresh tokens (total) | — | — | — | — | — | PENDING |
| Marginal fresh tokens | — | 12000 | PENDING | — | — | PENDING |
| Cost | — | $0.3000 | PENDING | — | — | PENDING |
| Cache-read tokens | — | 600000 | PENDING | — | — | PENDING |
| Turns | — | 14 | PENDING | — | — | PENDING |
| Wall time | — | 150.0 s | PENDING | — | — | PENDING |

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
