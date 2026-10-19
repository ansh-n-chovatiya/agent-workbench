# ctx-optimize phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A stdlib-Python usage reader and report CLI that totals Claude Code tokens by session, seat (main or subagent) and model, saves a snapshot, and lets us confirm or reject H1 and H2.

**Architecture:** `transcripts.py` finds and streams JSONL, `usage.py` turns lines into deduped `Request` records and aggregates them, `snapshot.py` persists counts, `report.py` renders text, `cli.py` ties them together. Read-only on `~/.claude`.

**Tech Stack:** Python 3.8+ stdlib only, pytest.

**Spec:** `docs/60-ctx-optimize-phase1-design.md` (data facts in `docs/11-research-usage-data.md`).

## Global Constraints

- Python 3.8+, standard library only, zero runtime dependencies (match `plugins/ctx`).
- Never write inside `~/.claude`. Snapshots go to `$CTX_OPTIMIZE_HOME` or `~/.agent-workbench/usage/`.
- Snapshots hold counts only: no prompt text, no file paths from transcripts, no code.
- No dollar figures; token volume only (doc 16).
- Fail open: unreadable or malformed lines are skipped and counted in `skipped_lines`, never raised.
- Test fixtures are synthetic JSONL written by the tests; never commit real transcripts.
- Seat is decided by which file a line came from, not by `isSidechain`.
- Dedupe rule (verified 2026-10-19 on a real session: 27 lines, 13 distinct requests, duplicate groups had identical usage): one `Request` per `(requestId, message.id)`; if lines disagree keep the one with the largest `output_tokens`.

## Execution (token split)

Claude owns Task 2's rules and reviews every patch. Codex builds the rest from the code in this plan.
For each Codex task:

```bash
S=$SCRATCH/work   # any scratch directory outside the repo
rm -rf $S && git worktree add --detach $S HEAD   # clean copy of the repo
codex exec -C $S --sandbox workspace-write "$(cat brief.txt)"   # brief = the task text below
git -C $S diff > $S/../taskN.patch               # Claude reviews this, then: git apply
```

Accept a patch only if `pytest plugins/ctx-optimize/tests -q` passes and it touches only the task's listed files.

## File structure

```
plugins/ctx-optimize/
  .claude-plugin/plugin.json
  bin/ctx-optimize
  py/ctx_optimize/{__init__,transcripts,usage,snapshot,report,cli}.py
  tests/{conftest,test_transcripts,test_usage,test_snapshot,test_report,test_cli}.py
  README.md  CHANGELOG.md
```

---

### Task 1: Scaffold and transcript discovery (Codex)

**Files:**
- Create: `plugins/ctx-optimize/.claude-plugin/plugin.json`, `py/ctx_optimize/__init__.py`, `py/ctx_optimize/transcripts.py`, `tests/conftest.py`, `tests/test_transcripts.py`

**Interfaces:**
- Produces: `SessionFiles(project: str, session_id: str, main: Path, subagents: List[Tuple[Path, Optional[Path]]])`; `find_sessions(root: Path, project: Optional[str] = None) -> List[SessionFiles]`; `read_jsonl(path: Path, stats: dict) -> Iterator[dict]`.

- [ ] **Step 1: Write the failing tests** (`tests/conftest.py` puts `py/` on `sys.path`)

```python
# tests/conftest.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "py"))
```

```python
# tests/test_transcripts.py
import json
from ctx_optimize.transcripts import find_sessions, read_jsonl


def make(root):
    proj = root / "-Users-x-proj"
    proj.mkdir(parents=True)
    (proj / "s1.jsonl").write_text('{"a":1}\n')
    sub = proj / "s1" / "subagents"
    sub.mkdir(parents=True)
    (sub / "agent-abc.jsonl").write_text('{"b":2}\n')
    (sub / "agent-abc.meta.json").write_text(json.dumps({"agentType": "ctx:reviewer"}))
    (sub / "agent-nometa.jsonl").write_text("")
    (root / "-Users-x-other").mkdir()
    (root / "-Users-x-other" / "s2.jsonl").write_text("")
    return root


def test_find_sessions_pairs_subagents_with_meta(tmp_path):
    sessions = find_sessions(make(tmp_path), project="-Users-x-proj")
    assert [s.session_id for s in sessions] == ["s1"]
    pairs = {p.name: (m.name if m else None) for p, m in sessions[0].subagents}
    assert pairs == {"agent-abc.jsonl": "agent-abc.meta.json", "agent-nometa.jsonl": None}


def test_find_sessions_all_projects_and_missing_root(tmp_path):
    assert len(find_sessions(make(tmp_path))) == 2
    assert find_sessions(tmp_path / "nope") == []


def test_read_jsonl_skips_and_counts_bad_lines(tmp_path):
    f = tmp_path / "x.jsonl"
    f.write_text('{"ok":1}\nnot json\n\n[1,2]\n{"ok":2}\n')
    stats = {"skipped_lines": 0}
    assert list(read_jsonl(f, stats)) == [{"ok": 1}, {"ok": 2}]
    assert stats["skipped_lines"] == 2  # "not json" and the non-object; blank lines are free


def test_read_jsonl_unreadable_file_is_skipped(tmp_path):
    stats = {"skipped_lines": 0}
    assert list(read_jsonl(tmp_path / "missing.jsonl", stats)) == []
```

