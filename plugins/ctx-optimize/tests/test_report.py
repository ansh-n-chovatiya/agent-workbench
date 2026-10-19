# tests/test_report.py
from ctx_optimize.usage import Request
from ctx_optimize.snapshot import build_summary
from ctx_optimize.report import render_text


def test_report_separates_seats_and_shows_context():
    r = Request("s1", "p", "main", "main", "", "claude-x", 1, 5, 900, 100, 0, "", 1001)
    t = render_text(build_summary({"s1": [r]}, {"skipped_lines": 3}))
    assert "main" in t and "claude-x" in t
    assert "1,001" in t            # thousands separators
    assert "skipped lines: 3" in t
    assert "$" not in t            # never dollars


def test_report_empty():
    assert "no sessions" in render_text(build_summary({}, {})).lower()
