"""Units can carry risk tags and the failure modes that apply to them (D12, phase 4).

A risk tag (`shared-interface`, `auth`, `data`, `ui`) keeps a unit off the cheapest reviewer tier however small its
package is, and the unit's review package names the tags and the failure modes the reviewer must account for. Both
fields are optional: a unit without them behaves, and its package reads, exactly as before.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import config as config_mod, dispatch, frontmatter, plan as plan_mod, review as review_mod, spec  # noqa: E402
from test_sibling_scope import WaveFixture, section_lines  # noqa: E402


class TestSelection(unittest.TestCase):
    FLOOR = config_mod.DEFAULTS["models"]["reviewer"]

    def pick(self, **stats):
        return dispatch.model_for(config_mod.DEFAULTS, role="reviewer", stats={"bytes": 10, "out_of_scope": 0, **stats})

    def test_control_a_small_clean_untagged_package_is_cheapened(self):
        self.assertNotEqual(self.pick(), self.FLOOR)

    def test_a_risky_unit_keeps_the_floor_even_when_small_and_clean(self):
        self.assertEqual(self.pick(risky=True), self.FLOOR)


class TestInThePackage(WaveFixture):
    def setUp(self):
        super().setUp()
        self.write("src/alpha.py", "x = 1\n")

    def prepared(self, **meta):
        unit = self.unit("01-alpha", owns=["src/alpha.py"])
        unit.doc.meta.update(meta)
        unit.doc.write(unit.path)
        unit = plan_mod.Unit(unit.path, frontmatter.read(unit.path))
        review_mod.capture_before(self.layout, self.config, unit, self.slug, self.root)
        self.write("src/alpha.py", "x = 2\n")
        return unit

    def package(self, unit):
        built, stats, problem = review_mod.build(self.layout, self.config, unit, self.slug, self.root)
        self.assertEqual(problem, "")
        return built.read_text(encoding="utf-8"), stats

    def test_tags_and_failure_modes_are_named_and_the_stats_say_risky(self):
        unit = self.prepared(risk=["auth"], failure_modes=["permissions and ownership"])
        text, stats = self.package(unit)
        body = "\n".join(section_lines(text, "Risk and failure modes"))
        self.assertIn("**risk**: auth", body)
        self.assertIn("permissions and ownership", body)
        self.assertTrue(stats["risky"])

    def test_control_an_untagged_unit_has_no_such_section(self):
        text, stats = self.package(self.prepared())
        self.assertNotIn("## Risk and failure modes", text)
        self.assertFalse(stats["risky"])

    def test_failure_modes_alone_do_not_make_a_unit_risky(self):
        _text, stats = self.package(self.prepared(failure_modes=["cleanup of resources"]))
        self.assertFalse(stats["risky"])

    def test_dispatch_stats_agree_with_build_stats(self):
        unit = self.prepared(risk=["data"])
        self.package(unit)
        self.assertTrue(review_mod.dispatch_stats(self.layout, self.slug, unit, 1)["risky"])


class TestValidation(WaveFixture):
    def problems(self, **meta):
        unit = self.unit("01-alpha", owns=["src/alpha.py"])
        unit.doc.meta.update(meta)
        unit.doc.write(unit.path)
        return [p for p in plan_mod.check(self.layout, self.slug)[1] if "risk" in p or "failure mode" in p]

    def test_known_tags_and_modes_are_accepted(self):
        self.assertEqual(self.problems(risk=["ui", "data"], failure_modes=[spec.FAILURE_MODES[0]]), [])

    def test_an_unknown_risk_tag_is_named(self):
        self.assertTrue(any("'secuirty'" in p for p in self.problems(risk=["secuirty"])))

    def test_an_unknown_failure_mode_is_named(self):
        self.assertTrue(any("'made up'" in p for p in self.problems(failure_modes=["made up"])))


if __name__ == "__main__":
    unittest.main()
