"""D17's opt-in stop rule must leave the existing review loop intact."""

import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import config as config_mod, findings, review  # noqa: E402
from test_review import ReviewFixture  # noqa: E402


class RoundCeilingTests(unittest.TestCase):
    def setUp(self):
        self.config = copy.deepcopy(config_mod.DEFAULTS)
        self.config["review"]["stop_rule"] = True

    def finding(self, severity, status="open"):
        return findings.Finding(1, severity, "still broken", status=status)

    def test_default_off_still_allows_round_three(self):
        self.assertIs(config_mod.DEFAULTS["review"]["stop_rule"], False)
        self.assertEqual(findings.MAX_ROUNDS, 3)
        self.assertEqual(findings.round_ceiling(
            [self.finding("important")], config_mod.DEFAULTS,
        ), 3)

    def test_important_stops_before_round_three(self):
        self.assertEqual(findings.round_ceiling(
            [self.finding("important")], self.config,
        ), 2)

    def test_critical_allows_round_three_and_four_but_never_five(self):
        ceiling = findings.round_ceiling([self.finding("critical")], self.config)
        self.assertLessEqual(3, ceiling)
        self.assertLessEqual(4, ceiling)
        self.assertGreater(5, ceiling)

    def test_closed_critical_does_not_extend_the_loop(self):
        for status in ("addressed", "disputed", "parked"):
            with self.subTest(status=status):
                self.assertEqual(findings.round_ceiling(
                    [self.finding("critical", status), self.finding("important")],
                    self.config,
                ), 2)


class StopRuleReviewTests(ReviewFixture):
    def prepare(self, enabled=True):
        self.config["review"]["stop_rule"] = enabled
        # CLI calls reload the configuration; use the same switch on disk and
        # in direct build calls so both entry points exercise the same policy.
        self.write(".ctx/ctx.yaml", config_mod.render(self.config))
        unit = self.unit()
        self.write("src/a.py", "x = 1\n")
        review.capture_before(self.layout, self.config, unit, self.slug, self.root)
        self.write("src/a.py", "x = 2\n")
        path, _stats, problem = self.build(unit)
        self.assertEqual(problem, "")
        self.assertTrue(path.is_file())
        return unit

    def next_build(self, unit):
        return self.build(unit, 2, review.after_key(self.slug, unit.name, 1))

    def test_unchanged_round_two_writes_no_package(self):
        unit = self.prepare()
        path, _stats, problem = self.next_build(unit)
        self.assertIsNone(path)
        self.assertIn("unchanged since the last review (round 1)", problem)
        self.assertFalse(review.package_path(self.layout, self.slug, unit.name, 2).exists())

    def test_real_owned_edit_writes_package(self):
        unit = self.prepare()
        self.write("src/a.py", "x = 3\n")
        path, stats, problem = self.next_build(unit)
        self.assertEqual(problem, "")
        self.assertTrue(path.is_file())
        self.assertEqual(stats["modified"], 1)

    def test_off_unchanged_round_two_still_writes_package(self):
        unit = self.prepare(enabled=False)
        path, stats, problem = self.next_build(unit)
        self.assertEqual(problem, "")
        self.assertTrue(path.is_file())
        self.assertEqual((stats["added"], stats["modified"], stats["deleted"]), (0, 0, 0))

    def test_round_one_unchanged_still_writes_package(self):
        unit = self.prepare()
        self.write("src/a.py", "x = 1\n")
        path, _stats, problem = self.build(unit)
        self.assertEqual(problem, "")
        self.assertTrue(path.is_file())

    def test_cli_unchanged_notice_does_not_dispatch(self):
        unit = self.prepare()
        code, out = self.cli("review", unit.name, "--plan", self.slug, "--round", "2")
        self.assertEqual(code, 1, out)
        self.assertEqual(len(out.splitlines()), 1, out)
        self.assertIn("unchanged since the last review (round 1)", out)
        self.assertNotIn("Dispatch", out)
        self.assertFalse(review.package_path(self.layout, self.slug, unit.name, 2).exists())

    def test_cli_round_three_refuses_important_and_names_next_step(self):
        unit = self.prepare()
        findings.load(self.layout, self.slug, unit.name).add("important", "still broken")
        code, out = self.cli("review", unit.name, "--plan", self.slug, "--round", "3")
        self.assertEqual(code, 1, out)
        self.assertIn("review.stop_rule", out)
        self.assertIn("--status parked", out)
        self.assertIn("owner", out)
        self.assertIn("/ctx:decide", out)
        self.assertNotIn("Dispatch", out)

    def test_cli_critical_allows_round_three_and_four_with_edits(self):
        unit = self.prepare()
        findings.load(self.layout, self.slug, unit.name).add("critical", "data loss")
        # Each fix is compared with the immediately preceding reviewed tree,
        # not the original pre-work baseline.
        path, _stats, problem = self.next_build(unit)
        self.assertEqual(problem, "")
        self.assertTrue(path.is_file())
        for round_number in (3, 4):
            self.write("src/a.py", f"x = {round_number + 1}\n")
            code, out = self.cli("review", unit.name, "--plan", self.slug,
                                 "--round", str(round_number))
            self.assertEqual(code, 0, out)
            self.assertIn("Dispatch", out)
            self.assertTrue(review.package_path(
                self.layout, self.slug, unit.name, round_number,
            ).is_file())

    def test_cli_default_off_allows_round_three_unchanged(self):
        unit = self.prepare(enabled=False)
        self.next_build(unit)
        code, out = self.cli("review", unit.name, "--plan", self.slug, "--round", "3")
        self.assertEqual(code, 0, out)
        self.assertIn("Dispatch", out)
        self.assertTrue(review.package_path(self.layout, self.slug, unit.name, 3).is_file())

    def test_ledger_edit_is_not_an_empty_snapshot_delta(self):
        unit = self.prepare()
        findings.load(self.layout, self.slug, unit.name).add("important", "still broken")
        path, _stats, problem = self.next_build(unit)
        self.assertEqual(problem, "")
        self.assertTrue(path.is_file())

    def test_cli_round_five_refuses_even_critical(self):
        unit = self.prepare()
        findings.load(self.layout, self.slug, unit.name).add("critical", "data loss")
        code, out = self.cli("review", unit.name, "--plan", self.slug, "--round", "5")
        self.assertEqual(code, 1, out)
        self.assertIn("review.stop_rule reached (4)", out)
        self.assertNotIn("Dispatch", out)


if __name__ == "__main__":
    unittest.main()
