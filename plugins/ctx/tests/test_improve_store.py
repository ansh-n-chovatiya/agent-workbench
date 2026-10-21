"""The improvement store: private, scrubbed, append-only, backfilled once.

Every test redirects HOME to a temp directory, so nothing reaches the real
`~/.agent-workbench`. Tests are tagged with the acceptance criterion (AC<n>)
of the improve-loop spec they prove.
"""

import json
import os
import stat
import sys
import tempfile
import threading
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ctx import config as config_mod, findings, improve, paths  # noqa: E402

ON = {"improve": {"enabled": True}}
OFF = {"improve": {"enabled": False}}


class StoreCase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        base = Path(self._tmp.name).resolve()
        self.home = base / "home"
        self.home.mkdir()
        self._saved = {k: os.environ.get(k) for k in ("HOME", "USERPROFILE")}
        os.environ["HOME"] = str(self.home)
        os.environ["USERPROFILE"] = str(self.home)
        self.addCleanup(self._restore)
        self.repo = base / "myproject"
        (self.repo / ".ctx").mkdir(parents=True)
        self.layout = paths.Layout(self.repo / ".ctx")
        self.target = improve.path_for(self.layout)

    def _restore(self):
        for key, value in self._saved.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def lines(self):
        if not self.target.exists():
            return []
        return [json.loads(ln) for ln in self.target.read_text().splitlines() if ln]

    def real(self):
        """Records other than the backfill sentinel."""
        return [r for r in self.lines() if r["kind"] != improve.SENTINEL_KIND]

    def add_finding(self, plan, unit, summary, status=None, confidence="high"):
        ledger = findings.load(self.layout, plan, unit)
        item = ledger.add("important", summary, confidence=confidence)
        if status == "disputed":
            ok, why = ledger.set_status(item.id, "disputed", evidence="not so")
            self.assertTrue(ok, why)
        elif status == "parked":
            ok, why = ledger.set_status(item.id, "parked", ruling="later")
            self.assertTrue(ok, why)
        return item


class TestRecord(StoreCase):
    def test_AC1_appends_one_json_line_under_home(self):
        self.assertTrue(improve.record(
            self.layout, ON, "forced-done", unit="u1", plan="p1",
            summary="forced past the gate", confidence="low"))
        rows = self.real()
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual((row["kind"], row["unit"], row["plan"]),
                         ("forced-done", "u1", "p1"))
        self.assertEqual(row["summary"], "forced past the gate")
        self.assertEqual(row["confidence"], "low")
        self.assertIn("ts", row)
        self.assertTrue(str(self.target).startswith(str(self.home)))

    def test_AC1_never_raises_when_the_store_cannot_be_written(self):
        # HOME is a regular file, so the directory cannot be created.
        blocker = Path(self._tmp.name) / "afile"
        blocker.write_text("x")
        os.environ["HOME"] = str(blocker)
        os.environ["USERPROFILE"] = str(blocker)
        self.assertFalse(improve.record(self.layout, ON, "k", summary="s"))
        self.assertEqual(list(improve.records(self.layout)), [])

    def test_AC1_never_raises_on_hostile_input(self):
        self.assertFalse(improve.record(None, ON, "k", summary="s"))
        self.assertTrue(improve.record(self.layout, ON, None, unit=None,
                                       summary=object(), confidence="weird"))
        self.assertEqual(self.real()[0]["confidence"], "high")

    def test_AC2_default_is_true_and_listed_in_defaults(self):
        self.assertEqual(config_mod.DEFAULTS["improve"], {"enabled": True})
        self.assertTrue(improve.enabled({}))
        self.assertTrue(improve.enabled(None))
        self.assertIn("improve.enabled", config_mod.render(config_mod.DEFAULTS))

    def test_AC2_disabled_writes_nothing_and_creates_nothing(self):
        self.assertFalse(improve.record(self.layout, OFF, "k", summary="s"))
        self.assertEqual(improve.backfill(self.layout, OFF, force=True), 0)
        self.assertFalse((self.home / ".agent-workbench").exists())
        self.assertFalse(self.target.exists())
        self.assertFalse(self.layout.runtime.exists())


