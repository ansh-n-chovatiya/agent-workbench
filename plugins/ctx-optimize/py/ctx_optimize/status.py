"""One-line status for Claude Code's `statusLine` setting. Reads stdin JSON, costs no model tokens, never raises."""
import os
import time
from pathlib import Path
from typing import Optional

RUNNING_WINDOW_S = 30  # a subagent transcript written this recently counts as running


def running_agents(transcript_path: Optional[str], now: float) -> int:
    if not transcript_path:
        return 0
    sub = Path(transcript_path).with_suffix("") / "subagents"
    try:
        return sum(1 for e in os.scandir(sub)
                   if e.name.startswith("agent-") and e.name.endswith(".jsonl")
                   and now - e.stat().st_mtime <= RUNNING_WINDOW_S)
    except OSError:
        return 0


def _cache(pc, now: float) -> str:
    if not isinstance(pc, dict):
        return ""
    if not pc.get("warm"):
        return "cache cold"
    exp = pc.get("expires_at")
    if isinstance(exp, (int, float)) and not isinstance(exp, bool):
        mins = max(0, int((exp - now) // 60))
        return f"cache warm {mins}m"
    return "cache warm"


def render(data, now: Optional[float] = None) -> str:
    now = time.time() if now is None else now
    if not isinstance(data, dict):
        return ""
    parts = []
    model = data.get("model")
    if isinstance(model, dict) and model.get("display_name"):
        parts.append(str(model["display_name"]))
    cw = data.get("context_window")
    pct = cw.get("used_percentage") if isinstance(cw, dict) else None
    if isinstance(pct, (int, float)) and not isinstance(pct, bool):
        parts.append(f"ctx {int(pct)}%")
    cache = _cache(data.get("prompt_cache"), now)
    if cache:
        parts.append(cache)
    n = running_agents(data.get("transcript_path"), now)
    if n:
        parts.append(f"{n} agent{'s' if n != 1 else ''}")
    return " · ".join(parts)
