# Changelog

## 0.1.0

- Usage reader and `report` CLI: totals by session, seat and model, with snapshots.

## 0.2.0

- `report --units`: tokens per ledger unit, stage and review round (spawn-order inference).
- `statusline`: one-line status for the `statusLine` setting.
- `/ctx-agents` pane (mod): this session's subagents with status, model, tokens, task label.
- Fix: a request repeated by a resumed session is counted once across files (it was counted per file, overstating totals by about 17%).
- `report --ledger PATH`: `--units` shows `<plan>/<unit>` instead of the session prefix when the ledger journal can place the unit; stages are inferred per plan, so two plans with the same unit number no longer mix.
