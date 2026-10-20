"""A finding can be marked low confidence: it becomes a question for the builder
and never blocks. Each test is tagged with the acceptance criterion it covers."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import briefing, config as config_mod, findings as findings_mod  # noqa: E402
from ctx import frontmatter, plan as plan_mod  # noqa: E402
from support import OK, Fixture  # noqa: E402

CHECK = [{"kind": "cmd", "run": OK}]
BODY = "## Objective\nDo the thing.\n\n## Acceptance criteria\n1. it works\n"
NAME = "01-api"


class ConfidenceFixture(Fixture):
    slug = "conf-plan"

    def setUp(self):
        super().setUp()
        directory = plan_mod.units_dir(self.layout, self.slug)
        directory.mkdir(parents=True, exist_ok=True)
        frontmatter.Document(
            {
                "ctx_schema": 1, "unit": NAME, "plan": self.slug,
                "tier": "subagent", "depends_on": [], "owns": ["src/a.py"],
                "reads": [], "forbid": [], "budget_tokens": 1000,
                "status": "pending", "wave": 1, "verify": list(CHECK),
            },
            BODY,
        ).write(directory / f"{NAME}.md")
        self.trust(list(CHECK))
        self.assertEqual(self.cli("plan", self.slug, "--no-spec")[0], 0)

    def add(self, severity="critical", *extra):
        return self.cli("findings", NAME, "--add", severity, "--summary", "odd row",
                        "--where", "src/a.py:3", *extra)

    def ledger(self):
        return findings_mod.load(self.layout, self.slug, NAME)


class TestConfidence(ConfidenceFixture):

    def test_AC1_low_is_recorded(self):
        code, out = self.add("critical", "--confidence", "low")
        self.assertEqual(code, 0, out)
        self.assertEqual(self.ledger().get(1).confidence, "low")

    def test_AC1_default_is_high(self):
        self.assertEqual(self.add()[0], 0)
        self.assertEqual(self.ledger().get(1).confidence, "high")

    def test_AC1_control_invalid_value_refused(self):
        with self.assertRaises(SystemExit):
            self.add("critical", "--confidence", "medium")
        self.assertEqual(self.ledger().findings, [])

    def test_AC2_low_never_blocks_whatever_severity(self):
        for severity in findings_mod.SEVERITIES:
            self.add(severity, "--confidence", "low")
        ledger = self.ledger()
        self.assertEqual(len(ledger.findings), 3)
        self.assertEqual(ledger.blocking(), [])
        self.assertFalse(any(f.blocking() for f in ledger.findings))
        self.assertEqual(findings_mod.unresolved(ledger), [])
        self.assertEqual(ledger.counts()["blocking"], 0)

    def test_AC2_control_high_still_blocks(self):
        self.add("critical")
        self.add("important")
        self.add("minor")
        self.assertEqual([f.id for f in self.ledger().blocking()], [1, 2])

    def test_AC2_low_does_not_fail_the_list_exit_code(self):
        self.add("critical", "--confidence", "low")
        self.assertEqual(self.cli("findings", NAME)[0], 0)

    def test_AC3_list_has_separate_heading(self):
        self.add("critical")
        self.add("important", "--confidence", "low")
        code, out = self.cli("findings", NAME)
        self.assertEqual(code, 1, out)
        self.assertIn("ask the builder (1)", out)
        self.assertIn("1 critical open", out)
        self.assertNotIn("1 important", out)
        self.assertIn("1 to ask the builder", out)
        self.assertIn("1 blocking finding(s)", out)

    def test_AC3_control_no_heading_without_low(self):
        self.add("critical")
        self.assertNotIn("ask the builder", self.cli("findings", NAME)[1])

    def test_AC3_briefing_lists_low(self):
        self.add("critical", "--confidence", "low")
        state = {"plan": self.slug, "unit": NAME, "level": "2"}
        text = briefing.build(self.layout, config_mod.load(self.layout), state)
        self.assertIn("ask the builder", text)

    def test_AC3_control_briefing_silent_without_low(self):
        self.add("critical")
        state = {"plan": self.slug, "unit": NAME, "level": "2"}
        text = briefing.build(self.layout, config_mod.load(self.layout), state)
        self.assertNotIn("ask the builder", text)

    def test_AC4_old_file_loads_as_high(self):
        self.add("critical")
        text = self.ledger().path.read_text(encoding="utf-8")
        self.assertNotIn("- confidence:", text)
        ledger = self.ledger()
        self.assertEqual(ledger.get(1).confidence, "high")
        self.assertTrue(ledger.get(1).blocking())

    def test_AC4_low_round_trips(self):
        self.add("important", "--confidence", "low")
        ledger = self.ledger()
        ledger.save()
        self.assertEqual(self.ledger().get(1).confidence, "low")
        self.assertIn("- confidence: low", ledger.path.read_text(encoding="utf-8"))

    def test_AC4_unknown_value_in_file_fails_towards_blocking(self):
        self.add("critical", "--confidence", "low")
        path = self.ledger().path
        path.write_text(path.read_text(encoding="utf-8").replace(
            "confidence: low", "confidence: whatever"), encoding="utf-8")
        self.assertEqual(self.ledger().get(1).confidence, "high")

    def test_AC5_reviewer_prompt_carries_confidence(self):
        text = (Path(__file__).resolve().parent.parent / "agents" / "reviewer.md"
                ).read_text(encoding="utf-8")
        self.assertIn("confidence: low", text)
        self.assertIn("confidence: high | low", text)

    def test_AC6_status_set_works_on_low(self):
        self.add("critical", "--confidence", "low")
        code, out = self.cli("findings", NAME, "--set", "1", "--status", "addressed",
                             "--evidence", "fixed in a.py:3")
        self.assertEqual(code, 0, out)
        finding = self.ledger().get(1)
        self.assertEqual((finding.status, finding.confidence), ("addressed", "low"))

    def test_AC6_remark_high_blocks_again(self):
        self.add("critical", "--confidence", "low")
        self.assertEqual(self.ledger().blocking(), [])
        code, out = self.cli("findings", NAME, "--set", "1", "--confidence", "high")
        self.assertEqual(code, 0, out)
        self.assertEqual([f.id for f in self.ledger().blocking()], [1])

    def test_AC6_control_unknown_id_refused(self):
        code, _ = self.cli("findings", NAME, "--set", "9", "--confidence", "high")
        self.assertEqual(code, 1)


if __name__ == "__main__":
    unittest.main()
