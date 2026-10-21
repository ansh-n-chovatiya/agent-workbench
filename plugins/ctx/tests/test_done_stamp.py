"""A unit file edited by hand to say `done` is not a unit that passed the gate (found by the whole-repo review).

`status` is not sealed, because a runner holds Write over its unit file. `ctx ci` skips `done` units on the grounds
that they were gated when marked done, so it must know ctx marked them: ctx leaves a stamp, a hand edit does not.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import contract, frontmatter, plan as plan_mod  # noqa: E402
from support import OK, Fixture  # noqa: E402

CHECK = [{"kind": "cmd", "run": OK}]
NAME = "01-api"


class StampFixture(Fixture):
    slug = "stamp-plan"

    def setUp(self):
        super().setUp()
        directory = plan_mod.units_dir(self.layout, self.slug)
        directory.mkdir(parents=True, exist_ok=True)
        self.unit_path = directory / f"{NAME}.md"
        frontmatter.Document(
            {"ctx_schema": 1, "unit": NAME, "plan": self.slug, "tier": "subagent", "depends_on": [],
             "owns": ["src/a.py"], "reads": [], "forbid": [], "budget_tokens": 1000, "status": "pending", "wave": 1,
             "verify": list(CHECK)},
            "## Objective\nDo the thing.\n\n## Acceptance criteria\n1. it works\n",
        ).write(self.unit_path)
        self.trust(list(CHECK))
        self.assertEqual(self.cli("plan", self.slug, "--no-spec")[0], 0)
        self.assertEqual(self.cli("start", self.slug)[0], 0)

    def hand_edit_done(self):
        doc = frontmatter.read(self.unit_path)
        doc.meta["status"] = "done"
        doc.write(self.unit_path)

    def ci(self):
        return self.cli("ci", "--plan", self.slug)


class TestDoneStamp(StampFixture):
    def test_a_unit_ctx_marked_done_is_trusted_and_stamped(self):
        code, out = self.cli("unit", NAME, "--plan", self.slug, "--status", "done")
        self.assertEqual(code, 0, out)
        self.assertTrue(contract.is_done_stamped(self.layout, self.slug, NAME))
        self.assertEqual(self.ci()[0], 0, self.ci()[1])

    def test_a_hand_edited_done_with_an_open_critical_finding_fails_ci(self):
        self.assertEqual(self.cli("findings", NAME, "--plan", self.slug, "--add", "critical",
                                  "--summary", "broken", "--where", "src/a.py:1")[0], 0)
        self.assertNotEqual(self.cli("unit", NAME, "--plan", self.slug, "--status", "done")[0], 0)  # refused
        self.hand_edit_done()
        self.assertFalse(contract.is_done_stamped(self.layout, self.slug, NAME))
        code, out = self.ci()
        self.assertNotEqual(code, 0, out)
        self.assertIn(NAME, out)

    def test_moving_a_unit_back_clears_the_stamp_so_a_later_hand_edit_is_not_trusted(self):
        self.assertEqual(self.cli("unit", NAME, "--plan", self.slug, "--status", "done")[0], 0)
        self.assertEqual(self.cli("unit", NAME, "--plan", self.slug, "--status", "running")[0], 0)
        self.assertFalse(contract.is_done_stamped(self.layout, self.slug, NAME))


if __name__ == "__main__":
    unittest.main()
