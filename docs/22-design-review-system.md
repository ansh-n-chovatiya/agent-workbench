# Design: review system inside Context Ledger

Status: proposed. Goal (D12): a ctx change should reach "mergeable" in **two review rounds or fewer**, because
edge cases are handled while building, not found afterwards.

## Diagnosis (from 15 and 18)

1. Reviews run after the code exists.
2. The ctx reviewer sees only the diff package.
3. Specs list what to build, not how it can fail; no failure-mode step exists (verified by search).
4. Findings are not turned into rules, so the same bug types recur.

## Pipeline

```
spec ─► failure-mode pass ─► plan ─► test-first build ─► auto-checks ─► review R1 ─► fix ─► review R2 ─► PR-level pass
        (new, required)      units    caller list +       (free)        caller-aware   (fix-only)        once, whole change
                             carry    tests for each                    + rules file
                             risk     failure mode
                             tags
                  ▲                                                                              │
                  └───────── confirmed findings are promoted into the project rules file ◄───────┘
```

## Stage changes

### 1. Failure-mode pass (spec stage)
`/ctx:spec` gains a required `## Failure modes` section. Starting checklist (replace it with the categories found
in your real review history, doc 31 Q1): input boundaries (empty, huge, malformed); error and timeout paths;
permissions and ownership checks; concurrency and repeated calls; existing data and backward compatibility; callers
of anything changed; async UI states (loading, empty, error, success); cleanup of resources. Each item either becomes
an acceptance criterion with a check or is marked "not applicable" with one line why. Planning is blocked while an
item is neither (same mechanism as unanswered questions in `/ctx:ask`).

### 2. Plan stage
Units carry the failure modes that apply to them and a **risk tag** (touches shared interface, auth, data, UI). The
tag picks the review tier (a risky unit is never reviewed on the cheapest tier).

### 3. Build stage (`unit-runner`)
Before editing: list every caller of each symbol it will change, and write a failing test for each failure mode
that applies. After editing: run `verify` and the project's lint and type checks. It reports which failure modes
are covered by which test.

### 4. Auto-checks (zero tokens)
Lint, types and tests run before any model reviews. The package-builder also computes, in code:
- a **caller list** for changed symbols (language-aware where cheap, word-match otherwise),
- the existing scope-violation and churn sections,
- a **test-to-failure-mode table** (which criterion has which test, which has none).

### 5. Review round 1 (`reviewer`)
Still read-only and a fresh seat, but now receives the caller list and the project rules file, and may read the
named callers. It must account for every failure mode in the spec. Findings carry a **confidence score**; low
confidence goes to a separate "ask the builder" list instead of blocking (borrowed from the official plugin).
A written false-positive list (pre-existing code, linter-catchable, unmodified lines) is part of its prompt.

### 6. Fix and round 2
`re-reviewer` checks only the fix package and the open findings. **Round cap becomes two**; a serious finding (security, data scope, data loss) earns more rounds, but there is a
**hard ceiling of four rounds in total**, after which the item goes to the owner as an explicit decision. Anything
else still open is parked with a ruling (existing mechanism) or escalated.

### 7. PR-level pass (once, before merge)
A generic version of the senior's command: verify claims against the real code, trace callers across the whole
change, check scope narrower and broader than the spec, check project rules (including design-system rules when a
frontend project declares them), report in plain language with an example. Read-only. Runs once on the merged
diff, not per unit.

### 8. Learning loop
`ctx rules --add` records a confirmed finding as a one-line rule in `.ctx/rules.md` (project invariants). The
spec stage and the builder read it. Rules are reviewed by the owner; a finding becomes a rule only when it was
confirmed and is general. **The file has a size cap** (for example 40 lines or about 1,500 tokens, since it is read by
every spec and build session); when full, the owner merges or retires rules. Without a cap the learning loop would
grow the always-read context it is meant to shrink.

## What must stay generic
Project rules live in a file, not in ctx's code. No repo, product or framework names in the logic (the owner's
existing principle for Hark applies here too). Examples may name things.

## Measurements the ledger must keep
Findings per round and per category; rounds to approval; failure modes without a test at round 1; tokens per stage
(from 21). Without these the target cannot be judged.

## Risks specific to this design
- More up-front work costs tokens; it pays only if rounds fall. Test on 3 to 5 real changes (phase 4).
- A long failure-mode list can become box-ticking. Limit to items that apply, and prune from data.
- Caller lists by word-match are noisy in dynamic languages; accept noise, cap length.
