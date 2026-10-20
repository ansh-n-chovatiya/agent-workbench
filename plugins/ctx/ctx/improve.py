"""A private, scrubbed, append-only log of ctx's own mistakes.

Every record says one thing went wrong (a reviewer finding, a forced override,
a blocked unit ...) in a single scrubbed line. The log lives at
`~/.agent-workbench/improve/<project>-<hash>.jsonl`, outside any repository, so it can
never be committed by accident and one owner's log spans every checkout of a
project.

Three constraints shape it, all inherited from `telemetry`:

* **Fail open.** `record` sits behind hooks and commands; it returns False on
  any failure and never raises.
* **Private.** The file is created 0600 in a 0700 directory, and nothing that
  reaches it is raw: summaries go through `redact.scrub` and then a path /
  email / token scrub. Source code is never an input, only a one-line summary.
* **Bounded.** Past `MAX_BYTES` the file is trimmed to its newest `KEEP_LINES`
  atomically (`atomic.write_text`), exactly as telemetry rotates.

The first `record` (or `backfill`) for a project also reads the existing
findings ledgers once and records what they already hold, marked by a sentinel
record so it is not repeated. Ledgers are only read.

Ledger-side writes are serialised by `lock.held(layout, "improve")`; the whole
check-dedupe-append sequence, backfill included, runs inside one acquisition
because `lock.held` is not re-entrant.
"""

import hashlib
import json
import os
import re
import time
from pathlib import Path

from . import atomic, findings, lock, log, redact

LOCK_NAME = "improve"

MAX_BYTES = 512 * 1024
KEEP_LINES = 1500

MAX_SUMMARY = 200
_MAX_FIELD = 80

CONFIDENCES = ("high", "low")

#: The `kind` of the marker that says backfill already ran for this project.
SENTINEL_KIND = "backfill-done"

#: Kinds the backfill emits.
KIND_FINDING = "review-finding"
KIND_FALSE_ALARM = "reviewer-false-alarm"

FALSE_ALARM_STATUSES = ("disputed", "parked")

_EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)+")
# Windows drive paths, UNC paths, then any absolute POSIX path of two or more
# segments (so `and/or` and `https://host/x` are left alone).
_WIN_PATH = re.compile(r"\b[A-Za-z]:[\\/][^\s'\"`,;)\]>]*")
_UNC_PATH = re.compile(r"\\\\[^\s'\"`,;)\]>]+")
_POSIX_PATH = re.compile(r"(?<![\w.:/\\<-])/(?:[^\s/'\"`,;)\]>]+/)+[^\s/'\"`,;)\]>]*")
_HOME_PATH = re.compile(r"(?<![\w.:/\\<-])/(?:Users|home)/[^\s'\"`,;)\]>]*")
_HEX = re.compile(r"\b[0-9a-fA-F]{20,}\b")
# No `/`, `-` or `_`: a path, a hyphenated name or a snake_case identifier is not a key, and the unit and plan
# names that go through this scrub are exactly that. Mixed letters and digits, 32 or more in a row, is.
_B64 = re.compile(r"[A-Za-z0-9+]{32,}={0,2}")
# Free text is scrubbed harder: a real secret may carry `/`, `-` or `_` (standard and URL-safe base64), and prose
# has no business holding a 24-character mixed run.
_B64_WIDE = re.compile(r"[A-Za-z0-9+/_\-]{24,}={0,2}")


def enabled(config):
    section = (config or {}).get("improve")
    if not isinstance(section, dict):
        return True
    return bool(section.get("enabled", True))


# ---------------------------------------------------------------- locations

def _slug(text):
    cleaned = re.sub(r"[^A-Za-z0-9_.-]+", "-", str(text or "")).strip("-.")
    return cleaned[:_MAX_FIELD] or "project"


def project_slug(layout):
    """The repo folder name: `layout.root` is `<repo>/.ctx`."""
    return _slug(Path(layout.root).resolve().parent.name)


def store_dir():
    """`~/.agent-workbench/improve`, with `HOME` honoured on every call."""
    home = os.environ.get("HOME") or os.environ.get("USERPROFILE") or os.path.expanduser("~")
    return Path(home) / ".agent-workbench" / "improve"


def path_for(layout):
    """One file per repo: the folder name for a person to recognise, a short hash of the full path so two
    checkouts called `app` never share a file, a sentinel or a key space."""
    root = str(Path(layout.root).resolve().parent)
    return store_dir() / f"{project_slug(layout)}-{hashlib.sha1(root.encode('utf-8')).hexdigest()[:8]}.jsonl"


# ----------------------------------------------------------------- scrubbing

def scrub_text(text, limit=MAX_SUMMARY, ident=False):
    """One line, credentials / paths / emails / long tokens removed, capped."""
    one = " ".join(str(text or "")[:4000].split())
    one = redact.scrub(one)
    one = _EMAIL.sub("<email>", one)
    for pattern in (_WIN_PATH, _UNC_PATH, _HOME_PATH, _POSIX_PATH):
        one = pattern.sub("<path>", one)
    one = _HEX.sub("<secret>", one)
    one = (_B64 if ident else _B64_WIDE).sub(_b64_repl, one)
    return one[:limit]


def _b64_repl(match):
    run = match.group(0)
    # A long run of plain letters is a word or identifier, not a key.
    if any(c.isdigit() for c in run) and any(c.isalpha() for c in run):
        return "<secret>"
    return run


# ------------------------------------------------------------------- records

