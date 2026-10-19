# ctx-optimize phase 1: usage reader and report CLI

Status: approved by the owner 2026-10-19. Implements phase 1 of 30 (measure, D11). Components per 21.
Scope: measurement only. No routing, no hooks, no mod, no status line, no ledger join (phase 2).

## Goal

Answer H1 and H2 from 16 with data from many real sessions: where do tokens go, main chat or subagents, and
which models. Output is a report plus a saved snapshot, and a written confirm or reject of H1 and H2.

## Layout

```
plugins/ctx-optimize/
  .claude-plugin/plugin.json      version 0.1.0, MIT
  bin/ctx-optimize                thin launcher (python3, stdlib only)
  py/ctx_optimize/
    transcripts.py                find sessions, stream JSONL lines (tolerates bad lines)
    usage.py                      Request records, dedupe, aggregate by session/agent/model/token type
    snapshot.py                   write/read snapshot JSON under ~/.agent-workbench/usage/
    report.py                     text + --json output
    cli.py                        `ctx-optimize report [--session ID | --day D | --project P] [--json]`
  tests/                          fixtures are synthetic JSONL, no real transcripts
  README.md, CHANGELOG.md
```

Plus a `ctx-optimize` entry in `.claude-plugin/marketplace.json` once it runs.

## Data model

One `Request` per assistant message with `message.usage`: session, seat (`main` or `agent:<agentType>`), agent id,
model, input, output, cache_read, cache_write (5m and 1h), thinking tokens, timestamp. Source facts are in 11.

- Walk the main transcript and `<session>/subagents/agent-*.jsonl`; join `agent-*.meta.json` for `agentType`,
  `model`, `description`.
- **Dedupe:** a streamed message can appear on several lines; count each `requestId` / message id once. Verify
  against real files before trusting (open question below).
- Seat is decided by file, never by `isSidechain` alone.
- Context per request = input + cache_read + cache_write. Report mean and p95 per seat (this is what tests H1).
- Per-token prices are not applied (16): volume only, never dollars.

## Output

Per session: seat x model table (requests, fresh input, output, cache read, cache write), main vs subagent share,
mean/p95 context per request. Across sessions: totals and a what-if table (main requests by model and context
size, the input phase 3 needs). Snapshot written before the 30-day transcript cleanup; it holds counts only, no
prompt text, because the repo is public and transcripts hold code. Snapshots live outside the repo.

## Failure behaviour

Fail open and read-only: missing dirs give an empty report, unreadable or truncated lines are skipped and counted
in a `skipped_lines` field, the tool never writes inside `~/.claude`.

## Acceptance (from 30)

1. Per-session totals match `/usage` within 5% on one session where both exist (owner supplies the `/usage`
   figures for a chosen session; I do not guess them).
2. Report separates main chat from subagents.
3. A snapshot is saved and re-readable.
4. Run over the ctx, Hark and DevFlow projects; write the H1/H2 verdict into 16.

## Build process (token split)

| Step | Who | Why |
|---|---|---|
| Dedupe and seat rules, check against real transcripts | Claude | Judgement; a wrong rule silently skews every number |
| Parser, aggregator, snapshot, report, CLI, tests, README | Codex (`codex exec`, patches only) | Mechanical from this spec |
| Review of every patch, run tests, apply | Claude | Quality gate (D18) |
| Bulk run over all sessions | Codex runs the CLI, Claude reads the summary | Large output stays out of Claude's context |

Codex works in a scratch copy and returns a unified diff; Claude applies it after review. Codex never touches the
repo directly. A patch is accepted only when tests pass and it stays within the files listed above.

## Open questions

- Are streamed assistant messages duplicated across lines in real transcripts? Check with a quick count of
  distinct vs total `requestId` on one session before writing the dedupe rule.
- How `/usage` rounds or groups tokens (affects the 5% check). Resolved when the owner provides figures.
