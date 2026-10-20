"""Commands and hooks feed the improve log with no user action (unit 02).

Every test is tagged `AC<n>` after the acceptance criterion it exercises. The
controls are as important as the positives: `addressed` records nothing, a
prompt with no correction phrase records nothing, an edit outside any done
unit's `owns` records nothing, and the prompt text never reaches the store.

HOME is redirected to a temp directory at import time as well as per test.
`unittest discover` imports every module before running any test, so this keeps
the *whole* suite from writing to the real `~/.agent-workbench`; the existing
tests drive `ctx unit` and the hooks, which now record.
"""

import os
import shutil
import sys
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import improve, plan as plan_mod, state  # noqa: E402
from support import Fixture, OK  # noqa: E402

PLAN = "p1"
SECRET_PROMPT = "that's wrong, please fix zebra-quartz-unique-9431 again"


class CaptureFixture(Fixture):
    # `Fixture.setUp` points HOME at a throwaway directory, so nothing here can reach the real store.

    def make_unit(self, name="01-a", owns=("src/a.py",), checks=None):
        plan_mod.create(self.layout, PLAN)
        checks = [{"kind": "cmd", "run": OK}] if checks is None else checks
        self.trust(checks)
        plan_mod.scaffold_unit(self.layout, PLAN, name, objective="do a thing",
                               owns=owns, verify_checks=checks)
        return name

    def unit(self, name, status, *extra):
        return self.cli("unit", name, "--plan", PLAN, "--status", status, *extra)

    def recs(self, *kinds):
        return [r for r in improve.records(self.layout)
                if not kinds or r.get("kind") in kinds]

    def store_text(self):
        path = improve.path_for(self.layout)
        return path.read_text(encoding="utf-8") if path.is_file() else ""

    def finish(self, name="01-a"):
        self.unit(name, "running")
        code, _ = self.unit(name, "done")
        self.assertEqual(code, 0)


class TestFindings(CaptureFixture):
    def add(self, name, summary="boom in src/secret_module.py: def leak(): pass"):
        return self.cli("findings", name, "--plan", PLAN, "--add", "important",
                        "--summary", summary, "--where", "src/secret_module.py")

    def test_AC1_add_records_review_finding_with_severity_only(self):
        name = self.make_unit()
        self.assertEqual(self.add(name)[0], 0)
        found = self.recs("review-finding")
        self.assertEqual(len(found), 1)
        self.assertIn("important", found[0]["summary"])
        self.assertNotIn("secret_module", self.store_text())
        self.assertNotIn("leak", self.store_text())

    def test_AC1_disputed_and_parked_record_false_alarm_addressed_does_not(self):
        name = self.make_unit()
        for _ in range(3):
            self.add(name)
        self.cli("findings", name, "--plan", PLAN, "--set", "1", "--status", "disputed",
                 "--ruling", "not a bug", "--evidence", "tests/x.py:1 passes")
        self.cli("findings", name, "--plan", PLAN, "--set", "2", "--status", "parked",
                 "--ruling", "later")
        self.assertEqual(len(self.recs("reviewer-false-alarm")), 2)
        before = len(self.recs())
        code, _ = self.cli("findings", name, "--plan", PLAN, "--set", "3",
                           "--status", "addressed", "--evidence", "fixed it")
        self.assertEqual(code, 0)
        self.assertEqual(len(self.recs()), before)  # control: addressed records nothing
        self.assertEqual(len(self.recs("reviewer-false-alarm")), 2)


class TestUnitOutcomes(CaptureFixture):
    def test_AC2_forced_done_blocked_and_rounds(self):
        name = self.make_unit(checks=[{"kind": "cmd", "run": self.py("import sys; sys.exit(1)")}])
        self.assertEqual(self.unit(name, "blocked")[0], 0)
        self.assertEqual(len(self.recs("blocked")), 1)
        self.assertEqual(self.unit(name, "verify_failed")[0], 0)
        self.assertEqual(len(self.recs("blocked")), 2)
        self.assertEqual(self.recs("forced-done"), [])  # control
        self.assertEqual(self.unit(name, "done", "--force")[0], 0)
        forced = self.recs("forced-done")
        self.assertEqual(len(forced), 1)
        self.assertIn("overrode the gate", forced[0]["summary"])
        self.assertEqual(len(self.recs("rounds")), 1)

    def test_AC2_rounds_carries_the_review_round_count(self):
        name = self.make_unit()
        self.finish(name)
        rounds = self.recs("rounds")
        self.assertEqual(len(rounds), 1)
        self.assertIn("1 review round", rounds[0]["summary"])
        self.assertEqual(self.recs("forced-done", "blocked"), [])  # control

    def test_AC5_disabled_removes_every_effect(self):
        cfg = self.layout.config
        text = cfg.read_text(encoding="utf-8")
        cfg.write_text(text + "\nimprove:\n  enabled: false\n", encoding="utf-8")
        name = self.make_unit()
        self.finish(name)
        self.unit(name, "blocked")
        self.assertFalse(improve.path_for(self.layout).exists())
        self.assertNotIn("last_done", state.load(self.layout))


