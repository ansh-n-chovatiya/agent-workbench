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
    label: str = ""    # subagent description from meta.json (task label), else ""


def _int(v) -> int:
    return v if isinstance(v, int) and not isinstance(v, bool) else 0


def _parse(obj: dict, sf: SessionFiles, seat: str, agent: str, agent_id: str, label: str = "") -> Optional[Request]:
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
                   str(obj.get("timestamp") or ""), inp + cr + cw, label)


def _load_file(path, sf, seat, agent, agent_id, stats, label="") -> List[Request]:
    best: Dict[tuple, Request] = {}
    order: List[tuple] = []
    for obj in read_jsonl(path, stats):
        req = _parse(obj, sf, seat, agent, agent_id, label)
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
        agent, label = "unknown", ""
        if meta is not None:
            try:
                data = json.loads(meta.read_text(encoding="utf-8"))
                if isinstance(data, dict) and data.get("agentType"):
                    agent = str(data["agentType"])
                if isinstance(data, dict) and data.get("description"):
                    label = str(data["description"])[:120]
            except (OSError, ValueError):
                pass
        reqs += _load_file(path, sf, "subagent", agent, path.stem[len("agent-"):], stats, label)
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
