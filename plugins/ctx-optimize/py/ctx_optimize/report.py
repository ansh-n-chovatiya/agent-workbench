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


def _row(label: str, r: dict, width: int = 26) -> str:
    models = ", ".join(f"{m} x{n}" for m, n in sorted(r["models"].items()))
    return (f"  {label:<{width}}{_n(r['requests']):>6}{_n(r['output']):>10}{_n(r['cache_read']):>14}"
            f"{_n(r['cache_write']):>12}  {models}")


def render_units(summary: dict) -> str:
    att = summary["attribution"]
    labels = ["unattributed subagents", "main chat (not per unit)"]
    for unit, u in att["units"].items():
        labels.append(unit)
        labels += ["  " + stage for stage in u["stages"]]
    width = max(26, max(len(label) for label in labels) + 2)
    out = ["Subagent tokens by unit and stage (spawn-order inference; see README)",
           f"  {'unit / stage':<{width}}{'reqs':>6}{'output':>10}{'cache read':>14}{'cache write':>12}  models"]
    for unit in sorted(att["units"]):
        u = att["units"][unit]
        out.append(_row(unit, u["total"], width))
        for stage in sorted(u["stages"]):
            out.append(_row("  " + stage, u["stages"][stage], width))
    out.append(_row("unattributed subagents", att["unattributed"], width))
    out.append(_row("main chat (not per unit)", att["main_chat"], width))
    return "\n".join(out) + "\n"
