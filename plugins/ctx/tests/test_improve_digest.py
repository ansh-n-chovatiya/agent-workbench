"""The improvement digest is built at session end, surfaced at session start, and marked seen unaided (unit 03).

Every test is tagged `AC<n>`. Controls matter as much as positives: fewer than three occurrences gives no suggestion,
low-confidence records never reach the threshold, nothing unread leaves the briefing unchanged, and a hostile record
never reaches the digest.
"""

import os
import sys
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import briefing, config as config_mod, improve, improve_digest, state  # noqa: E402
from support import Fixture  # noqa: E402

HOSTILE = ("crash in /Users/you/secret/app.py for jane@example.com token "
           "sk-ant-api03-AbCdEf0123456789AbCdEf0123456789 def leak(): return open('/home/user/.ssh/id_rsa')")


class DigestFixture(Fixture):
    def cfg(self):
        return config_mod.load(self.layout)

    def rec(self, kind, summary="a thing", n=1, confidence="high", unit="01-a"):
        for i in range(n):
            improve.record(self.layout, self.cfg(), kind, unit=unit, plan="p1", summary=summary,
                           confidence=confidence, key=f"{kind}:{summary}:{confidence}:{unit}:{i}")

    def build(self):
        path = improve_digest.build(self.layout, self.cfg())
        self.assertIsNotNone(path)
        return path.read_text(encoding="utf-8")

    def brief(self):
        return briefing.build(self.layout, self.cfg(), state.load(self.layout))


class TestBuild(DigestFixture):
    def test_AC1_sections_counts_and_suggestion_at_three(self):
        self.rec("review-finding", "missing null check", 3)
        self.rec("reviewer-false-alarm", "style nit", 3)
        self.rec("forced-done", "overrode the gate", 3)
        self.rec("blocked", "unit marked blocked", 1)
        text = self.build()
        for title in ("Builder missed", "Reviewer false alarm", "Process friction", "Manual fixes", "Possible redos"):
            self.assertIn("## " + title, text)
        self.assertIn("missing null check: seen 3 time(s)", text)
        self.assertEqual(text.count("suggested change:"), 3)
        self.assertIn("blocked: seen 1 time(s)", text)

    def test_AC1_control_fewer_than_three_gives_no_suggestion(self):
        self.rec("review-finding", "missing null check", 2)
        self.rec("forced-done", "overrode the gate", 2)
        text = self.build()
        self.assertIn("seen 2 time(s)", text)
        self.assertNotIn("suggested change", text)

    def test_AC1_control_low_confidence_never_reaches_the_threshold(self):
        self.rec("review-finding", "missing null check", 2)
        self.rec("review-finding", "missing null check", 5, confidence="low", unit="02-b")
        self.rec("manual-fix", "edited a.py after unit was done", 4, confidence="low")
        self.rec("possible-redo", "correction after completion", 4, confidence="low")
        text = self.build()
        self.assertNotIn("suggested change", text)
        self.assertIn("never counted: 5", text)
        self.assertIn("manual-fix: seen 4 time(s)", text)
        self.assertIn("possible-redo: seen 4 time(s)", text)
        self.assertIsNone(improve_digest.unread(self.layout, self.cfg()))

    def test_AC1_hostile_record_never_reaches_the_digest(self):
        self.rec("review-finding", HOSTILE, 3)
        self.rec("manual-miss", HOSTILE, 3, unit="02-b")
        text = self.build()
        for needle in ("/Users/you", "/home/user", "jane@example.com", "sk-ant", "AbCdEf0123", "leak", "id_rsa",
                       "secret/app"):
            self.assertNotIn(needle, text)
        self.assertIn("suggested change", text)  # the pattern is still counted
        self.assertTrue(improve_digest.WITHHELD in text)

    def test_AC1_location_and_mode(self):
        self.rec("blocked", "x", 1)
        self.build()
        path = improve_digest.digest_path(self.layout)
        self.assertEqual(path.parent, improve.store_dir())
        self.assertTrue(path.name.endswith("-digest.md"))
        if os.name == "posix":
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_AC1_disabled_writes_nothing(self):
        cfg = self.layout.config
        cfg.write_text(cfg.read_text(encoding="utf-8") + "\nimprove:\n  enabled: false\n", encoding="utf-8")
        self.assertIsNone(improve_digest.build(self.layout, self.cfg()))
        self.assertFalse(improve_digest.digest_path(self.layout).exists())


