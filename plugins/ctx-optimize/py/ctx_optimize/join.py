"""Attribute subagent requests to a ledger unit, stage and review round.

The ledger names the unit in the subagent's task label ("Fix round: unit 01
findings"). Rounds are rarely written there, so they are inferred from spawn
order per (session, plan, unit): the first runner builds, each reviewer opens the next
review round, a runner after a review is the fix for that round.
Main-chat tokens cannot be split per unit and are reported as one bucket.
"""
import re
from typing import Dict, List, Tuple

from .plans import iso_to_epoch, plan_for
from .usage import Request

_UNIT = re.compile(r"\bunit[\s:#-]*([A-Za-z0-9][\w.-]*)", re.I)
_ROUND = re.compile(r"\bround[\s:#-]*(\d+)", re.I)
_FIX = re.compile(r"\bfix", re.I)

UNATTRIBUTED = "unattributed"
_ROW = ("requests", "input", "output", "cache_read", "cache_write")


def _agents(reqs: List[Request], windows=None) -> List[dict]:
    by: Dict[Tuple[str, str], dict] = {}
    for r in reqs:
        if r.seat != "subagent":
            continue
        a = by.setdefault((r.session, r.agent_id), dict(
            session=r.session, agent=r.agent, label=r.label, start=r.ts, reqs=[]))
        a["start"] = min(a["start"], r.ts) if a["start"] else r.ts
        a["reqs"].append(r)
    out = sorted(by.values(), key=lambda a: (a["session"], a["start"]))
    for a in out:
        epoch = iso_to_epoch(a["start"]) if windows else None
        a["plan"] = plan_for(windows, epoch) if epoch is not None else None
    return out


def classify(agents: List[dict]) -> List[Tuple[str, str, dict]]:
    """Return (unit, stage, agent) per subagent, in spawn order."""
    reviews: Dict[Tuple[str, str], int] = {}
    builds: Dict[Tuple[str, str], int] = {}
    out = []
    for a in agents:
        kind = a["agent"].split(":")[-1]
        m = _UNIT.search(a["label"])
        if not (a["agent"].startswith("ctx:") and m):
            out.append((UNATTRIBUTED, "other", a))
            continue
        unit, key = m.group(1), (a["session"], a.get("plan") or "", m.group(1))
        explicit = _ROUND.search(a["label"])
        if kind in ("reviewer", "re-reviewer"):
            n = int(explicit.group(1)) if explicit else reviews.get(key, 0) + 1
            reviews[key] = max(reviews.get(key, 0), n)
            stage = f"review r{n}"
        elif kind == "verifier":
            stage = "verify"
        elif kind == "unit-runner":
            if _FIX.search(a["label"]) or builds.get(key):
                stage = f"fix r{max(reviews.get(key, 1), 1)}"
            else:
                stage = "build"
            builds[key] = builds.get(key, 0) + 1
        else:
            stage = "other"
        out.append((unit, stage, a))
    return out


def join_units(reqs: List[Request], windows=None) -> dict:
    """{"units": {unit: {"stages": {stage: row}, "total": row}}, "main_chat": row, "unattributed": row}.

    A row is requests/input/output/cache_read/cache_write plus "models": {model: requests}.
    Units are keyed "<session8>/<unit>" because unit numbers repeat across plans. With ledger plan
    `windows`, a unit whose first request falls in a plan is keyed "<plan>/<unit>" instead.
    """
    def new():
        row = {k: 0 for k in _ROW}
        row["models"] = {}
        return row

    def add(row, r):
        row["requests"] += 1
        row["input"] += r.input
        row["output"] += r.output
        row["cache_read"] += r.cache_read
        row["cache_write"] += r.cache_write
        row["models"][r.model] = row["models"].get(r.model, 0) + 1

    units: Dict[str, dict] = {}
    other, main = new(), new()
    for r in reqs:
        if r.seat == "main":
            add(main, r)
    for unit, stage, a in classify(_agents(reqs, windows)):
        if unit == UNATTRIBUTED:
            for r in a["reqs"]:
                add(other, r)
            continue
        u = units.setdefault(f"{a.get('plan') or a['session'][:8]}/{unit}", {"stages": {}, "total": new()})
        row = u["stages"].setdefault(stage, new())
        for r in a["reqs"]:
            add(row, r)
            add(u["total"], r)
    return {"units": units, "main_chat": main, UNATTRIBUTED: other}
