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
