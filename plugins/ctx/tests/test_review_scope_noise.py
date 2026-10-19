"""Scope Criticals must name only what a unit could have been answerable for.

Field evidence (19 disputed "outside the unit's owned list" Criticals across five
plans, 431 stray paths): every one was the mechanical `## Scope violations`
section copied into a Critical, none was the reviewer rewording a fine check.
Two causes covered about four paths in five.

1. **Git-ignored paths** (logs, caches, generated JSON, hook output) are not in
   the snapshot's built-in ignore list, so any dev server or hook that wrote one
   during the window became a "stray". They are not anyone's source, so they are
   no longer violations. They are still counted, in a note, so the section never
   hides that something changed.
2. **Units dispatched after this unit's baseline.** A review that runs in one
   batch after the last wave compares against the snapshot taken when the unit
   started, so a later wave's declared files look like strays; a concurrent fix
   round of an earlier wave does too. A unit that recorded a snapshot after this
   baseline was provably active in the window, so its declared paths are excused.

The tests that matter most are the controls: an undeclared tracked file and the
`owns` of a unit that never ran are both still violations. If the fix had been
"stop checking", those would fail.
"""

import shutil
import subprocess
import sys
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import review as review_mod  # noqa: E402
from test_sibling_scope import WaveFixture, violation_paths  # noqa: E402


def real_git_repo(root):
    """Replace the fixture's placeholder `.git` directory with a real repository."""
    shutil.rmtree(root / ".git", ignore_errors=True)
    subprocess.run(["git", "init", "-q"], cwd=str(root), check=True)


class TestGitIgnoredPathsAreNotViolations(WaveFixture):
    def setUp(self):
        super().setUp()
        real_git_repo(self.root)
        self.write(".gitignore", "logs/\ngenerated/\n")
        self.unit_a = self.unit("01-alpha", owns=["src/alpha.py"])
        self.write("src/alpha.py", "alpha = 1\n")
        review_mod.capture_before(self.layout, self.config, self.unit_a, self.slug, self.root)

    def build(self):
        built, _stats, problem = review_mod.build(
            self.layout, self.config, self.unit_a, self.slug, self.root)
        self.assertEqual(problem, "")
        return built.read_text(encoding="utf-8")

    def test_ignored_logs_and_generated_files_are_not_listed(self):
        self.write("src/alpha.py", "alpha = 2\n")
        self.write("logs/dev.log", "noise\n")
        self.write("generated/graph.json", "{}\n")
        text = self.build()
        self.assertEqual(violation_paths(text), set())
        self.assertIn("2 git-ignored path(s) changed", text)

    def test_control_an_undeclared_tracked_file_is_still_a_violation(self):
        self.write("src/alpha.py", "alpha = 2\n")
        self.write("logs/dev.log", "noise\n")
        self.write("src/nobody.py", "nobody = 1\n")
        text = self.build()
        self.assertEqual(violation_paths(text), {"src/nobody.py"})
        self.assertIn("1 git-ignored path(s) changed", text)

    def test_without_a_git_repository_nothing_is_excused(self):
        shutil.rmtree(self.root / ".git")
        (self.root / ".git").mkdir()  # the placeholder: not a repository
        self.write("logs/dev.log", "noise\n")
        text = self.build()
        self.assertEqual(violation_paths(text), {"logs/dev.log"})
        self.assertNotIn("git-ignored", text)


