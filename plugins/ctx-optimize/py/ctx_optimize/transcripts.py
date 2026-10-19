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
        if project is not None and project not in proj.name:
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
