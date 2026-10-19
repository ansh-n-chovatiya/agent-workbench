"""bootstrap.sh against a fake `claude`: dry run changes nothing, --yes sets up, a second run is a no-op."""
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "bootstrap.sh"

FAKE_CLAUDE = r'''#!/usr/bin/env bash
# A stand-in for `claude`: state lives in $FAKE_STATE, every call is logged to $FAKE_STATE/calls.
set -e
echo "$*" >> "$FAKE_STATE/calls"
case "$1 $2 $3" in
  "plugin marketplace list") cat "$FAKE_STATE/markets.json" 2>/dev/null || echo "[]" ;;
  "plugin marketplace add")
    printf '[{"name":"agent-workbench","source":"github","repo":"%s","installLocation":"%s/clone"}]' "$4" "$FAKE_STATE" > "$FAKE_STATE/markets.json" ;;
  "plugin list --json") cat "$FAKE_STATE/plugins.json" 2>/dev/null || echo "[]" ;;
  "plugin install "*)
    python3 - "$FAKE_STATE/plugins.json" "$3" <<'PY'
import json, os, sys
p, pid = sys.argv[1], sys.argv[2]
cur = json.load(open(p)) if os.path.exists(p) else []
cur.append({"id": pid, "scope": "user", "enabled": True})
json.dump(cur, open(p, "w"))
PY
    ;;
  *) echo "fake claude: unexpected: $*" >&2; exit 9 ;;
esac
'''

MUTATING = ("plugin marketplace add", "plugin install")


class BootstrapTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.state = self.tmp / "state"
        self.state.mkdir()
        self.bin = self.tmp / "bin"
        self.bin.mkdir()
        fake = self.bin / "claude"
        fake.write_text(FAKE_CLAUDE)
        fake.chmod(0o755)
        self.config = self.tmp / "config"
        self.env = dict(os.environ, PATH=f"{self.bin}{os.pathsep}{os.environ['PATH']}",
                        FAKE_STATE=str(self.state), CLAUDE_CONFIG_DIR=str(self.config))

    def run_script(self, *args):
        return subprocess.run(["bash", str(SCRIPT), *args], env=self.env, capture_output=True, text=True)

    def calls(self):
        f = self.state / "calls"
        return f.read_text().splitlines() if f.exists() else []

    def mutating_calls(self):
        return [c for c in self.calls() if c.startswith(MUTATING)]

    def settings(self):
        return json.loads((self.config / "settings.json").read_text())

    def test_dry_run_is_the_default_and_writes_nothing(self):
        out = self.run_script()
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("would: add the agent-workbench marketplace", out.stdout)
        self.assertIn("would: install ctx@agent-workbench", out.stdout)
        self.assertIn("would: install ctx-optimize@agent-workbench", out.stdout)
        self.assertIn("would: add the ctx-optimize status line", out.stdout)
        self.assertIn("dry run only", out.stdout)
        self.assertEqual(self.mutating_calls(), [])
        self.assertFalse((self.config / "settings.json").exists())

    def test_yes_sets_everything_up_and_keeps_existing_settings(self):
        self.config.mkdir()
        (self.config / "settings.json").write_text(json.dumps({"theme": "dark", "model": "opus"}))
        out = self.run_script("--yes")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertEqual(self.mutating_calls(), [
            "plugin marketplace add ansh-n-chovatiya/agent-workbench",
            "plugin install ctx@agent-workbench -s user",
            "plugin install ctx-optimize@agent-workbench -s user"])
        s = self.settings()
        self.assertEqual((s["theme"], s["model"]), ("dark", "opus"))
        self.assertTrue(s["statusLine"]["command"].endswith("/clone/plugins/ctx-optimize/bin/ctx-optimize statusline"))
        self.assertEqual(len(list(self.config.glob("settings.json.bak-bootstrap-*"))), 1)

    def test_a_second_run_changes_nothing(self):
        self.run_script("--yes")
        before = (self.config / "settings.json").read_bytes()
        calls_before = len(self.mutating_calls())
        out = self.run_script("--yes")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("nothing to do", out.stdout)
        self.assertEqual(len(self.mutating_calls()), calls_before)
        self.assertEqual((self.config / "settings.json").read_bytes(), before)
        self.assertEqual(len(list(self.config.glob("settings.json.bak-bootstrap-*"))), 0)

    def test_an_existing_status_line_is_left_alone(self):
        self.config.mkdir()
        (self.config / "settings.json").write_text(json.dumps({"statusLine": {"type": "command", "command": "mine"}}))
        out = self.run_script("--yes")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("left alone", out.stdout)
        self.assertEqual(self.settings()["statusLine"]["command"], "mine")

    def test_bad_option_and_missing_claude(self):
        self.assertEqual(self.run_script("--nope").returncode, 2)
        env = dict(self.env, PATH="/usr/bin:/bin")
        missing = subprocess.run(["bash", str(SCRIPT)], env=env, capture_output=True, text=True)
        self.assertEqual(missing.returncode, 1)
        self.assertIn("'claude' is not on PATH", missing.stderr)


if __name__ == "__main__":
    unittest.main()
