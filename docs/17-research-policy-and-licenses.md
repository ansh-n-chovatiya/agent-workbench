# Research: policy and licences

## Gateways and subscriptions (verified, Anthropic docs `llm-gateway`, 2026-10-17)

- Anthropic supports routing Claude Code through a gateway but **does not support routing Claude Code to
  non-Claude models** through any gateway, and does not audit third-party gateways.
- While a gateway credential variable or `apiKeyHelper` is active, requests carry that credential **instead of the
  claude.ai subscription login**; subscription usage limits do not apply and traffic is billed per token to the
  credential owner.
- Setting only `ANTHROPIC_BASE_URL` keeps the saved subscription login as the active credential, and the gateway
  must forward the OAuth capability in `anthropic-beta`.
- Caching through a gateway depends on the gateway forwarding `cache_control` markers and the `anthropic-beta`
  header; a gateway that strips them makes the whole conversation bill as uncached on every turn.
- The 1-hour cache lifetime is not available through the Claude apps gateway.

Not read: Anthropic's usage policy and consumer or commercial terms on proxying subscription traffic (Q9).

## Licences

| Item | Licence | Source | Implication |
|---|---|---|---|
| herdr | Apache-2.0 (GitHub page); one blog says AGPL-3.0 | conflict | Verify LICENSE in the repo before copying code. Using the binary is fine either way. |
| Codex CLI | not read | | Check before bundling anything. We only call it. |
| Gemini CLI | Apache-2.0 | GitHub page | Same. |
| ccusage | MIT | GitHub page | May copy with notice; keep a notices file. |
| Claude Code Usage Monitor | MIT | GitHub page | Same. |
| claude-usage-exporter | not checked | | Do not copy until checked. |
| Context Ledger | owner's (public repo) | | Check which licence file it ships before publishing a combined repo. |

Rule: anything adapted from another project goes in a `THIRD_PARTY_NOTICES.md` with licence and source.

## Plugin naming

`claude plugin validate` rejects names that start with `claude-`, `anthropic-`, `anthropics-` or `cc-plugin-`, and
names such as `claude`, `anthropic`, `claude-code`. Pick names without these.
