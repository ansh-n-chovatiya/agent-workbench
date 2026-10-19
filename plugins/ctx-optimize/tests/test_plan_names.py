import json
from datetime import datetime
from ctx_optimize.cli import main
from ctx_optimize.join import join_units
from ctx_optimize.plans import PlanWindow
from test_join import story, sub


def _epoch(s):
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%S").timestamp()


def test_no_windows_unchanged():
    base = join_units(story())
    assert join_units(story(), None) == base
    assert join_units(story(), []) == base
    assert list(base["units"]) == ["abcdef12/01"]


def test_resolved_and_unresolved_in_same_run():
    from datetime import timezone
    t = datetime(2026, 10, 19, 10, 0, tzinfo=timezone.utc).timestamp()
    wins = [PlanWindow("planA", t - 60, t + 3600)]
    reqs = [sub("ctx:unit-runner", "Build unit 01", "2026-10-19T10:00:00Z", "a1"),
            sub("ctx:unit-runner", "Build unit 02", "2026-10-25T10:00:00Z", "a2")]
    assert set(join_units(reqs, wins)["units"]) == {"planA/01", "abcdef12/02"}


def _seed(tmp_path):
    p = tmp_path / "proj" / "-p"
    p.mkdir(parents=True)
    rec = {"type": "assistant", "timestamp": "2026-10-19T10:00:00Z", "sessionId": "abcdef12-0000",
           "requestId": "r1", "isSidechain": True, "agentId": "a1",
           "message": {"id": "m1", "model": "claude-opus-5-5",
                       "usage": {"input_tokens": 1, "output_tokens": 1}}}
    return p, rec


def _journal(base):
    j = base / "journal"
    j.mkdir(parents=True)
    # local-time journal entries; wide spread so any timezone covers the request
    (j / "2026-10-19.md").write_text("# 2026-10-19\n00:00 | x | planZ | start\n23:59 | x | planZ | end\n")
    (j / "2026-10-18.md").write_text("# 2026-10-18\n12:00 | x | planZ | start\n")


def test_ledger_flag_reaches_join(tmp_path, capsys, monkeypatch):
    base = tmp_path / "led" / ".ctx"
    _journal(base)
    p, _ = _seed(tmp_path)
    (p / "s.jsonl").write_text("")
    seen = []
    import ctx_optimize.cli as cli
    real = cli.build_summary
    monkeypatch.setattr(cli, "build_summary", lambda ps, st, w=None: (seen.append(w), real(ps, st, w))[1])
    main(["report", "--root", str(tmp_path / "proj"), "--no-snapshot"])
    main(["report", "--root", str(tmp_path / "proj"), "--ledger", str(tmp_path / "led"), "--no-snapshot"])
    main(["report", "--root", str(tmp_path / "proj"), "--ledger", str(base), "--no-snapshot"])
    capsys.readouterr()
    assert seen[0] is None
    assert [w.plan for w in seen[1]] == ["planZ"] and [w.plan for w in seen[2]] == ["planZ"]


def test_two_plans_with_the_same_unit_number_keep_their_own_stages():
    import calendar
    from ctx_optimize.join import join_units
    from ctx_optimize.plans import PlanWindow
    from ctx_optimize.usage import Request

    def sub(agent, label, ts, aid):
        return Request("abcdef12-0000", "p", "subagent", agent, aid, "m", 1, 5, 100, 0, 0, ts, 101, label)

    t = lambda h, m: float(calendar.timegm((2026, 10, 19, h, m, 0)))
    ws = [PlanWindow("alpha", t(10, 0), t(10, 10)), PlanWindow("beta", t(11, 0), t(11, 10))]
    reqs = [sub("ctx:unit-runner", "Build unit 01", "2026-10-19T10:00:00Z", "a1"),
            sub("ctx:reviewer", "Review unit 01", "2026-10-19T10:05:00Z", "a2"),
            sub("ctx:unit-runner", "Build unit 01", "2026-10-19T11:00:00Z", "b1"),
            sub("ctx:reviewer", "Review unit 01", "2026-10-19T11:05:00Z", "b2")]
    units = join_units(reqs, ws)["units"]
    assert set(units["alpha/01"]["stages"]) == {"build", "review r1"}
    assert set(units["beta/01"]["stages"]) == {"build", "review r1"}


def test_cli_end_to_end_names_the_plan_and_warns_on_a_missing_journal(tmp_path, capsys):
    import json
    from ctx_optimize.cli import main
    proj = tmp_path / "proj" / "-p"
    sub_dir = proj / "s1" / "subagents"
    sub_dir.mkdir(parents=True)
    (proj / "s1.jsonl").write_text("")
    (sub_dir / "agent-a.jsonl").write_text(json.dumps({
        "type": "assistant", "requestId": "r1", "timestamp": "2026-10-19T10:00:00Z",
        "message": {"id": "m1", "model": "claude-x", "usage": {
            "input_tokens": 1, "output_tokens": 2, "cache_read_input_tokens": 3, "cache_creation_input_tokens": 0}}}))
    (sub_dir / "agent-a.meta.json").write_text(json.dumps({"agentType": "ctx:unit-runner", "description": "Build unit 01"}))
    led = tmp_path / "work" / ".ctx" / "journal"
    led.mkdir(parents=True)
    (led / "2026-10-19.md").write_text("# 2026-10-19\n\n00:00 | build | alpha | go\n23:59 | build | alpha | done\n")
    assert main(["report", "--root", str(tmp_path / "proj"), "--units", "--no-snapshot", "--ledger", str(tmp_path / "work")]) == 0
    assert "alpha/01" in capsys.readouterr().out
    assert main(["report", "--root", str(tmp_path / "proj"), "--units", "--no-snapshot", "--ledger", str(tmp_path / "typo")]) == 0
    cap = capsys.readouterr()
    assert "no plan journal found" in cap.err and "/01" in cap.out
