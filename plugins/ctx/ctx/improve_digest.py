"""The improvement digest: the improve log, turned into something a session can act on.

`build` reads the private log (`improve.records`) and writes `<store>-digest.md` beside it, grouped as builder missed,
reviewer false alarm, process friction, manual fixes and possible redos. A pattern gets a count; it gets a suggested
change only once it has been seen `THRESHOLD` times, and low-confidence records never count toward that.

Scrub rule: every line is built from kinds, counts and summaries that already went through `improve.scrub_text`; each
line is scrubbed again on the way out, and a summary that looks like source code is withheld rather than printed. The
suggestions are fixed sentences, never record text.

Automation, none of it needing a command:

* SessionEnd calls `refresh`, which rebuilds only when the log is newer than the digest.
* SessionStart's briefing calls `unread` for its one line; the hook calls `settle` first and `mark_shown` after.
* **Seen is marked at the next SessionStart, not on a `Read` of the digest.** The plugin's PostToolUse matcher is
  `Edit|Write|MultiEdit|NotebookEdit|Bash`; a `Read` never reaches the hook, and widening the matcher would run a hook
  on every file read for the sake of one flag. A digest that was shown to a session and is still on disk when a
  *different* session starts has been offered once, which is the most a hook can know. The briefing itself stays pure:
  `ctx briefing` and `ctx doctor` only ever call `unread`, so measuring it never marks anything.

State lives in a sidecar beside the digest (`<store>-digest.state`, 0600, outside the repository): the signature of the
actionable patterns, and which signature was shown and seen. Only actionable patterns are signed, so a new low-confidence
record does not make an already-read digest unread again. Everything fails open.
"""

import hashlib
import json
import os
import re
from pathlib import Path

from . import atomic, improve, log

THRESHOLD = 3
_SHOW = 100  # characters of a summary shown in the digest
_MAX_RECORDS = improve.KEEP_LINES
_MAX_STORE_BYTES = 2 * improve.MAX_BYTES

#: section -> (title, record kinds). Order is the order in the file.
SECTIONS = (
    ("builder", "Builder missed", ("review-finding", "manual-miss")),
    ("alarm", "Reviewer false alarm", ("reviewer-false-alarm",)),
    ("friction", "Process friction", ("forced-done", "blocked")),
    ("manual", "Manual fixes", ("manual-fix",)),
    ("redo", "Possible redos", ("possible-redo",)),
)
#: Sections whose records are low confidence by nature: listed, never suggested.
_LISTED_ONLY = ("manual", "redo")

SUGGESTIONS = {
    "review-finding": "Add the recurring check to the unit template's acceptance criteria or its verify commands.",
    "manual-miss": "Turn the recurring miss into an acceptance criterion or a verify command.",
    "reviewer-false-alarm": "Give reviewers the scope and the known-good cases up front so this is not raised again.",
    "forced-done": "Fix or replace the verify command that keeps needing `--force`.",
    "blocked": "Split units earlier, or state their dependencies, so fewer units block.",
}

_CODEY = re.compile(r"[{};`]|=>|\bdef \w|\bclass \w|\bimport \w|\breturn\b|\w\(\)|\bfunction\b|\$\(")
_DIGITS = re.compile(r"\d+")
WITHHELD = "(summary withheld: looks like code)"


# ---------------------------------------------------------------- locations

def digest_path(layout):
    """Beside the log, same stem (so two checkouts called `app` never share a digest)."""
    store = improve.path_for(layout)
    return store.with_name(store.stem + "-digest.md")


def _state_path(layout):
    store = improve.path_for(layout)
    return store.with_name(store.stem + "-digest.state")