class TestSessionEnd(DigestFixture):
    def test_AC2_session_end_builds_when_records_are_newer(self):
        self.rec("blocked", "x", 3)
        self.assertFalse(improve_digest.digest_path(self.layout).exists())
        code, _ = self.run_hook("SessionEnd", reason="clear")
        self.assertEqual(code, 0)
        self.assertTrue(improve_digest.digest_path(self.layout).is_file())

    def test_AC2_control_no_rebuild_when_the_digest_is_current(self):
        self.rec("blocked", "x", 3)
        self.build()
        digest = improve_digest.digest_path(self.layout)
        os.utime(str(digest), (time.time() + 100, time.time() + 100))
        digest.write_text("sentinel", encoding="utf-8")
        os.utime(str(digest), (time.time() + 100, time.time() + 100))
        self.run_hook("SessionEnd")
        self.assertEqual(digest.read_text(encoding="utf-8"), "sentinel")

    def test_AC2_fail_open_when_build_raises(self):
        self.rec("blocked", "x", 3)
        original = improve_digest._analyse

        def boom(_records):
            raise RuntimeError("boom")

        improve_digest._analyse = boom
        try:
            code, _ = self.run_hook("SessionEnd")
        finally:
            improve_digest._analyse = original
        self.assertEqual(code, 0)

    def test_AC2_no_log_means_no_digest_and_no_error(self):
        code, _ = self.run_hook("SessionEnd")
        self.assertEqual(code, 0)
        self.assertFalse(improve_digest.digest_path(self.layout).exists())


class TestBriefing(DigestFixture):
    def check_level(self, level):
        state.update(self.layout, level=level)
        before = self.brief()
        self.rec("forced-done", "overrode the gate", 3)
        self.build()
        after = self.brief()
        extra = [ln for ln in after.splitlines() if ln not in before.splitlines()]
        self.assertLessEqual(len(after), config_mod.briefing_cap(self.cfg(), level))
        self.assertEqual(len(extra), 1)
        self.assertTrue(extra[0].startswith("[ctx] improve: 1 unread"), extra[0])
        self.assertFalse(briefing.measure(self.layout, self.cfg(), state.load(self.layout))["truncated"])
        return extra[0]

    def test_AC3_unread_actionable_adds_exactly_one_line_at_every_level(self):
        # L0's 220-character cap gets the short form of the line; L1 and L2 get the whole instruction. Either way it
        # is exactly one extra line, the cap holds, and the briefing is never marked truncated.
        for level in ("0", "1", "2"):
            with self.subTest(level=level):
                self.check_level(level)
                for path in improve.store_dir().glob("*"):
                    path.unlink()

    def test_AC3_levels_with_room_carry_the_whole_instruction(self):
        line = self.check_level("2")
        self.assertIn("normal spec flow", line)
        self.assertIn("owner's merge", line)

    def test_AC3_line_names_the_digest_path_and_the_rule(self):
        self.rec("forced-done", "overrode the gate", 3)
        self.build()
        line = improve_digest.briefing_line(self.layout, self.cfg())
        shown = "~/" + improve_digest.digest_path(self.layout).relative_to(Path.home()).as_posix()
        self.assertIn(shown, line)
        self.assertIn("smallest change", line)
        self.assertIn("itself changes only through review and the owner's merge", line)

    def test_AC3_control_nothing_unread_leaves_the_briefing_byte_identical(self):
        state.update(self.layout, level="2")
        baseline = self.brief()
        self.assertEqual(self.brief(), baseline)
        self.rec("forced-done", "overrode the gate", 2)  # below threshold: not actionable
        self.build()
        self.assertEqual(self.brief(), baseline)
        self.rec("review-finding", "x", 9, confidence="low")
        self.build()
        self.assertEqual(self.brief(), baseline)

    def test_AC3_measuring_the_briefing_marks_nothing(self):
        self.rec("forced-done", "overrode the gate", 3)
        self.build()
        first = self.brief()
        self.assertEqual(self.brief(), first)
        self.assertIsNotNone(improve_digest.unread(self.layout, self.cfg()))


class TestSeen(DigestFixture):
    def setUp(self):
        super().setUp()
        state.update(self.layout, level="2")  # L0's 220-character cap rarely has room for the line

    def start(self, session):
        return self.run_hook("SessionStart", session_id=session)[1]

    def test_AC4_shown_once_then_seen_at_the_next_session_start(self):
        self.rec("forced-done", "overrode the gate", 3)
        self.run_hook("SessionEnd")
        first = self.start("s1")
        self.assertIn("unread pattern", first)
        self.assertIn("unread pattern", self.start("s1"))  # same session starting again (resume): still offered
        second = self.start("s2")
        self.assertNotIn("unread pattern", second)
        self.assertNotIn("unread pattern", self.start("s3"))

    def test_AC4_a_changed_actionable_set_is_unread_again(self):
        self.rec("forced-done", "overrode the gate", 3)
        self.run_hook("SessionEnd")
        self.start("s1")
        self.start("s2")
        self.rec("blocked", "unit marked blocked", 3, unit="02-b")
        self.build()
        self.assertIn("unread pattern", self.start("s3"))

    def test_AC4_control_a_new_low_confidence_record_does_not_resurface_a_read_digest(self):
        self.rec("forced-done", "overrode the gate", 3)
        self.run_hook("SessionEnd")
        self.start("s1")
        self.start("s2")
        self.rec("possible-redo", "correction after completion", 1, confidence="low")
        self.build()
        self.assertNotIn("unread pattern", self.start("s3"))

    def test_AC4_no_session_id_still_settles(self):
        self.rec("forced-done", "overrode the gate", 3)
        self.run_hook("SessionEnd")
        self.assertIn("unread pattern", self.start(None))
        self.assertNotIn("unread pattern", self.start(None))


