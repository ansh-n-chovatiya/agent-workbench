import json
from ctx_optimize.transcripts import SessionFiles
from ctx_optimize.usage import load_session, aggregate


def line(rid, mid, out, inp=1, cr=0, cw=0, model="claude-sonnet-5-5", block=0):
    return json.dumps({
        "type": "assistant", "requestId": rid, "apiBlockIndex": block,
        "timestamp": "2026-10-19T10:00:00Z", "sessionId": "s1",
        "message": {"id": mid, "model": model, "usage": {
            "input_tokens": inp, "output_tokens": out,
            "cache_read_input_tokens": cr, "cache_creation_input_tokens": cw,
            "output_tokens_details": {"thinking_tokens": 3}}}})


def build(tmp_path):
    main = tmp_path / "s1.jsonl"
    main.write_text("\n".join([
        line("r1", "m1", 10, cr=100, cw=5, block=0),
        line("r1", "m1", 10, cr=100, cw=5, block=1),      # duplicate block line
        line("r2", "m2", 20, cr=300),
        json.dumps({"type": "user", "message": {"content": "hi"}}),
        json.dumps({"type": "assistant", "message": {"id": "m3", "usage": None}}),
    ]))
    sub = tmp_path / "agent-a.jsonl"
    sub.write_text(line("r9", "m9", 7, cr=50, model="claude-opus-5-5"))
    meta = tmp_path / "agent-a.meta.json"
    meta.write_text(json.dumps({"agentType": "ctx:reviewer", "model": "opus"}))
    return SessionFiles("p", "s1", main, [(sub, meta)])


def test_dedupes_block_lines_and_ignores_non_usage(tmp_path):
    reqs = load_session(build(tmp_path), {})
    assert sorted(r.output for r in reqs if r.seat == "main") == [10, 20]


def test_conflicting_duplicates_keep_largest_output(tmp_path):
    f = tmp_path / "s1.jsonl"
    f.write_text("\n".join([line("r1", "m1", 5), line("r1", "m1", 12, block=1)]))
    reqs = load_session(SessionFiles("p", "s1", f, []), {})
    assert [r.output for r in reqs] == [12]


def test_seat_comes_from_file_and_meta(tmp_path):
    reqs = load_session(build(tmp_path), {})
    sub = [r for r in reqs if r.seat == "subagent"]
    assert len(sub) == 1 and sub[0].agent == "ctx:reviewer" and sub[0].model == "claude-opus-5-5"
    assert sub[0].context == 1 + 50 + 0 and sub[0].thinking == 3


def test_missing_meta_gives_unknown_agent(tmp_path):
    f = tmp_path / "agent-z.jsonl"
    f.write_text(line("r1", "m1", 1))
    reqs = load_session(SessionFiles("p", "s1", tmp_path / "none.jsonl", [(f, None)]), {})
    assert reqs[0].agent == "unknown"


def test_aggregate_totals_context_and_share(tmp_path):
    agg = aggregate(load_session(build(tmp_path), {}))
    m = agg["by_seat_model"]["main|claude-sonnet-5-5"]
    assert (m["requests"], m["output"], m["cache_read"], m["cache_write"]) == (2, 30, 400, 5)
    assert agg["context"]["main"]["mean"] == (106 + 301) / 2
    assert agg["context"]["main"]["max"] == 301
    assert round(agg["seat_share"]["subagent"], 4) == round(50 / 450, 4)


def test_aggregate_empty():
    agg = aggregate([])
    assert agg["by_seat_model"] == {} and agg["seat_share"] == {"main": 0.0, "subagent": 0.0}


def test_requests_repeated_in_a_resumed_session_are_counted_once(tmp_path):
    from ctx_optimize.usage import dedupe_across
    early = tmp_path / "early.jsonl"
    early.write_text(line("r1", "m1", 10, cr=100).replace("2026-10-19T10:00:00Z", "2026-10-19T09:00:00Z"))
    late = tmp_path / "late.jsonl"
    late.write_text("\n".join([  # a resumed session copies r1, then adds r2
        line("r1", "m1", 10, cr=100).replace("2026-10-19T10:00:00Z", "2026-10-19T09:00:00Z"),
        line("r2", "m2", 20, cr=200).replace("2026-10-19T10:00:00Z", "2026-10-19T11:00:00Z")]))
    per = {"late": load_session(SessionFiles("p", "late", late, []), {}),
           "early": load_session(SessionFiles("p", "early", early, []), {})}
    out = dedupe_across(per)
    assert [r.output for r in out["early"]] == [10]          # the earlier session keeps the request
    assert [r.output for r in out["late"]] == [20]           # the copy is dropped from the later one
