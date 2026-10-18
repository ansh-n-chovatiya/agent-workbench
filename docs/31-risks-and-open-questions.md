# Risks and open questions

A living list. Each open question has a way to close it.

## Open questions

| ID | Question | Closed by |
|---|---|---|
| Q1 | Which bug categories keep escaping the builder? | Owner supplies past review outputs; phase 0 S6 |
| Q2 | Does `agent.spawn` rewrite apply when the owner's settings or env force a model? | Spike S1 (docs say `_FORCE=1` wins) |
| Q3 | What can a mod's sandbox actually do (`$.process.run`, `$.http.fetch`)? | `claude plugin validate` output on a stub |
| Q4 | Exact auto-install prompt behaviour for `enabledPlugins` / `extraKnownMarketplaces` | Spike S4 |
| Q5 | Now narrower: does ctx work unchanged when it lives in `plugins/ctx` instead of the repo root (marketplace `source` path, `bin/ctx`, `pyproject.toml`, tests)? | Spike S3 |
| Q6 | Full `SubagentStop` payload and what a mod gets on subagent finish | Spike S2 |
| Q7 | herdr licence (Apache-2.0 vs AGPL-3.0 conflict) | Read the LICENSE file in the repo |
| Q8 | Does Codex read `AGENTS.md` details we need (nesting, size limit)? | Read the Codex AGENTS.md page |
| Q9 | Anthropic's terms on proxying subscription traffic | Read the usage policy; only matters if a gateway is ever reconsidered |
| Q10 | What exactly does the built-in `/code-review` do? | Owner pastes it, or approves a run on a throwaway diff |
| Q11 | Why did a ctx fix round run on Opus when `models.runner` is sonnet? | Read the unit's `model:` and escalation settings (S5) |
| Q12 | Which Gemini tool does the owner's plan use after 2026-06-18? | Owner's plan |
| Q13 | Which licence does Context Ledger ship, for a combined marketplace? | Read its LICENSE file |
| Q15 | What do the installed model-router plugin (2.1.0) and the 3 local mods already do? | Read their source on the work profile (or share a summary) |
| Q16 | Are any managed-only settings (`allowManagedModsOnly`, `allowManagedHooksOnly`, `disableAllHooks`) active on the work machine? | `/status` there |
| Q17 | Why do unit-runners run on Opus when the config names Sonnet, and do general-purpose and Explore subagents inherit Opus? | Read unit `model:` fields and `ctx` dispatch code (S5); `agent.spawn` log |
| Q18 | What exactly were the 24 disputed "outside the unit's owned files" criticals (which paths, which units, same wave or not, machine check or reviewer wording)? | Anonymised sample from the work profile (prompt given to owner) |
| Q19 | **Partly answered (doc 10 section 7):** a mod can rewrite the `prompt` of any subagent at `agent.spawn`, so it can add the terse-report rule to Explore and general-purpose too. Still open: whether the main-thread standard level is best set by `prompt.section`, `prompt.submit` context or an output style; whether ctx's `04-agent-prompts` unit already shortens replies | Read the rest of the type file; read ctx agent prompts |
| Q20 | What do the "behaviour guidelines" plugin (work profile) and the "Karpathy guidelines" mentioned in the Hark project already say about scope, so the new rule extends instead of duplicating? | Owner shares the text or a summary; not installed in this profile |
| Q21 | Which licence should the merged repo carry, and does the owner confirm MIT for `ai-skills`? Which licence does `@playwright/test` ship? | Owner confirms; read the package's licence field |
| Q14 | How many tokens does the enabled-skill listing add at session start, and which enabled skills are never used? | `/context` in a fresh session; `/usage` attribution; the phase 2 report |

## Risks

| Risk | Effect | Mitigation |
|---|---|---|
| H1 is false (main context is not the main cost) | Routing work matters more than expected | Phase 1 decides; plan changes before phase 3 |
| Mods API is new and changes (types are version-specific) | Mod breaks on upgrade | Pin tested version in docs; `claude plugin test` in CI; mod fails open |
| Extra spec work does not cut rounds | More tokens, no gain | A/B in phase 4; stop and re-read findings |
| Failure-mode list becomes box-ticking | Noise | Only applicable items; prune from data |
| Transcript format changes | Reader breaks | Version-tolerant parsing; reader fails open; tests on saved samples |
| Transcripts deleted after 30 days | Lost history | Saved report snapshots |
| One measured session is unrepresentative | Wrong conclusions | Phase 1 covers all sessions across three projects |
| Unit `model:` field semantics differ from assumption | Routing design changes | Spike S5 |
| Personal or work-derived data in a public repo (docs, `.ctx/` journals, test fixtures, transcripts) | Leak | Everything is public (D3): scan before every push for emails, home paths, client or employer names; never commit `.ctx/` (already ignored in ctx's `.gitignore`); doc 19 is anonymised but the owner reviews it before publishing |
| Third-party code copied without notice | Licence breach | `THIRD_PARTY_NOTICES.md`; check licence first |
| Over-building | Never finished | Phases end with numbers; non-goals listed in 30 |