def _build(kind, unit, plan, summary, confidence, key):
    entry = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "kind": scrub_text(kind, _MAX_FIELD, ident=True) or "unknown",
        "unit": scrub_text(unit, _MAX_FIELD, ident=True),
        "plan": scrub_text(plan, _MAX_FIELD, ident=True),
        "summary": scrub_text(summary),
        "confidence": confidence if confidence in CONFIDENCES else "high",
    }
    if key is not None:
        entry["key"] = scrub_text(key, 160, ident=True)
    return entry


def _read_lines(target):
    try:
        with target.open("r", encoding="utf-8", errors="replace") as handle:
            return handle.read().splitlines()
    except OSError:
        return []


def _parse(line):
    try:
        entry = json.loads(line)
    except ValueError:
        return None
    return entry if isinstance(entry, dict) else None


def _ensure_dir(directory):
    parent = directory.parent
    for made in (parent, directory):
        existed = made.is_dir()
        made.mkdir(parents=True, exist_ok=True)
        if not existed:
            try:
                os.chmod(str(made), 0o700)
            except OSError:
                pass


def _append(target, lines):
    flags = os.O_WRONLY | os.O_APPEND | os.O_CREAT
    fd = os.open(str(target), flags, 0o600)
    with os.fdopen(fd, "a", encoding="utf-8") as handle:
        handle.write("".join(line + "\n" for line in lines))
    try:
        os.chmod(str(target), 0o600)
    except OSError:
        pass


def _rotate(target):
    """Trim to the newest KEEP_LINES, always keeping the sentinel. Lock held."""
    try:
        if not target.is_file() or target.stat().st_size <= MAX_BYTES:
            return
        lines = _read_lines(target)
        kept = lines[-KEEP_LINES:]
        if not any((_parse(ln) or {}).get("kind") == SENTINEL_KIND for ln in kept):
            sentinel = next((ln for ln in lines
                             if (_parse(ln) or {}).get("kind") == SENTINEL_KIND), None)
            if sentinel is not None:
                kept = [sentinel] + kept[-(KEEP_LINES - 1):]
        atomic.write_text(target, "".join(ln + "\n" for ln in kept))
        try:
            os.chmod(str(target), 0o600)
        except OSError:
            pass
    except OSError as exc:
        log.failure("improve.rotate", exc, path=target)


def _finding_entries(layout):
    """One candidate record per finding in every ledger. Reads only."""
    entries = []
    try:
        files = sorted(layout.plans.glob("*/findings/*.md"))
    except OSError:
        return entries
    for path in files:
        try:
            plan_slug, unit = path.parent.parent.name, path.stem
            ledger = findings.load(layout, plan_slug, unit)
            for item in ledger.findings:
                kind = (KIND_FALSE_ALARM if item.status in FALSE_ALARM_STATUSES
                        else KIND_FINDING)
                entries.append(_build(
                    kind, unit, plan_slug, item.summary, item.confidence,
                    f"backfill:{plan_slug}/{unit}/{item.id}"))
        except Exception as exc:  # one bad ledger must not stop the others
            log.failure("improve.backfill", exc, path=path)
    return entries


def _has_sentinel(lines):
    return any((_parse(ln) or {}).get("kind") == SENTINEL_KIND for ln in lines)


def _backfill_locked(layout, target, lines):
    """Append unseen ledger findings plus the sentinel. Returns count added."""
    seen = {(_parse(ln) or {}).get("key") for ln in lines}
    fresh = []
    for entry in _finding_entries(layout):
        if entry["key"] not in seen:
            seen.add(entry["key"])
            fresh.append(entry)
    marker = _build(SENTINEL_KIND, "", "", "findings ledgers scanned", "high", None)
    _append(target, [json.dumps(e, sort_keys=True) for e in fresh + [marker]])
    return len(fresh)


def record(layout, config, kind, *, unit="", plan="", summary="",
           confidence="high", key=None):
    """Append one scrubbed record. Never raises; True if it was written.

    With `improve.enabled` false nothing is read, written or created. A repeated
    `key` is written once. The first call for a project backfills first.
    """
    try:
        if not enabled(config):
            return False
        entry = _build(kind, unit, plan, summary, confidence, key)
        target = path_for(layout)
        _ensure_dir(target.parent)
        with lock.held(layout, LOCK_NAME):
            lines = _read_lines(target)
            if not _has_sentinel(lines):
                _backfill_locked(layout, target, lines)
                lines = _read_lines(target)
            if "key" in entry and any(
                    (_parse(ln) or {}).get("key") == entry["key"] for ln in lines):
                return False
            _rotate(target)
            _append(target, [json.dumps(entry, sort_keys=True)])
        return True
    except Exception as exc:
        try:
            log.failure("improve.record", exc)
        except Exception:
            pass
        return False


def backfill(layout, config, force=False):
    """Record the existing findings once. Returns the number of records added.

    Does nothing (0) when disabled or when the sentinel is already present,
    unless `force`, which rescans and adds only findings not already keyed.
    """
    try:
        if not enabled(config):
            return 0
        target = path_for(layout)
        _ensure_dir(target.parent)
        with lock.held(layout, LOCK_NAME):
            lines = _read_lines(target)
            if _has_sentinel(lines) and not force:
                return 0
            return _backfill_locked(layout, target, lines)
    except Exception as exc:
        try:
            log.failure("improve.backfill", exc)
        except Exception:
            pass
        return 0


def records(layout, include_meta=False):
    """Parsed records, oldest first; corrupt lines are skipped.

    The backfill sentinel is bookkeeping, not a mistake, so it is left out
    unless `include_meta` is set.
    """
    try:
        lines = _read_lines(path_for(layout))
    except Exception:
        return
    for line in lines:
        entry = _parse(line)
        if entry is None:
            continue
        if entry.get("kind") == SENTINEL_KIND and not include_meta:
            continue
        yield entry
