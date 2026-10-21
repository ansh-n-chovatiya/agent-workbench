"""An unreadable ctx.yaml names the file and is never silent (found by the whole-repo review)."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from support import Fixture  # noqa: E402


class TestBrokenConfig(Fixture):
    def break_it(self, text="gate:\n\tenabled: false\n"):
        self.layout.config.write_text(text, encoding="utf-8")

    def test_a_command_names_the_file_and_says_what_to_do(self):
        self.break_it()
        code, out = self.cli("status")
        self.assertEqual(code, 2)
        self.assertIn("ctx.yaml", out)
        self.assertIn("tab indentation", out)
        self.assertIn("Fix it", out)

    def test_a_list_instead_of_a_mapping_is_a_sentence_not_a_traceback(self):
        self.break_it("- one\n- two\n")
        code, out = self.cli("status")
        self.assertEqual(code, 2)
        self.assertIn("must be a mapping", out)
        self.assertNotIn("Traceback", out)

    def test_the_session_start_hook_does_not_fail_and_says_the_file_is_unreadable(self):
        import contextlib
        import io
        self.break_it()
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            code, _out = self.run_hook("SessionStart")
        self.assertEqual(code, 0)
        self.assertIn("ctx.yaml", err.getvalue())
        self.assertIn("did nothing rather than failing your session", err.getvalue())

    def test_control_a_valid_config_is_untouched(self):
        self.assertEqual(self.cli("status")[0], 0)


if __name__ == "__main__":
    unittest.main()