def _load_state(layout):
    try:
        data = json.loads(_state_path(layout).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def _save_state(layout, data):
    path = _state_path(layout)
    atomic.write_text(path, json.dumps(data, sort_keys=True))
    try:
        os.chmod(str(path), 0o600)
    except OSError:
        pass


# ------------------------------------------------------------------- analysis

def _line(text, limit=_SHOW):
    return improve.scrub_text(text, limit)


def _shown(summary):
    text = _line(summary)
    if not text:
        return ""
    return WITHHELD if _CODEY.search(text) else text


def _group_key(kind, summary):
    # Process kinds are one pattern per kind: their notes differ per unit but the friction is the same.
    if kind in ("forced-done", "blocked"):
        return kind
    return _DIGITS.sub("#", " ".join(str(summary or "").lower().split()))[:60]


def _analyse(records):
    """`{section: {"patterns": [...], "low": n}}` from parsed records."""
    kinds = {kind: sid for sid, _title, ks in SECTIONS for kind in ks}
    out = {sid: {"patterns": {}, "low": 0} for sid, _t, _k in SECTIONS}
    for rec in records:
        kind = str(rec.get("kind") or "")
        sid = kinds.get(kind)
        if sid is None:
            continue
        bucket = out[sid]
        if rec.get("confidence") == "low" or sid in _LISTED_ONLY:
            bucket["low"] += 1
            if sid not in _LISTED_ONLY:
                continue
            key = kind
        else:
            key = (kind, _group_key(kind, rec.get("summary")))
        entry = bucket["patterns"].setdefault(
            key, {"kind": kind, "count": 0, "units": set(), "summary": rec.get("summary")})
        entry["count"] += 1
        if rec.get("unit"):
            entry["units"].add(str(rec["unit"]))
    return out


def _ordered(bucket):
    return sorted(bucket["patterns"].values(),
                  key=lambda p: (-p["count"], p["kind"], str(p["summary"])))


def _actionable(analysis):
    found = []
    for sid, _title, _kinds in SECTIONS:
        if sid in _LISTED_ONLY:
            continue
        for item in _ordered(analysis[sid]):
            if item["count"] >= THRESHOLD and item["kind"] in SUGGESTIONS:
                found.append(item)
    return found


def _signature(items):
    # Pattern identity only, not counts: a pattern already read must not resurface on every new occurrence.
    text = "|".join(f"{i['kind']}:{_group_key(i['kind'], i['summary'])}" for i in items)
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]


def _render(slug, analysis, total):
    lines = [
        f"# ctx improvement digest: {_line(slug, 60)}",
        "",
        "Generated by ctx from its private improvement log. Counts and one-line summaries only: no code, paths,",
        "emails or tokens. A suggestion appears once a pattern has been seen "
        f"{THRESHOLD} or more times; low-confidence records never count toward that.",
        "To act on one: propose the smallest change through the normal spec flow. ctx itself changes only",
        "through review and the owner's merge.",
        "",
        f"Records read: {total}",
    ]
    for sid, title, _kinds in SECTIONS:
        bucket = analysis[sid]
        lines += ["", f"## {title}", ""]
        patterns = _ordered(bucket)
        if not patterns:
            lines.append("- nothing recorded")
        for item in patterns:
            units = len(item["units"])
            where = f" across {units} unit(s)" if units else ""
            label = item["kind"] if sid in _LISTED_ONLY or item["kind"] in ("forced-done", "blocked") else _shown(
                item["summary"]) or item["kind"]
            lines.append(f"- {label}: seen {item['count']} time(s){where}")
            if sid not in _LISTED_ONLY and item["count"] >= THRESHOLD and item["kind"] in SUGGESTIONS:
                lines.append(f"  - suggested change: {SUGGESTIONS[item['kind']]}")
        if sid not in _LISTED_ONLY and bucket["low"]:
            lines.append(f"- low confidence, listed apart and never counted: {bucket['low']}")
        if sid in _LISTED_ONLY and patterns:
            lines.append("- low confidence: listed for a person to judge, never counted toward a suggestion")
    # Defence in depth: nothing leaves this function without one more scrub of its lines.
    return "\n".join(_final(line) for line in lines) + "\n"


