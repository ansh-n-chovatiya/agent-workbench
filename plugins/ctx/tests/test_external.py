"""Optional second reviewers (Codex, Gemini): used only when installed and switched on, never able to block a unit.

The tools are replaced by small fake executables on PATH, so nothing here needs the real CLIs, an account or a network.
Controls: not installed, installed but off, a timeout and a failing tool are all messages and leave the normal review
untouched; an external finding is low confidence and so never counts as blocking.
"""
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import external, findings as findings_mod, review as review_mod  # noqa: E402
from test_sibling_scope import WaveFixture  # noqa: E402

FINDINGS = ("FINDING | critical | src/alpha.py:3 | the loop never ends | an endless loop hangs the caller\n"
            "- FINDING | bogus | src/alpha.py:9 | odd severity | still recorded as minor\n"
            "some chatter\n")


def fake(directory, name, body):
    path = Path(directory) / name
    path.write_text(f"#!{sys.executable}\n" + body, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IEXEC)
    return path


CODEX = '''import json, os, sys
args = sys.argv[1:]
out = args[args.index("-o") + 1]
open(os.environ["FAKE_LOG"], "w").write(json.dumps({"args": args, "cwd": os.getcwd(), "stdin": sys.stdin.read()}))
open(out, "w").write(%r)
''' % FINDINGS
GEMINI = '''import json, os, sys
open(os.environ["FAKE_LOG"], "w").write(json.dumps({"args": sys.argv[1:], "cwd": os.getcwd(), "stdin": sys.stdin.read()}))
sys.stdout.write(%r)
''' % FINDINGS


# The fakes are `#!` scripts, which Windows does not run; the logic under test is platform-independent.
@unittest.skipIf(os.name == "nt", "fake executables use a shebang")
class PathCase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.bin = Path(self._tmp.name) / "bin"
        self.bin.mkdir()
        self.log = Path(self._tmp.name) / "call.json"
        self._saved = {k: os.environ.get(k) for k in ("PATH", "FAKE_LOG")}
        os.environ["PATH"] = str(self.bin)  # only the fakes: the real tools can never be reached
        os.environ["FAKE_LOG"] = str(self.log)
        self.addCleanup(self._restore)

    def _restore(self):
        for key, value in self._saved.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def called(self):
        import json
        return json.loads(self.log.read_text(encoding="utf-8"))


ON = {"external": {"timeout_seconds": 20, "codex": {"enabled": True}, "gemini": {"enabled": True}}}
OFF = {"external": {"codex": {"enabled": False}, "gemini": {"enabled": False}}}


class TestReadiness(PathCase):
    def test_not_installed_says_so_and_how_to_get_it(self):
        ok, why = external.readiness(ON, "codex")
        self.assertFalse(ok)
        self.assertIn("not installed", why)
        self.assertIn("npm install -g @openai/codex", why)

    def test_installed_but_off_says_how_to_switch_it_on_and_what_it_sends(self):
        fake(self.bin, "codex", CODEX)
        ok, why = external.readiness(OFF, "codex")
        self.assertFalse(ok)
        self.assertIn("external.codex.enabled: true", why)
        self.assertIn("code", why)

    def test_installed_and_on_is_ready_and_unknown_config_is_off(self):
        fake(self.bin, "gemini", GEMINI)
        self.assertEqual(external.readiness(ON, "gemini"), (True, ""))
        self.assertFalse(external.readiness({}, "gemini")[0])
        self.assertFalse(external.readiness({"external": {"gemini": {"enabled": "yes"}}}, "gemini")[0])


class TestParse(unittest.TestCase):
    def test_finding_lines_only_and_unknown_severity_becomes_minor(self):
        rows = external.parse(FINDINGS)
        self.assertEqual([r[0] for r in rows], ["critical", "minor"])
        self.assertEqual(rows[0][1:3], ("src/alpha.py:3", "the loop never ends"))

    def test_none_and_garbage_give_nothing_and_the_count_is_capped(self):
        self.assertEqual(external.parse("NONE"), [])
        self.assertEqual(external.parse("FINDING | minor |"), [])
        many = "\n".join(f"FINDING | minor | f.py:{i} | s{i} | w" for i in range(60))
        self.assertEqual(len(external.parse(many)), external.MAX_FINDINGS)


