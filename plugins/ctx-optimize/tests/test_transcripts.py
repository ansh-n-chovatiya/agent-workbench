# tests/test_transcripts.py
import json
from ctx_optimize.transcripts import find_sessions, read_jsonl


def make(root):
    proj = root / "-Users-x-proj"
    proj.mkdir(parents=True)
    (proj / "s1.jsonl").write_text('{"a":1}\n')
    sub = proj / "s1" / "subagents"
    sub.mkdir(parents=True)
    (sub / "agent-abc.jsonl").write_text('{"b":2}\n')
    (sub / "agent-abc.meta.json").write_text(json.dumps({"agentType": "ctx:reviewer"}))
    (sub / "agent-nometa.jsonl").write_text("")
    (root / "-Users-x-other").mkdir()
    (root / "-Users-x-other" / "s2.jsonl").write_text("")
    return root


def test_find_sessions_pairs_subagents_with_meta(tmp_path):
    sessions = find_sessions(make(tmp_path), project="-Users-x-proj")
    assert [s.session_id for s in sessions] == ["s1"]
    pairs = {p.name: (m.name if m else None) for p, m in sessions[0].subagents}
    assert pairs == {"agent-abc.jsonl": "agent-abc.meta.json", "agent-nometa.jsonl": None}


def test_find_sessions_all_projects_and_missing_root(tmp_path):
    assert len(find_sessions(make(tmp_path))) == 2
    assert find_sessions(tmp_path / "nope") == []


def test_read_jsonl_skips_and_counts_bad_lines(tmp_path):
    f = tmp_path / "x.jsonl"
    f.write_text('{"ok":1}\nnot json\n\n[1,2]\n{"ok":2}\n')
    stats = {"skipped_lines": 0}
    assert list(read_jsonl(f, stats)) == [{"ok": 1}, {"ok": 2}]
    assert stats["skipped_lines"] == 2  # "not json" and the non-object; blank lines are free


def test_read_jsonl_unreadable_file_is_skipped(tmp_path):
    stats = {"skipped_lines": 0}
    assert list(read_jsonl(tmp_path / "missing.jsonl", stats)) == []


def test_project_filter_is_substring(tmp_path):
    root = make(tmp_path)
    assert [s.session_id for s in find_sessions(root, project="proj")] == ["s1"]
