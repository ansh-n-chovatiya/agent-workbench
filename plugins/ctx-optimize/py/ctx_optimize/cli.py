# py/ctx_optimize/cli.py
import argparse
import datetime
import json
import re
import sys
from pathlib import Path
from typing import List, Optional

from .plans import load_windows
from .report import render_text, render_units
from .status import render as render_status
from .snapshot import build_summary, prune_snapshots, snapshot_dir, write_snapshot
from .transcripts import find_sessions
from .usage import dedupe_across, load_session


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="ctx-optimize")
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("report", help="total tokens by session, seat and model")
    r.add_argument("--root", default=str(Path.home() / ".claude" / "projects"))
    r.add_argument("--project")
    r.add_argument("--session")
    r.add_argument("--day")
    r.add_argument("--units", action="store_true", help="tokens per ledger unit, stage and review round")
    r.add_argument("--ledger", help="project dir (containing .ctx) or .ctx dir; names units by plan")
    r.add_argument("--json", action="store_true")
    r.add_argument("--no-snapshot", action="store_true")
    r.add_argument("--snapshot-dir")
    r.add_argument("--keep", type=int, metavar="N", help="after saving, keep only the N newest snapshots")
    sub.add_parser("statusline", help="one-line status for Claude Code's statusLine setting (reads JSON on stdin)")
    return p


def main(argv: Optional[List[str]] = None) -> int:
    try:
        args = _parser().parse_args(argv)
    except SystemExit as e:
        return 2 if e.code else 0
    if args.cmd == "statusline":
        try:
            print(render_status(json.load(sys.stdin)))
        except Exception:
            print("")
        return 0
    if args.keep is not None and args.keep < 1:
        print("--keep must be at least 1", file=sys.stderr)
        return 2
    if args.day and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.day):
        print("--day must look like 2026-10-19", file=sys.stderr)
        return 2
    stats = {"skipped_lines": 0}
    loaded = {}
    for sf in find_sessions(Path(args.root), args.project):
        reqs = load_session(sf, stats)
        if reqs:
            loaded[sf.session_id] = reqs
    # Dedupe over everything in scope first: a resumed session repeats earlier
    # requests, and filtering before deduping would keep the copy.
    per_session = {}
    for sid, reqs in dedupe_across(loaded).items():
        if not reqs or (args.session and sid != args.session):
            continue
        if args.day and not any(r.ts.startswith(args.day) for r in reqs):
            continue
        per_session[sid] = reqs
    windows = None
    if args.ledger:
        lp = Path(args.ledger)
        led = lp / ".ctx" if (lp / ".ctx").is_dir() else lp
        windows = load_windows(led)
        if not windows:
            print(f"--ledger: no plan journal found under {led}; units keep the session prefix", file=sys.stderr)
    summary = build_summary(per_session, stats, windows)
    text = render_units(summary) if args.units else render_text(summary)
    print(json.dumps(summary, indent=2, sort_keys=True) if args.json else text, end="\n" if args.json else "")
    if not args.no_snapshot and per_session:
        stamp = datetime.datetime.now().strftime("%Y%m%dT%H%M%S")
        target = Path(args.snapshot_dir) if args.snapshot_dir else snapshot_dir()
        try:
            write_snapshot(summary, target, stamp)
            if args.keep is not None:
                prune_snapshots(target, args.keep)
        except OSError as e:
            print(f"snapshot not saved: {e}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
