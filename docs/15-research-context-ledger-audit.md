# Research: Context Ledger audit

Read locally on 2026-10-17 from `~/Desktop/Personal/context-ledger` (v1.2.0 per its README; 136 commits; about
21k lines of Python, standard library only; Python 3.8+). Public repo `ansh-n-chovatiya/context-ledger`.

## What exists

- **Levels:** L0 trace (about 30-token briefing), L1 tracked task with a done-gate, L2 spec plus plan plus units.
- **Commands (24):** ask, context, decide, doctor, drop, escalate, findings, handoff, init, load, merge, next,
  phase, plan, preview, resume, review, save, spec, start, status, task, trust, verify.
- **Agents (4):** `unit-runner` (Bash/Read/Edit/Write, one unit), `reviewer` (read-only, first pass),
  `re-reviewer` (later rounds, fix-only package), `verifier` (rubric checks).
- **Hooks (7):** session_start, user_prompt_submit, pre_tool_use, post_tool_use, pre_compact, stop, session_end.
  The `stop` hook runs the done-gate and can refuse to end the session.
- **Config (`.ctx/ctx.yaml`):** `briefing_chars` per level (220 / 900 / 2600), gate attempts and output trimming,
  `plan.wave_budget_tokens: 250000`, `models: runner sonnet, reviewer opus, verifier opus`, `telemetry.enabled`.
  `models.escalate_on_failed_round` exists in `ctx/config.py` and defaults to false.
- **Telemetry:** `.ctx/runtime/telemetry.jsonl` (hook durations, briefing sizes, reported spend, per-role totals).
- **Review mechanics:** `ctx review <unit>` builds a package by diffing two content snapshots (no git needed).
  Package = objective, criteria, declared `owns/reads/forbid`, interfaces, stat summary, machine-computed
  scope-violation section, unified diff at 10 lines of context. A smaller, cleaner package earns a cheaper
  reviewer tier. Findings are recorded with `ctx findings`; `critical` and `important` block the review gate.
  Round cap is three; a fourth round is an escalation, not a retry.
- **Reviewer rules:** read-only, no Bash or git, does not dispatch subagents, does not trust the unit's report,
  may read outside the diff only to evaluate a **named** concrete risk.
- **Prior token work:** a plan `token-quality-ux` (reducer module, footprint module, review churn, agent prompts,
  hook shell noise, gate output) with 12 stored review packages under `.ctx/runtime/reviews/`.

## Gaps against the owner's problem (verified by reading; see also 22)

| Gap | Evidence |
|---|---|
| No failure-mode step in spec, plan or build | `grep -i "edge\|failure\|empty"` over `commands/spec.md`, `commands/plan.md`, `agents/unit-runner.md` found nothing relevant |
| Reviewer is limited to the diff package | `agents/reviewer.md`: "Do not re-derive the diff"; outside code only for a named risk |
| No project-rules file feeds builder and reviewer | Not found in agents or commands read |
| Review findings do not become future rules | Findings live per unit; no promotion step found |
| No token join to units | `telemetry.jsonl` has per-role totals, not per-unit transcript totals |
| Tokens per stage unknown | See 11: only one session measured |

## Open

- Read `commands/spec.md`, `commands/plan.md`, `commands/start.md` end to end (only grepped so far).
- Why did a fix-round unit-runner run on Opus when `models.runner` is sonnet? Check the unit's own `model:` field.
- Read `ctx/briefing.py` and the hooks for always-on token cost; run `claude plugin details ctx`.
- Check whether the `.ctx/` review packages already hold a history of finding types (12 packages in the ctx repo;
  Hark and DevFlow have none stored).

## Update 2026-10-18 (spike S5, code read)

- **Test suite is 2267 tests**, not 165 (CI floor 2145). Run from `plugins/ctx` in the monorepo: 0 failures, 4 skips.
- **Why unit-runners can run on Opus (Q11, Q17).** `dispatch.model_for` precedence: the unit's own `model:`, then a score-derived
  tier (score at or above `complexity.thresholds.deep` = 6.0 maps to the dearest tier, Opus), then `models.<role>`. But `ctx`
  only *names* a model on the dispatch line; `commands/start.md` tells the orchestrator to pass it, and no agent file declares
  `model:`. If the orchestrator omits it, the Task call inherits the session (Opus). Nothing enforces it. That is the case a
  phase 3 `agent.spawn` mod closes.
- **Always-on cost.** Unchanged from doc 10: about 845 tokens per session.
- **Review round cap.** `MAX_ROUNDS = 3`, enforced by the caller in `ctx/commands.py`, not by `Ledger.bump_round`.