class TestCommands(DigestFixture):
    def test_AC5_improve_builds_and_prints_the_path(self):
        self.rec("blocked", "x", 1)
        code, out = self.cli("improve")
        self.assertEqual(code, 0)
        self.assertEqual(out.strip(), str(improve_digest.digest_path(self.layout)))
        self.assertTrue(improve_digest.digest_path(self.layout).is_file())

    def test_AC5_improve_backfill_runs(self):
        code, _ = self.cli("improve", "--backfill")
        self.assertEqual(code, 0)

    def test_AC5_miss_records_a_scrubbed_high_confidence_manual_miss(self):
        code, _ = self.cli("miss", "forgot the", "check in /Users/you/x/y.py mail jane@example.com")
        self.assertEqual(code, 0)
        found = [r for r in improve.records(self.layout) if r["kind"] == "manual-miss"]
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]["confidence"], "high")
        text = improve.path_for(self.layout).read_text(encoding="utf-8")
        self.assertNotIn("/Users/you", text)
        self.assertNotIn("jane@example.com", text)

    def test_AC5_miss_with_no_text_records_nothing(self):
        code, _ = self.cli("miss")
        self.assertEqual(code, 1)
        self.assertEqual([r for r in improve.records(self.layout) if r["kind"] == "manual-miss"], [])

    def test_AC5_improve_off_exits_nonzero_and_writes_nothing(self):
        cfg = self.layout.config
        cfg.write_text(cfg.read_text(encoding="utf-8") + "\nimprove:\n  enabled: false\n", encoding="utf-8")
        code, _ = self.cli("improve")
        self.assertEqual(code, 1)
        self.assertFalse(improve_digest.digest_path(self.layout).exists())


class TestReviewFindings(DigestFixture):
    """Round-1 review: placement, honest "shown", and no resurfacing on counts."""

    def start(self, session, level):
        state.update(self.layout, level=level)
        return self.run_hook("SessionStart", session_id=session)[1]

    def test_AC3_an_unseen_line_is_not_marked_shown(self):
        self.rec("forced-done", "overrode the gate", 3)
        self.run_hook("SessionEnd")
        cfg = self.layout.config
        cfg.write_text(cfg.read_text(encoding="utf-8") + "\nbriefing_chars:\n  l0: 60\n", encoding="utf-8")
        self.assertNotIn("[ctx] improve:", self.start("s1", "0"))   # no room even for the short line: dropped whole
        self.start("s2", "0")
        state.update(self.layout, level="2")
        self.assertIn("[ctx] improve:", self.run_hook("SessionStart", session_id="s3")[1])  # never seen: still offered

    def test_AC3_level_zero_gets_the_short_form(self):
        self.rec("forced-done", "overrode the gate", 3)
        self.build()
        state.update(self.layout, level="0")
        text = briefing.build(self.layout, self.cfg(), state.load(self.layout))
        self.assertIn("[ctx] improve: 1 unread, see ~/", text)
        self.assertNotIn("propose the smallest change", text)

    def test_AC3_the_line_comes_last_and_never_displaces_the_active_work(self):
        self.rec("forced-done", "overrode the gate", 3)
        self.build()
        state.update(self.layout, level="2")
        text = briefing.build(self.layout, self.cfg(), state.load(self.layout))
        self.assertTrue(text.splitlines()[-1].startswith("[ctx] improve:"))

    def test_AC4_a_new_occurrence_of_a_read_pattern_does_not_resurface_it(self):
        self.rec("forced-done", "overrode the gate", 3)
        self.run_hook("SessionEnd")
        self.start("s1", "2")
        self.start("s2", "2")                                        # now seen
        self.rec("forced-done", "overrode the gate", 5)              # 3 -> 5 of the same pattern
        self.build()
        self.assertNotIn("unread pattern", self.start("s3", "2"))

    def test_AC5_control_a_new_actionable_pattern_does_resurface(self):
        self.rec("forced-done", "overrode the gate", 3)
        self.run_hook("SessionEnd")
        self.start("s1", "2")
        self.start("s2", "2")
        self.rec("blocked", "gate refused twice", 3)
        self.build()
        self.assertIn("unread pattern", self.start("s3", "2"))


if __name__ == "__main__":
    unittest.main()