class TestRun(PathCase):
    def test_codex_runs_read_only_outside_the_repo_with_the_package_on_stdin(self):
        fake(self.bin, "codex", CODEX)
        rows, raw, problem = external.run_review(ON, "codex", "PACKAGE TEXT")
        self.assertEqual(problem, "")
        self.assertEqual(len(rows), 2)
        call = self.called()
        self.assertIn("read-only", call["args"])
        self.assertIn("--ephemeral", call["args"])
        self.assertIn("PACKAGE TEXT", call["stdin"])
        self.assertIn("FINDING |", call["stdin"])
        self.assertNotEqual(os.path.realpath(call["cwd"]), os.path.realpath(os.getcwd()))

    def test_gemini_runs_in_plan_mode_outside_the_repo(self):
        fake(self.bin, "gemini", GEMINI)
        rows, _raw, problem = external.run_review(ON, "gemini", "PACKAGE TEXT")
        self.assertEqual((problem, len(rows)), ("", 2))
        call = self.called()
        self.assertEqual(call["args"][:2], ["--approval-mode", "plan"])
        self.assertIn("PACKAGE TEXT", call["stdin"])
        self.assertNotEqual(os.path.realpath(call["cwd"]), os.path.realpath(os.getcwd()))

    def test_control_not_ready_never_runs_anything(self):
        rows, raw, problem = external.run_review(OFF, "codex", "x")
        self.assertEqual((rows, raw), ([], ""))
        self.assertIn("not installed", problem)
        self.assertFalse(self.log.exists())

    def test_control_a_timeout_is_a_message_not_an_error(self):
        fake(self.bin, "gemini", "import time\ntime.sleep(30)\n")
        config = {"external": {"timeout_seconds": 1, "gemini": {"enabled": True}}}
        rows, _raw, problem = external.run_review(config, "gemini", "x")
        self.assertEqual(rows, [])
        self.assertIn("did not answer within 1s", problem)

    def test_control_a_failing_tool_with_no_output_is_a_message(self):
        fake(self.bin, "gemini", "import sys\nsys.stderr.write('auth needed\\n')\nsys.exit(3)\n")
        rows, _raw, problem = external.run_review(ON, "gemini", "x")
        self.assertEqual(rows, [])
        self.assertIn("exited 3", problem)
        self.assertIn("auth needed", problem)


class TestInTheReview(PathCase, WaveFixture):
    def setUp(self):
        PathCase.setUp(self)
        WaveFixture.setUp(self)
        self.unit_a = self.unit("01-alpha", owns=["src/alpha.py"])
        self.write("src/alpha.py", "x = 1\n")
        review_mod.capture_before(self.layout, self.config, self.unit_a, self.slug, self.root)
        self.write("src/alpha.py", "x = 2\n")

    def tearDown(self):
        WaveFixture.tearDown(self)

    def enable(self):
        cfg = self.layout.config
        cfg.write_text(cfg.read_text(encoding="utf-8") + "\nexternal:\n  codex:\n    enabled: true\n", encoding="utf-8")

    def ledger(self):
        return findings_mod.load(self.layout, self.slug, "01-alpha")

    def test_the_findings_are_recorded_low_confidence_from_their_source_and_never_block(self):
        fake(self.bin, "codex", CODEX)
        self.enable()
        code, out = self.cli("review", "01-alpha", "--plan", self.slug, "--with", "codex")
        self.assertEqual(code, 0, out)
        self.assertIn("external review (codex): 2 finding(s)", out)
        rows = self.ledger().findings
        self.assertEqual([(f.source, f.confidence) for f in rows], [("codex", "low")] * 2)
        self.assertEqual(self.ledger().blocking(), [])
        raw = list((self.layout.root / "runtime" / "reviews").glob("*-codex.md"))
        self.assertEqual(len(raw), 1)

    def test_control_installed_but_off_prints_the_next_step_and_records_nothing(self):
        fake(self.bin, "codex", CODEX)
        code, out = self.cli("review", "01-alpha", "--plan", self.slug, "--with", "codex")
        self.assertEqual(code, 0, out)
        self.assertIn("installed but off", out)
        self.assertIn("review package", out)  # the normal review still ran
        self.assertEqual(self.ledger().findings, [])
        self.assertFalse(self.log.exists())

    def test_control_not_installed_prints_the_install_hint(self):
        self.enable()
        code, out = self.cli("review", "01-alpha", "--plan", self.slug, "--with", "codex")
        self.assertEqual(code, 0, out)
        self.assertIn("not installed", out)
        self.assertEqual(self.ledger().findings, [])

    def test_control_without_the_flag_nothing_external_runs(self):
        fake(self.bin, "codex", CODEX)
        self.enable()
        self.cli("review", "01-alpha", "--plan", self.slug)
        self.assertFalse(self.log.exists())

    def test_doctor_lists_the_tools_only_once_one_is_switched_on(self):
        fake(self.bin, "codex", CODEX)
        self.assertNotIn("external reviewers", self.cli("doctor")[1])
        self.enable()
        out = self.cli("doctor")[1]
        self.assertIn("external reviewers", out)
        self.assertIn("codex: installed", out)
        self.assertIn("gemini: not installed", out)


if __name__ == "__main__":
    unittest.main()
