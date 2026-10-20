"""The review package can say which acceptance criterion has a test and which has none (D12, phase 4).

Computed in code at zero model cost, from the test files the change added or modified. It is opt-in
(`review.tests_table`, default off, D20) and, when off, leaves the package as it was. The controls that matter: a
criterion with no test must read NONE, and a changed non-test file must never be mistaken for a test.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import config as config_mod, frontmatter, plan as plan_mod, review as review_mod, testmap  # noqa: E402
from test_sibling_scope import WaveFixture, section_lines  # noqa: E402

CRITERIA = ["Empty input returns an empty list", "A malformed record raises ValueError", "Output is sorted by name"]


class TestTestsIn(unittest.TestCase):
    def test_python_and_javascript_tests_with_bodies(self):
        py = "def helper():\n    pass\n\ndef test_a():\n    # AC1\n    pass\n\nasync def test_b():\n    pass\n"
        self.assertEqual([n for n, _ in testmap.tests_in(py, "tests/test_x.py")], ["test_a", "test_b"])
        self.assertIn("AC1", testmap.tests_in(py, "tests/test_x.py")[0][1])
        js = "it('loads the page', () => {})\ntest(\"saves\", () => {})\n"
        self.assertEqual([n for n, _ in testmap.tests_in(js, "web/a.spec.ts")], ["loads the page", "saves"])

    def test_control_a_non_test_file_has_no_tests_even_if_it_looks_like_one(self):
        self.assertEqual(testmap.tests_in("def test_a():\n    pass\n", "src/helpers.py"), [])
        self.assertFalse(testmap.is_test_file("src/contest.py"))


class TestMapping(unittest.TestCase):
    def rows(self, tests):
        return dict(testmap.map_criteria(CRITERIA, tests))

    def test_explicit_tags_match_by_name_or_body(self):
        rows = self.rows([("t.py", "test_one", "# criterion 2\n"), ("t.py", "test_ac3_sorted", "")])
        self.assertEqual(rows[CRITERIA[1]], [("t.py::test_one", False)])
        self.assertEqual(rows[CRITERIA[2]], [("t.py::test_ac3_sorted", False)])
        self.assertEqual(rows[CRITERIA[0]], [])

    def test_shared_words_in_the_name_are_a_marked_guess(self):
        rows = self.rows([("t.py", "test_malformed_record_raises", "")])
        self.assertEqual(rows[CRITERIA[1]], [("t.py::test_malformed_record_raises", True)])

    def test_control_one_shared_word_is_not_enough(self):
        self.assertEqual(self.rows([("t.py", "test_record_loading", "")])[CRITERIA[1]], [])

    def test_control_an_explicit_tag_stops_guessing_for_that_test(self):
        rows = self.rows([("t.py", "test_sorted_output_by_name_ac1", "")])
        self.assertEqual(rows[CRITERIA[2]], [])
        self.assertEqual(rows[CRITERIA[0]], [("t.py::test_sorted_output_by_name_ac1", False)])


class TestRender(unittest.TestCase):
    def test_none_rows_and_guess_marks(self):
        text = "\n".join(testmap.render(CRITERIA, [("t.py", "test_x", "# AC1"), ("t.py", "test_sorted_by_name_output", "")]))
        self.assertIn("1. Empty input returns an empty list: `t.py::test_x`", text)
        self.assertIn("2. A malformed record raises ValueError: **NONE**", text)
        self.assertIn("`t.py::test_sorted_by_name_output` *guess*", text)

    def test_no_test_files_and_no_criteria_say_so(self):
        self.assertIn("No test file was added or modified", "\n".join(testmap.render(CRITERIA, [])))
        self.assertIn("nothing to map", "\n".join(testmap.render([], [("t.py", "test_x", "")])))


class TestInThePackage(WaveFixture):
    def setUp(self):
        super().setUp()
        self.unit_a = self.unit("01-alpha", owns=["src/alpha.py", "tests/test_alpha.py"])
        frontmatter.Document(
            self.unit_a.doc.meta,
            "## Objective\nDo it.\n\n## Acceptance criteria\n"
            + "".join(f"{i}. {c}\n" for i, c in enumerate(CRITERIA, 1)),
        ).write(self.unit_a.path)
        self.unit_a = plan_mod.Unit(self.unit_a.path, frontmatter.read(self.unit_a.path))
        self.write("src/alpha.py", "x = 1\n")
        review_mod.capture_before(self.layout, self.config, self.unit_a, self.slug, self.root)
        self.write("src/alpha.py", "x = 2\n")

    def package(self, enabled):
        self.config["review"]["tests_table"] = enabled
        built, _stats, problem = review_mod.build(self.layout, self.config, self.unit_a, self.slug, self.root)
        self.assertEqual(problem, "")
        return built.read_text(encoding="utf-8")

    def test_the_switch_ships_off(self):
        self.assertIs(config_mod.DEFAULTS["review"]["tests_table"], False)

    def test_on_a_criterion_without_a_test_reads_none(self):
        self.write("tests/test_alpha.py", "def test_empty():\n    # AC1\n    pass\n")
        body = "\n".join(section_lines(self.package(True), "Tests by criterion"))
        self.assertIn("1. Empty input returns an empty list: `tests/test_alpha.py::test_empty`", body)
        self.assertIn("2. A malformed record raises ValueError: **NONE**", body)

    def test_on_with_no_test_file_changed_says_so(self):
        body = "\n".join(section_lines(self.package(True), "Tests by criterion"))
        self.assertIn("No test file was added or modified", body)

    def test_control_off_the_package_has_no_such_section(self):
        self.write("tests/test_alpha.py", "def test_empty():\n    # AC1\n    pass\n")
        self.assertNotIn("## Tests by criterion", self.package(False))


if __name__ == "__main__":
    unittest.main()