class TestScrub(StoreCase):
    def assert_scrubbed(self, raw, leaked, expect):
        improve.record(self.layout, ON, "k", summary=raw)
        text = self.target.read_text()
        self.assertNotIn(leaked, text)
        self.assertIn(expect, self.real()[0]["summary"])

    def test_AC3_posix_home_path(self):
        self.assert_scrubbed("edited /Users/example/code/app/main.py today",
                             "example", "<path>")

    def test_AC3_linux_home_path(self):
        self.assert_scrubbed("see /home/victim/.ssh/config", "victim", "<path>")

    def test_AC3_windows_path(self):
        self.assert_scrubbed(r"opened C:\Users\victim\secret.txt now",
                             "victim", "<path>")

    def test_AC3_email(self):
        self.assert_scrubbed("mail dave@example.com about it",
                             "dave@example.com", "<email>")

    def test_AC3_long_hex(self):
        hexrun = "deadbeef" * 6
        self.assert_scrubbed(f"hash {hexrun} used", hexrun, "<secret>")

    def test_AC3_base64_run(self):
        run = "Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MGFiY2RlZg"
        self.assert_scrubbed(f"token {run} leaked", run, "<secret>")

    def test_AC3_vendor_token_goes_through_redact(self):
        token = "sk-" + "a1b2c3d4e5f6g7h8i9j0"
        improve.record(self.layout, ON, "k", summary=f"key {token}")
        self.assertNotIn(token, self.target.read_text())

    def test_AC3_unit_plan_and_key_are_scrubbed_too(self):
        improve.record(self.layout, ON, "k", unit="/Users/victim/x/y",
                       plan="e@example.com", summary="s", key="/home/runner/a/b")
        text = self.target.read_text()
        for leaked in ("victim", "e@example.com", "runner"):
            self.assertNotIn(leaked, text)

    def test_AC3_summary_is_one_line_and_capped(self):
        improve.record(self.layout, ON, "k", summary="line one\nline two\n" + "x" * 500)
        summary = self.real()[0]["summary"]
        self.assertNotIn("\n", summary)
        self.assertLessEqual(len(summary), improve.MAX_SUMMARY)

    def test_AC3_ordinary_text_is_left_alone(self):
        text = "and/or src/app/main.py failed https://example.com/a/b"
        improve.record(self.layout, ON, "k", summary=text)
        self.assertEqual(self.real()[0]["summary"], text)


