# Glossary

| Term | Meaning here |
|---|---|
| **Context Ledger (ctx)** | The owner's Claude Code plugin that keeps specs, plans, decisions and review findings on disk in `.ctx/`. Python, standard library only. |
| **Unit** | One independently dispatchable piece of a ctx plan, with its own acceptance criteria. |
| **Plugin** | A directory Claude Code loads: commands, agents, skills, hooks, MCP servers. Has `.claude-plugin/plugin.json`. |
| **Mod** | A plugin whose `hooks/hooks.json` names a hooks module (`register(on, options)`). It can change Claude Code's behaviour and draw in its interface through the mods API (`$`). |
| **Marketplace** | A repository with `.claude-plugin/marketplace.json` listing installable plugins. |
| **Subagent** | A separate Claude conversation started by the main chat for one job. It has its own context and its own cache. |
| **Main chat / orchestrator** | The interactive session. Its context is re-sent on every request. |
| **Prompt cache** | Server-side reuse of an identical request prefix. Per model. Cache reads are billed at a lower rate than fresh input. |
| **Gateway** | A proxy between Claude Code and the API (`ANTHROPIC_BASE_URL`). Not the same as a mod. |
| **herdr** | An open-source terminal multiplexer that runs coding agents in panes and shows each one's state. |
| **Profile** | The owner's whole setup (plugins, settings, agent instruction files, tool config) kept in one repository and applied by one command. |
| **Failure-mode pass** | A required step in the spec stage that lists how a change can fail (empty input, errors, concurrency, permissions, old data) and turns each item into a criterion with a check. |
| **Project rules file** | A per-project file of invariants and past findings that the builder and reviewer both read. |
