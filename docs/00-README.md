# Agent Workbench: planning docs

Status date: 2026-10-17. **No code exists yet.** These docs hold the research and decisions that must be
settled before any code is written.

## Reading order

| # | File | Kind | Status |
|---|---|---|---|
| 01 | [vision-and-goals](01-vision-and-goals.md) | Foundation | draft |
| 02 | [glossary](02-glossary.md) | Foundation | draft |
| 10 | [research-claude-code-extension-points](10-research-claude-code-extension-points.md) | Research | researched (docs read 2026-10-17) |
| 11 | [research-usage-data](11-research-usage-data.md) | Research | researched and measured locally |
| 12 | [research-existing-tools](12-research-existing-tools.md) | Research | partly researched |
| 13 | [research-herdr](13-research-herdr.md) | Research | researched |
| 14 | [research-codex-gemini](14-research-codex-gemini.md) | Research | partly researched |
| 15 | [research-context-ledger-audit](15-research-context-ledger-audit.md) | Research | partly researched |
| 16 | [research-token-economics](16-research-token-economics.md) | Research | researched; one sample measured |
| 17 | [research-policy-and-licenses](17-research-policy-and-licenses.md) | Research | partly researched |
| 18 | [research-review-skills](18-research-review-skills.md) | Research | partly researched |
| 19 | [research-work-profile-facts](19-research-work-profile-facts.md) | Research | measured by owner (anonymised, approximate) |
| 20 | [decisions](20-decisions.md) | Decisions | proposed, awaiting owner review |
| 21 | [design-architecture](21-design-architecture.md) | Design | proposed |
| 22 | [design-review-system](22-design-review-system.md) | Design | proposed |
| 23 | [design-scope-discipline](23-design-scope-discipline.md) | Design | proposed |
| 30 | [build-plan](30-build-plan.md) | Plan | proposed |
| 31 | [risks-and-open-questions](31-risks-and-open-questions.md) | Plan | living list |

`_seed-claude-token-router.md` is the owner's original spec. It is kept for reference; where it disagrees with the
research (see 10 and 20), the research wins.

## Conventions

- **Verified** = read in official docs or measured on this Mac on 2026-10-17. **Source** = a secondary page.
  **Assumed** = not checked. Every fact in the research files carries one of these.
- Decisions link to the research behind them. A decision with no research behind it is marked as a guess.
- Nothing personal (names, client names, keys) goes in these docs.

## When you decide to start (checklist, status 2026-10-17)

No code exists yet. All design decisions are made (see 20). Before or when starting:

**Needs your explicit yes at that moment**
- [ ] Create the public GitHub repo `agent-workbench` and fold in `context-ledger` and `ai-skills` (phase 0.9). Public and
      permanent, so confirm just before.
- [ ] Confirm an MIT licence for `ai-skills` (it has none today, Q21).

**Information that unblocks later phases (gather any time; none is needed to begin phase 0.9 or 1)**
- [ ] Q18: anonymised sample of the 24 "outside owned files" findings (prompt was given in the conversation; paste it
      again from the history of this session or ask for it).
- [ ] Q15: source or summary of the model-router plugin and the 3 local mods in the work profile.
- [ ] Q16: `/status` from the work machine (are mods allowed?).
- [ ] Q10: text of the built-in `/code-review`, or permission to run it on a throwaway diff.
- [ ] Q20: text or summary of the "behaviour guidelines" plugin and the Karpathy guidelines.
- [ ] Q12: which of Codex and Gemini you have (low priority; multi-agent is out of scope for now).

**Order of work** (details in 30): phase 0.9 repo and move, then phase 1 usage reader and report, then Q17 (why
unit-runners ran on Opus), then the quality-gated phases. Re-review the plan after phase 1.

**Keep this folder safe:** these docs are not under version control yet. Phase 0.9 puts them in the new repo; until
then, back the folder up if you want to keep it.