class TestUnitsActiveSinceTheBaselineAreExcused(WaveFixture):
    def setUp(self):
        super().setUp()
        self.first = self.unit("01-first", owns=["src/a.py"], wave=1)
        self.later = self.unit("02-later", owns=["src/b.py"], wave=2)
        self.never = self.unit("03-never", owns=["src/c.py"], wave=3)
        for name in ("a", "b", "c"):
            self.write(f"src/{name}.py", f"{name} = 1\n")

    def dispatch(self, unit):
        review_mod.capture_before(self.layout, self.config, unit, self.slug, self.root)
        time.sleep(0.02)  # taken_at is a float clock; make the ordering unambiguous

    def review_first(self):
        built, _stats, problem = review_mod.build(
            self.layout, self.config, self.first, self.slug, self.root)
        self.assertEqual(problem, "")
        return built.read_text(encoding="utf-8")

    def test_a_later_wave_dispatched_after_our_baseline_is_not_a_stray(self):
        self.dispatch(self.first)
        self.write("src/a.py", "a = 2\n")
        self.dispatch(self.later)            # a later wave began after our baseline
        self.write("src/b.py", "b = 2\n")    # ... and wrote its own file
        self.assertEqual(violation_paths(self.review_first()), set())

    def test_control_a_unit_that_never_ran_excuses_nothing(self):
        self.dispatch(self.first)
        self.dispatch(self.later)
        self.write("src/a.py", "a = 2\n")
        self.write("src/c.py", "c = 2\n")    # owned by 03, which was never dispatched
        self.assertEqual(violation_paths(self.review_first()), {"src/c.py"})

    def test_control_a_unit_dispatched_before_our_baseline_excuses_nothing(self):
        self.dispatch(self.later)            # its only snapshot predates our baseline
        self.dispatch(self.first)
        self.write("src/a.py", "a = 2\n")
        self.write("src/b.py", "b = 2\n")
        self.assertEqual(violation_paths(self.review_first()), {"src/b.py"})

    def test_a_concurrent_fix_round_of_an_earlier_wave_counts_as_active(self):
        self.dispatch(self.later)
        self.dispatch(self.first)
        # The earlier-wave unit reviews a fix round after our baseline: that is a
        # snapshot of its own, taken inside our window.
        review_mod.snapshot.capture(
            self.layout, self.config, review_mod.after_key(self.slug, self.later.name, 2),
            self.root, content_paths=list(self.later.owns), force=True)
        self.write("src/a.py", "a = 2\n")
        self.write("src/b.py", "b = 2\n")
        self.assertEqual(violation_paths(self.review_first()), set())


class TestFieldCaseReplay(WaveFixture):
    """Case D from the work-machine evidence, replayed end to end.

    A wave-2 unit is reviewed (round 2) after two wave-1 units ran concurrent fix
    rounds, while a dev server wrote logs and a hook rebuilt ignored JSON. Of the
    paths that changed, only the one nobody declared is the unit's to answer for.
    """

    def test_only_the_genuinely_undeclared_path_is_reported(self):
        real_git_repo(self.root)
        self.write(".gitignore", "*.log\ngraph/\n")
        one = self.unit("01-one", owns=["src/one.py"], wave=1)
        two = self.unit("02-two", owns=["src/two.py"], wave=1)
        mine = self.unit("03-mine", owns=["src/mine.py"], wave=2)
        for name in ("one", "two", "mine"):
            self.write(f"src/{name}.py", f"{name} = 1\n")
        review_mod.capture_before(self.layout, self.config, mine, self.slug, self.root)
        time.sleep(0.02)
        for unit in (one, two):  # concurrent round-1 fixes, snapshotted inside our window
            review_mod.snapshot.capture(
                self.layout, self.config, review_mod.after_key(self.slug, unit.name, 1),
                self.root, content_paths=list(unit.owns), force=True)
        self.write("src/mine.py", "mine = 2\n")
        self.write("src/one.py", "one = 2\n")
        self.write("src/two.py", "two = 2\n")
        self.write("dev-server.log", "request\n")
        self.write("graph/out.json", "{}\n")
        self.write("NOTES.txt", "orchestrator scribble\n")  # real, undeclared, tracked-able
        built, _stats, problem = review_mod.build(
            self.layout, self.config, mine, self.slug, self.root)
        self.assertEqual(problem, "")
        text = built.read_text(encoding="utf-8")
        self.assertEqual(violation_paths(text), {"NOTES.txt"})
        self.assertIn("2 git-ignored path(s) changed", text)


if __name__ == "__main__":
    unittest.main()
