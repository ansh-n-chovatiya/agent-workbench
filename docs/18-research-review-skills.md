# Research: the review skills

Three review styles are in use or on disk. The text of the built-in `/code-review` skill (effort levels, `--fix`,
`--comment`) is **not on disk and was not read**; running it would start a real review. The owner can paste it
(Q10). What follows compares the other three.

## 1. The senior developer's PR command (owner pasted it)

Manager-mode PR review. Method:
1. Resolve ticket and PR(s); read ticket comments because the real context is often there.
2. **Do not trust the PR description.** Verify each claim against the real code at the PR's branch, tracing every
   call site a change touches. One agent per PR or per repo, told to report confirmed bugs with `file:line`,
   plausible-but-unverified concerns, and what looks correct.
3. Give each agent the workspace invariants from `CLAUDE.md` and `.claude/rules` (tenancy filters, permission
   gates, redaction tables, frozen values, the four states of an async UI view).
4. Frontend PRs: design-system compliance (changes under the shared `ui/` folder, raw colours, legacy tokens,
   hand-rolled copies of shared components).
5. Reconcile the ticket with the PR: narrower and **broader** scope (an undiscussed decision).
6. Report in plain language with a concrete example per finding; separate confirmed from plausible; end with a
   mergeable-or-not verdict and a short punch list. Never comments, approves or edits.

Strength: finds real bugs by reading **outside the diff**. Cost: heavy reading, and the invariants are
workspace-specific.

## 2. `code-review` plugin in the official marketplace (read from disk)

Pipeline: a Haiku agent checks whether the PR needs review; another lists relevant `CLAUDE.md` files; a third
summarises; then **five parallel Sonnet agents**, each with one lens: (1) `CLAUDE.md` compliance, (2) shallow bug
scan of the changes only, (3) git blame and history, (4) comments on earlier PRs touching the same files,
(5) guidance in code comments. Each issue gets a **0 to 100 confidence score** from a Haiku agent; **issues under
80 are dropped**. An explicit list of false positives is given (pre-existing issues, linter or type-checker
catches, pedantic style, general quality or test coverage unless `CLAUDE.md` requires it, unmodified lines).
Output: a short PR comment with full-SHA links.

Strength: precision, cheap model for filtering, and a written false-positive list. Weakness for this owner's
problem: it deliberately ignores edge cases and test coverage and does not read beyond the changes.

## 3. Context Ledger `reviewer` (read from disk, see 15)

Fresh seat, read-only, diff package only, acceptance criteria quoted verbatim, scope violations computed by code,
findings written to files, round cap of three.

## Comparison

| | Senior command | Official plugin | ctx reviewer |
|---|---|---|---|
| Reads outside diff | Yes, traces callers | No | Only for a named risk |
| Project rules | Workspace invariants | `CLAUDE.md` | Acceptance criteria |
| False-positive control | Confirmed vs plausible | Confidence score, threshold 80 | Severity levels |
| Scope check | Ticket vs PR | None | Machine-computed |
| Edge cases and tests | Via call-site tracing | Excluded | Included in quality read |
| Parallel lenses | Per PR/repo | 5 lenses | One |

## Take-aways for 22

- All three find bugs **after** the code is written. None reduces how many are written.
- Borrow: caller tracing and invariants (senior), confidence filter and false-positive list and history lens
  (plugin), snapshot packages and findings files (ctx).
- The senior command is workspace-specific; a ctx version must read invariants from a **project rules file**, not
  hard-code repo names.
