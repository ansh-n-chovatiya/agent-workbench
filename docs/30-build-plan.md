# Build plan

Status: proposed. Nothing here starts until the owner has reviewed 20 to 22 and 31. Each phase has an
acceptance check that a command or a measurement can decide.

## Phase 0: verification spikes (research only, no product code)

**Status 2026-10-18: S1 to S5 done (results in 10 section 8, 15 and 31). S6 needs the owner's past review outputs and the built-in `/code-review` text (Q1, Q10), so it is still open.**

| Spike | Answers | Done when |
|---|---|---|
| S1 `claude --version`; `claude plugin validate` on a stub mod using `agent.spawn` | Q2, Q3 | A stub mod rewrites a subagent's model and `$.store` survives two sessions |
| S2 Read the full hooks page for `SubagentStop` payload and `SessionEnd` | Q6 | Fields written into 10 |
| S3 Marketplace entry for a plugin in a subdirectory (`plugins/ctx`) of the same repo, and that `ctx`'s hooks and `${CLAUDE_PLUGIN_ROOT}` paths still work from there | Q5 (now: subdirectory plugin) | Verified in `/docs/en/plugins/marketplace-reference` or by a throwaway marketplace |
| S4 Settings auto-install prompt behaviour on a fresh clone | Q4 | Written into 10 |
| S5 Read `commands/spec.md`, `plan.md`, `start.md`; run `claude plugin details ctx` | ctx always-on cost; unit `model:` field | Written into 15 |
| S6 Collect the owner's past review outputs and built-in `/code-review` text | Q1, Q10 | Category table created in 31 |

## Phase 0.9: create the repo and move first (ordering fix, 2026-10-17)

**Status 2026-10-18: done locally, nothing pushed.** `agent-workbench` is a local git repo with `context-ledger` (as `plugins/ctx`, 136 commits) and `ai-skills` (as `plugins/skills-demo`) folded in with history via `git subtree`; tags `ctx-v1.0.0`, `ctx-v1.1.0`, `ctx-v1.2.0` recreated at the original commits; root `.claude-plugin/marketplace.json`, root `.github/workflows/ci.yml` (ctx jobs copied from the plugin's own workflow, which stays because ctx's tests read it, plus a `scan` job), `.gitignore`, `LICENSE` (MIT, copied from ctx), `scripts/scan-personal-data.py` with tests. Checks: ctx suite 2267 tests pass from `plugins/ctx`; `/ctx:init` runs live from there; tracked-file scan clean. **Not done, needs the owner:** (1) the history scan finds the `.ctx/journal` exposure described in 31, so decide whether to rewrite history before the first push; (2) creating the public GitHub repo; (3) the MIT licence for `ai-skills` (Q21), which also blocks making `plugins/skills-demo` a proper plugin (it has no `plugin.json`; that is phase 5). The skills plugin is not in the marketplace yet for that reason.

