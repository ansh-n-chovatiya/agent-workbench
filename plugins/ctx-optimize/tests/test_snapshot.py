import json
from ctx_optimize.usage import Request
from ctx_optimize.snapshot import build_summary, write_snapshot, read_snapshot, snapshot_dir


def req(seat="main", model="m", out=1, cr=10):
    return Request("s1", "p", seat, "main" if seat == "main" else "a", "", model, 1, out, cr, 0, 0, "", 1 + cr)


def test_summary_has_counts_only_and_totals():
    s = build_summary({"s1": [req(), req("subagent")]}, {"skipped_lines": 2})
    assert s["version"] == 1 and s["skipped_lines"] == 2
    assert s["sessions"]["s1"]["project"] == "p"
    assert s["total"]["by_seat_model"]["main|m"]["requests"] == 1
    text = json.dumps(s)
    assert "message" not in text and "content" not in text


def test_write_read_round_trip_and_atomic(tmp_path):
    s = build_summary({"s1": [req()]}, {})
    path = write_snapshot(s, tmp_path / "new", "20261019T100000")
    assert path.name == "usage-20261019T100000.json"
    assert read_snapshot(path) == s
    assert [p.name for p in path.parent.iterdir()] == [path.name]


def test_snapshot_dir_env_override(monkeypatch, tmp_path):
    monkeypatch.setenv("CTX_OPTIMIZE_HOME", str(tmp_path))
    assert snapshot_dir() == tmp_path
