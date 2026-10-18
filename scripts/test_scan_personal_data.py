"""Exercise the scanner CLI against isolated, locally tracked files."""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCANNER = Path(__file__).with_name("scan-personal-data.py").resolve()


class ScanTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)

    def run_scan(self, content, private=None):
        (self.root / "sample.txt").write_text(content, encoding="utf-8")
        subprocess.run(["git", "add", "sample.txt"], cwd=str(self.root), check=True)
        if private is not None:
            (self.root / ".scan-private-patterns").write_text(private, encoding="utf-8")
        return subprocess.run([sys.executable, str(SCANNER)], cwd=str(self.root),
                              capture_output=True, text=True)

    def test_clean_tree_passes(self):
        result = self.run_scan(
            "ordinary documentation\nactions/checkout@0123456789\n"
            "import '@playwright/test'\ncolor=white@0.07\n"
            "/Users/you/project /Users/example/project /home/runner/work /home/user/project\n"
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, "")

    def test_planted_email_fails(self):
        email = "planted@" + "private.invalid"
        result = self.run_scan(email + "\n")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("sample.txt:1: email: " + email, result.stdout)

    def test_allowlisted_email_passes(self):
        result = self.run_scan("\n".join([
            "ansh.n.chovatiya@gmail.com", "123+ci@users.noreply.github.com",
            "noreply@anthropic.com", "ci@example.com", "ci@example.org", "ci@localhost",
        ]))
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_home_path_fails(self):
        home = "/Users/" + "private-person"
        result = self.run_scan(home + "/project\n")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("sample.txt:1: home path: " + home, result.stdout)

    def test_private_pattern_fails(self):
        result = self.run_scan("confidential-label\n", "# comment\n\nconfidential-label\n")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("sample.txt:1: private pattern: confidential-label", result.stdout)


if __name__ == "__main__":
    unittest.main()
