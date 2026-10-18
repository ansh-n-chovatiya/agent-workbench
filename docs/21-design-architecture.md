# Design: architecture

Status: proposed. Follows decisions D1 to D14 in 20.

## Repositories (D3)

```
agent-workbench/                   public repo, also the marketplace; holds everything (D3)
  README.md                        what this is, one-command setup
  THIRD_PARTY_NOTICES.md           licence and source for anything adapted
  .claude-plugin/
    marketplace.json               lists: ctx, ctx-optimize, each skills-* plugin (all in this repo)
  plugins/
    ctx/                           Context Ledger, folded in with its history (was its own repo)
    ctx-optimize/                  token log, report, routing mod, /agents, status line
      .claude-plugin/plugin.json
      hooks/                       hooks.json + register.ts (mod), switch-guard hook
      py/                          usage reader, ledger join, report CLI (stdlib only)
      commands/  agents/           slash commands, if any are not drawn by the mod
      tests/                       *.test.ts (claude plugin test) and Python tests
    skills-<theme>/                one small plugin per skill group (video, review, docs, ...)
      .claude-plugin/plugin.json
      skills/<skill-name>/SKILL.md
  profile/
    bootstrap.sh                   idempotent, --dry-run, --yes
    settings.base.json             merged into user settings after a diff
    templates/                     AGENTS.md, GEMINI.md, project rules file stub
  docs/                            planning docs now, user docs later (00-README.md is the index)
  scripts/                         validate-all, test-all, release helpers

Retired after the move (history preserved inside this repo, README pointer, then archived):
  context-ledger  and  ai-skills
```

Because everything lives in one repo, Q5 (marketplace entries that point at another repo) no longer matters.
Migration risk: existing installs point at the old `context-ledger` marketplace path (the work profile too), so
after the move each profile must add the new marketplace and reinstall; the old repo's README says how.

## Skills library (growing)

The owner plans to keep adding skills. Rules for the workbench repo:

- **Group skills into small themed plugins** (for example `skills-video`, `skills-review`, `skills-docs`), not one
  large plugin. A plugin is the unit that can be enabled or disabled per project.
- **Enable per project, not globally.** Every enabled skill lists its name and description in each session's
  context, used or not. Use `defaultEnabled: false` on rarely used groups and list the wanted ones in the
  project's `.claude/settings.json`. Enabling plugin skills appends content and does not break the prompt cache
  (doc 16), so toggling between tasks is cheap.
- **Keep descriptions short and specific.** They are paid for in every session. Put long instructions in the
  skill body, which loads only when the skill runs.
- **Everything here is public (D3).** Before adding a skill, scan it for client or employer names, emails, home paths
  and keys; skills that need such details read them from the user's own config, not from the repo.
- **`ctx-optimize` reports skill cost**: the `/usage` attribution already shows tokens by skill; the report should
  list skills that are enabled but never invoked, so they can be turned off.
- Open check (Q14): measure how many tokens the enabled-skill listing adds to a session start, with
  `/context`.

## `ctx-optimize` components

| Component | Language | Job | Needs ledger? |
|---|---|---|---|
| **Usage reader** | Python stdlib | Walk `~/.claude/projects/*` main and `subagents/` transcripts; total tokens by session, agent, model, token type; read `meta.json` for role and task label. | No |
| **Ledger join** | Python stdlib | Attribute agent totals to unit, phase and review round using `.ctx/` journal, state and findings. Report by stage: spec, plan, build, review round 1/2, PR review. | Yes |
| **Report CLI** | Python stdlib | `ctx-optimize report [--session|--day|--unit]`; writes a saved snapshot before the 30-day cleanup removes transcripts. | Optional |
| **Router mod** | TypeScript | `agent.spawn`: set subagent model from the unit's `model:` field, else a small keyword fallback, else leave as requested. Log every decision to `$.store`. Warn on `_FORCE`. | Optional |
| **Switch guard** | settings hook | `PreModelSwitch`: warn that a switch rebuilds the cache while it is warm. | No |
| **`/agents` command** | TypeScript | Pane listing agents (live from `$.agent.list()`, past ones from `$.store`): status, model, task label, time, one-line result, tokens. Nothing drawn until run. | No |
| **Status line** | script | One line: model, context percent, cache warm or cold, running agents. Reads `current_usage` / `prompt_cache`. | No |

Data flow: transcripts and `.ctx/` files are the inputs. The reader writes a small JSON summary; the mod and the
status line read that summary and `$.store`. The mod never reads prompts; it stores task labels of at most 60
characters (seed rule kept).

## Routing rules (D7, D8)

1. A model the caller set explicitly wins.
2. A unit's own `model:` from the ledger is applied to its subagent.
3. If `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`, the mod cannot win; it logs the mismatch.
4. No ledger and no explicit model: keyword fallback (mechanical to Haiku, implementation to Sonnet, debugging and
   architecture to Opus); no match leaves the request unchanged.
5. A prompt starting with `~` skips routing. Any error lets the call through unchanged.
6. The main chat is never switched by the mod.

Cache-friendly extras to test, not assume: `subagentPromptCacheTtl: 1h` for review loops; `/clear` between units.

## Dashboard (D9)

Three levels: always one status line; `/agents` on request; no web page in v1. herdr's sidebar covers live pane
state, so we do not redraw it.

## Agent roles and fallbacks (D6)

A small config in the profile maps roles to agents, for example `implement: claude`, `review: claude`,
`second-opinion: codex` (optional). Every role falls back to Claude when the CLI is missing or not signed in.
Nothing in `ctx-optimize` or ctx calls Codex or Gemini in v1.

## Profile bootstrap (D14)

`profile/bootstrap.sh`, idempotent, with `--dry-run`:

1. Check for `claude`; offer to install Codex, herdr and Gemini only if chosen.
2. `claude plugin marketplace add <workbench>`; install `ctx` and `ctx-optimize`; list the result.
3. Merge base settings into `~/.claude/settings.json` (never overwrite; show a diff first).
4. Write `AGENTS.md` and `GEMINI.md` stubs that point at `.ctx/` and the project rules file.
5. Never store secrets; Codex and Gemini sign-in stay interactive.
6. For a project: `/ctx:init`, plus a committed `.claude/settings.json` listing the marketplace and plugins
   (applies after folder trust; verify prompt behaviour, Q4).

## Failure behaviour

Everything in `ctx-optimize` fails open: if the reader, the mod or the status line breaks, Claude Code and ctx
continue unchanged.
