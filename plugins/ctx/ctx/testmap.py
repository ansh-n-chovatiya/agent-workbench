"""Which acceptance criterion has a test, and which has none: a table for the review package (D12, phase 4).

Computed in code from the test files the change touched. A test counts for criterion N when it says so (`AC2`,
`criterion 2`, `c2` in its name or body) or, failing that, when its name shares two or more significant words with the
criterion; that second kind is marked as a guess. A criterion with no test is the row a reviewer most needs. Nothing
here calls a model.
"""
import re

_TEST_FILE = re.compile(r"(^|/)(test_[^/]*\.py|[^/]*_test\.py|[^/]*\.(test|spec)\.(js|jsx|mjs|cjs|ts|tsx))$")
_PY_TEST = re.compile(r"^[ \t]*(?:async[ \t]+)?def[ \t]+(test\w*)[ \t]*\(", re.M)
_JS_TEST = re.compile(r"^[ \t]*(?:it|test)(?:\.\w+)?\([ \t]*(['\"`])(.+?)\1", re.M)
_TAG = re.compile(r"\b(?:ac|criterion|criteria|c)[ _\-]?#?(\d{1,2})\b", re.I)
_STOP = {"that", "this", "with", "from", "when", "then", "must", "should", "which", "have", "each", "into", "does",
         "test", "tests", "case", "returns", "return", "given", "using", "used", "uses"}
MAX_TESTS_PER_ROW = 4
MIN_SHARED_WORDS = 2


def is_test_file(path):
    return bool(_TEST_FILE.search(path.replace("\\", "/")))


def tests_in(text, path):
    """`[(name, body)]` for the tests defined in `text`; empty when `path` is not a test file."""
    if not text or not is_test_file(path):
        return []
    found = [(m.start(), m.group(1)) for m in _PY_TEST.finditer(text)]
    found += [(m.start(), m.group(2)) for m in _JS_TEST.finditer(text)]
    found.sort()
    out = []
    for i, (start, name) in enumerate(found):
        end = found[i + 1][0] if i + 1 < len(found) else len(text)
        out.append((name, text[start:end]))
    return out


def _words(text):
    return {w for w in re.findall(r"[a-z]{4,}", text.lower().replace("_", " ")) if w not in _STOP}


def _tagged(name, body):
    return {int(n) for n in _TAG.findall(name.replace("_", " ") + "\n" + body)}


def map_criteria(criteria, tests):
    """`[(criterion, [(test label, guessed)])]`, one row per criterion; `tests` is `[(path, name, body)]`."""
    rows = [[c, []] for c in criteria]
    for path, name, body in tests:
        label = f"{path}::{name}"
        tagged = _tagged(name, body)
        for i, row in enumerate(rows, 1):
            if i in tagged:
                row[1].append((label, False))
            elif not tagged and len(_words(name) & _words(row[0])) >= MIN_SHARED_WORDS:
                row[1].append((label, True))
    return [(c, found) for c, found in rows]


def render(criteria, tests):
    """Lines for the `## Tests by criterion` section."""
    if not criteria:
        return ["No acceptance criteria are stated, so there is nothing to map tests to."]
    if not tests:
        return ["No test file was added or modified in this change, so no criterion has a test here. "
                "(A test that already existed and still passes is not shown.)"]
    rows = map_criteria(criteria, tests)
    out = ["Tests added or modified in this change, matched to criteria by an explicit tag (`AC2`, `criterion 2`)",
           "or, marked *guess*, by words shared with the test name. A criterion marked NONE has no such test.", ""]
    for i, (criterion, found) in enumerate(rows, 1):
        short = " ".join(criterion.split())
        short = short if len(short) <= 90 else short[:87] + "..."
        if not found:
            out.append(f"{i}. {short}: **NONE**")
            continue
        shown = [f"`{label}`" + (" *guess*" if guessed else "") for label, guessed in found[:MAX_TESTS_PER_ROW]]
        more = f" and {len(found) - MAX_TESTS_PER_ROW} more" if len(found) > MAX_TESTS_PER_ROW else ""
        out.append(f"{i}. {short}: {', '.join(shown)}{more}")
    return out


def gather(read_after, paths):
    """`[(path, name, body)]` from the changed paths that are test files; `read_after(path)` gives the new text."""
    out = []
    for path in paths:
        if not is_test_file(path):
            continue
        for name, body in tests_in(read_after(path), path):
            out.append((path, name, body))
    return out
