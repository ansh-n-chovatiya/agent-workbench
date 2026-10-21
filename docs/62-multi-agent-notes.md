# Using Codex and Gemini with ctx by hand

Status: notes, written 2026-10-21. Phase 6 of 30. Nothing here is automatic: per D6, automatic cross-agent calls are
built only after this manual flow has been used a few times and has earned it.

## The rule

ctx owns the ledger and the gate. Another agent is a worker or a second pair of eyes, never a second ledger. Anything
it finds goes into the same findings file, so the done-gate and the improvement log see it.

## Codex or Gemini as a second reviewer

1. Build the package as usual: `ctx review <unit>` (or `ctx review --pr` for the whole change). It prints the path.
2. Give the other agent the package file and say: read only, report findings as `severity | file:line | one line |
   why`, no edits. Run it in its own terminal; paste nothing secret.
3. Record each finding you accept: `ctx findings <unit> --add <severity> --summary "..." --where file:line`.
   Mark a finding you reject `disputed` with a ruling. Add `--confidence low` for a guess.
4. Fix, then `ctx review <unit> --round 2`. (The two-round cap only applies when `review.stop_rule` is on; it ships off.)

## Codex or Gemini as a builder

Hand it the unit file (`.ctx/plans/<plan>/units/<unit>.md`) and the project rules (`ctx rules`). Tell it to touch only
`owns`, not to commit, and to report the way the `unit-runner` does (criteria, verify output, failure modes). Then run
`ctx unit <unit> --status done` yourself: the gate decides, not the agent's report.

## Running several side by side

A terminal multiplexer that shows each pane's state (herdr, tmux) is enough: one pane for the orchestrating session,
one per agent. Keep each agent on a separate unit with disjoint `owns`; if two agents must touch one file it is one
unit. Use `ctx start --worktree` only when you want physical separation; it is off by default.

## The built flow (2026-10-21): `ctx review <unit> --with codex|gemini`

Optional and off by default. It runs only when all three are true: you typed `--with`, the tool is installed
(`codex` or `gemini` on the PATH), and you switched it on for this machine in `~/.claude/ctx/external.yaml`
(`codex:` with `enabled: true` indented under it). A project's `ctx.yaml` cannot switch it on. If something is missing
ctx says what (not installed, with the install command; or installed but off, with the line to add and a reminder that
the package contains code and goes to that provider), and the normal review carries on.

When it runs, the tool gets the package on stdin, read-only, in an empty temporary directory (never the repository),
with a timeout (`external.timeout_seconds`, 300). Its `FINDING | severity | file:line | summary | why` lines become
**low-confidence** findings from that source, so they cannot block a unit: confirm one with
`ctx findings <unit> --set ID --confidence high`, dispute the rest. The raw answer is kept next to the package.
`ctx doctor` shows the tools once any is switched on. Each run also writes an `external-review` record to the
improvement log, so after a few runs the digest can show whether the second reviewer earns its cost.

Builders (Codex or Gemini doing a unit's work) stay manual, as described above.
