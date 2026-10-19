from ctx_optimize.usage import Request
from ctx_optimize.join import join_units, classify, _agents
from ctx_optimize.report import render_units
from ctx_optimize.snapshot import build_summary


def sub(agent, label, ts, aid, model="claude-opus-5-5", out=10, cr=100, sid="abcdef12-0000"):
    return Request(sid, "p", "subagent", agent, aid, model, 1, out, cr, 5, 0, ts, 106, label)


def main_req(cr=1000):
    return Request("abcdef12-0000", "p", "main", "main", "", "claude-sonnet-5-5", 1, 5, cr, 0, 0, "2026-10-19T09:00:00Z", cr + 1)


def story():
    return [
        sub("ctx:unit-runner", "Build unit 01", "2026-10-19T10:00:00Z", "a1", "claude-sonnet-5-5"),
        sub("ctx:reviewer", "Review unit 01", "2026-10-19T10:05:00Z", "a2"),
        sub("ctx:unit-runner", "Fix round: unit 01 findings", "2026-10-19T10:10:00Z", "a3"),
        sub("ctx:re-reviewer", "Re-review unit 01 round 2", "2026-10-19T10:15:00Z", "a4"),
        sub("ctx:verifier", "Verify unit 01", "2026-10-19T10:20:00Z", "a5"),
        sub("general-purpose", "Market research", "2026-10-19T10:21:00Z", "a6"),
        main_req(),
    ]


def test_stages_and_rounds_inferred_from_spawn_order():
    stages = [(u, s) for u, s, _ in classify(_agents(story()))]
    assert stages == [("01", "build"), ("01", "review r1"), ("01", "fix r1"),
                      ("01", "review r2"), ("01", "verify"), ("unattributed", "other")]


def test_second_runner_without_fix_word_is_still_a_fix():
    reqs = [sub("ctx:unit-runner", "Run unit 02", "2026-10-19T10:00:00Z", "b1"),
            sub("ctx:unit-runner", "Run unit 02 again", "2026-10-19T10:30:00Z", "b2")]
    assert [s for _, s, _ in classify(_agents(reqs))] == ["build", "fix r1"]


def test_join_totals_and_buckets():
    j = join_units(story())
    u = j["units"]["abcdef12/01"]
    assert set(u["stages"]) == {"build", "review r1", "fix r1", "review r2", "verify"}
    assert u["total"]["requests"] == 5 and u["total"]["cache_read"] == 500
    assert u["stages"]["build"]["models"] == {"claude-sonnet-5-5": 1}
    assert j["unattributed"]["requests"] == 1 and j["main_chat"]["cache_read"] == 1000


def test_nothing_is_lost_or_double_counted():
    reqs = story()
    j = join_units(reqs)
    total = sum(u["total"]["requests"] for u in j["units"].values()) + j["unattributed"]["requests"] + j["main_chat"]["requests"]
    assert total == len(reqs)


def test_units_do_not_collide_across_sessions():
    reqs = [sub("ctx:unit-runner", "Build unit 01", "t1", "a", sid="aaaaaaaa-1"),
            sub("ctx:unit-runner", "Build unit 01", "t2", "b", sid="bbbbbbbb-2")]
    assert set(join_units(reqs)["units"]) == {"aaaaaaaa/01", "bbbbbbbb/01"}


def test_render_units_and_summary_carry_attribution():
    s = build_summary({"abcdef12-0000": story()}, {})
    t = render_units(s)
    assert "abcdef12/01" in t and "review r2" in t and "main chat" in t and "$" not in t