class TestHooks(CaptureFixture):
    def done_unit(self, owns=("src/a.py",)):
        name = self.make_unit(owns=owns)
        self.finish(name)
        return name

    def edit(self, path):
        return self.run_hook("PostToolUse", tool_name="Edit",
                             tool_input={"file_path": str(self.root / path)})

    def test_AC3_edit_inside_done_unit_records_manual_fix_basename_only(self):
        self.done_unit()
        state.update(self.layout, level="2")
        self.edit("src/a.py")
        found = self.recs("manual-fix")
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]["confidence"], "low")
        self.assertIn("a.py", found[0]["summary"])
        self.assertNotIn("src/", self.store_text())
        self.edit("src/a.py")  # repeated call: written once
        self.assertEqual(len(self.recs("manual-fix")), 1)

    def test_AC3_edit_outside_any_owns_records_nothing(self):
        self.done_unit()
        state.update(self.layout, level="2")
        self.edit("src/other.py")
        self.assertEqual(self.recs("manual-fix"), [])

    def test_AC3_no_record_while_a_unit_is_active(self):
        name = self.done_unit()
        self.unit(name, "running")  # active again
        self.edit("src/a.py")
        self.assertEqual(self.recs("manual-fix"), [])

    def prompt(self, text):
        return self.run_hook("UserPromptSubmit", prompt=text)

    def test_AC4_correction_after_recent_completion_records_category_only(self):
        self.done_unit()
        code, out = self.prompt(SECRET_PROMPT)
        self.assertEqual((code, out), (0, ""))
        found = self.recs("possible-redo")
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]["confidence"], "low")
        self.assertNotIn("zebra", self.store_text())
        self.assertNotIn("quartz", self.store_text())
        self.prompt(SECRET_PROMPT)  # same completion: once
        self.assertEqual(len(self.recs("possible-redo")), 1)

    def test_AC4_prompt_without_phrase_records_nothing(self):
        self.done_unit()
        self.prompt("looks great, now add the README section")
        self.assertEqual(self.recs("possible-redo"), [])

    def test_AC4_stale_completion_records_nothing(self):
        self.done_unit()
        done = state.load(self.layout)["last_done"]
        state.update(self.layout, last_done=dict(done, ts=time.time() - 31 * 60))
        self.prompt("that's wrong")
        self.assertEqual(self.recs("possible-redo"), [])

    def test_AC4_smart_apostrophes_match(self):
        self.done_unit()
        self.prompt("that\u2019s wrong")
        self.assertEqual(len(self.recs("possible-redo")), 1)

    def test_AC4_a_passing_stop_gate_is_not_a_completion(self):
        name = self.make_unit()
        state.update(self.layout, unit=name)
        self.run_hook("Stop")
        self.assertNotIn("last_done", state.load(self.layout))
        self.prompt("please fix the import order")
        self.assertEqual(self.recs("possible-redo"), [])

    def test_AC5_disabled_hooks_record_nothing(self):
        self.done_unit()
        cfg = self.layout.config
        cfg.write_text(cfg.read_text(encoding="utf-8") + "\nimprove:\n  enabled: false\n", encoding="utf-8")
        before = self.store_text()
        self.prompt(SECRET_PROMPT)
        self.assertEqual(self.store_text(), before)
        self.assertEqual(self.recs("possible-redo"), [])

    def test_AC4_phrases_are_case_insensitive(self):
        self.done_unit()
        self.prompt("NOT WHAT I ASKED")
        self.assertEqual(len(self.recs("possible-redo")), 1)

    def test_AC6_hook_output_identical_with_feature_on_or_off(self):
        state.set_nudge(self.layout, "hello nudge")
        on = self.prompt("fix it")
        cfg = self.layout.config
        cfg.write_text(cfg.read_text(encoding="utf-8") + "\nimprove:\n  enabled: false\n",
                       encoding="utf-8")
        state.set_nudge(self.layout, "hello nudge")
        off = self.prompt("fix it")
        self.assertEqual(on, off)
        self.assertEqual(on, (0, "[ctx] hello nudge\n"))

    def test_AC5_hooks_fail_open_when_the_store_is_unwritable(self):
        self.done_unit()
        blocker = Path(os.environ["HOME"]) / ".agent-workbench"
        shutil.rmtree(blocker, ignore_errors=True)
        blocker.write_text("not a directory", encoding="utf-8")
        self.assertFalse(improve.record(self.layout, self.config, "probe", summary="x"))  # the blocker works
        code, out = self.prompt("that's wrong")
        self.assertEqual((code, out), (0, ""))


if __name__ == "__main__":
    unittest.main()
