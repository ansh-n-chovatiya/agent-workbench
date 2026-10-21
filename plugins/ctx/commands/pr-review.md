---
description: One read-only review of a whole change before merge
allowed-tools: Bash, Read, Task
argument-hint: [base-ref, default origin/main]
---
!`"${CLAUDE_PLUGIN_ROOT}/bin/ctx" review --pr "$ARGUMENTS" || true`

The line above names a **PR-level review package**: the whole change against its base, plus the project rules.
Do not read it here; that is the reviewer's context.

Dispatch the `reviewer` subagent on the model named by `models.reviewer` (`ctx doctor` shows it) with the path and
this addition to its prompt: *this is the merged change, not one unit. Verify the claims the change makes against
the real code, trace callers across the whole change, check the scope against what was asked (narrower and
broader), check every project rule, and report in plain language with one concrete example per finding. Read
only.* It runs once, before merge. Record anything confirmed with `ctx findings`, and offer a general, confirmed
lesson to the owner as a `ctx rules --add` line (never add it yourself).
