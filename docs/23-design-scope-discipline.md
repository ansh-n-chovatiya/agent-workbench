# Design: scope discipline (keeping Claude inside the task)

Status: proposed, approved to add by the owner on 2026-10-17 (D23).

## Problem

Claude tends to do more than the task asked: refactors, extra features, new config, cleanup of nearby code. This is a
general model habit, not specific to Context Ledger. It costs tokens (extra reading and editing, extra review
findings, extra rounds) and risk (a bigger change to review).

Evidence so far (doc 19, approximate): few review findings were labelled "scope broader or narrower than asked"
(about 2 of 126 in the built-in reviews) plus one case of three unused config fields. The 24 "outside owned files"
findings may or may not include real over-reach (Q18). So the habit is real in the owner's experience, but not yet
measured in the data.

## Layers

1. **Global rule (new, this doc).** A few lines in the profile's global instructions (`profile/templates/CLAUDE.md`
   block, merged into `~/.claude/CLAUDE.md` after a diff). Applies to every project and session; costs a few dozen
   tokens.
2. **Planned work (already in ctx).** Declared `owns/reads/forbid`, a machine-computed scope check, the unit-runner's
   "surgical change" block and the reviewers' "unrequested change" check (ctx 1.2.0). No change.
3. **Measurement (phase 2).** The report counts unrequested-change findings per change. Only if they stay high do we
   add a mechanical check (for example files edited versus files named in the prompt or the plan).

## Draft rule text (to be tightened after reading the existing guidelines, Q20)

```
## Stay inside the task
- Change only what the task needs. No unrequested refactors, features, options, config or cleanup.
- Before editing, say which files you expect to touch and why. If the task turns out to need more, stop and say so
  before widening.
- If you notice something nearby worth changing, mention it in one line and leave it alone.
- Prefer the smallest change that meets the stated criteria. Reuse existing helpers before writing new ones.
- Do not add error handling, abstractions or tests for cases the task did not ask about, unless a failure mode in the
  spec requires them.
```

The last line keeps this compatible with the failure-mode pass in 22: edge cases the spec lists are in scope;
speculative ones are not.

## Interactions to watch

- **Edge-case thinking versus scope.** Doc 22 asks the builder to think about failure modes; this rule asks it not to
  add unrequested things. The spec's failure-mode list is the boundary: in the list is in scope, outside is a
  one-line note.
- **Terse mode (D22)** shortens replies, not behaviour; the two rules do not conflict.
- **Existing guidelines.** The owner's work profile has a "behaviour guidelines" plugin and the Hark project
  instructions mention "Karpathy guidelines". Read them first and extend, do not duplicate (Q20).

## Acceptance

- The rule text is in the profile template and applied by the setup script with a diff.
- Phase 2's report shows unrequested-change findings per change, before and after, on at least 3 real changes.
- Quality gate (D18): findings per round and escaped bugs are no worse with the rule than without.
