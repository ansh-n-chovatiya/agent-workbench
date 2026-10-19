"""Which ledger plan was active at a given moment, from a project's journal."""
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

_HEADER = re.compile(r"^#\s*(\d{4}-\d{2}-\d{2})\s*$")
_FNAME = re.compile(r"^(\d{4}-\d{2}-\d{2})(?:--.*)?$")
_TIME = re.compile(r"^(\d{1,2}):(\d{2})$")
_ISO = re.compile(
    r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?"
    r"(Z|[+-]\d{2}:\d{2})$"
)


@dataclass
class PlanWindow:
    plan: str
    start: float  # UTC epoch seconds of the plan's earliest event
    end: float    # UTC epoch seconds of the plan's latest event


def _date(s: str):
    try:
        return datetime.strptime(s, "%Y-%m-%d")
    except ValueError:
        return None


def _file_events(path: Path):
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return
    lines = text.splitlines()
    day = None
    for ln in lines:
        if ln.strip():
            m = _HEADER.match(ln.strip())
            if m:
                day = _date(m.group(1))
            break
    if day is None:
        m = _FNAME.match(path.stem)
        day = _date(m.group(1)) if m else None
    if day is None:
        return
    for ln in lines:
        parts = [p.strip() for p in ln.split("|", 3)]
        if len(parts) != 4:
            continue
        tm = _TIME.match(parts[0])
        plan = parts[2]
        if not tm or plan in ("", "-"):
            continue
        hh, mm = int(tm.group(1)), int(tm.group(2))
        if hh > 23 or mm > 59:
            continue
        # naive datetime -> timestamp() interprets it in the system timezone
        yield plan, day.replace(hour=hh, minute=mm).timestamp()


def load_windows(ledger_dir: Path) -> List[PlanWindow]:
    jdir = Path(ledger_dir) / "journal"
    if not jdir.is_dir():
        return []
    spans: Dict[str, List[float]] = {}
    for f in sorted(jdir.glob("*.md")):
        for plan, ts in _file_events(f):
            if plan in spans:
                s = spans[plan]
                s[0] = min(s[0], ts)
                s[1] = max(s[1], ts)
            else:
                spans[plan] = [ts, ts]
    wins = [PlanWindow(p, s[0], s[1]) for p, s in spans.items()]
    wins.sort(key=lambda w: (w.start, w.plan))
    return wins


def plan_for(windows: List[PlanWindow], epoch: float, grace: float = 1800.0) -> Optional[str]:
    best = None
    for w in windows:
        if w.start <= epoch <= w.end + grace:
            if best is None or w.start > best.start:
                best = w
    return best.plan if best else None


def iso_to_epoch(ts: str) -> Optional[float]:
    if not isinstance(ts, str):
        return None
    m = _ISO.match(ts.strip())
    if not m:
        return None
    y, mo, d, h, mi, s = (int(m.group(i)) for i in range(1, 7))
    frac = float("0." + m.group(7)) if m.group(7) else 0.0
    tz = m.group(8)
    try:
        if tz == "Z":
            off = timedelta(0)
        else:
            oh, om = int(tz[1:3]), int(tz[4:6])
            if om > 59:
                return None
            off = timedelta(hours=oh, minutes=om)
            if tz[0] == "-":
                off = -off
        dt = datetime(y, mo, d, h, mi, s, tzinfo=timezone(off))
    except ValueError:
        return None
    return dt.timestamp() + frac
