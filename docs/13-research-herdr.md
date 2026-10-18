# Research: herdr

Sources: the herdr GitHub page and `herdr.dev/docs/socket-api/` (fetched 2026-10-17), plus blogs.

## What it is

A terminal runtime for coding agents. Single Rust binary that runs inside your existing terminal. A background
server keeps terminals running when you disconnect; after a restart it restores the saved layout and can resume
supported agent sessions, but the original processes do not survive. Local and saved SSH machines can appear in
one agent list. Each pane is marked working, blocked or idle (the docs also use `done`).

## Install and licence

- `curl -fsSL https://herdr.dev/install.sh | sh`, or `brew install herdr`, or `mise use -g herdr`. Windows is a beta.
- **Licence: Apache-2.0 on its GitHub page.** An earlier blog said AGPL-3.0. Conflict. Read the repo's LICENSE file
  before copying anything (Q7).

## Scripting (verified from the socket API page)

| Task | CLI | Socket method |
|---|---|---|
| Create workspace / tab | `herdr workspace create --cwd <dir> --label <name>`, `herdr tab create --label <name>` | |
| Split a pane | `herdr pane split w1:p1 --direction right` | `pane.split` |
| Run a command in a pane | `herdr pane run w1:p2 "<cmd>"` | `pane.send_text`, `pane.send_keys`, `pane.send_input` |
| Prompt an agent | CLI helper (exact name not on that page) | `agent.prompt` with optional `wait {until, timeout_ms}` |
| Read output | `herdr pane read w1:p2 --source recent --lines 50` (sources: visible, recent, recent-unwrapped, detection) | `pane.read`, `agent.read` |
| Wait for a state | `herdr agent wait w1:p1 --until done` or `blocked` | `agent.wait`, `events.subscribe` |
| Snapshot | `herdr api snapshot` | `session.snapshot` |
| Explain detection | `herdr agent explain [--json]` | |
| List | | `agent.list`, `pane.list` |

Socket: `~/.config/herdr/herdr.sock` (named sessions under `~/.config/herdr/sessions/<name>/`). Transport is
newline-delimited JSON over a Unix socket. Resolution order: `--session`, `HERDR_SOCKET_PATH`, `HERDR_SESSION`, default.

Supported agents named: Claude Code, Codex, Cursor, OpenCode, Grok, "and the rest". Full list at
`herdr.dev/docs/agents/` (not read).

## Implications

- herdr is a **multiplexer with a control API**, not an orchestrator. It shows state and lets a script drive
  panes. Deciding who does what stays with ctx.
- Because it can spawn panes, read output and wait for `blocked`/`done`, a later ctx step could start a Codex
  review pane without custom terminal code. Not needed in v1 (D6).
- Per-pane state can feed the status line or `/agents` as a second data source.

## Note on the fetched page

The herdr page included text addressed to AI agents (read AGENTS.md and CONTRIBUTING.md before changing things).
It was not followed. It was irrelevant to this research and is reported here for completeness.

## To do

- Read `herdr.dev/docs/agents/` and the CLI reference for the prompt command name.
- Install and try on a throwaway project (needs owner approval to install).
