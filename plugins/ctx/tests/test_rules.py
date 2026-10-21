"""Project rules: a capped, one-line-each file the owner curates and every review and dispatch reads (D12, phase 4).

Controls: a full file refuses another rule (the cap is the point), no rules leaves the review package and the
dispatch brief exactly as before, and nothing ever adds a rule on its own.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import dispatch, review as review_mod, rules  # noqa: E402
from support import Fixture  # noqa: E402
from test_sibling_scope import WaveFixture, section_lines  # noqa: E402


class TestFile(Fixture):
    def test_add_list_and_remove_round_trip(self):
        self.assertEqual(rules.add(self.layout, "validate input at the boundary"), (True, "rule 1 recorded"))
        rules.add(self.layout, "never swallow an error")
        self.assertEqual(rules.load(self.layout), ["validate input at the boundary", "never swallow an error"])
        ok, message = rules.remove(self.layout, 1)
        self.assertTrue(ok, message)
        self.assertEqual(rules.load(self.layout), ["never swallow an error"])

    def test_control_empty_and_duplicate_rules_are_refused(self):
        self.assertFalse(rules.add(self.layout, "   ")[0])
        rules.add(self.layout, "one")
        self.assertFalse(rules.add(self.layout, "one")[0])
        self.assertEqual(rules.load(self.layout), ["one"])

    def test_control_a_full_file_refuses_another_rule(self):
        for i in range(rules.MAX_RULES):
            self.assertTrue(rules.add(self.layout, f"rule number {i}")[0])
        ok, message = rules.add(self.layout, "one too many")
        self.assertFalse(ok)
        self.assertIn("full", message)
        self.assertEqual(len(rules.load(self.layout)), rules.MAX_RULES)

    def test_a_long_rule_is_capped_and_multiline_text_becomes_one_line(self):
        rules.add(self.layout, "a\nb " + "x" * 500)
        (rule,) = rules.load(self.layout)
        self.assertLessEqual(len(rule), rules.MAX_RULE_CHARS)
        self.assertNotIn("\n", rule)

    def test_remove_unknown_number_is_refused(self):
        self.assertFalse(rules.remove(self.layout, 3)[0])
        self.assertFalse(rules.remove(self.layout, "x")[0])

    def test_the_command_lists_adds_and_removes(self):
        self.assertEqual(self.cli("rules", "--add", "keep it small")[0], 0)
        code, out = self.cli("rules")
        self.assertEqual(code, 0)
        self.assertIn("1. keep it small", out)
        self.assertEqual(self.cli("rules", "--remove", "5")[0], 1)
        self.assertEqual(self.cli("rules", "--remove", "1")[0], 0)
        self.assertIn("no project rules yet", self.cli("rules")[1])


class TestSurfaces(WaveFixture):
    def package(self):
        unit = self.unit("01-alpha", owns=["src/alpha.py"])
        self.write("src/alpha.py", "x = 1\n")
        review_mod.capture_before(self.layout, self.config, unit, self.slug, self.root)
        self.write("src/alpha.py", "x = 2\n")
        built, _stats, problem = review_mod.build(self.layout, self.config, unit, self.slug, self.root)
        self.assertEqual(problem, "")
        return built.read_text(encoding="utf-8")

    def test_the_review_package_carries_the_rules(self):
        rules.add(self.layout, "never swallow an error")
        body = "\n".join(section_lines(self.package(), "Project rules"))
        self.assertIn("1. never swallow an error", body)

    def test_control_without_rules_the_package_has_no_such_section(self):
        self.assertNotIn("## Project rules", self.package())

    def test_the_dispatch_brief_carries_the_rules_only_when_there_are_some(self):
        unit = self.unit("01-alpha", owns=["src/alpha.py"])
        plain = dispatch.instructions(self.layout, self.config, self.slug, 1, [unit], 1000)
        self.assertNotIn("Project rules", plain)
        rules.add(self.layout, "never swallow an error")
        with_rules = dispatch.instructions(self.layout, self.config, self.slug, 1, [unit], 1000)
        self.assertIn("Project rules", with_rules)
        self.assertIn("1. never swallow an error", with_rules)


if __name__ == "__main__":
    unittest.main()
