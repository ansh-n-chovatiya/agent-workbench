# Research: existing usage and dashboard tools

Owner's stance: build custom, but reading or adapting existing tools is fine. Check licences before copying code.

| Tool | What it does | Data source | Per-subagent? | Licence | Status |
|---|---|---|---|---|---|
| Built-in `/usage`, `/context`, `/insights` | Session totals, plan attribution by skill/subagent/plugin/MCP | Local session history | Attribution share only | n/a (Claude Code) | Verified in docs |
| Built-in OpenTelemetry export | Metrics such as `claude_code.token.usage` with a `query_source` attribute (main, subagent, auxiliary) | Claude Code itself | Yes, per the secondary sources | n/a | Source (blogs); official page `/docs/en/monitoring-usage` not read yet |
| ccusage (ryoppippi) | Daily, weekly, monthly, session and 5-hour-window reports for several agent CLIs, including Claude Code and Codex | Local data files | Not stated on its page | MIT | Verified (GitHub page) |
| Claude Code Usage Monitor | Live terminal dashboard and limit forecast; uses the status line `rate_limits` data, local estimates as a fallback | Status line data, local config files | Not stated | MIT | Verified (GitHub page) |
| claude-usage-exporter (PyPI) | Reads local transcripts, exports per agent, model and token type to Prometheus/OTLP/stdout | Local transcripts | Yes, per its description | **Not checked** | Source only |
| ctx telemetry | Hook durations, briefing sizes, reported spend, per-role totals | `.ctx/runtime/telemetry.jsonl` | By ctx role | Owner's own | Verified locally (5,114 lines in the ctx repo) |
| herdr sidebar | Live pane state: working, blocked, idle | Process and output detection | Per pane | Apache-2.0 | Verified (see 13) |

## Caveman (juliusbrussee/caveman), read 2026-10-17 from its GitHub page; nothing run or audited

Apache-2.0 skill plus CLI plus proxy that makes agents reply tersely and shrinks tool output; a separate "Auto"
feature routes requests to a model through its own cloud after sign-in and sends recent prompts there. Claims on
its page, not verified by us: 33.2% fewer input tokens from shrinking tool output (54 runs, one file type got
worse); output 6,983 to 2,693 tokens on 10 questions with its strongest terse mode (older version, not re-run); its
rules cost about 1,160 input tokens; its "65%" headline is unexplained. Code, paths, errors, numbers and negations
are said to stay exact. CLI telemetry is on by default. Used here as a reference for terse-report rules only (D22).

## Findings

1. Nothing found joins **tokens to ledger units and phases**. That join is the custom part.
2. The data needed (transcripts and `meta.json`) is already on disk (see 11), so a reader needs no hooks.
3. For OTel, one source says short `claude -p` runs can exit before the metric flushes, and another says metrics
   are aggregated without per-prompt IDs. Do not depend on OTel for per-unit numbers.
4. ccusage and the usage monitor are reference implementations for the transcript format and for pricing data.
   Pricing must come from a table we maintain or from the ledger; it is not in the transcripts.

## To do before build

- Read `/docs/en/monitoring-usage` and the `statusline` page (fields `current_usage`, `prompt_cache`, cost).
- Check claude-usage-exporter's licence and source layout.
- Decide whether to read ccusage's pricing table (MIT permits reuse with the notice).
