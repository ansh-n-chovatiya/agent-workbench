# Research: token economics

Sources: Anthropic docs `costs` and `prompt-caching` (fetched 2026-10-17) and the measurement in 11.

## How cost builds up (verified)

- Every request re-sends the full context: system prompt, project context, every prior message and tool result.
  The API reuses an identical prefix from cache and bills the re-read at the cached rate.
- **Each model has its own cache.** Switching models recomputes the whole request even when the text is identical.
- Changing effort level on most models also rebuilds the cache; on Opus 5.5, Sonnet 5.5, Haiku 5.5 and Fable 5.1
  with an API key or subscription it does not.
- Cache lifetime: 1 hour for the main conversation on a subscription within plan usage; 5 minutes with usage
  credits, an API key or a cloud provider. **Subagents, workflows, forks, compaction and titles default to 5
  minutes** even on a subscription. `promptCacheTtl` and `subagentPromptCacheTtl` (v2.1.242+) change this.
- A subagent starts its own cache; its first request cannot read the parent's. A **fork** inherits the parent's
  prefix and does read the parent's cache.
- Skills whose frontmatter names a different `model` cause a model switch for that turn. `opusplan` switches model
  on every plan-mode toggle.
- Keeps the cache: editing files, editing CLAUDE.md (but it does not apply until restart), changing permission mode
  or output style, invoking skills, `/rewind`, enabling or disabling plugin skills, commands, agents, hooks.
- Breaks it: model switch, MCP tool-set change with tools not deferred, plugin MCP servers, compaction (by design),
  many images, upgrading Claude Code, fast mode on.
- Compaction while the cache is warm costs a fraction of the context size; after a cold gap it reprocesses
  everything. `idleCompaction` (v2.1.290+) can compact shortly before the cache expires.
- Anthropic's own reduction advice: `/clear` between unrelated tasks; Sonnet for most coding, Opus for hard
  reasoning; `model: haiku` for simple subagents; hooks that trim noisy output; skills instead of long CLAUDE.md;
  plan mode before big changes; give verification targets; specific prompts; delegate verbose work to subagents.
- Agent teams use roughly 7x the tokens of a standard session in plan mode (docs figure).

## What the measurement says (11, one session)

- Average main-chat request carried about 239k tokens. Cache reads were about 94M in 393 requests.
- Subagents added about 20M cache-read tokens over 66 agents.
- **Hypothesis H1:** the main chat's accumulated context, not subagent model choice, is the biggest cost driver in
  ctx sessions. If H1 holds, routing subagents to cheaper models helps less than keeping the main context small
  (shorter sessions, `/clear` between units, results returned as file paths, not text).
- **Hypothesis H2:** the review loop multiplies cost because every round re-sends large context to Opus
  subagents. Needs per-round numbers.
- Neither is proven. Phase 1 exists to test them on many sessions.

## Consequences for the design

1. A per-prompt model gateway would repeatedly rebuild the cache. Rejected (D5).
2. Choose the main model once per session or per task; use `PreModelSwitch` to warn before a costly switch.
3. Route **subagents**, not the main chat. Use `agent.spawn` to set the model.
4. Consider `subagentPromptCacheTtl: 1h` if review rounds on the same unit are more than five minutes apart.
5. Reduce main-chat context: ledger-first workflow so sessions stay short and disposable.
6. Report cost by stage so H1 and H2 can be confirmed or dropped.

## Pricing

Per-token prices are **not** recorded here. They are not in the transcripts; Claude Code computes cost from list
prices locally. Use `/usage` or the pricing page when a dollar figure is needed. Never quote savings in dollars
without the log.

## Phase 1 findings (2026-10-19, `ctx-optimize report` over three projects)

Volume only, no prices. Source: transcripts in `~/.claude/projects` for the ctx (`context-ledger`), Hark and DevFlow
projects; 14 sessions, 0 skipped lines. Totals of this tool match an independent count exactly on one session
(31 requests, identical input, output, cache read, cache write). **Not yet reconciled with `/usage`** (needs the
owner's figures for one session; target within 5%).

| Project | Sessions | Main requests | Subagent requests | Main share of cache read | Mean main context / request | Mean subagent context / request |
|---|---|---|---|---|---|---|
| ctx | 2 | 207 | 340 | 82% | 226k | 35k |
| Hark | 7 | 997 | 39 | 99% | 358k | 76k |
| DevFlow | 5 | 242 | 9 | 99% | 150k | 36k |

- **H1: confirmed on this data.** The main chat accounts for 82% to 99% of cache-read volume and its mean context per
  request is 4 to 6 times a subagent's. Even in the ctx project, which has 340 subagent requests, subagents are 18%.
  Routing subagents to cheaper models can save at most that share; keeping the main context small matters more.
- **H2: not decidable yet.** In ctx, 201 of 340 subagent requests ran on Opus (7.4M cache read), but per-round numbers
  need the ledger join (phase 2). Hark and DevFlow have almost no subagent activity, so they say nothing about review
  rounds.
- Caveats: three projects, one owner, small subagent counts outside ctx. Hark main context reaches 966k tokens at
  the maximum, a lead worth checking in phase 2. Synthetic (`<synthetic>`) messages carry no usage and are harmless.

## Phase 2 findings (2026-10-19, one ctx plan, 9 units, `report --units`)

Rounds are inferred from spawn order (see ctx-optimize README); one plan, so treat as a first read.

- Of 8.8M cache-read tokens in unit subagents: build 59%, fix rounds 15%, review 26%. Review round 1 is 96% of review volume; round 2 is 4%.
- **H2: not supported by this plan.** The review loop did not multiply cost: only two units got a round 2 and it was cheap (Sonnet, 92k vs 2.2M for round 1). The expensive review was one unit (09) whose single round 1 used 28 requests.
- **Q17 answered in part:** 115 of 169 build requests and 24 of 62 fix requests ran on Opus although `models.runner` is sonnet; units 01, 07, 08, 09 built entirely on Opus. Moving those to Sonnet is the larger saving than any review change. Still to confirm: whether those units carry their own `model:`.
- 39 non-ctx subagents (general-purpose and similar) were unattributed: 1.6M cache read.
