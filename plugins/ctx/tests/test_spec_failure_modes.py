"""A spec can require a `## Failure modes` pass before it may be planned (D12, phase 4).

The review history shows the same bug classes found after the code exists: error paths, concurrency, existing data,
callers, UI states. Naming them while the spec is written is cheaper than finding them in review round 3. The check
is opt-in (`spec.failure_modes`, default off, per D20) and recorded in the spec's own frontmatter when the spec is
created, so turning it on later never retroactively blocks an older spec and turning it off never unblocks one.

The tests that matter most are the controls: a spec created without the switch is untouched, and an "answered"
item with no answer, or an `n/a` with no reason, does not count as answered.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import config as config_mod, frontmatter, spec as spec_mod  # noqa: E402
from support import Fixture  # noqa: E402

SLUG = "rotate-keys"


def answer_all(layout, slug=SLUG, how="criterion 1"):
    path = spec_mod.spec_path(layout, slug)
    doc = frontmatter.read(path)
    doc.body = doc.body.replace("- [ ] ", "- [x] ")
    lines = []
    for line in doc.body.splitlines():
        if line.startswith("- [x] ") and ":" not in line:
            line += f": {how}"
        lines.append(line)
    doc.body = "\n".join(lines) + "\n"
    doc.write(path)


class FailureModeSpec(Fixture):
    def make(self, enabled=True):
        spec_mod.create(self.layout, SLUG, "Rotate signing keys.", failure_modes=enabled)
        for category in spec_mod.INTAKE_CATEGORIES:  # intake is a separate gate; satisfy it
            spec_mod.record_inferred(self.layout, SLUG, category, "fine", "test setup")

    def open_items(self):
        return [b for b in spec_mod.ready(self.layout, SLUG)[1] if b.startswith("failure mode")]


class TestOffByDefault(FailureModeSpec):
    def test_the_switch_ships_off(self):
        self.assertIs(config_mod.DEFAULTS["spec"]["failure_modes"], False)

    def test_a_spec_made_without_the_switch_has_no_section_and_is_never_blocked(self):
        self.make(enabled=False)
        text = spec_mod.spec_path(self.layout, SLUG).read_text(encoding="utf-8")
        self.assertNotIn("## Failure modes", text)
        self.assertEqual(self.open_items(), [])
        self.assertTrue(spec_mod.plannable(self.layout, SLUG)[0])


class TestTheSectionAndTheGate(FailureModeSpec):
    def test_the_scaffold_lists_every_category_unticked_and_planning_is_blocked(self):
        self.make()
        text = spec_mod.spec_path(self.layout, SLUG).read_text(encoding="utf-8")
        self.assertIn("## Failure modes", text)
        for category in spec_mod.FAILURE_MODES:
            self.assertIn(f"- [ ] {category}", text)
        self.assertEqual(len(self.open_items()), len(spec_mod.FAILURE_MODES))
        self.assertFalse(spec_mod.plannable(self.layout, SLUG)[0])

    def test_answering_every_item_opens_the_gate(self):
        self.make()
        answer_all(self.layout)
        self.assertEqual(self.open_items(), [])
        self.assertTrue(spec_mod.plannable(self.layout, SLUG)[0])

    def test_one_open_item_still_blocks(self):
        self.make()
        answer_all(self.layout)
        path = spec_mod.spec_path(self.layout, SLUG)
        text = path.read_text(encoding="utf-8")
        path.write_text(text.replace("- [x] async UI states: criterion 1", "- [ ] async UI states"), encoding="utf-8")
        self.assertEqual(len(self.open_items()), 1)
        self.assertIn("async UI states", self.open_items()[0])

    def test_control_a_tick_with_no_answer_does_not_count(self):
        self.make()
        answer_all(self.layout)
        path = spec_mod.spec_path(self.layout, SLUG)
        path.write_text(path.read_text(encoding="utf-8").replace("- [x] cleanup of resources: criterion 1",
                                                                  "- [x] cleanup of resources"), encoding="utf-8")
        self.assertEqual(len(self.open_items()), 1)

    def test_control_na_needs_a_reason(self):
        self.make()
        answer_all(self.layout)
        path = spec_mod.spec_path(self.layout, SLUG)
        base = path.read_text(encoding="utf-8")
        path.write_text(base.replace("callers of anything changed: criterion 1", "callers of anything changed: n/a"),
                        encoding="utf-8")
        self.assertEqual(len(self.open_items()), 1)
        path.write_text(base.replace("callers of anything changed: criterion 1",
                                     "callers of anything changed: n/a — new module, nothing calls it yet"),
                        encoding="utf-8")
        self.assertEqual(self.open_items(), [])

    def test_control_deleting_the_section_does_not_unblock_the_spec(self):
        self.make()
        path = spec_mod.spec_path(self.layout, SLUG)
        doc = frontmatter.read(path)
        head, _, rest = doc.body.partition("## Failure modes")
        doc.body = head + "## " + rest.split("## ", 1)[1]
        doc.write(path)
        self.assertEqual(len(self.open_items()), 1)
        self.assertIn("add a '## Failure modes' section", self.open_items()[0])


class TestThroughTheCli(FailureModeSpec):
    def test_ctx_spec_follows_the_config_and_ctx_plan_refuses_until_answered(self):
        self.layout.config.write_text("spec:\n  failure_modes: true\n", encoding="utf-8")
        self.cli("spec", SLUG, "--intent", "Rotate signing keys.")
        for category in spec_mod.INTAKE_CATEGORIES:
            spec_mod.record_inferred(self.layout, SLUG, category, "fine", "test setup")
        _code, out = self.cli("plan", "rotate-plan", "--spec", SLUG)
        self.assertIn("refusing to plan", out)
        self.assertIn("failure mode", out)
        answer_all(self.layout)
        _code, out = self.cli("plan", "rotate-plan", "--spec", SLUG)
        self.assertNotIn("refusing to plan", out)


if __name__ == "__main__":
    unittest.main()


class TestReviewFindings(FailureModeSpec):
    """Whole-repo review: deleting lines must not open the gate; ids must not match other ids."""

    def test_deleting_all_but_one_item_does_not_open_the_gate(self):
        self.make()
        path = spec_mod.spec_path(self.layout, SLUG)
        doc = frontmatter.read(path)
        head = doc.body.split("## Failure modes", 1)[0]
        tail = doc.body.split("## Out of scope", 1)[1]
        doc.body = head + "## Failure modes\n- [x] input boundaries: criterion 1\n\n## Out of scope" + tail
        doc.write(path)
        missing = [b for b in self.open_items() if "missing" in b]
        self.assertEqual(len(missing), len(spec_mod.FAILURE_MODES) - 1)

    def test_resolving_q1_never_resolves_q10_and_text_matching_two_resolves_none(self):
        spec_mod.create(self.layout, "ids", "Intent.")
        qpath = spec_mod.questions_path(self.layout, "ids")
        doc = frontmatter.read(qpath)
        doc.body = doc.body.replace("## Blocking", "## Blocking\n" + "".join(
            f"- [ ] Q{n}: question number {n} about keys\n" for n in (1, 10, 11)), 1)
        doc.write(qpath)
        self.assertTrue(spec_mod.resolve(self.layout, "ids", "Q1", "yes"))
        body = frontmatter.read(qpath).body
        self.assertIn("- [x] Q1:", body)
        self.assertIn("- [ ] Q10:", body)
        self.assertIn("- [ ] Q11:", body)
        self.assertFalse(spec_mod.resolve(self.layout, "ids", "about keys", "yes"))  # matches two: none resolved
        self.assertIn("- [ ] Q10:", frontmatter.read(qpath).body)
        self.assertTrue(spec_mod.resolve(self.layout, "ids", "number 11", "yes"))

    def test_a_bare_number_is_the_nth_open_blocking_question(self):
        spec_mod.create(self.layout, "nth", "Intent.")
        qpath = spec_mod.questions_path(self.layout, "nth")
        doc = frontmatter.read(qpath)
        doc.body = doc.body.replace("## Blocking", "## Blocking\n- [ ] first thing\n- [ ] second thing", 1)
        doc.write(qpath)
        self.assertTrue(spec_mod.resolve(self.layout, "nth", "2", "ok"))
        body = frontmatter.read(qpath).body
        self.assertIn("- [x] second thing", body)
        self.assertIn("- [ ] first thing", body)
