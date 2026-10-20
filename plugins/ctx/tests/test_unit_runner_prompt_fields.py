"""Pins the failure_modes / risk wording in the unit-runner prompt."""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from ctx import plan  # noqa: E402

PROMPT = (ROOT / "agents" / "unit-runner.md").read_text(encoding="utf-8")
FIELDS = ["failure_modes", "risk"]


def missing_fields(names):
    return [n for n in names if not isinstance(getattr(plan.Unit, n, None), property)]


class RunnerPromptFields(unittest.TestCase):
    def test_AC1_failing_test_per_failure_mode(self):
        self.assertIn("lists `failure_modes`, write a failing", PROMPT)
        self.assertIn("`n/a — <reason>`", PROMPT)

    def test_AC1_risk_names_callers(self):
        self.assertIn("lists `risk`", PROMPT)
        self.assertIn("name every caller of a changed signature before editing", PROMPT)

    def test_AC2_return_line_is_optional(self):
        line = "failure_modes: <mode>: <test or n/a — reason>"
        self.assertIn(line, PROMPT)
        self.assertIn("(omit when none are listed)", PROMPT)

    def test_AC3_rule_is_conditional(self):
        self.assertIn("If the unit lists", PROMPT)
        self.assertIn("If it lists", PROMPT)

    def test_AC5_fields_are_real_unit_properties(self):
        self.assertEqual(missing_fields(FIELDS), [])

    def test_AC5_control_wrong_name_is_caught(self):
        self.assertEqual(missing_fields(["failure_mode"]), ["failure_mode"])


if __name__ == "__main__":
    unittest.main()
