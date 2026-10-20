# Agent notes

Rules for any coding agent (Claude Code, Codex, Gemini) working in this repo.
`GEMINI.md` points here, so there is one copy to keep current.

## Layout

- `plugins/ctx`: Context Ledger (Python, stdlib only).
- `plugins/ctx-optimize`: usage reports, status line, optional router mod.
- `plugins/showreel`: video tooling (Node).
- `scripts/`: root checks and `bootstrap.sh`. `docs/`: design notes and the build plan (`docs/30-build-plan.md`).

## Before you push

Run from the repo root, and chain with `&&` so a failure stops the push:

```sh
python3 scripts/check-manifests.py && \
python3 -m unittest discover -s scripts -p 'test_*.py' && \
python3 scripts/scan-personal-data.py && \
(cd plugins/ctx && python3 -m unittest discover -s tests -q)
```

For `ctx-optimize`: `cd plugins/ctx-optimize && python3 -m unittest discover -s tests -q`.

## Rules

- Never commit personal data: real home paths, emails, tokens, transcripts. Use `/Users/you`.
- Python in `plugins/ctx` and `plugins/ctx-optimize` uses the standard library only and must run on 3.8.
- A version bump touches the manifest, the CHANGELOG and, for ctx, `ctx.__version__`; then run the full suite
  (README examples quote versions).
- New behaviour ships off by default and is measured before its default changes (decision D20).
- Do not edit files you did not change on purpose: another session may have uncommitted work in the same checkout.
  Use a git worktree for branches.
- Verify with a test that fails without your change. Do not claim a fix that no test exercises.
