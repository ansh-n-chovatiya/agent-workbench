"""`ctx findings --add` / `--set` re-seal only the finding they touched.

Before, both passed `authoritative=True` for the whole ledger, so any hand-edit
of a sibling finding (open -> addressed, severity lowered, confidence low) was
sealed verbatim by the next legitimate command and its drift vanished.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import contract, findings as findings_mod  # noqa: E402
from test_contract_seal_findings_lock import SealFixture  # noqa: E402


class OnlyFixture(SealFixture):
    def setUp(self):
        super().setUp()
        self.seed("first")
        self.seed("second")
        self.assertEqual(self.sealed_ids(), ["1", "2"])

    def ledger(self):
        return findings_mod.load(self.layout, self.slug, self.unit_name)

    def hand_edit(self, **fields):
        ledger = self.ledger()
        finding = ledger.get(1)
        for key, value in fields.items():
            setattr(finding, key, value)
        ledger.save()

    def drift(self):
        return contract.findings_drift(self.layout, self.slug, self.unit_name)

    def drifted_ids(self):
        return [line for line in self.drift() if "finding [1]" in line]

    def add(self):
        return self.cli("findings", self.unit_name, "--plan", self.slug, "--add", "important",
                        "--summary", "third")

    def set2(self):
        return self.cli("findings", self.unit_name, "--plan", self.slug, "--set", "2",
                        "--status", "addressed", "--evidence", "fixed")


class TestAC1SealFindingsOnly(OnlyFixture):
    def test_AC1_only_records_listed_ids_verbatim_and_softens_none_else(self):
        self.hand_edit(status="addressed", severity="minor")
        ledger = self.ledger()
        ledger.get(2).status = "addressed"
        ledger.save()
        contract.seal_findings(self.layout, self.slug, self.unit_name,
                               self.ledger(), authoritative=True, only=[2])
        seal = contract.load_seal(self.layout, self.slug, self.unit_name)["findings"]
        self.assertEqual(seal["2"]["status"], "addressed")
        self.assertEqual(seal["1"]["status"], "open")
        self.assertEqual(seal["1"]["severity"], "important")

    def test_AC1_only_omitted_is_unchanged(self):
        self.hand_edit(status="addressed")
        contract.seal_findings(self.layout, self.slug, self.unit_name,
                               self.ledger(), authoritative=True)
        seal = contract.load_seal(self.layout, self.slug, self.unit_name)["findings"]
        self.assertEqual(seal["1"]["status"], "addressed")

    def test_AC1_new_finding_outside_only_is_still_added(self):
        ledger = self.ledger()
        ledger.add("important", "unlisted")
        contract.seal_findings(self.layout, self.slug, self.unit_name,
                               ledger, authoritative=True, only=[2])
        self.assertEqual(self.sealed_ids(), ["1", "2", "3"])


class TestAC2AC3SiblingDriftSurvives(OnlyFixture):
    EDITS = {
        "status": {"status": "addressed"},
        "severity": {"severity": "minor"},
        "confidence": {"confidence": "low"},
    }

    def test_AC2_AC3_add_and_set_leave_sibling_drift(self):
        for name, fields in self.EDITS.items():
            for label, run in (("add", self.add), ("set", self.set2)):
                with self.subTest(edit=name, command=label):
                    self.setUp_fresh()
                    self.hand_edit(**fields)
                    self.assertTrue(self.drifted_ids(), "control: drift before")
                    code, out = run()
                    self.assertEqual(code, 0, out)
                    self.assertTrue(self.drifted_ids(), out)

    def setUp_fresh(self):
        # reset ledger and seal to the two-finding baseline
        path = findings_mod.path_for(self.layout, self.slug, self.unit_name)
        if path.exists():
            path.unlink()
        contract.seal(self.layout, self.config, self.slug, self.unit)
        self.seed("first")
        self.seed("second")


class TestAC4LegitimateMoves(OnlyFixture):
    def test_AC4_set_on_touched_finding_reseals(self):
        code, out = self.set2()
        self.assertEqual(code, 0, out)
        seal = contract.load_seal(self.layout, self.slug, self.unit_name)["findings"]
        self.assertEqual(seal["2"]["status"], "addressed")
        self.assertEqual([x for x in self.drift() if "finding [2]" in x], [])

    def test_AC4_add_seals_the_new_finding(self):
        code, out = self.add()
        self.assertEqual(code, 0, out)
        self.assertEqual(self.sealed_ids(), ["1", "2", "3"])


class TestTouchedFindingSeverity(OnlyFixture):
    """Review round 1: the touched finding itself must not launder a hand-edited severity."""

    def test_AC3_lowering_the_touched_findings_severity_is_still_drift_after_set(self):
        self.hand_edit(severity="minor")
        self.assertTrue([x for x in self.drift() if "finding [1]" in x])
        code, out = self.cli("findings", self.unit_name, "--plan", self.slug,
                             "--set", "1", "--status", "addressed", "--evidence", "x")
        self.assertEqual(code, 0, out)
        self.assertTrue([x for x in self.drift() if "finding [1]" in x and "downgraded" in x])

    def test_AC4_control_a_legitimate_set_leaves_no_drift_on_that_finding(self):
        code, out = self.cli("findings", self.unit_name, "--plan", self.slug,
                             "--set", "1", "--status", "addressed", "--evidence", "x")
        self.assertEqual(code, 0, out)
        self.assertEqual(self.drift(), [])
        self.assertEqual(contract.compare(self.layout, self.slug, self.unit)[1], [])

    def test_AC3_marking_the_touched_finding_low_is_still_drift_after_set(self):
        self.hand_edit(confidence="low")
        code, out = self.cli("findings", self.unit_name, "--plan", self.slug,
                             "--set", "1", "--status", "addressed", "--evidence", "x")
        self.assertEqual(code, 0, out)
        self.assertTrue([x for x in self.drift() if "finding [1]" in x and "low confidence" in x])

    def test_AC1_without_only_a_lowered_severity_is_recorded_verbatim(self):
        self.hand_edit(severity="minor")
        contract.seal_findings(self.layout, self.slug, self.unit_name, self.ledger(), authoritative=True)
        self.assertEqual(contract.load_seal(self.layout, self.slug, self.unit_name)["findings"]["1"]["severity"], "minor")


class TestAC5DeletionStillDrift(OnlyFixture):
    def test_AC5_deleted_finding_is_drift_after_add_or_set(self):
        for label, run in (("add", self.add), ("set", self.set2)):
            with self.subTest(command=label):
                self.setUp_restore()
                ledger = self.ledger()
                ledger.findings = [f for f in ledger.findings if f.id != 1]
                ledger.save()
                code, out = run()
                self.assertEqual(code, 0, out)
                self.assertTrue(
                    [x for x in self.drift() if "finding [1]" in x and "deleted" in x])

    def setUp_restore(self):
        findings_mod.path_for(self.layout, self.slug, self.unit_name).unlink()
        contract.seal(self.layout, self.config, self.slug, self.unit)
        self.seed("first")
        self.seed("second")


if __name__ == "__main__":
    unittest.main()