def _final(line):
    indent = line[:len(line) - len(line.lstrip(" "))]
    return indent + improve.scrub_text(line, 400) if line.strip() else ""


# ----------------------------------------------------------------------- build

def build(layout, config):
    """Write the digest; return its path, or None when disabled or it could not be written. Never raises."""
    try:
        if not improve.enabled(config):
            return None
        records = list(improve.records(layout))[-_MAX_RECORDS:]
        analysis = _analyse(records)
        items = _actionable(analysis)
        target = digest_path(layout)
        improve._ensure_dir(target.parent)
        atomic.write_text(target, _render(improve.project_slug(layout), analysis, len(records)))
        try:
            os.chmod(str(target), 0o600)
        except OSError:
            pass
        state = _load_state(layout)
        state.update(sig=_signature(items), actionable=len(items))
        _save_state(layout, state)
        return target
    except Exception as exc:
        _failed("improve_digest.build", exc)
        return None


def refresh(layout, config):
    """SessionEnd: rebuild when the log is newer than the digest. Cheap, bounded, never raises."""
    try:
        if not improve.enabled(config):
            return None
        store = improve.path_for(layout)
        if not store.is_file() or store.stat().st_size > _MAX_STORE_BYTES:
            return None
        target = digest_path(layout)
        if target.is_file() and target.stat().st_mtime >= store.stat().st_mtime:
            return None
        return build(layout, config)
    except Exception as exc:
        _failed("improve_digest.refresh", exc)
        return None


# ------------------------------------------------------------- seen / unread

def unread(layout, config):
    """`(count, path)` when the digest has actionable items not yet seen, else None. Reads only."""
    try:
        if not improve.enabled(config):
            return None
        target = digest_path(layout)
        if not target.is_file():
            return None
        state = _load_state(layout)
        count = int(state.get("actionable") or 0)
        if count <= 0 or not state.get("sig") or state.get("sig") == state.get("seen"):
            return None
        return count, target
    except Exception:
        return None


def mark_shown(layout, config, session):
    """Record that the briefing offered the current digest to `session`."""
    try:
        if unread(layout, config) is None:
            return
        state = _load_state(layout)
        state.update(shown=state["sig"], shown_session=session or "")
        _save_state(layout, state)
    except Exception as exc:
        _failed("improve_digest.mark_shown", exc)


def settle(layout, config, session):
    """Call before the briefing is built: a digest offered to an earlier session is now seen."""
    try:
        if not improve.enabled(config):
            return
        state = _load_state(layout)
        if not state.get("sig") or state.get("shown") != state["sig"] or state.get("seen") == state["sig"]:
            return
        if session and state.get("shown_session") == session:
            return  # the same session starting again (resume, compaction)
        state["seen"] = state["sig"]
        _save_state(layout, state)
    except Exception as exc:
        _failed("improve_digest.settle", exc)


LINE_MARK = "[ctx] improve:"


def _tilde(path):
    try:
        return "~/" + Path(path).relative_to(Path.home()).as_posix()
    except ValueError:
        return str(path)


def briefing_line(layout, config, room=None):
    """The one briefing line, or an empty string. `room` is the characters left in the briefing: the full line
    when it fits, otherwise a short one (the default level's cap is small), otherwise nothing."""
    found = unread(layout, config)
    if found is None:
        return ""
    count, path = found
    shown = _tilde(path)
    full = (f"{LINE_MARK} {count} unread pattern(s). Read {shown}, propose the smallest change through the "
            "normal spec flow; ctx itself changes only through review and the owner's merge.")
    short = f"{LINE_MARK} {count} unread, see {shown}"
    if room is None or len(full) <= room:
        return full
    return short if len(short) <= room else ""


def _failed(where, exc):
    try:
        log.failure(where, exc)
    except Exception:
        pass
