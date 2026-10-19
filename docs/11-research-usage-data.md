# Research: where token usage is recorded

Measured on this Mac on 2026-10-17 from one real Context Ledger session. Verified locally unless marked.

## Files

| What | Path | Notes |
|---|---|---|
| Main transcript | `~/.claude/projects/<project-dir>/<session-id>.jsonl` | One JSON object per line. |
| Subagent transcript | `~/.claude/projects/<project-dir>/<session-id>/subagents/agent-<agentId>.jsonl` | Separate file per subagent. Survives main compaction. |
| Subagent metadata | `.../subagents/agent-<agentId>.meta.json` | Keys seen: `agentType`, `description`, `toolUseId`, `spawnDepth`, `requestShape`, `requestNonInteractive`, `model`. |
| Retention | deleted after `cleanupPeriodDays` (default 30) | So reports must be saved before then. |
| ctx's own log | `<project>/.ctx/runtime/telemetry.jsonl` | Hook durations, briefing sizes, reported spend, per-role (via `ctx telemetry`). |

## Usage fields (assistant messages, `message.usage`)

`input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`,
`cache_creation.ephemeral_1h_input_tokens` / `ephemeral_5m_input_tokens`, `output_tokens_details.thinking_tokens`,
`service_tier`, `speed`. The model is in `message.model`. Other fields seen on request lines: `requestedModel`,
`effort`, `perTurnEffort`, `requestId`, `promptId`.

Main-transcript lines had `isSidechain: 0`; subagent work is only in the separate files, so a reader must walk
both.

## One measured session (ctx project, plan with parallel units)

| Seat | Requests | Fresh input | Output | Cache read | Cache write |
|---|---|---|---|---|---|
| Main chat (claude-sonnet-5-5) | 393 | 922 | 348,208 | 94,081,977 | 930,995 |
| 66 subagent files, Opus 5.5 | 398 | 796 | 56,071 | 15,294,995 | 1,415,523 |
| 66 subagent files, Sonnet 5.5 | 230 | 460 | 7,003 | 5,177,312 | 1,313,828 |

Derived: the main chat averaged about **239k tokens of context per request** (94.08M / 393). By cache-read
volume the main chat is about 82% of the total and subagents about 18%. Per-token prices differ by model and are
not applied here, so this is a volume comparison, not a cost comparison.

**Caveat:** one session. Do not generalise. Phase 1 must repeat this on many sessions.

A `ctx:unit-runner` fix round ran on Opus (`meta.json` says `model: opus`) although `ctx.yaml` sets
`models.runner: sonnet`. Not escalation: it came from the unit's complexity score mapping to the dearest tier (see 15, update 2026-10-19).

## Implications

- A transcript reader can produce per-session, per-agent, per-model totals with no hook and no network.
- The metadata file links an agent to its role and task label, which ctx can join to a unit.
- Hard part: attributing main-chat tokens to **stages** (spec, build, review). Needs the ledger's phase markers or
  timestamps from `.ctx/journal` and `.ctx/runtime/state.json`. Design in 21.
