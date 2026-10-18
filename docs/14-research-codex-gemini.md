# Research: Codex CLI and Gemini CLI (optional agents)

Policy (decision D6): Claude is the core. Codex and Gemini are optional, run side by side, and nothing in the
Claude workflow depends on them.

## Codex CLI (verified from OpenAI docs, fetched 2026-10-17)

- **Install:** `curl -fsSL https://chatgpt.com/codex/install.sh | sh` (owner's screenshot of the official page;
  the same command updates). Also `brew install codex` and `npm install -g @openai/codex`.
- **Sign-in:** first `codex` run offers "Sign in with ChatGPT". `codex login` opens a browser flow; `--device-auth`
  uses a device code; `--with-api-key` reads a key from stdin; `codex login status`, `codex logout`.
- **Plans:** ChatGPT Plus, Pro, Team, Edu or Enterprise per the quickstart. Re-check before relying on it.
- **Non-interactive:** `codex exec` (alias `codex e`), `--json` for event lines, `-o <file>` for the last message,
  `--output-schema`, `--ephemeral`, `codex exec resume|fork`.
- **Review:** `codex review` with one target: `--uncommitted`, `--base <branch>`, `--commit <sha>`, or custom
  instructions as a prompt (`-` reads stdin).
- **Config:** `$CODEX_HOME/config.toml` (usually `~/.codex/config.toml`); profiles via `--profile`; `-c key=value`.
- **Sandbox and approvals:** `--sandbox read-only | workspace-write | danger-full-access`;
  `--ask-for-approval on-request | never`; `--yolo` bypasses everything (avoid).
- **Instruction file:** `AGENTS.md`. The page I read only links to its docs; details not read (Q8).
- **Models:** `--model`; `--oss` for a local provider (LM Studio, Ollama).

## Gemini CLI (verified from its GitHub page, fetched 2026-10-17)

- **Notice on that page:** Gemini CLI was **replaced by Antigravity CLI for unpaid-tier and Google One users on
  2026-06-18**. Whether an owner's Gemini subscription still works with Gemini CLI depends on the plan. Check the
  owner's plan before writing any setup step.
- Install: `npm install -g @google/gemini-cli` (also Homebrew, MacPorts, Anaconda). Apache-2.0.
- Auth: Google sign-in, `GEMINI_API_KEY`, or Vertex AI variables.
- Headless: `gemini -p "<prompt>"`, `--output-format json | stream-json`.
- Context file: `GEMINI.md`.
- The page states no free-tier limits.

## Using them with the workflow (v1 scope)

| Option | v1? | Why |
|---|---|---|
| Shared files: `.ctx/` plus `AGENTS.md` and `GEMINI.md` that point at the ledger rules | Yes | No coupling. Any agent can read the ledger. |
| Owner runs `codex review --base <branch>` by hand in a herdr pane and records findings with `ctx findings` | Yes (manual) | Uses the owner's Codex quota, not Claude's. |
| Ledger starts a Codex or Gemini review automatically | No | Needs headless output parsing and login state. Revisit after phase 3 (see 30). |

## To do

- Read the Codex AGENTS.md page and decide whether `AGENTS.md` can simply say "follow CLAUDE.md and `.ctx/`".
- Check whether `codex review` output can be turned into `ctx findings --add` lines mechanically.
- Confirm the owner's Gemini plan and whether Antigravity CLI replaces Gemini CLI for it.
