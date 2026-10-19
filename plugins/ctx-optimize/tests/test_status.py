import os
import time
from ctx_optimize.status import render, running_agents
from ctx_optimize.cli import main


def test_render_full_line():
    data = {"model": {"display_name": "Opus"}, "context_window": {"used_percentage": 34.7},
            "prompt_cache": {"warm": True, "expires_at": 1000 + 270}}
    assert render(data, now=1000) == "Opus · ctx 34% · cache warm 4m"


def test_render_cold_cache_and_missing_fields():
    assert render({"prompt_cache": {"warm": False}}, now=0) == "cache cold"
    assert render({"context_window": {"used_percentage": None}}, now=0) == ""
    assert render([], now=0) == "" and render(None, now=0) == ""


def test_running_agents_counts_recent_files_only(tmp_path):
    t = tmp_path / "s1.jsonl"
    t.write_text("")
    sub = tmp_path / "s1" / "subagents"
    sub.mkdir(parents=True)
    now = time.time()
    for name, age in [("agent-a.jsonl", 5), ("agent-b.jsonl", 500), ("agent-a.meta.json", 1)]:
        p = sub / name
        p.write_text("")
        os.utime(p, (now - age, now - age))
    assert running_agents(str(t), now) == 1
    assert running_agents(None, now) == 0 and running_agents(str(tmp_path / "x.jsonl"), now) == 0


def test_cli_statusline_reads_stdin_and_never_fails(monkeypatch, capsys):
    import io
    monkeypatch.setattr("sys.stdin", io.StringIO('{"model":{"display_name":"Sonnet"}}'))
    assert main(["statusline"]) == 0
    assert capsys.readouterr().out.strip() == "Sonnet"
    monkeypatch.setattr("sys.stdin", io.StringIO("not json"))
    assert main(["statusline"]) == 0
    assert capsys.readouterr().out.strip() == ""
