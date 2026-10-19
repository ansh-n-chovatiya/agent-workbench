import json
import os
import re
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


# CLI stamps are %Y%m%dT%H%M%S. Retention only ever touches files in this exact shape, so a stamp with a dash in it
# or a file somebody else put in the directory is never mistaken for a snapshot and never deleted.
_STAMP = r"\d{8}T\d{6}"
_SNAPSHOT = re.compile(r"^usage-(" + _STAMP + r")(?:-(\d+))?\.json$")


def _name(stamp: str, n: int) -> str:
    return f"usage-{stamp}.json" if n == 1 else f"usage-{stamp}-{n}.json"


def _next_suffix(directory: Path, stamp: str) -> int:
    """One past the highest suffix already used for this stamp (the unsuffixed file counts as 1).

    Starting at the lowest free name instead would reuse a name that retention just freed: the new snapshot would
    land in the oldest slot and be the next one pruned.
    """
    pattern = re.compile(r"^usage-" + re.escape(stamp) + r"(?:-(\d+))?\.json$")
    used = [int(m.group(1) or 1) for m in map(pattern.match, os.listdir(directory)) if m]
    return max(used) + 1 if used else 1


def write_snapshot(summary: dict, directory: Path, stamp: str) -> Path:
    """Write `usage-<stamp>.json`, or `-2`, `-3`, ... when that name is taken; return the path written.

    Safe against concurrent writers and pruners: the finished temp file is published with `os.link`, which fails if
    the name exists, so a name is claimed atomically, nothing is ever overwritten and a reader never sees a partial
    file. Where hard links are unavailable (exFAT, some network and container mounts) it falls back to an
    exclusive create, which still never overwrites; there a reader can briefly see a short file.
    """
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=directory, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(summary, fh, indent=2, sort_keys=True)
        n = _next_suffix(directory, stamp)
        use_link = True
        while True:
            final = directory / _name(stamp, n)
            try:
                if use_link:
                    os.link(tmp, final)
                else:
                    claim = os.open(final, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
                    with os.fdopen(claim, "wb") as out, open(tmp, "rb") as src:
                        out.write(src.read())
                return final
            except FileExistsError:
                n += 1
            except OSError:
                if not use_link:
                    raise
                use_link = False
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def prune_snapshots(directory: Path, keep: int) -> List[Path]:
    """Delete all but the `keep` newest snapshots; return the paths this call deleted, oldest first.

    Newest means by stamp, then by numeric suffix. Anything that is not exactly `usage-<stamp>[-<n>].json` is ignored.
    A file another process already removed is skipped, not an error, and not reported as deleted.
    """
    if keep < 1:
        raise ValueError("keep must be at least 1")
    directory = Path(directory)
    try:
        names = os.listdir(directory)
    except OSError:
        return []
    found = sorted(
        ((m.group(1), int(m.group(2) or 1), name) for name in names for m in [_SNAPSHOT.match(name)] if m))
    deleted = []
    for _stamp, _n, name in found[:max(0, len(found) - keep)]:
        path = directory / name
        try:
            path.unlink()
        except FileNotFoundError:
            continue
        deleted.append(path)
    return deleted


def read_snapshot(path: Path) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))
