"""Project rules: confirmed, general lessons kept as one line each in `.ctx/rules.md` (D12, phase 4).

The file lives with the project, never in ctx's code, and is capped: it is read by every review and every dispatch,
so an unbounded rule list would grow the context it exists to protect. When it is full the owner retires or merges
a rule before adding another. Nothing here calls a model, and nothing adds a rule on its own.
"""
import re

from . import atomic

MAX_RULES = 40
MAX_RULE_CHARS = 200
_ITEM = re.compile(r"^- (.+)$")


def path_for(layout):
    return layout.root / "rules.md"


def load(layout):
    """The rules, in order. A missing or unreadable file is no rules."""
    try:
        text = path_for(layout).read_text(encoding="utf-8")
    except OSError:
        return []
    return [m.group(1).strip() for m in map(_ITEM.match, text.splitlines()) if m and m.group(1).strip()]


def _save(layout, rules):
    body = "# Project rules\n\nOne line each. Confirmed and general. Retire a rule with `ctx rules --remove N`.\n\n"
    atomic.write_text(path_for(layout), body + "".join(f"- {r}\n" for r in rules))


def add(layout, text):
    """`(ok, message)`. Refuses an empty rule, a duplicate, and a full file (the cap is the point)."""
    rule = " ".join(str(text or "").split())[:MAX_RULE_CHARS]
    if not rule:
        return False, "a rule needs text: ctx rules --add \"the rule\""
    rules = load(layout)
    if rule in rules:
        return False, "that rule is already recorded"
    if len(rules) >= MAX_RULES:
        return False, (f"the rules file is full ({MAX_RULES}); retire or merge one first with "
                       "`ctx rules --remove N` — it is read by every review and dispatch")
    _save(layout, rules + [rule])
    return True, f"rule {len(rules) + 1} recorded"


def remove(layout, number):
    """`(ok, message)` for retiring rule `number` (1-based)."""
    rules = load(layout)
    try:
        index = int(number) - 1
    except (TypeError, ValueError):
        index = -1
    if not 0 <= index < len(rules):
        return False, f"no rule {number!r} (have {len(rules)})"
    gone = rules.pop(index)
    _save(layout, rules)
    return True, f"retired: {gone}"


def block(layout):
    """Lines for a review package or a dispatch brief; empty when there are no rules."""
    rules = load(layout)
    if not rules:
        return []
    return [f"{i}. {r}" for i, r in enumerate(rules, 1)]
