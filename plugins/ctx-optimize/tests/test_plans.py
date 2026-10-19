import os
import time
from datetime import datetime, timezone

import pytest

from ctx_optimize.plans import PlanWindow, iso_to_epoch, load_windows, plan_for


@pytest.fixture
def tz():
    old = os.environ.get("TZ")

    def set_tz(name):
        os.environ["TZ"] = name
        time.tzset()

    yield set_tz
    if old is None:
        os.environ.pop("TZ", None)
    else:
        os.environ["TZ"] = old
    time.tzset()


def utc(y, mo, d, h, mi=0):
    return datetime(y, mo, d, h, mi, tzinfo=timezone.utc).timestamp()


def journal(tmp_path, name, text):
    j = tmp_path / "journal"
    j.mkdir(exist_ok=True)
    (j / name).write_text(text)


def test_missing_dir(tmp_path):
    assert load_windows(tmp_path / "nope") == []


def test_local_time_conversion(tmp_path, tz):
    tz("Asia/Kolkata")  # UTC+05:30
    journal(tmp_path, "2026-10-19.md", "# 2026-10-19\n10:00 | build | p1 | start\n12:30 | build | p1 | end\n")
    (w,) = load_windows(tmp_path)
    assert w == PlanWindow("p1", utc(2026, 10, 19, 4, 30), utc(2026, 10, 19, 7, 0))


def test_spans_midnight_and_author_suffix(tmp_path, tz):
    tz("America/New_York")  # UTC-04:00 in October
    journal(tmp_path, "2026-10-19.md", "\n# 2026-10-19\n23:00 | s | pA | e\n")
    journal(tmp_path, "2026-10-20--alice.md", "00:30 | s | pA | e\n")  # no header: filename date
    journal(tmp_path, "2026-10-20--bob.md", "# 2026-10-20\n09:00 | s | pB | e\n")
    wins = load_windows(tmp_path)
    assert [w.plan for w in wins] == ["pA", "pB"]
    assert wins[0].start == utc(2026, 10, 20, 3)
    assert wins[0].end == utc(2026, 10, 20, 4, 30)
    assert wins[1].start == utc(2026, 10, 20, 13)


def test_skipped_lines(tmp_path, tz):
    tz("UTC")
    journal(tmp_path, "2026-10-19.md", "\n".join([
        "# 2026-10-19",
        "10:00 | s |  | blank plan",
        "10:01 | s | - | dash plan",
        "24:00 | s | bad | hour",
        "10:60 | s | bad | minute",
        "not a line",
        "10:02 | s | bad",
        "11:00 | s | ok | fine | with pipe",
    ]))
    (w,) = load_windows(tmp_path)
    assert w.plan == "ok" and w.start == w.end == utc(2026, 10, 19, 11)


def test_plan_for_overlap_and_grace():
    ws = [PlanWindow("old", 0, 1000), PlanWindow("new", 500, 800)]
    assert plan_for(ws, 600) == "new"
    assert plan_for(ws, 900) == "new"  # within new's grace, latest start wins
    assert plan_for(ws, 800 + 1801) == "old"  # new's grace expired
    assert plan_for(ws, 1000 + 1800) == "old"
    assert plan_for(ws, 1000 + 1801) is None
    assert plan_for(ws, -1) is None
    assert plan_for([], 5) is None
    assert plan_for(ws, 1500, grace=0) is None


def test_iso_to_epoch_forms():
    base = utc(2026, 10, 19, 10)
    assert iso_to_epoch("2026-10-19T10:00:00Z") == base
    assert iso_to_epoch("2026-10-19T10:00:00.250Z") == base + 0.25
    assert iso_to_epoch("2026-10-19T10:00:00.5Z") == base + 0.5
    assert iso_to_epoch("2026-10-19T10:00:00.123456789Z") == pytest.approx(base + 0.123456789)
    assert iso_to_epoch("2026-10-19T15:30:00+05:30") == base
    assert iso_to_epoch("2026-10-19T05:00:00-05:00") == base


@pytest.mark.parametrize("bad", ["", "garbage", "2026-10-19", "2026-10-19T10:00:00", "2026-13-19T10:00:00Z", None])
def test_iso_to_epoch_invalid(bad):
    assert iso_to_epoch(bad) is None
