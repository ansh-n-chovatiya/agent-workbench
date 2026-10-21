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


class TestPrPackage(WaveFixture):
    """`ctx review --pr`: the whole change against a base, with the project rules, from real git."""

    def setUp(self):
        super().setUp()
        import shutil
        import subprocess
        shutil.rmtree(self.root / ".git", ignore_errors=True)
        self.git = lambda *a: subprocess.run(["git", "-c", "user.email=a@example.com", "-c", "user.name=a", *a],
                                             cwd=str(self.root), check=True, capture_output=True)
        self.git("init", "-q", "-b", "main")
        self.write(".gitignore", ".ctx/\n")
        self.write("a.py", "a = 1\n")
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "base")
        self.git("checkout", "-q", "-b", "topic")
        self.write("a.py", "a = 2\n")
        self.git("commit", "-qam", "change")

    def test_the_package_has_rules_stat_and_diff(self):
        rules.add(self.layout, "never swallow an error")
        path, problem = review_mod.pr_package(self.layout, "main")
        self.assertEqual(problem, "")
        text = path.read_text(encoding="utf-8")
        self.assertIn("1. never swallow an error", text)
        self.assertIn("a.py", text)
        self.assertIn("+a = 2", text)

    def test_control_an_unknown_base_is_a_problem_not_a_package(self):
        path, problem = review_mod.pr_package(self.layout, "no-such-ref")
        self.assertIsNone(path)
        self.assertIn("no-such-ref", problem)

    def test_the_command_prints_the_path_and_refuses_a_bad_base(self):
        from ctx import cli
        import io
        import contextlib
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            code = cli.main(["--cwd", str(self.root), "review", "--pr", "main"])
        self.assertEqual(code, 0)
        self.assertTrue(buf.getvalue().splitlines()[0].endswith("pr-review.md"))
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(cli.main(["--cwd", str(self.root), "review", "--pr", "no-such-ref"]), 1)


class TestPrPackageHardening(TestPrPackage):
    def test_an_option_shaped_base_is_refused_before_git_sees_it(self):
        path, problem = review_mod.pr_package(self.layout, "--output=oops")
        self.assertIsNone(path)
        self.assertIn("not a usable base ref", problem)
        self.assertFalse((self.root / "oops...HEAD").exists())

    def test_the_configured_redact_patterns_are_applied(self):
        self.write("a.py", "token = 'INTERNAL-12345'\n")
        self.git("commit", "-qam", "secret-ish")
        path, problem = review_mod.pr_package(self.layout, "main", {"redact": ["INTERNAL-[0-9]+"]})
        self.assertEqual(problem, "")
        self.assertNotIn("INTERNAL-12345", path.read_text(encoding="utf-8"))

    def test_a_latin_1_file_in_the_diff_does_not_crash(self):
        (self.root / "b.txt").write_bytes("caf\xe9\n".encode("latin-1"))
        self.git("add", "-A")
        self.git("commit", "-qm", "latin1")
        path, problem = review_mod.pr_package(self.layout, "main")
        self.assertEqual(problem, "")
        self.assertIn("b.txt", path.read_text(encoding="utf-8"))

    def test_an_unknown_base_and_no_repository_are_plain_sentences(self):
        _path, problem = review_mod.pr_package(self.layout, "origin/main")
        self.assertIn("unknown base ref", problem)
        self.assertNotIn("fatal", problem)


class TestPlanUnitName(Fixture):
    def test_a_name_plan_check_would_reject_is_refused_at_creation(self):
        from ctx import plan as plan_mod
        plan_mod.create(self.layout, "nm")
        code, out = self.cli("plan-unit", "core", "--plan", "nm")
        self.assertEqual(code, 1)
        self.assertIn("01-kebab-case", out)
        self.assertEqual(self.cli("plan-unit", "01-core", "--plan", "nm")[0], 0)
