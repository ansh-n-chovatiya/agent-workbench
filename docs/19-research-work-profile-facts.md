# Research: facts from the work profile (anonymised)

Source: an anonymised report the owner generated read-only in the work profile and shared on 2026-10-17
(30-day window, 61 sessions in 4 projects, Claude Code 2.1.302, Max plan). Review counts are the report's own hand
classification (about plus or minus 5), and its tool could not tell confirmed findings from dismissed ones for
built-in reviews. Treat every number as approximate. Nothing identifying is stored here.

## 1. Environment (affects what we may build)

- Subscription login (Max), first-party provider, no API key, no `env` block. **No managed settings found**, so
  mods and plugins are allowed. The managed-only keys (`allowManagedModsOnly` etc.) could not be checked: confirm in
  `/status` (Q16).
- Already installed there: Context Ledger 1.2.0, **a "model-router hook" plugin (2.1.0) and 3 local mods (0.1.0)**,
  about 90 skills. We must read the existing router before designing another (Q15); it may already do part of D7/D8.
- Most-used in 30 days: built-in `/code-review` 33 runs, ledger start 27, ledger spec 15, plan 14, ledger review 10,
  manager-style PR review 7.

## 2. Token usage: the main chat dominates (confirms H1)

- Main-chat requests by model: Opus 5.5 12,255, Sonnet 5.5 370, other 28. So about **97% of main-chat requests ran on
  Opus**.
- Ten largest sessions (all in one project), each 460 to 1,618 main-chat requests. Average **414k to 537k cache-read
  tokens per main request**.
- Summed over those ten: main chat about 4.68 billion cache-read tokens; subagents about 1.14 billion (1.11 billion
  on Opus). Subagents are about **20%** of the volume, in line with the 18% measured in doc 11.
- The share varies: one session was about 60% subagent (S7, 22 to 55 Opus subagents running long), most were 5 to 15%.
- Subagents by type (all projects): general-purpose 176, ledger unit-runner 129, ledger reviewer 33, Explore 30,
  ledger re-reviewer 18. **Nearly all subagents ran on Opus**, including unit-runners (the ledger config names
  Sonnet as the runner model) and Explore. Q11 is now a pattern, not a one-off.
- Only 3 manual clears and 1 manual compact across 61 sessions; longest session had 1,618 main requests and 4 to 8
  compactions.
- Volumes only. No prices applied (doc 16 rule).

## 3. Review history

- Ledger review records: 14 units, 151 findings, about **1.8 rounds per unit**. Status: 96 addressed, 26 disputed
  (false positives), 8 parked, 21 open.
- **All 24 "critical" findings were the same generic item: "files changed outside the unit's owned list",
  caused by parallel units sharing a working tree, and all 24 were disputed.** Real findings were 13 important and
  114 minor. The scope check is firing falsely on every parallel unit (a ctx defect to fix first).
- Built-in `/code-review`: 33 runs over 9 sessions. For changes it reviewed repeatedly, round 1 found the most and
  later rounds found narrower hardening. One change took 8 rounds with findings (about 9 runs).
- **A review can repeat identical findings when nothing changed** (two structured reports with the same 8 findings).
  A zero-token "diff unchanged since last review" check would skip that run.
- Built-in structured reviews found permission, tenant-scope and caller-not-updated problems. Free-text reviews were
  dominated by error handling, input edge cases, UI state and timing.

Findings by category (approximate; ledger 127 real, built-in structured 26, built-in free-text 73):

| Category | Ledger | Built-in structured | Built-in free-text |
|---|---|---|---|
| error or timeout handling | ~28 | 4 | 14 |
| concurrency or repeated call | ~17 | 3 | 6 |
| duplicated existing helper or component | ~14 | 2 | 2 |
| test missing or testing the wrong thing | ~14 | 0 | 0 |
| input boundary, empty or missing data | ~12 | 1 | 8 |
| caller or interface not updated | ~12 | 2 | 0 |
| naming, style, stale comments | ~10 | 1 | 2 |
| async UI state | ~9 | 1 | 5 |
| other (deploy order, timing, dead code, billing) | ~8 | 7 | 30 |
| permission or ownership check | ~5 | 3 | 0 |
| backward compatibility, existing data | ~3 | 1 | 3 |
| tenant or data-scope filter | 0 | 1 | 2 |

"Other" in the free-text column is large: deploy order, shutdown and restart behaviour, timing and sync, removed
code still referenced elsewhere. The first checklist must include these.

## 4. Project rules

None. Each project has one `CLAUDE.md` and **no `.claude/rules` files and no invariants file** a reviewer is told to
read. The permission, tenant-scope and caller checks that the structured reviews found are the kind a rules file
would state up front. The project rules file in 22 is new ground here, not a replacement.

## 5. Workflow

- 28 of 61 sessions used subagents. Work follows spec, plan, start, review; units are built in parallel then
  reviewed and re-reviewed; the built-in review runs late and repeatedly after fixes.
- Sessions sit near 480k cached tokens per request for long stretches.

## Conclusions (feed decisions)

1. **The biggest lever is the main chat on Opus with very long contexts**, not subagent routing. Subagent routing
   still matters (they are 20% and almost all Opus), but second.
2. The ledger's false critical scope flag costs review rounds and trust; fixing it is cheap and certain.
3. Skip-if-unchanged and a hard stop rule would cut repeated or low-yield review runs.
4. The checklist and rules file have real data behind them now (the table above).
5. Reading the existing router and mods comes before writing a new one.