The plan changes ctx (phases 0.5 and 4) and adds `plugins/ctx-optimize` (phases 1 to 3), and D3 puts all of it in one
repo. Doing the move last (the old phase 5) would mean editing ctx in the old repo and migrating it afterwards.
So: create `agent-workbench`, fold in `context-ledger` and `ai-skills` with history (details in phase 5), prove ctx
works from `plugins/ctx` (spike S3), add CI (ctx's tests, `claude plugin validate`, a personal-data scan) and a
`.gitignore` that excludes `.ctx/`, usage snapshots and transcripts. All later phases work in the new repo.
Usage snapshots and reports are stored outside the repo (for example under the user's data directory), because
transcripts contain code and the repo is public.

## Phase 0.5: quick certain fixes (from doc 19)

**Status: blocked on evidence, not started.** Both targets were checked against the code on 2026-10-17 and the
original premises did not hold (see D16, D17):
1. D16: the wave-aware scope check already exists (`wave_scope`, since 0.8.0). First task: read the evidence lines of
   a sample of the 24 disputed findings (Q18) and find the real cause. Acceptance: cause named, then a test that
   reproduces it, then the fix, with a real out-of-scope edit still flagged (positive control).
2. D17: D12 is now decided (two rounds, serious findings earn more, hard ceiling of four); implement the stop rule
   and the free "unchanged since last review" notice behind a default-off switch, flip after the quality gate.

## Quality gate (applies to every phase, D18)

No change that could lower output quality ships on impressions. Each candidate (a cheaper model for an agent type,
a shorter review, a smaller context) is run on the same real change with and without it. It ships only if findings
per round, rounds to approval and escaped bugs are equal or better. Zero-quality-risk savings (D16, D17, fresh
sessions at stage boundaries, output trimming, cache lifetime, skill sets) go first and need only a token
comparison.

## Model-per-stage experiment (D18)

Run after phase 1 gives the baseline. For 3 to 5 real changes, run the build stage on Sonnet and the rest on Opus,
then compare with the Opus-only baseline: findings per round, rounds to approval, escaped bugs, tokens by stage.
If equal or better, Sonnet becomes the default for build and orchestration stages and the stage hint switches on;
if not, record which finding types rose and keep Opus, or try Sonnet with a stricter review round. Q17 (why
unit-runners ran on Opus) is answered first because it changes what the baseline means.

## Phase 1: measure (D11)

Main-chat context and model first (D18), then subagents. Include a what-if table from real transcripts: how many
main requests would have run on each model and at what context size.

Build the **usage reader and report CLI** only (Python, stdlib, tests). Run on all sessions of the ctx, Hark and
DevFlow projects.
Acceptance: totals per session, agent, model match `/usage` within 5% on a session where both exist; report
separates main chat from subagents; a snapshot is saved. **Output: confirm or reject H1 and H2 (16).**
No routing is built until this is read.

## Phase 2: join to the ledger and show it

Ledger join (stage, unit, round), `/agents` pane, one status line.
Acceptance: for one real ctx plan the report lists tokens per unit and per review round; `/agents` draws nothing
until run; the status line costs no model tokens.

## Phase 3: routing

Router mod with unit `model:`, fallback keywords, switch guard, decision log.
Acceptance: `claude plugin test` passes; a subagent for a unit with `model: haiku` runs on Haiku in a live
session; `_FORCE=1` produces a logged mismatch; any thrown error passes the call through unchanged.

## Phase 4: review system (22)

Order: failure-mode section in `/ctx:spec` and plan blocking; caller list and test table in the package; reviewer
and builder prompt changes; confidence filter; `ctx rules`; round cap of two; PR-level pass.
Acceptance (A/B on 3 to 5 real changes): rounds to approval at or below two; findings per category recorded;
tokens per change recorded against the baseline from phase 1. If rounds do not fall, stop and re-read the findings
before adding more checks.

## Phase 5: one repository, profile and bootstrap

The move itself now happens in phase 0.9; this phase keeps the rest. Move recipe (D3): fold `context-ledger` and `ai-skills` into `agent-workbench` with history preserved
(git subtree or filter-repo into `plugins/ctx` and the `skills-*` plugins), fix any path assumptions (the ctx
`bin/`, tests and `pyproject.toml` expect to sit at a repo root), run ctx's own test suite from the new location,
scan for personal data, then archive the old repos with a README pointer. Each profile re-adds the new marketplace.

Workbench repo, marketplace, `bootstrap.sh` with `--dry-run`, agent-role config with Claude fallbacks.
Acceptance: on a clean macOS user account or VM, one command yields working `ctx`, `ctx-optimize` and settings;
a second run changes nothing.

## Phase 6: optional agents

herdr layout notes, `AGENTS.md` / `GEMINI.md` stubs, manual `codex review` flow that records into
`ctx findings`. Automatic cross-agent calls only if used by hand at least a few times first (D6).

## Loops and ordering guards (reviewed 2026-10-17)

- Review loop is capped: two rounds, serious findings extend it, hard ceiling of four, then the owner decides.
- Learning loop (findings to rules file to fewer findings) is capped by the rules file size limit (22).
- "On by default" versus "quality gate first": features are built default off, measured, then flipped (D20).
- Quality gate needs a baseline: the baseline is doc 19 plus the phase 1 report, so phase 3 model changes wait for
  both.
- Building the review system with ctx itself (working rule) risks editing the tool that is gating the work: pin the
  installed ctx version while a plugin change is in progress.
- Owner-input blockers (not loops): Q15, Q16, Q18, Q10, Q20. Work not depending on them (phases 0.9 and 1) goes first.

## Release, licence and rollback (added 2026-10-17)

1. **Release and update process.** One version per plugin in its `plugin.json` (Claude Code pins an installed plugin
   to the declared version, so an unchanged version means no update). Tag each release (`ctx-vX.Y.Z`,
   `ctx-optimize-vX.Y.Z`, `skills-<theme>-vX.Y.Z`), keep a `CHANGELOG.md` per plugin, and document the two-step
   update (`claude plugin marketplace update <name>`, then `claude plugin update <plugin>@<name>`), then restart
   (ctx README already warns that update reads the local marketplace clone). CI refuses a release whose version
   was not bumped. Acceptance: a change released from the repo reaches a second profile by following the documented
   steps only.
2. **Licence check.** Context Ledger is MIT (copyright the owner). **`ai-skills` has no licence file and no licence
   field (checked 2026-10-17)**, so as published it is all rights reserved by default. Before the merge: the owner
   adds an MIT licence for the skills (same author, so no third-party consent needed), the merged repo carries one
   top-level LICENSE with per-plugin notes if they differ, and `THIRD_PARTY_NOTICES.md` lists the dependency on
   `@playwright/test` (a runtime npm dependency of the demo-video skill; confirm its licence from the package before
   writing the notice, not assumed here), anything adapted from Caveman's rules (Apache-2.0, D22), and anything copied
   from ccusage (MIT) or other tools. CI fails if a plugin has no licence line. `node_modules` is not tracked (checked).
3. **Rollback test.** Every feature that ships default on (D20) has a switch, and a test proves it: with the switch
   off, behaviour matches the previous release (same hook output, same subagent models and prompts, no extra
   tokens). Acceptance per feature: a test with the switch on and a test with it off, plus one manual session
   checked with the status line and `/usage`. Also a documented whole-plugin rollback: disable or reinstall the
   previous tagged version.

## Not planned
Gateway (D5); web dashboard (D9); main-chat model switching (D7); a standalone terminal app.

## Working rules
- Use ctx itself to build this (units, findings, gate) so the new review system is tested on real work.
- Every phase ends with the numbers from phase 1's report, not with impressions.
- Never claim a saving without the log.