- [ ] **Step 2: Run to verify failure**

Run: `pytest plugins/ctx-optimize/tests/test_transcripts.py -q`
Expected: FAIL, `ModuleNotFoundError: ctx_optimize`.

- [ ] **Step 3: Implement**

```python
# py/ctx_optimize/__init__.py
__version__ = "0.1.0"
```

```python
# py/ctx_optimize/transcripts.py
"""Find Claude Code transcripts and stream their JSON lines. Read-only."""
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator, List, Optional, Tuple


@dataclass
class SessionFiles:
    project: str
    session_id: str
    main: Path
    subagents: List[Tuple[Path, Optional[Path]]] = field(default_factory=list)


def find_sessions(root: Path, project: Optional[str] = None) -> List[SessionFiles]:
    root = Path(root)
    if not root.is_dir():
        return []
    out = []
    for proj in sorted(p for p in root.iterdir() if p.is_dir()):
        if project is not None and proj.name != project:
            continue
        for main in sorted(proj.glob("*.jsonl")):
            sid = main.stem
            subs = []
            sub_dir = proj / sid / "subagents"
            if sub_dir.is_dir():
                for f in sorted(sub_dir.glob("agent-*.jsonl")):
                    meta = f.with_name(f.stem + ".meta.json")
                    subs.append((f, meta if meta.is_file() else None))
            out.append(SessionFiles(proj.name, sid, main, subs))
    return out


def read_jsonl(path: Path, stats: dict) -> Iterator[dict]:
    try:
        fh = open(path, encoding="utf-8", errors="replace")
    except OSError:
        return
    with fh:
        for line in fh:
            if not line.strip():
                continue
            try:
                obj = json.loads(line)
            except ValueError:
                obj = None
            if isinstance(obj, dict):
                yield obj
            else:
                stats["skipped_lines"] = stats.get("skipped_lines", 0) + 1
```

`plugin.json`: `{"name":"ctx-optimize","displayName":"Context Ledger Optimize","version":"0.1.0","description":"Measures where Claude Code tokens go, by session, agent and model.","author":{"name":"Ansh Chovatiya"},"keywords":["tokens","usage","report"],"license":"MIT"}`

- [ ] **Step 4: Run to verify pass.** Same command. Expected: 4 passed.
- [ ] **Step 5: Commit**

```bash
git add plugins/ctx-optimize
git commit -m "feat(ctx-optimize): scaffold plugin and transcript discovery"
```

---

### Task 2: Request records, dedupe, aggregation (Claude writes; rules are the risk)

**Files:**
- Create: `py/ctx_optimize/usage.py`, `tests/test_usage.py`

**Interfaces:**
- Consumes: `SessionFiles`, `read_jsonl` (Task 1).
- Produces: `Request` dataclass (`session, project, seat, agent, agent_id, model, input, output, cache_read, cache_write, thinking, ts, context`); `load_session(sf: SessionFiles, stats: dict) -> List[Request]`; `aggregate(reqs: List[Request]) -> dict`.
- `seat` is `"main"` or `"subagent"`; `agent` is `agentType` from meta, or `"main"`, or `"unknown"`; `context = input + cache_read + cache_write`.
- `aggregate` returns `{"by_seat_model": {"main|claude-x": {"requests","input","output","cache_read","cache_write"}}, "context": {"main": {"mean","p95","max"}, "subagent": {...}}, "seat_share": {"main": float, "subagent": float}}` where share is cache_read share of total cache_read.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_usage.py
import json
from ctx_optimize.transcripts import SessionFiles
from ctx_optimize.usage import load_session, aggregate


