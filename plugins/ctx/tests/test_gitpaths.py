"""Uncommitted and arrived paths are relative to the ledger's project, exactly, even in a monorepo or with unicode.

Found by the whole-repo review: `git status --porcelain` names paths from the repository root and escapes non-ASCII
names, so in a nested ledger or for a file called `café.py` every scope comparison silently missed.
"""
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import gitpaths, paths, review as review_mod, verify  # noqa: E402


def _writable(function, path, _info):
    os.chmod(path, stat.S_IWRITE)
    function(path)


def git(root, *args, date=None):
    env = dict(os.environ)
    if date:
        env["GIT_COMMITTER_DATE"] = env["GIT_AUTHOR_DATE"] = date
    subprocess.run(["git", "-c", "user.email=a@example.com", "-c", "user.name=a", *args], cwd=str(root), check=True,
                   capture_output=True, env=env)


class RepoCase(unittest.TestCase):
    def setUp(self):
        self.base = Path(tempfile.mkdtemp()).resolve()
        self.addCleanup(shutil.rmtree, self.base, False, _writable)
        self.repo = self.base / "repo"
        self.project = self.repo / "svc x"  # a space on purpose
        (self.project / ".ctx").mkdir(parents=True)
        git(self.repo, "init", "-q")
        (self.repo / ".gitignore").write_text(".ctx/\n")
        self.write("svc x/keep.py", "k = 1\n")
        self.write("other/o.py", "o = 1\n")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "base")
        self.layout = paths.Layout(self.project / ".ctx")

    def write(self, rel, text):
        p = self.repo / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")


class TestStatusPaths(RepoCase):
    def test_paths_are_relative_to_the_project_and_outside_ones_are_dropped(self):
        self.write("svc x/keep.py", "k = 2\n")
        self.write("svc x/new.py", "n = 1\n")
        self.write("other/o.py", "o = 2\n")  # belongs to no unit of this ledger
        found, error = gitpaths.status_paths(self.project)
        self.assertEqual((sorted(found), error), (["keep.py", "new.py"], ""))

    def test_non_ascii_names_are_exact_not_escaped(self):
        self.write("svc x/café é.py", "x = 1\n")
        found, _error = gitpaths.status_paths(self.project)
        self.assertEqual(found, ["café é.py"])

    def test_a_rename_names_the_new_path_only(self):
        git(self.repo, "mv", "svc x/keep.py", "svc x/moved.py")
        found, _error = gitpaths.status_paths(self.project)
        self.assertEqual(found, ["moved.py"])

    def test_control_no_repository_is_an_error_not_an_empty_list(self):
        outside = self.base / "plain"
        outside.mkdir()
        found, error = gitpaths.status_paths(outside)
        self.assertEqual(found, [])
        self.assertTrue(error)

    def test_the_done_gate_helpers_use_the_same_convention(self):
        self.write("svc x/café.py", "x = 1\n")
        self.assertEqual(verify.changed_files(self.project), (["café.py"], ""))
        self.assertEqual(review_mod._uncommitted_paths(self.layout), ["café.py"])


class TestArrivedByPull(RepoCase):
    def test_a_commit_dated_before_the_window_but_pulled_during_it_is_excused_by_the_baseline_commit(self):
        head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=str(self.repo), capture_output=True, text=True,
                              check=True).stdout.strip()
        time.sleep(1.1)
        self.write("svc x/pulled.py", "p = 1\n")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "old date", date="2026-01-01T00:00:00+0000")
        kept, arrived = review_mod._split_committed(self.layout, ["pulled.py"], time.time() - 0.5, head)
        self.assertEqual((kept, arrived), ([], ["pulled.py"]))

    def test_control_without_the_baseline_commit_the_old_dated_commit_is_not_found_by_time(self):
        time.sleep(1.1)
        self.write("svc x/pulled.py", "p = 1\n")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "old date", date="2026-01-01T00:00:00+0000")
        kept, arrived = review_mod._split_committed(self.layout, ["pulled.py"], time.time() - 0.5, "")
        self.assertEqual((kept, arrived), (["pulled.py"], []))

    def test_control_an_uncommitted_edit_after_the_baseline_stays_a_violation(self):
        head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=str(self.repo), capture_output=True, text=True,
                              check=True).stdout.strip()
        self.write("svc x/keep.py", "k = 9\n")
        kept, arrived = review_mod._split_committed(self.layout, ["keep.py"], time.time() - 5, head)
        self.assertEqual((kept, arrived), (["keep.py"], []))


if __name__ == "__main__":
    unittest.main()
