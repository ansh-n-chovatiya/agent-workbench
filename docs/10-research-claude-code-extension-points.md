# Research: Claude Code extension points

Sources: code.claude.com docs (hooks, plugins reference, mods reference, sub-agents, settings, costs), fetched
2026-10-17. Version notes in the docs refer to Claude Code v2.1.29x to v2.1.30x. **Check the installed version
before building** (`claude --version`).

## 1. Mods can do what the token-router spec needs (verified)

A mod is a plugin with `hooks/hooks.json` containing `modules: ["./register.ts"]`. The module exports
`register(on, options)`. TypeScript files are accepted.

| Need | Mods API | Notes |
|---|---|---|
| Choose a subagent's model | `on('agent.spawn', ...)` then `next({ ...e, model })`, or `{ deny: reason }` | Also fires for agent-team teammates (`e.isTeammate`). Does **not** re-run when a subagent is resumed with `SendMessage`. |
| Withhold a subagent type | `agent.offer` returns `{ isOffered: false }` | |
| Watch each model request | `turn.step` (can set `model` or `effort`), `turn.complete`, `session.measure` | `session.measure` fires after each turn. |
| Read usage | `$.session.usage()` returns `{ startedAt, context, rateLimits, cost }`; `context` has `tokens`, `window`, `percent` | Main session only, as documented. |
| List agents | `$.agent.list()` with `status`: pending, running, waiting, idle, completed, failed, killed | This session's subagents only. |
| Share state across sessions | `$.store.get/set/delete/keys` | One key-value store shared by every session on the machine. 4 MiB of JSON total. `$.fs.write` is not atomic, so use `$.store` for shared data. |
| Draw UI on request | `$.ui.open` (pane), `$.ui.toast`, `$.ui.status`; render sites `Pane`, `AbovePrompt` | Terminal and Desktop. VS Code ignores some props. |
| Add a slash command | `$.command.register` | |
| Guard a model switch | Settings hook `PreModelSwitch` with decision control | |
| Run code | `$.process.run` (30 s default, 10 min max), `$.http.fetch` (4 MiB, 30 s), `$.fs`, `$.mcp` | What the sandbox allows beyond this: **unverified**. The seed spec says "no network, no shell"; the API lists `$.http` and `$.process`. Test with `claude plugin validate`. |

Limits: a hook gets 10 s of its own execution time per event. `$.store` is 4 MiB. Tests run with
`claude plugin test` (5 s each by default). `claude plugin validate <dir>` lists the events and API calls a mod uses.

## 2. Subagent model precedence changed (verified; the seed spec is out of date)

Since v2.1.251 the order is:

1. The per-invocation `model` parameter on the Agent tool call. **A mod's `agent.spawn` hook can replace it.**
2. The subagent's `model` frontmatter (`inherit` means the main model).
3. `CLAUDE_CODE_SUBAGENT_MODEL`.
4. The main conversation's model.

`CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` (v2.1.257+) makes the env var win over everything, including the mod's
choice. The seed spec said the env var outranks the mod; that is only true with `_FORCE=1`. The mod should log a
mismatch when it detects the force flag.

A family alias such as `opus` in the parameter or frontmatter resolves to the main conversation's exact model
when that model is in the same family.

## 3. Settings hooks (verified)