def line(rid, mid, out, inp=1, cr=0, cw=0, model="claude-sonnet-5-5", block=0):
    return json.dumps({
        "type": "assistant", "requestId": rid, "apiBlockIndex": block,
        "timestamp": "2026-10-19T10:00:00Z", "sessionId": "s1",
        "message": {"id": mid, "model": model, "usage": {
            "input_tokens": inp, "output_tokens": out,
            "cache_read_input_tokens": cr, "cache_creation_input_tokens": cw,
            "output_tokens_details": {"thinking_tokens": 3}}}})


def build(tmp_path):
    main = tmp_path / "s1.jsonl"
    main.write_text("\n".join([
        line("r1", "m1", 10, cr=100, cw=5, block=0),
        line("r1", "m1", 10, cr=100, cw=5, block=1),      # duplicate block line
        line("r2", "m2", 20, cr=300),
        json.dumps({"type": "user", "message": {"content": "hi"}}),
        json.dumps({"type": "assistant", "message": {"id": "m3", "usage": None}}),
    ]))
    sub = tmp_path / "agent-a.jsonl"
    sub.write_text(line("r9", "m9", 7, cr=50, model="claude-opus-5-5"))
    meta = tmp_path / "agent-a.meta.json"
    meta.write_text(json.dumps({"agentType": "ctx:reviewer", "model": "opus"}))
    return SessionFiles("p", "s1", main, [(sub, meta)])


def test_dedupes_block_lines_and_ignores_non_usage(tmp_path):
    reqs = load_session(build(tmp_path), {})
    assert sorted(r.output for r in reqs if r.seat == "main") == [10, 20]


def test_conflicting_duplicates_keep_largest_output(tmp_path):
    f = tmp_path / "s1.jsonl"
    f.write_text("\n".join([line("r1", "m1", 5), line("r1", "m1", 12, block=1)]))
    reqs = load_session(SessionFiles("p", "s1", f, []), {})
    assert [r.output for r in reqs] == [12]


def test_seat_comes_from_file_and_meta(tmp_path):
    reqs = load_session(build(tmp_path), {})
    sub = [r for r in reqs if r.seat == "subagent"]
    assert len(sub) == 1 and sub[0].agent == "ctx:reviewer" and sub[0].model == "claude-opus-5-5"
    assert sub[0].context == 1 + 50 + 0 and sub[0].thinking == 3


def test_missing_meta_gives_unknown_agent(tmp_path):
    f = tmp_path / "agent-z.jsonl"
    f.write_text(line("r1", "m1", 1))
    reqs = load_session(SessionFiles("p", "s1", tmp_path / "none.jsonl", [(f, None)]), {})
    assert reqs[0].agent == "unknown"


def test_aggregate_totals_context_and_share(tmp_path):
    agg = aggregate(load_session(build(tmp_path), {}))
    m = agg["by_seat_model"]["main|claude-sonnet-5-5"]
    assert (m["requests"], m["output"], m["cache_read"], m["cache_write"]) == (2, 30, 400, 5)
    assert agg["context"]["main"]["mean"] == (106 + 301) / 2
    assert agg["context"]["main"]["max"] == 301
    assert round(agg["seat_share"]["subagent"], 4) == round(50 / 450, 4)


def test_aggregate_empty():
    agg = aggregate([])
    assert agg["by_seat_model"] == {} and agg["seat_share"] == {"main": 0.0, "subagent": 0.0}
```

- [ ] **Step 2: Run to verify failure.** `pytest plugins/ctx-optimize/tests/test_usage.py -q` → FAIL (`ImportError`).

- [ ] **Step 3: Implement**

```python
# py/ctx_optimize/usage.py
"""Turn transcript lines into deduped Request records and aggregate them."""
import json
from dataclasses import dataclass
from typing import Dict, List, Optional

from .transcripts import SessionFiles, read_jsonl


@dataclass
class Request:
    session: str
    project: str
    seat: str          # "main" or "subagent", decided by the file the line came from
    agent: str         # agentType from meta.json, "main", or "unknown"
    agent_id: str
    model: str
    input: int
    output: int
    cache_read: int
    cache_write: int
    thinking: int
    ts: str
    context: int       # input + cache_read + cache_write


