"""Who still mentions what a change altered: a caller list for the review package, computed in code (D12, phase 4).

A reviewer shown only the diff cannot see a caller the change broke, because the broken file is not in the diff. This
finds functions and classes whose signature was added, removed or changed (Python, JavaScript and TypeScript, by
pattern: cheap and language-light by design) and word-matches the names across the rest of the project. A match is a
lead for the reviewer to read, not proof of a call. Nothing here calls a model.
"""
import re
from pathlib import Path

_PY = [
    re.compile(r"^[ \t]*(?:async[ \t]+)?def[ \t]+(\w+)[ \t]*\(([^)]{0,500})\)", re.M),
    re.compile(r"^[ \t]*class[ \t]+(\w+)[ \t]*(?:\(([^)]{0,300})\))?[ \t]*:", re.M),
]
_JS = [
    re.compile(r"^[ \t]*(?:export[ \t]+)?(?:default[ \t]+)?(?:async[ \t]+)?function\*?[ \t]+(\w+)[ \t]*\(([^)]{0,500})\)", re.M),
    re.compile(r"^[ \t]*(?:export[ \t]+)?(?:default[ \t]+)?class[ \t]+(\w+)()", re.M),
    re.compile(r"^[ \t]*(?:export[ \t]+)?const[ \t]+(\w+)[ \t]*=[ \t]*(?:async[ \t]+)?\(([^)]{0,500})\)[ \t]*=>", re.M),
    re.compile(r"^[ \t]*(?:export[ \t]+)?const[ \t]+(\w+)[ \t]*=[ \t]*(?:async[ \t]+)?(\w+)[ \t]*=>", re.M),
]
_PATTERNS = {".py": _PY, ".js": _JS, ".jsx": _JS, ".mjs": _JS, ".cjs": _JS, ".ts": _JS, ".tsx": _JS}

SCAN_EXTENSIONS = {".py", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".md", ".json", ".yaml", ".yml",
                   ".toml", ".sh", ".html", ".css"}
MAX_FILE_BYTES = 200_000
MAX_FILES = 3000
MAX_SYMBOLS = 40       # symbols listed in one package
MAX_REFS = 8           # references listed per symbol
TOO_MANY_FILES = 12    # a name mentioned in more files than this is summarised, not listed


def signatures(text, path):
    """`{name: normalised signature}` for the functions and classes defined in `text` (empty for other languages)."""
    patterns = _PATTERNS.get(Path(path).suffix.lower())
    if not patterns or not text:
        return {}
    found = {}
    for pattern in patterns:
        for m in pattern.finditer(text):
            name = m.group(1)
            if name.startswith("__") and name.endswith("__"):
                continue
            sig = " ".join((m.group(2) or "").split())
            found.setdefault(name, set()).add(sig)
    return {name: " | ".join(sorted(sigs)) for name, sigs in found.items()}


def changed_symbols(before, after, path):
    """`{name: "added" | "removed" | "changed"}` for signatures that differ; body-only edits do not count."""
    old, new = signatures(before or "", path), signatures(after or "", path)
    out = {}
    for name in sorted(set(old) | set(new)):
        if name not in old:
            out[name] = "added"
        elif name not in new:
            out[name] = "removed"
        elif old[name] != new[name]:
            out[name] = "changed"
    return out


def find_callers(root, relpaths, symbols, exclude=()):
    """`{symbol: [(relpath, line), ...]}`: where else each name appears, as a whole word, outside `exclude`."""
    root = Path(root)
    found = {name: [] for name in symbols}
    if not symbols:
        return found
    compiled = {name: re.compile(r"\b" + re.escape(name) + r"\b") for name in symbols}
    scanned = 0
    for rel in sorted(relpaths):
        if rel in exclude or Path(rel).suffix.lower() not in SCAN_EXTENSIONS:
            continue
        path = root / rel
        try:
            if path.stat().st_size > MAX_FILE_BYTES:
                continue
            text = path.read_text(encoding="utf-8", errors="strict")
        except (OSError, UnicodeDecodeError):
            continue
        scanned += 1
        if scanned > MAX_FILES:
            break
        for number, line in enumerate(text.splitlines(), 1):
            for name, pattern in compiled.items():
                if pattern.search(line):
                    found[name].append((rel, number))
    return found


def render(changed, found):
    """The package lines for the `## Callers` section."""
    lines = [
        "Computed from the diff in code, not by a model: functions and classes whose signature was added, removed or",
        "changed, and the files outside this change that mention the name (word match; a lead to read, not proof of a",
        "call). For a removed name that is still mentioned, or a changed signature, read that caller (reading outside",
        "the diff is allowed for exactly this) and report whether it breaks.",
        "",
    ]
    if not changed:
        return lines + ["No function or class signature changed in a language this check reads "
                        "(Python, JavaScript, TypeScript)."]
    names = sorted(changed)
    for name in names[:MAX_SYMBOLS]:
        kind, refs = changed[name], found.get(name, [])
        files = sorted({r[0] for r in refs})
        label = {"changed": "signature changed", "removed": "removed", "added": "added"}[kind]
        if not refs:
            lines.append(f"- `{name}` ({label}): no other file mentions it")
            continue
        if len(files) > TOO_MANY_FILES:
            lines.append(f"- `{name}` ({label}): {len(files)} files mention it (too many to list), "
                         f"e.g. {', '.join(files[:3])}")
            continue
        shown = ", ".join(f"{f}:{n}" for f, n in refs[:MAX_REFS])
        more = f" (+{len(refs) - MAX_REFS} more)" if len(refs) > MAX_REFS else ""
        lead = f"- `{name}` ({label})"
        lines.append(f"{lead} is still mentioned in: {shown}{more}" if kind == "removed" else f"{lead}: {shown}{more}")
    if len(names) > MAX_SYMBOLS:
        lines.append(f"- … and {len(names) - MAX_SYMBOLS} more changed symbols")
    return lines
