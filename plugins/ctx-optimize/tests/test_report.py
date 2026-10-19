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


def test_unit_table_stays_aligned_with_a_long_plan_name():
    from ctx_optimize.report import render_units
    row = {"requests": 7, "input": 1, "output": 2, "cache_read": 3, "cache_write": 4, "models": {"m": 7}}
    empty = {"requests": 0, "input": 0, "output": 0, "cache_read": 0, "cache_write": 0, "models": {}}
    summary = {"attribution": {"units": {"a-very-long-plan-name-for-the-alignment-check/01": {"stages": {"build": row}, "total": row}},
                               "main_chat": empty, "unattributed": empty}}
    lines = render_units(summary).splitlines()
    col = lines[1].index("reqs") + len("reqs")
    for line in lines[2:]:
        assert line[col - 1].isdigit() and line[col] == " ", line