class TestPrivacyAndDedupe(StoreCase):
    @unittest.skipIf(os.name == "nt", "POSIX modes")
    def test_AC4_file_is_0600_in_a_0700_directory(self):
        improve.record(self.layout, ON, "k", summary="s")
        self.assertEqual(stat.S_IMODE(self.target.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(self.target.parent.stat().st_mode), 0o700)

    def test_AC4_repeated_key_is_written_once(self):
        self.assertTrue(improve.record(self.layout, ON, "k", summary="a", key="same"))
        self.assertFalse(improve.record(self.layout, ON, "k", summary="b", key="same"))
        self.assertTrue(improve.record(self.layout, ON, "k", summary="c", key="other"))
        self.assertEqual([r["summary"] for r in self.real()], ["a", "c"])

    def test_AC4_no_key_is_never_deduped(self):
        improve.record(self.layout, ON, "k", summary="a")
        improve.record(self.layout, ON, "k", summary="a")
        self.assertEqual(len(self.real()), 2)

    def test_AC4_concurrent_writers_lose_nothing(self):
        def work(i):
            improve.record(self.layout, ON, "k", summary=f"n{i}", key=f"k{i}")
        threads = [threading.Thread(target=work, args=(i,)) for i in range(12)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(len(self.real()), 12)
        self.assertEqual(sum(1 for r in self.lines()
                             if r["kind"] == improve.SENTINEL_KIND), 1)


class TestRotation(StoreCase):
    def test_AC5_keeps_newest_lines_and_the_sentinel(self):
        saved = improve.MAX_BYTES, improve.KEEP_LINES
        improve.MAX_BYTES, improve.KEEP_LINES = 2000, 5
        self.addCleanup(lambda: setattr(improve, "MAX_BYTES", saved[0]))
        self.addCleanup(lambda: setattr(improve, "KEEP_LINES", saved[1]))
        for i in range(60):
            improve.record(self.layout, ON, "k", summary=f"entry {i:03d}")
        rows = self.lines()
        self.assertLessEqual(self.target.stat().st_size, improve.MAX_BYTES + 400)
        self.assertEqual(rows[-1]["summary"], "entry 059")
        self.assertNotIn("entry 000", [r["summary"] for r in rows])
        self.assertEqual(sum(1 for r in rows
                             if r["kind"] == improve.SENTINEL_KIND), 1)
        self.assertFalse(list(self.target.parent.glob(".ctx-*")))


class TestReviewFindings(StoreCase):
    """Round-1 review: realistic names, same-named repos, and a bad layout."""

    def test_AC3_hyphenated_and_pathlike_identifiers_are_not_secrets(self):
        self.assertEqual(improve.scrub_text("plan improve-loop/01-improve-store/1 done", ident=True),
                         "plan improve-loop/01-improve-store/1 done")
        self.assertEqual(improve.scrub_text("unit 03-capture-points-in-hooks_v2", ident=True),
                         "unit 03-capture-points-in-hooks_v2")

    def test_AC3_slash_and_urlsafe_secrets_in_free_text_are_scrubbed(self):
        for secret in ("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", "aB3-dE6_gH9jK2mN5pQ8sT1vW4yZ"):
            self.assertIn("<secret>", improve.scrub_text(f"leaked {secret} here"), secret)
            improve.record(self.layout, ON, "k", summary=f"leaked {secret}")
            self.assertNotIn(secret, self.target.read_text())

    def test_AC3_control_a_long_mixed_run_is_still_a_secret(self):
        self.assertIn("<secret>", improve.scrub_text("token Ab3dE6gH9jK2mN5pQ8sT1vW4yZ7bC0eF3hJ6"))

    def test_AC6_realistic_plan_and_unit_names_each_get_their_own_record(self):
        self.add_finding("improve-loop", "01-improve-store", "one")
        self.add_finding("improve-loop", "02-improve-capture", "two")
        self.add_finding("seal-touched-only", "01-seal-only", "three")
        self.assertEqual(improve.backfill(self.layout, ON), 3)
        self.assertEqual(len({r["key"] for r in self.real()}), 3)

    def test_AC4_two_repos_with_the_same_folder_name_do_not_share_a_store(self):
        other = Path(self._tmp.name).resolve() / "elsewhere" / "myproject"
        (other / ".ctx").mkdir(parents=True)
        other_layout = paths.Layout(other / ".ctx")
        self.assertNotEqual(improve.path_for(self.layout), improve.path_for(other_layout))
        improve.record(self.layout, ON, "k", summary="mine", key="same")
        self.assertTrue(improve.record(other_layout, ON, "k", summary="theirs", key="same"))

    def test_AC7_records_with_a_bad_layout_yields_nothing_instead_of_raising(self):
        self.assertEqual(list(improve.records(None)), [])


class TestBackfill(StoreCase):
    def test_AC6_first_record_backfills_existing_findings_once(self):
        self.add_finding("p", "u1", "missing null check")
        self.add_finding("p", "u1", "wrong claim", status="disputed")
        self.add_finding("p", "u2", "style nit", status="parked")
        before = {p: p.read_bytes() for p in self.layout.plans.glob("*/findings/*.md")}
        improve.record(self.layout, ON, "manual", summary="x")
        kinds = sorted(r["kind"] for r in self.real())
        self.assertEqual(kinds, ["manual", "review-finding",
                                 "reviewer-false-alarm", "reviewer-false-alarm"])
        improve.record(self.layout, ON, "manual", summary="y")
        self.assertEqual(len(self.real()), 5)
        after = {p: p.read_bytes() for p in self.layout.plans.glob("*/findings/*.md")}
        self.assertEqual(before, after)

    def test_AC6_explicit_backfill_runs_once_then_force_adds_only_new(self):
        self.add_finding("p", "u1", "first")
        self.assertEqual(improve.backfill(self.layout, ON), 1)
        self.assertEqual(improve.backfill(self.layout, ON), 0)
        self.add_finding("p", "u1", "second")
        self.assertEqual(improve.backfill(self.layout, ON), 0)
        self.assertEqual(improve.backfill(self.layout, ON, force=True), 1)
        self.assertEqual(len(self.real()), 2)

    def test_AC6_backfilled_summaries_are_scrubbed(self):
        self.add_finding("p", "u1", "leaks /Users/victim/proj/a.py and g@example.org")
        improve.backfill(self.layout, ON)
        text = self.target.read_text()
        self.assertNotIn("victim", text)
        self.assertNotIn("g@example.org", text)

    def test_AC6_low_confidence_finding_keeps_its_confidence(self):
        self.add_finding("p", "u1", "maybe", confidence="low")
        improve.backfill(self.layout, ON)
        self.assertEqual(self.real()[0]["confidence"], "low")

    def test_AC6_project_without_ledgers_still_gets_a_sentinel(self):
        self.assertEqual(improve.backfill(self.layout, ON), 0)
        self.assertEqual([r["kind"] for r in self.lines()], [improve.SENTINEL_KIND])


class TestRecords(StoreCase):
    def test_AC7_skips_corrupt_lines_and_the_sentinel(self):
        improve.record(self.layout, ON, "k", summary="good")
        with self.target.open("a") as handle:
            handle.write("not json\n[1,2]\n\n")
        improve.record(self.layout, ON, "k", summary="also good")
        got = [r["summary"] for r in improve.records(self.layout)]
        self.assertEqual(got, ["good", "also good"])
        meta = [r["kind"] for r in improve.records(self.layout, include_meta=True)]
        self.assertIn(improve.SENTINEL_KIND, meta)

    def test_AC7_missing_file_yields_nothing(self):
        self.assertEqual(list(improve.records(self.layout)), [])


if __name__ == "__main__":
    unittest.main()
