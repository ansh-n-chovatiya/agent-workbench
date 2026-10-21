"""Paths that arrived by a git commit during a unit's window are not that unit's violations.

Field evidence: a pull or another session's commit landed files in the shared checkout while a unit ran, and six of
eight review packages carried a mechanical Critical for them. A unit does not commit, so a path that is clean in git
and was touched by a commit after the unit's baseline did not come from it. The controls matter most: an uncommitted
edit, a re-edited committed file and an untracked file are all still violations.
"""
import os
import stat
import subprocess
import sys
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import review as review_mod  # noqa: E402
from test_review_scope_noise import real_git_repo  # noqa: E402
from test_sibling_scope import WaveFixture, violation_paths  # noqa: E402


def git(root, *args, date=None):
    env = dict(os.environ)
    if date:
        env["GIT_COMMITTER_DATE"] = env["GIT_AUTHOR_DATE"] = date
    subprocess.run(["git", "-c", "user.email=a@example.com", "-c", "user.name=a", *args],
                   cwd=str(root), check=True, capture_output=True, env=env)


class CommittedFixture(WaveFixture):
    def setUp(self):
        super().setUp()
        real_git_repo(self.root)
        self.write(".gitignore", ".ctx/\n")
        self.unit_a = self.unit("01-alpha", owns=["src/alpha.py"])
        self.write("src/alpha.py", "alpha = 1\n")
        self.write("src/other.py", "other = 1\n")
        git(self.root, "add", "-A")
        git(self.root, "commit", "-q", "-m", "base")
        review_mod.capture_before(self.layout, self.config, self.unit_a, self.slug, self.root)
        time.sleep(1.1)  # git commit times have one-second resolution

    def commit_other(self, text="other = 2\n"):
        self.write("src/other.py", text)
        git(self.root, "add", "-A")
        git(self.root, "commit", "-q", "-m", "someone else")

    def text(self):
        built, _stats, problem = review_mod.build(self.layout, self.config, self.unit_a, self.slug, self.root)
        self.assertEqual(problem, "")
        return built.read_text(encoding="utf-8")


class TestArrivedByCommit(CommittedFixture):
    def test_a_path_committed_during_the_window_is_not_a_violation(self):
        self.write("src/alpha.py", "alpha = 2\n")
        self.commit_other()
        text = self.text()
        self.assertEqual(violation_paths(text), set())
        self.assertIn("1 path(s) arrived by a git commit", text)
        self.assertIn("src/other.py", text)

    def test_control_an_uncommitted_edit_is_still_a_violation(self):
        self.write("src/alpha.py", "alpha = 2\n")
        self.write("src/other.py", "other = 2\n")
        self.assertEqual(violation_paths(self.text()), {"src/other.py"})

    def test_control_a_committed_file_edited_again_is_still_a_violation(self):
        self.commit_other()
        self.write("src/other.py", "other = 3\n")
        self.assertEqual(violation_paths(self.text()), {"src/other.py"})

    def test_control_an_untracked_new_file_is_still_a_violation(self):
        self.write("src/new.py", "new = 1\n")
        self.assertEqual(violation_paths(self.text()), {"src/new.py"})

    def test_control_a_commit_made_before_the_window_does_not_excuse_a_later_uncommitted_edit(self):
        # `src/other.py` was committed by someone before the baseline; the baseline is taken after that commit.
        # Its later uncommitted change is therefore not "arrived by commit" and is a violation.
        self.write("src/other.py", "other = 9\n")
        self.assertEqual(violation_paths(self.text()), {"src/other.py"})

    def test_control_a_historical_commit_outside_the_window_is_not_found_by_the_time_filter(self):
        self.write("src/old.py", "old = 1\n")
        git(self.root, "add", "-A")
        git(self.root, "commit", "-q", "-m", "ancient", date="2001-01-01T00:00:00+0000")
        kept, arrived = review_mod._split_committed(self.layout, ["src/old.py"], time.time() - 0.5, "")
        self.assertEqual((kept, arrived), (["src/old.py"], []))

    def test_without_a_repository_nothing_is_excused(self):
        import os
        import shutil

        def writable(function, path, _excinfo):  # git marks object files read-only; Windows refuses to delete them
            os.chmod(path, stat.S_IWRITE)
            function(path)

        shutil.rmtree(self.root / ".git", onerror=writable)
        (self.root / ".git").mkdir()
        self.write("src/other.py", "other = 2\n")
        self.assertEqual(violation_paths(self.text()), {"src/other.py"})
        self.assertNotIn("arrived by a git commit", self.text())

    def test_a_ledger_nested_below_the_repository_root_matches_its_own_paths(self):
        from ctx import paths
        sub = self.root / "sub"
        (sub / ".ctx").mkdir(parents=True)
        self.write("sub/lib.py", "lib = 1\n")
        self.write("sub/mine.py", "mine = 1\n")
        git(self.root, "add", "-A")
        git(self.root, "commit", "-q", "-m", "nested base")
        time.sleep(1.1)
        layout = paths.Layout(sub / ".ctx")
        since = time.time() - 1.0
        self.write("sub/lib.py", "lib = 2\n")
        git(self.root, "add", "-A")
        git(self.root, "commit", "-q", "-m", "nested change")
        self.write("sub/mine.py", "mine = 2\n")  # uncommitted: stays
        kept, arrived = review_mod._split_committed(layout, ["lib.py", "mine.py"], since)
        self.assertEqual((kept, arrived), (["mine.py"], ["lib.py"]))


if __name__ == "__main__":
    unittest.main()