def _int(v) -> int:
    return v if isinstance(v, int) and not isinstance(v, bool) else 0


def _parse(obj: dict, sf: SessionFiles, seat: str, agent: str, agent_id: str) -> Optional[Request]:
    if obj.get("type") != "assistant":
        return None
    msg = obj.get("message")
    usage = msg.get("usage") if isinstance(msg, dict) else None
    if not isinstance(usage, dict):
        return None
    inp, cr, cw = (_int(usage.get(k)) for k in (
        "input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"))
    details = usage.get("output_tokens_details")
    thinking = _int(details.get("thinking_tokens")) if isinstance(details, dict) else 0
    return Request(sf.session_id, sf.project, seat, agent, agent_id, str(msg.get("model") or "unknown"),
                   inp, _int(usage.get("output_tokens")), cr, cw, thinking,
                   str(obj.get("timestamp") or ""), inp + cr + cw)


def _load_file(path, sf, seat, agent, agent_id, stats) -> List[Request]:
    best: Dict[tuple, Request] = {}
    order: List[tuple] = []
    for obj in read_jsonl(path, stats):
        req = _parse(obj, sf, seat, agent, agent_id)
        if req is None:
            continue
        msg = obj["message"]
        key = (obj.get("requestId") or msg.get("id") or id(obj), msg.get("id"))
        if key not in best:
            order.append(key)
            best[key] = req
        elif req.output > best[key].output:
            best[key] = req
    return [best[k] for k in order]


def load_session(sf: SessionFiles, stats: dict) -> List[Request]:
    reqs = _load_file(sf.main, sf, "main", "main", "", stats)
    for path, meta in sf.subagents:
        agent = "unknown"
        if meta is not None:
            try:
                data = json.loads(meta.read_text(encoding="utf-8"))
                if isinstance(data, dict) and data.get("agentType"):
                    agent = str(data["agentType"])
            except (OSError, ValueError):
                pass
        reqs += _load_file(path, sf, "subagent", agent, path.stem[len("agent-"):], stats)
    return reqs


