"""The review package can name who still calls what the change altered (D12, phase 4).

A reviewer shown only the diff cannot see a caller the change broke: the broken file is not in the diff. The list is
computed in code, at zero model cost: functions and classes whose signature was added, removed or changed, and the
files outside the change that still mention the name. It is opt-in (`review.callers`, default off, D20) and, when off,
leaves the package byte-for-byte as it was.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import callers, config as config_mod, review as review_mod  # noqa: E402
from test_sibling_scope import WaveFixture, section_lines  # noqa: E402


class TestSignatures(unittest.TestCase):
    def test_python_functions_classes_and_async(self):
        text = "def a(x, y):\n    pass\n\nasync def b():\n    pass\n\nclass C(Base):\n    def m(self, z=1):\n        pass\n"
        self.assertEqual(sorted(callers.signatures(text, "m.py")), ["C", "a", "b", "m"])

    def test_javascript_and_typescript_forms(self):
        text = ("export function load(id) {}\nexport async function save(a, b) {}\nclass Store {}\n"
                "const make = (x) => x\nexport const wrap = async (f) => f\n")
        self.assertEqual(sorted(callers.signatures(text, "m.ts")), ["Store", "load", "make", "save", "wrap"])

    def test_unknown_languages_and_dunders_give_nothing(self):
        self.assertEqual(callers.signatures("def f(): pass", "notes.txt"), {})
        self.assertEqual(callers.signatures("def __init__(self): pass", "m.py"), {})


class TestChangedSymbols(unittest.TestCase):
    def test_added_removed_and_changed_signatures_but_not_body_edits(self):
        before = "def keep(a):\n    return 1\n\ndef change(a):\n    pass\n\ndef gone(a):\n    pass\n"
        after = "def keep(a):\n    return 2\n\ndef change(a, b):\n    pass\n\ndef fresh():\n    pass\n"
        out = callers.changed_symbols(before, after, "m.py")
        self.assertEqual(out, {"change": "changed", "gone": "removed", "fresh": "added"})

    def test_a_new_or_deleted_file_counts_as_added_or_removed(self):
        self.assertEqual(callers.changed_symbols(None, "def f(a):\n    pass\n", "m.py"), {"f": "added"})
        self.assertEqual(callers.changed_symbols("def f(a):\n    pass\n", None, "m.py"), {"f": "removed"})


class TestFindCallers(unittest.TestCase):
    def setUp(self):
        import tempfile
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def write(self, rel, text):
        p = self.root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")

    def test_word_match_outside_the_change_with_line_numbers(self):
        self.write("a.py", "def target(x):\n    pass\n")
        self.write("b.py", "from a import target\n\ntarget(1)\n")
        self.write("c.py", "targeted = 1\n")  # not a word match
        found = callers.find_callers(self.root, ["a.py", "b.py", "c.py"], {"target": "changed"}, exclude={"a.py"})
        self.assertEqual(found["target"], [("b.py", 1), ("b.py", 3)])

    def test_changed_files_binary_files_and_big_files_are_skipped(self):
        self.write("a.py", "target\n")
        (self.root / "blob.bin").write_bytes(b"\x00target\x00")
        self.write("big.py", "target\n" + "x" * 300_000)
        found = callers.find_callers(self.root, ["a.py", "blob.bin", "big.py"], {"target": "changed"}, exclude={"a.py"})
        self.assertEqual(found["target"], [])


class TestRender(unittest.TestCase):
    def test_lists_callers_flags_removed_symbols_and_caps_the_noise(self):
        lines = callers.render({"load": "changed", "gone": "removed", "quiet": "added"},
                               {"load": [("b.py", 3), ("c.py", 9)], "gone": [("d.py", 2)], "quiet": []})
        text = "\n".join(lines)
        self.assertIn("`load` (signature changed): b.py:3, c.py:9", text)
        self.assertIn("`gone` (removed) is still mentioned in: d.py:2", text)
        self.assertIn("`quiet` (added): no other file mentions it", text)

    def test_a_very_common_name_is_summarised_not_listed(self):
        many = [(f"f{i}.py", 1) for i in range(40)]
        text = "\n".join(callers.render({"x": "changed"}, {"x": many}))
        self.assertIn("40 files mention it", text)
        self.assertNotIn("f39.py", text)

    def test_nothing_changed_says_so(self):
        self.assertIn("No function or class signature changed", "\n".join(callers.render({}, {})))


class TestInThePackage(WaveFixture):
    def setUp(self):
        super().setUp()
        self.unit_a = self.unit("01-alpha", owns=["src/alpha.py"])
        self.write("src/alpha.py", "def load(a):\n    return a\n")
        self.write("src/user.py", "from alpha import load\nload(1)\n")
        review_mod.capture_before(self.layout, self.config, self.unit_a, self.slug, self.root)
        self.write("src/alpha.py", "def load(a, b):\n    return a\n")

    def package(self, enabled):
        self.config["review"]["callers"] = enabled
        built, _stats, problem = review_mod.build(self.layout, self.config, self.unit_a, self.slug, self.root)
        self.assertEqual(problem, "")
        return built.read_text(encoding="utf-8")

    def test_the_switch_ships_on(self):
        self.assertIs(config_mod.DEFAULTS["review"]["callers"], True)

    def test_on_the_package_names_the_untouched_caller(self):
        text = self.package(True)
        body = "\n".join(section_lines(text, "Callers"))
        self.assertIn("`load` (signature changed)", body)
        self.assertIn("src/user.py:1", body)

    def test_control_off_the_package_has_no_callers_section(self):
        self.assertNotIn("## Callers", self.package(False))


if __name__ == "__main__":
    unittest.main()
