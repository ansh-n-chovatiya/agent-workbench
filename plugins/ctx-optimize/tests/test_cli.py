# tests/test_cli.py
import json
from ctx_optimize.cli import main
from test_usage import line


def seed(root):
    p = root / "-proj"
    p.mkdir(parents=True)
    (p / "s1.jsonl").write_text(line("r1", "m1", 10, cr=100))
    (p / "s2.jsonl").write_text(line("r2", "m2", 20, cr=200))


def test_report_json_and_snapshot(tmp_path, capsys):
    seed(tmp_path / "proj")
    snaps = tmp_path / "snaps"
    assert main(["report", "--root", str(tmp_path / "proj"), "--json", "--snapshot-dir", str(snaps)]) == 0
    data = json.loads(capsys.readouterr().out)
    assert set(data["sessions"]) == {"s1", "s2"}
    assert len(list(snaps.glob("usage-*.json"))) == 1


def test_session_filter_and_no_snapshot(tmp_path, capsys):
    seed(tmp_path / "proj")
    snaps = tmp_path / "snaps"
    main(["report", "--root", str(tmp_path / "proj"), "--session", "s2", "--json",
          "--no-snapshot", "--snapshot-dir", str(snaps)])
    assert set(json.loads(capsys.readouterr().out)["sessions"]) == {"s2"}
    assert not snaps.exists()


def test_text_default_and_missing_root(tmp_path, capsys):
    assert main(["report", "--root", str(tmp_path / "nope"), "--no-snapshot"]) == 0
    assert "No sessions found" in capsys.readouterr().out


def test_bad_arguments_exit_2():
    assert main(["report", "--day", "yesterday"]) == 2