Events include `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, `SessionEnd`,
`PreCompact`, `PreModelSwitch`, `PostModelSwitch`, `UserPromptSubmit`, `TaskCreated`, `TaskCompleted`.
Common input fields: `session_id`, `transcript_path`, `cwd`, `permission_mode`, `effort`, and `agent_id` /
`agent_type` for subagent hooks. `PreToolUse` can return `updatedInput`, but the docs do **not** say that this can
change the Agent tool's `model`. Use the mod's `agent.spawn` for that. The `SubagentStop` payload was truncated in
what I read; check it in the full page before relying on `last_assistant_message`.

## 4. Plugin manifest facts that affect the design (verified)

- `dependencies`: `"name"`, `"name@marketplace"` or `{ name, marketplace, version }`. A plugin can require another.
- `settings` in `plugin.json`: only `agent` and `subagentStatusLine` take effect.
- `userConfig`: values prompted at enable time; `sensitive` ones go to the credential store.
- `bin/`: executables placed on the Bash tool's PATH while the plugin is enabled.
- `skills`, `agents`, `commands`, `hooks`, `mcpServers`, `workflows` (workflow scripts) are all plugin components.
- `${CLAUDE_PLUGIN_ROOT}` changes on update; keep state in `${CLAUDE_PLUGIN_DATA}` (`~/.claude/plugins/data/<id>/`).
- **Plugin names starting with `claude-` or `anthropic-` are rejected by `claude plugin validate`.** The seed's
  working title "Claude Token Router" must not be used as the plugin name. Use `token-router` or `ctx-optimize`.
- `defaultEnabled` decides whether a plugin starts enabled when the user has not set it.

## 5. Settings and auto-install (verified in part)

Precedence, highest first: managed, command line, project local (`.claude/settings.local.json`), shared project
(`.claude/settings.json`), user (`~/.claude/settings.json`). `enabledPlugins` and `extraKnownMarketplaces` in the
shared project file apply **only after the user trusts the folder**. Exact prompt behaviour for teammates:
read `/docs/en/settings` section on plugin auto-install before relying on it (open question Q4).

## 6. Built-in visibility (verified)

- `/usage` shows a Session block (tokens by model, a `Prompt cache (main)` line) and, on subscriptions, an
  attribution breakdown by skill, subagent, plugin and MCP server. It is local and approximate.
- A status line script can read `current_usage` (`cache_creation_input_tokens`, `cache_read_input_tokens`) and a
  `prompt_cache` object. `subagentStatusLine` exists as a setting.
- `/context` shows what fills the window. `/insights` writes an HTML report of how sessions went.

## What this changes

- The seed's router design is feasible as written, but the env-var rule and the plugin name need fixing.
- `$.store` solves the shared-store question (concurrent writers) that the seed listed as open.
- A status line and `/agents` pane are both supported render sites, so the dashboard needs no external process.

## 7. Phase-0 spike results (2026-10-17, Claude Code 2.1.302)

Verified from the mods docs (create, events) and the type file `mods/types/claude-code.d.ts` (first 100k characters of
517k read, so absences below are "not seen", not "does not exist").

- **Version.** Mods need v2.1.287 or later; installed is 2.1.302.
- **`agent.spawn` input** fields: `description`, `subagentType`, `model`, `background`, `cwd` and **`prompt`** are
  rewritable; `tool_use_id`, `provider`, `parentModel`, `parentAgentId`, `permissionMode`, `fork`, `name` are
  pinned. "A rewrite [of `prompt`] is the prompt the subagent runs with." Result: `{ model, agentId }` or
  `{ deny }`. So a mod **can prepend a terse-report instruction to every subagent's task prompt** (D22) and set its
  model. It does not touch the subagent's system prompt (that is only settable for agent types the mod registers
  itself with `$.agent.register`, `AgentSpec.prompt`).
- **Main-thread instruction.** `prompt.submit` can add `context` that only Claude reads; `prompt.section` and
  `prompt.compose` can change the system prompt, but text that changes between requests invalidates the cache.
  Use static text only. Whether `prompt.section` reaches subagents: not seen.
- **Live usage.** `turn.step` results carry `usage` (`input_tokens`, `output_tokens`, `cache_read_input_tokens`,
  `cache_creation_input_tokens`, `model`) and `e.agentId` for a subagent's request; `turn.complete` has `e.usage`,
  `e.durationMs` and `agentId` for subagent turns (per the events guide; the type file did not show them).
  So the mod can log tokens per agent live, in addition to the transcript reader.
- **Testing without a session.** `claude plugin test` fires events against a mod (tests in `*.test.ts`, import from
  `claude-code/testing`); `claude plugin validate <dir>` lists the hooks and API calls found by static analysis and
  rejects bad names. Both run from the shell with no sign-in or network.
- **Static-analysis rules to follow:** write `$.namespace.method(...)` in full, string-literal event names, ES
  modules, relative imports only, one `on` per event per matcher.
- **Type files** for the exact build are written to `.claude-plugin/types/` when a mod loads from `--plugin-dir` in an
  **interactive** session. Not yet generated here.
- **Failure behaviour.** A hook that throws or times out is skipped and the event continues; add `.catch` only for
  guards that must fail closed. Our routing and terse hooks fail open (D14 design).
- **ctx always-on cost:** `claude plugin details ctx` reports about **845 tokens** added to every session (25 skills,
  4 agents, 7 hooks that cost no model context). Negligible against about 480k tokens per request in long sessions.

Open after this spike: sandbox limits of `$.process.run` and `$.http.fetch` (Q3, run `claude plugin validate` on a
stub), full `SubagentStop` payload (Q6), marketplace entry for an external repo (Q5), auto-install prompt (Q4).
