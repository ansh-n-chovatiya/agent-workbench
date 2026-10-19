# ctx-optimize

Measures where Claude Code tokens go: by session, seat (main chat or subagent) and model. Read-only on
`~/.claude`; standard library only (Python 3.8+).

```
ctx-optimize report [--root PATH] [--project NAME] [--session ID] [--day YYYY-MM-DD]
                    [--units] [--json] [--no-snapshot] [--snapshot-dir PATH] [--keep N]
```

- `--project` matches by substring of the project directory name (e.g. `agent-workbench`).
- Reads `~/.claude/projects/*/<session>.jsonl` and `<session>/subagents/agent-*.jsonl` with their `.meta.json`.
- Streamed messages repeat once per content block; each request is counted once, keyed on
  `(requestId, message.id)`, keeping the line with the largest `output_tokens`.
- Seat is decided by the file a line came from, not by `isSidechain`.
- Reports token volume only, never dollars. Context per request = input + cache read + cache write.
- Saves a counts-only snapshot to `$CTX_OPTIMIZE_HOME` or `~/.agent-workbench/usage/` (outside the repo, since
  transcripts hold code). Transcripts are deleted after `cleanupPeriodDays`, so snapshots outlive them.
- Several runs in the same second each keep their own snapshot (`usage-<stamp>-2.json`, ...); `--keep N` then keeps only
  the N newest. Unreadable or malformed lines are skipped and counted as `skipped_lines`.

Design: `docs/60-ctx-optimize-phase1-design.md`. Tests: `pytest plugins/ctx-optimize/tests`.

## Tokens per unit and review round (`report --units`)

Subagents are attributed to a Context Ledger unit from their task label ("Fix round: unit 01 findings"). The label
rarely names the round, so stages are inferred from spawn order per (session, unit): the first `unit-runner` is
`build`, each reviewer opens the next `review rN`, a runner after that is `fix rN`, a verifier is `verify`. Agents
without a ctx label (general-purpose, Explore and so on) are listed as `unattributed`; main-chat tokens cannot be
split per unit and are shown as one line. Nothing is dropped. Unit numbers repeat across plans, so units are keyed
`<session8>/<unit>`. See `--ledger` below.

With `--ledger PATH` (a project directory containing `.ctx`, or the `.ctx` directory itself) the journal is read and
each unit is keyed `<plan>/<unit>` when its first request falls inside that plan's journal window (plus 30 minutes of
grace). Units the journal cannot place keep the `<session8>/<unit>` key.

## Status line

`ctx-optimize statusline` reads Claude Code's status-line JSON on stdin and prints one line, for example
`Opus · ctx 34% · cache warm 4m · 2 agents`. It makes no model calls and prints an empty line on any error. A
plugin cannot ship a `statusLine` setting, so add it yourself to `~/.claude/settings.json`:

```json
{ "statusLine": { "type": "command", "command": "/path/to/agent-workbench/plugins/ctx-optimize/bin/ctx-optimize statusline", "refreshInterval": 10 } }
```

Running agents are subagent transcripts written in the last 30 seconds (the status JSON has no agent list).

## Agents pane (`/ctx-agents`)

A mod (Claude Code 2.1.287+): `/ctx-agents` opens a pane listing this session's subagents with status, type, model,
tokens and task label (cut to 60 characters). Nothing is drawn until you run it; it reads agent labels and token
counts only, never prompts or answers. (The built-in `/agents` is untouched, hence the different name.)

## Install

`claude plugin install ctx-optimize@agent-workbench`; tests: `pytest plugins/ctx-optimize/tests` and
`claude plugin test plugins/ctx-optimize`.
