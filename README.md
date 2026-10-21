# Agent Workbench

[![CI](https://github.com/ansh-n-chovatiya/agent-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/ansh-n-chovatiya/agent-workbench/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Claude Code plugins](https://img.shields.io/badge/Claude%20Code-plugin%20marketplace-5a4fcf)

A Claude Code plugin marketplace for **durable project context**, **measured token spend** and **production-grade demo
videos**. Three plugins, one repository, one install.

> **New here, or not a developer?** Read [GETTING-STARTED.md](GETTING-STARTED.md): what each plugin is for and how to use it, in plain language.

## At a glance

| Plugin | What it does | Version | Runtime | Maturity |
| --- | --- | --- | --- | --- |
| [**ctx**](plugins/ctx) (Context Ledger) | Keeps a project's goal, plan, acceptance criteria and review findings on disk, gates "done" on real checks, and reviews work from a separate seat. | 1.3.0 | Python 3.8+, standard library only | Stable |
| [**ctx-optimize**](plugins/ctx-optimize) | Shows where Claude Code tokens go (per session, unit and review round), a status line and an agents pane, plus an optional subagent router. | 0.2.0 | Python 3.8+ and a small TypeScript mod | Beta |
| [**showreel**](plugins/showreel) | Turns a web flow into a demo video: cursor motion, zoom, captions, optional local voice-over, a local editor and export. | 0.1.0 | Node 20.19+ or 22.12+, Playwright | Early |

The plugins are independent. Install any one.

## Why

- **Long chats lose the plot.** ctx writes the goal, the plan and the definition of done to a `.ctx/` folder, so a new
  session (or a compaction) resumes from facts rather than from memory.
- **"Done" is a claim until something checks it.** A done-gate runs your project's own commands and refuses to finish
  while they fail; a separate reviewer reads a diff-based package and reports findings that must be answered.
- **You cannot reduce what you do not measure.** ctx-optimize reads Claude Code's own transcripts and reports tokens by
  seat, model, unit and round, without sending anything anywhere.
- **Demo videos should not take an afternoon.** Showreel records a described flow and renders a finished video locally.

## Quick start

**Fastest: open this repository in Claude Code.** The committed `.claude/settings.json` offers the marketplace and
enables `ctx` and `ctx-optimize`; Claude Code asks once whether to trust the folder.

**Any machine, one command** (a dry run unless you add `--yes`; running it twice changes nothing):

```sh
scripts/bootstrap.sh          # shows what it would do
scripts/bootstrap.sh --yes    # adds the marketplace, installs ctx and ctx-optimize, adds the status line if none is set
```

**Step by step:**

```sh
claude plugin marketplace add ansh-n-chovatiya/agent-workbench
claude plugin install ctx@agent-workbench
claude plugin install ctx-optimize@agent-workbench   # optional
claude plugin install showreel@agent-workbench       # optional; first use runs `showreel setup` (about 300 MB, once)
```

Restart Claude Code, then try `/ctx:status`, or ask: *"Use the ledger to add a password-reset page."*
Showreel: *"Make a 30-second demo video of http://localhost:3000 showing sign-up."*

## What you get

### ctx: the Context Ledger

- **Three levels of ceremony.** L0 trace (journal only), L1 one tracked task with a done-gate, L2 a planned piece of work
  with a spec, units, waves and review. You pay for the structure a task deserves and no more.
- **Spec before plan.** `ctx spec` turns an intent into checkable criteria and refuses to plan while a blocking
  question is open or a failure-mode checklist item is unanswered.
- **A done-gate you cannot talk past.** Verify commands run on the machine, are accepted per machine (`ctx trust`), and
  a hand-edited `status: done` is not trusted by `ctx ci`.
- **Review from a package, not a transcript.** Snapshot diffs, scope violations, callers of changed signatures, a
  tests-by-criterion table, project rules and a churn summary; findings carry severity, confidence and a seal that makes
  hand edits visible.
- **A self-improvement loop.** A private, scrubbed log of ctx's own misses becomes a digest that a later session reads
  and acts on through the normal review flow. Nothing changes without review and your merge.
- **Optional second reviewers.** `ctx review <unit> --with codex|gemini`, only if the tool is installed and you switched
  it on for your machine (it sends the package, which contains code, to that provider).
- **Fails open.** Hooks never break a session; every failure is a message, not a stack trace.

Full guide: [plugins/ctx/README.md](plugins/ctx/README.md) and [plugins/ctx/docs/reference.md](plugins/ctx/docs/reference.md).

### ctx-optimize

`ctx-optimize report` (add `--units`, `--ledger`, `--json`), a status line, the `/ctx-agents` pane and an experimental router
that is off by default. Read-only over `~/.claude`; snapshots go to `~/.agent-workbench/usage`.
[plugins/ctx-optimize/README.md](plugins/ctx-optimize/README.md)

### showreel

Brief, storyboard, record, render and a local editor, with brand kits, vertical/square formats and optional local
voice-over. `showreel setup` installs what it needs once, into a folder that survives plugin updates.
[plugins/showreel/README.md](plugins/showreel/README.md)

## How it works

```
Claude Code ──hooks (SessionStart, PreToolUse, PostToolUse, Stop, ...)──► ctx ──► .ctx/ (in your project, git-ignored)
     │                                                                       ├─ specs, plans, units, findings, journal
     ├─ slash commands (/ctx:spec, /ctx:review, ...) and subagents          └─ runtime/ (snapshots, seals, review packages)
     │   (unit-runner, reviewer, re-reviewer, verifier)
     └─ transcripts (~/.claude/projects) ──read-only──► ctx-optimize ──► ~/.agent-workbench/usage
```

State lives in plain files you can read, diff and delete. There is no daemon and no network service.

## Requirements and support matrix

| | Requirement |
| --- | --- |
| Claude Code | A current release with plugin marketplace support |
| ctx, ctx-optimize | Python 3.8 or newer; git for scope and review features |
| showreel | Node 20.19+ (20.x) or 22.12+; Chromium via Playwright; optional local voice engine |
| Operating systems | macOS and Linux for everything; Windows is exercised by CI (ctx suite and the showreel smoke run) |

CI runs the ctx suite on Linux, macOS (and Windows on `main`) with Python 3.13, and on Linux with Python 3.8.

## Security and privacy

- **Local by default.** ctx and ctx-optimize make no network calls. Showreel downloads Playwright and Chromium during
  `setup` and, only if you ask for voice-over, a local voice model.
- **Your code goes nowhere unless you opt in.** Second reviewers (Codex, Gemini) are off, can only be switched on in your
  own `~/.claude/ctx/external.yaml` (never by a repository's committed config), run read-only in an empty directory, and
  their answers are scrubbed before they can reach a briefing.
- **The improvement log is scrubbed and private.** No code, paths, emails or tokens; stored outside the repository,
  mode 0600.
- **Commands are trusted per machine.** A verify command in a repository does not run until you accept it on that machine.
- **Supply chain.** GitHub Actions are pinned to full commit SHAs and bumped monthly by Dependabot; a personal-data scan
  runs in CI; ctx releases publish a wheel, an sdist, an SBOM and SHA256SUMS.
- **Reporting a vulnerability:** see [SECURITY.md](SECURITY.md) (GitHub private reporting) and
  [plugins/ctx/SECURITY.md](plugins/ctx/SECURITY.md).

## Repository layout

```
.claude-plugin/marketplace.json   the marketplace manifest
.claude/settings.json             offers the marketplace and enables ctx and ctx-optimize in this repository
plugins/ctx                       Context Ledger
plugins/ctx-optimize              token measurement, status line, agents pane
plugins/showreel                  demo videos
scripts/                          bootstrap, manifest checks, personal-data scan, root tests
docs/                             design notes, research and the build plan (docs/30-build-plan.md)
```

## Quality

Every change goes through a pull request with one required check, `ci gate`, which passes only when every job that ran
succeeded. CI runs only the jobs for the part of the repository that changed (a ctx change does not start the showreel
browser job, and the reverse). Lint (ruff), the full ctx suite, a coverage floor, a ledger self-check, manifest
validation and the personal-data scan run on every relevant pull request. The newest changes were also reviewed by
independent read-only reviewers; their findings and fixes are recorded in each plugin's `CHANGELOG.md`.

## Releases and updates

1. Bump the plugin manifest and its `CHANGELOG.md` (for ctx also `ctx.__version__`).
2. Tag `ctx-vX.Y.Z` or `showreel-vX.Y.Z`; the release workflow creates that plugin's GitHub Release.
3. Users run `claude plugin marketplace update agent-workbench`, then `claude plugin update <plugin>@agent-workbench`,
   then restart Claude Code.

## Documentation

| Where | What |
| --- | --- |
| [GETTING-STARTED.md](GETTING-STARTED.md) | Plain-language introduction and troubleshooting |
| [plugins/ctx/README.md](plugins/ctx/README.md) | Context Ledger guide |
| [plugins/ctx/docs/reference.md](plugins/ctx/docs/reference.md) | Every config key, command and file |
| [plugins/ctx-optimize/README.md](plugins/ctx-optimize/README.md) | Token measurement, status line, router |
| [plugins/showreel/README.md](plugins/showreel/README.md) | Demo video workflow and commands |
| [docs/00-README.md](docs/00-README.md) | Design notes and research index |
| [docs/30-build-plan.md](docs/30-build-plan.md) | Roadmap and status |
| [docs/62-multi-agent-notes.md](docs/62-multi-agent-notes.md) | Using Codex and Gemini with ctx |
| [AGENTS.md](AGENTS.md) | Rules for coding agents working in this repository |

## Known limitations

- ctx needs git for its scope and review features; without it you get the ledger and gate but not scope checks.
- Per-unit git worktrees exist (`ctx start --worktree`) but are opt-in and less polished than the shared-tree flow.
- ctx-optimize's router has not been verified against live Haiku runs and ships off.
- Showreel is early (0.1.0): expect rough edges outside the documented flow.

## Contributing, support and licence

Contributions are welcome through pull requests; see [CONTRIBUTING.md](CONTRIBUTING.md) for how to run the tests.
Questions and bugs: open a GitHub issue. Licensed under the [MIT License](LICENSE); third-party notices are in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