def _p95(vals: List[int]) -> int:
    s = sorted(vals)
    return s[max(0, -(-len(s) * 95 // 100) - 1)]


def aggregate(reqs: List[Request]) -> dict:
    by: Dict[str, Dict[str, int]] = {}
    ctx: Dict[str, List[int]] = {"main": [], "subagent": []}
    reads = {"main": 0, "subagent": 0}
    for r in reqs:
        row = by.setdefault(f"{r.seat}|{r.model}", dict(
            requests=0, input=0, output=0, cache_read=0, cache_write=0))
        row["requests"] += 1
        row["input"] += r.input
        row["output"] += r.output
        row["cache_read"] += r.cache_read
        row["cache_write"] += r.cache_write
        ctx[r.seat].append(r.context)
        reads[r.seat] += r.cache_read
    total = sum(reads.values())
    return {
        "by_seat_model": by,
        "context": {seat: ({"mean": sum(v) / len(v), "p95": _p95(v), "max": max(v)} if v
                           else {"mean": 0.0, "p95": 0, "max": 0}) for seat, v in ctx.items()},
        "seat_share": {s: (reads[s] / total if total else 0.0) for s in reads},
    }
```

- [ ] **Step 4: Run to verify pass.** Expected: 6 passed. Then Claude checks the numbers against one real session by hand (count requests and sum `cache_read` with an independent one-off script) before accepting.
- [ ] **Step 5: Commit** `git add plugins/ctx-optimize && git commit -m "feat(ctx-optimize): deduped request records and aggregation"`

---

### Task 3: Snapshot and text report (Codex)

**Files:**
- Create: `py/ctx_optimize/snapshot.py`, `py/ctx_optimize/report.py`, `tests/test_snapshot.py`, `tests/test_report.py`

**Interfaces:**
- Consumes: `Request`, `aggregate` (Task 2).
- Produces:
  - `build_summary(per_session: Dict[str, List[Request]], stats: dict) -> dict` returning `{"version": 1, "sessions": {sid: aggregate(...) + {"project": str}}, "total": aggregate(all), "skipped_lines": int}`. Counts only; no text.
  - `snapshot_dir() -> Path` (`$CTX_OPTIMIZE_HOME` else `~/.agent-workbench/usage`); `write_snapshot(summary: dict, directory: Path, stamp: str) -> Path` writes `usage-<stamp>.json` atomically (temp file then `os.replace`); `read_snapshot(path: Path) -> dict`.
  - `render_text(summary: dict) -> str`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_snapshot.py
import json
from ctx_optimize.usage import Request
from ctx_optimize.snapshot import build_summary, write_snapshot, read_snapshot, snapshot_dir


def req(seat="main", model="m", out=1, cr=10):
    return Request("s1", "p", seat, "main" if seat == "main" else "a", "", model, 1, out, cr, 0, 0, "", 1 + cr)


def test_summary_has_counts_only_and_totals():
    s = build_summary({"s1": [req(), req("subagent")]}, {"skipped_lines": 2})
    assert s["version"] == 1 and s["skipped_lines"] == 2
    assert s["sessions"]["s1"]["project"] == "p"
    assert s["total"]["by_seat_model"]["main|m"]["requests"] == 1
    text = json.dumps(s)
    assert "message" not in text and "content" not in text


def test_write_read_round_trip_and_atomic(tmp_path):
    s = build_summary({"s1": [req()]}, {})
    path = write_snapshot(s, tmp_path / "new", "20261019T100000")
    assert path.name == "usage-20261019T100000.json"
    assert read_snapshot(path) == s
    assert [p.name for p in path.parent.iterdir()] == [path.name]


def test_snapshot_dir_env_override(monkeypatch, tmp_path):
    monkeypatch.setenv("CTX_OPTIMIZE_HOME", str(tmp_path))
    assert snapshot_dir() == tmp_path
```

```python
# tests/test_report.py
from ctx_optimize.usage import Request
from ctx_optimize.snapshot import build_summary
from ctx_optimize.report import render_text


def test_report_separates_seats_and_shows_context():
    r = Request("s1", "p", "main", "main", "", "claude-x", 1, 5, 900, 100, 0, "", 1001)
    t = render_text(build_summary({"s1": [r]}, {"skipped_lines": 3}))
    assert "main" in t and "claude-x" in t
    assert "1,001" in t            # thousands separators
    assert "skipped lines: 3" in t
    assert "$" not in t            # never dollars


def test_report_empty():
    assert "no sessions" in render_text(build_summary({}, {})).lower()
```

- [ ] **Step 2: Run to verify failure.** Expected: `ImportError`.

- [ ] **Step 3: Implement**

```python
# py/ctx_optimize/snapshot.py
import json
import os
import tempfile
from pathlib import Path
from typing import Dict, List

from .usage import Request, aggregate


def build_summary(per_session: Dict[str, List[Request]], stats: dict) -> dict:
    sessions, everything = {}, []
    for sid, reqs in per_session.items():
        entry = aggregate(reqs)
        entry["project"] = reqs[0].project if reqs else ""
        sessions[sid] = entry
        everything += reqs
    return {"version": 1, "sessions": sessions, "total": aggregate(everything),
            "skipped_lines": int(stats.get("skipped_lines", 0))}


def snapshot_dir() -> Path:
    env = os.environ.get("CTX_OPTIMIZE_HOME")
    return Path(env) if env else Path.home() / ".agent-workbench" / "usage"


def write_snapshot(summary: dict, directory: Path, stamp: str) -> Path:
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    final = directory / f"usage-{stamp}.json"
    fd, tmp = tempfile.mkstemp(dir=directory, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(summary, fh, indent=2, sort_keys=True)
        os.replace(tmp, final)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise
    return final


def read_snapshot(path: Path) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))
```

```python
# py/ctx_optimize/report.py
from typing import List


def _n(v) -> str:
    return f"{int(v):,}"


def _block(title: str, agg: dict) -> List[str]:
    lines = [title, f"  {'seat|model':<42}{'reqs':>8}{'input':>10}{'output':>12}{'cache read':>16}{'cache write':>14}"]
    for key in sorted(agg["by_seat_model"]):
        r = agg["by_seat_model"][key]
        lines.append(f"  {key:<42}{_n(r['requests']):>8}{_n(r['input']):>10}{_n(r['output']):>12}"
                     f"{_n(r['cache_read']):>16}{_n(r['cache_write']):>14}")
    for seat in ("main", "subagent"):
        c = agg["context"][seat]
        lines.append(f"  context/request {seat}: mean {_n(c['mean'])}  p95 {_n(c['p95'])}  max {_n(c['max'])}"
                     f"   share of cache read {agg['seat_share'][seat]:.0%}")
    return lines


def render_text(summary: dict) -> str:
    if not summary["sessions"]:
        return "No sessions found.\n"
    out = _block(f"TOTAL ({len(summary['sessions'])} sessions)", summary["total"])
    for sid, agg in sorted(summary["sessions"].items()):
        out += ["", *_block(f"session {sid} ({agg['project']})", agg)]
    out += ["", f"skipped lines: {summary['skipped_lines']}", "volume only; token counts, not dollars"]
    return "\n".join(out) + "\n"
```

The test asserts `"$" not in t`, so keep the footer as written (it has no dollar sign).

- [ ] **Step 4: Run to verify pass.** `pytest plugins/ctx-optimize/tests -q` → all pass.
- [ ] **Step 5: Commit** `git add plugins/ctx-optimize && git commit -m "feat(ctx-optimize): snapshot and text report"`

---

### Task 4: CLI, launcher, docs, marketplace entry (Codex)

**Files:**
- Create: `py/ctx_optimize/cli.py`, `bin/ctx-optimize`, `tests/test_cli.py`, `README.md`, `CHANGELOG.md`
- Modify: `.claude-plugin/marketplace.json` (add the `ctx-optimize` entry after `ctx`)

**Interfaces:**
- Consumes: everything above.
- Produces: `main(argv: Optional[List[str]] = None) -> int`. Command `report` with `--root PATH` (default `~/.claude/projects`), `--project NAME`, `--session ID`, `--day YYYY-MM-DD` (keep sessions with any request whose `ts` starts with that date), `--json`, `--no-snapshot`, `--snapshot-dir PATH`. Exit 0 always for data problems; exit 2 for bad arguments.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_cli.py
import json
from ctx_optimize.cli import main
from test_usage import line


def seed(root):
    p = root / "-proj"
    p.mkdir(parents=True)
    (p / "s1.jsonl").write_text(line("r1", "m1", 10, cr=100))
    (p / "s2.jsonl").write_text(line("r2", "m2", 20, cr=200))


def test_report_json_and_snapshot(tmp_path, capsys):
    seed(tmp_path / "proj")
    snaps = tmp_path / "snaps"
    assert main(["report", "--root", str(tmp_path / "proj"), "--json", "--snapshot-dir", str(snaps)]) == 0
    data = json.loads(capsys.readouterr().out)
    assert set(data["sessions"]) == {"s1", "s2"}
    assert len(list(snaps.glob("usage-*.json"))) == 1


def test_session_filter_and_no_snapshot(tmp_path, capsys):
    seed(tmp_path / "proj")
    snaps = tmp_path / "snaps"
    main(["report", "--root", str(tmp_path / "proj"), "--session", "s2", "--json",
          "--no-snapshot", "--snapshot-dir", str(snaps)])
    assert set(json.loads(capsys.readouterr().out)["sessions"]) == {"s2"}
    assert not snaps.exists()


def test_text_default_and_missing_root(tmp_path, capsys):
    assert main(["report", "--root", str(tmp_path / "nope"), "--no-snapshot"]) == 0
    assert "No sessions found" in capsys.readouterr().out


def test_bad_arguments_exit_2():
    assert main(["report", "--day", "yesterday"]) == 2
```

`tests/conftest.py` already puts `py/` on the path; add the tests dir too (`sys.path.insert(0, str(Path(__file__).parent))`) so `from test_usage import line` resolves.

- [ ] **Step 2: Run to verify failure.** Expected: `ImportError`.

- [ ] **Step 3: Implement**

```python
# py/ctx_optimize/cli.py
import argparse
import datetime
import json
import re
import sys
from pathlib import Path
from typing import List, Optional

from .report import render_text
from .snapshot import build_summary, snapshot_dir, write_snapshot
from .transcripts import find_sessions
from .usage import load_session


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="ctx-optimize")
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("report", help="total tokens by session, seat and model")
    r.add_argument("--root", default=str(Path.home() / ".claude" / "projects"))
    r.add_argument("--project")
    r.add_argument("--session")
    r.add_argument("--day")
    r.add_argument("--json", action="store_true")
    r.add_argument("--no-snapshot", action="store_true")
    r.add_argument("--snapshot-dir")
    return p


def main(argv: Optional[List[str]] = None) -> int:
    try:
        args = _parser().parse_args(argv)
    except SystemExit as e:
        return 2 if e.code else 0
    if args.day and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.day):
        print("--day must look like 2026-10-19", file=sys.stderr)
        return 2
    stats = {"skipped_lines": 0}
    per_session = {}
    for sf in find_sessions(Path(args.root), args.project):
        if args.session and sf.session_id != args.session:
            continue
        reqs = load_session(sf, stats)
        if args.day and not any(r.ts.startswith(args.day) for r in reqs):
            continue
        if reqs:
            per_session[sf.session_id] = reqs
    summary = build_summary(per_session, stats)
    print(json.dumps(summary, indent=2, sort_keys=True) if args.json else render_text(summary), end="\n" if args.json else "")
    if not args.no_snapshot and per_session:
        stamp = datetime.datetime.now().strftime("%Y%m%dT%H%M%S")
        try:
            write_snapshot(summary, Path(args.snapshot_dir) if args.snapshot_dir else snapshot_dir(), stamp)
        except OSError as e:
            print(f"snapshot not saved: {e}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

```python
#!/usr/bin/env python3
# bin/ctx-optimize  (chmod +x)
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), "..", "py"))
from ctx_optimize.cli import main  # noqa: E402

sys.exit(main())
```

`README.md`: what it measures, `ctx-optimize report [--session|--day|--project] [--json]`, where snapshots go, the "counts only, volume not dollars" note, the dedupe rule. `CHANGELOG.md`: `0.1.0 - usage reader and report`. Marketplace entry: `{"name":"ctx-optimize","source":"./plugins/ctx-optimize","description":"Measures where Claude Code tokens go, by session, agent and model."}`.

- [ ] **Step 4: Run to verify pass.** `pytest plugins/ctx-optimize/tests -q` → all pass; `python3 plugins/ctx-optimize/bin/ctx-optimize report --no-snapshot --project agent-workbench` prints a table. Also `claude plugin validate plugins/ctx-optimize` if available.
- [ ] **Step 5: Commit** `git add plugins/ctx-optimize .claude-plugin/marketplace.json && git commit -m "feat(ctx-optimize): report CLI, launcher and docs"`

---

### Task 5: Acceptance run and H1/H2 verdict (Claude decides; Codex does the bulk run)

**Files:**
- Modify: `docs/16-research-token-economics.md` (add the verdict section), `docs/30-build-plan.md` (phase 1 status line)

- [ ] **Step 1: Bulk run (Codex, output kept out of Claude's context).** Run `ctx-optimize report --json --no-snapshot` for the ctx, Hark and DevFlow project directories under `~/.claude/projects/`, write the three JSON files to the scratchpad, and print only one line per file: sessions, requests, main share of cache read, mean main context.
- [ ] **Step 2: Reconcile with `/usage` (needs the owner).** Ask the owner for the `/usage` totals for one chosen session. Compare input, output, cache read and cache write; the difference must be within 5%. If not, find the cause (dedupe, thinking tokens, or the `iterations` field) before going on.
- [ ] **Step 3: Check H1.** H1 holds if, across sessions, main chat is the larger share of cache read and mean main context is far above mean subagent context. Report the numbers, including sessions where it did not hold.
- [ ] **Step 4: Check H2.** Per-round numbers need the ledger join (phase 2). With phase 1 data, report only the share of Opus subagent requests and their mean context, and mark H2 as "not decidable yet" if that is all we have.
- [ ] **Step 5: Save a real snapshot** (`ctx-optimize report`, no `--no-snapshot`), write the verdict into doc 16 and the phase 1 status into doc 30, then commit `docs: phase 1 usage findings (H1, H2)`.

---

## Self-review

- Spec coverage: layout (Tasks 1 to 4), data model and dedupe (Task 2), output and snapshot (Task 3), fail-open and read-only (Tasks 1 and 3), acceptance 1 to 4 (Task 5), Codex split (Execution section). The what-if table (main requests by model and context size) is not built here: `aggregate` gives per-model counts and context mean/p95, which is enough for the first read. If Task 5 shows we need finer buckets, add them then.
- Placeholders: none; each code step has the code.
- Types: `Request` fields, `load_session`, `aggregate`, `build_summary`, `write_snapshot`, `render_text` and `main` are used with the same names and signatures in every task.
