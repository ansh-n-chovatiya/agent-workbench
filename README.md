# Agent Workbench

[![CI](https://github.com/ansh-n-chovatiya/agent-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/ansh-n-chovatiya/agent-workbench/actions/workflows/ci.yml)

A monorepo and Claude Code marketplace of plugins for durable project context
and demo video production. Planning and design documents live in
[docs/00-README.md](docs/00-README.md).

One command sets up a machine (it shows what it would do and changes nothing until you add `--yes`; running it
again changes nothing):

```sh
scripts/bootstrap.sh          # dry run
scripts/bootstrap.sh --yes    # add the marketplace, install ctx and ctx-optimize, add the status line if none is set
```

Or step by step. Add the marketplace first:

```sh
claude plugin marketplace add ansh-n-chovatiya/agent-workbench
```

| Plugin | Purpose | Install |
| --- | --- | --- |
| [ctx](plugins/ctx) | Context Ledger: durable project state, stdlib Python | `claude plugin install ctx@agent-workbench` |
| [ctx-optimize](plugins/ctx-optimize) | Token usage report per session, unit and review round; status line; agents pane | `claude plugin install ctx-optimize@agent-workbench` |
| [skills-demo](plugins/skills-demo) | Superseded by Showreel; to be removed after demo approval | `claude plugin install skills-demo@agent-workbench` |
| [showreel](plugins/showreel) | Web-flow demo videos with a local editor and export | `claude plugin install showreel@agent-workbench` |

Release and update process (bump the plugin manifest and CHANGELOG first):

1. Tag `ctx-vX.Y.Z`, `skills-demo-vX.Y.Z` or `showreel-vX.Y.Z` to create that plugin's GitHub Release.
2. Run `claude plugin marketplace update agent-workbench`.
3. Run `claude plugin update <plugin>@agent-workbench`.
4. Restart Claude Code.

See [CONTRIBUTING.md](CONTRIBUTING.md) for tests and [SECURITY.md](SECURITY.md) for reporting vulnerabilities.
