# Claude Token Router

A portable Claude Code add-on that sends each task to the cheapest model that can do it,
shares what it learns between sessions, and shows what every agent is doing.

## Why

Claude Code runs the whole session on one model (here: Opus). Small edits, searches and
renames do not need it, and every message re-sends the full conversation, so cost grows
quickly. Built-in options (`opusplan`, `/model`) are manual. Existing open-source routers
are small projects that mostly warn instead of routing, and send ordinary coding to Opus.

## Goals

1. Route subagents to Haiku, Sonnet or Opus by task type, with no manual step.
2. Keep the main chat on one model so the prompt cache is not lost.
3. Share routing preferences and activity between sessions on the same PC.
4. Show every agent and subagent on request, never by default.
5. Install on any PC with one command, with no setup beyond a config file.

## Non-goals

- Switching the main chat's model on every prompt (see "Cache cost" below).
- Anything drawn on screen unless the user asks for it.
- Sending prompts or code to any outside service.

## Parts

| Part | What it does | Visible? |
|---|---|---|
| Router mod | Hooks `agent.spawn`, picks a model for each subagent, rewrites it before it starts | No |
| Shared store | Per-mod JSON file (`$.store`, up to 4 MB) kept between sessions: preferences, activity log | No |
| Dashboard | `/agents` command: lists running and finished agents with model, task and result | Only when asked |
| Config file | `~/.claude/token-router.json`: rules, default models, on/off | No |

## Routing rules

First match wins. Rules are plain keyword and pattern checks, so classifying costs nothing.

| Task type | Examples | Model |
|---|---|---|
| mechanical | rename, format, lint, git status, file lookup, version bump | haiku |
| implementation | write or edit code, add a test, build a component | sonnet |
| debugging | failing test, stack trace, regression, flaky behaviour | opus |
| architecture | design, trade-offs, multi-file analysis, migrations | opus |
| no match | anything unclear | leave as requested (never guess) |

Rules:
- A model the caller set explicitly always wins.
- An environment variable that pins the subagent model (`CLAUDE_CODE_SUBAGENT_MODEL`) outranks the mod; the mod logs the mismatch.
- A prompt that starts with `~` skips routing.
- Any error in the mod lets the call through unchanged.

## Cache cost (why the main chat is not switched)

Claude re-uses the cached conversation prefix cheaply. After a model change the whole prefix
is billed in full again. Switching the main model on every prompt can therefore cost more than
it saves. The main chat stays on one model; only subagents, which start with a short context,
are routed.

## Shared store layout

```
routes      last N routing decisions: time, task type, chosen model, session id
overrides   user corrections ("this kind of task should use sonnet")
agents      per agent: id, session id, model, short task label, status, result summary
```

Only a short label of the task is stored (at most 60 characters), never the full prompt.
A session reads the store at start and on a timer; there is no live push between sessions.

## Dashboard (`/agents`)

Registered as a slash command. Nothing is drawn until it is run. It lists, per agent: status,
model, task label, running time, and the one-line result. A later option is a local web page
that reads the same store, so nothing appears in the terminal at all.

Each session only sees its own agents directly, so cross-session rows come from the store.

## Install on any PC

Needs a Claude Code build that supports mods and hot reloading.

1. Publish the mod as a GitHub repository with `.claude-plugin/marketplace.json`.
2. On any PC, inside Claude Code:
   ```
   /plugin install token-router --marketplace <owner>/<repo>
   ```
3. Accept the one-time hot-reloading question when Claude Code asks it.
4. Optionally create `~/.claude/token-router.json` to change the rules.

Repository layout:

```
token-router/
  .claude-plugin/plugin.json
  .claude-plugin/marketplace.json
  hooks/hooks.json
  hooks/register.ts        hooks and slash command
  hooks/classify.ts        rules
  hooks/store.ts           shared store helpers
  hooks/register.test.ts   tests
  README.md
```

## Config file

```json
{
  "enabled": true,
  "default": { "mechanical": "haiku", "implementation": "sonnet", "debugging": "opus", "architecture": "opus" },
  "skipPrefix": "~",
  "logLimit": 200
}
```

## Build steps

1. Router mod with rules and tests (`claude plugin test`), logging each decision to the store.
2. Run it for a few days and read the log: does Haiku or Sonnet fail on tasks the rules sent there?
3. Tune the rules from the log.
4. Add `/agents`.
5. Remove any older router plugin once this one proves better.
6. Publish to GitHub and install on a second PC to confirm the install steps.

## Open questions to verify before relying on them

- Which hooks and fields a mod gets on the target Claude Code version (check with `claude plugin validate`).
- Whether a mod can switch the main model through the `/config` Model row. Not needed for this design.
- Whether a mod's rewrite of a subagent's model is honored when the user's settings force one model on every subagent.
- Whether the shared store file is safe when two sessions write at the same time (if not, one writer per session key).
- Whether the PCs this will run on have a Claude Code version with mod support.
- Public or private repository (a private one needs GitHub access on every PC).

## Safety

- Runs in the mod sandbox: no network, no shell, no access outside the plugin's own store.
- Reads prompts only to classify them and keeps no full prompt text.
- Never blocks or edits the user's own message.
