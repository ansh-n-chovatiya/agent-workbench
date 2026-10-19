# py/ctx_optimize/snapshot.py
import json
import os
import tempfile
from pathlib import Path
from typing import Dict, List

from .join import join_units
from .usage import Request, aggregate


def build_summary(per_session: Dict[str, List[Request]], stats: dict, windows=None) -> dict:
    sessions, everything = {}, []
    for sid, reqs in per_session.items():
        entry = aggregate(reqs)
        entry["project"] = reqs[0].project if reqs else ""
        sessions[sid] = entry
        everything += reqs
    return {"version": 1, "sessions": sessions, "total": aggregate(everything),
            "attribution": join_units(everything, windows),
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
