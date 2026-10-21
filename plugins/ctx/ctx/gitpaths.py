"""Uncommitted paths as the ledger sees them: relative to the project root, even when it sits below the git root.

`git status --porcelain` names paths from the repository root, while a unit's `owns`, the snapshots and every scope
check are relative to the project (the folder that holds `.ctx`). In a repository whose root *is* the project the two
agree; in a monorepo (this one) they do not, and every comparison silently missed. This is the one place that
converts. Paths outside the project folder are dropped: no unit of this ledger can own them.
"""
import subprocess


def _run(args, root, timeout=30):
    done = subprocess.run(["git", *args], cwd=str(root), capture_output=True, timeout=timeout)
    return done.returncode, done.stdout.decode("utf-8", "surrogateescape"), done.stderr.decode("utf-8", "replace")


def status_paths(root):
    """`(paths, error)`: uncommitted paths (untracked included) relative to `root`; `error` is "" on success.

    NUL-separated, so a path with spaces or non-ASCII characters is exact and a rename names its new path.
    """
    try:
        code, prefix, err = _run(["rev-parse", "--show-prefix"], root)
        if code != 0:
            return [], (err.strip() or "not a git repository")
        code, out, err = _run(["status", "--porcelain=v1", "-z", "--untracked-files=all"], root, 60)
    except (OSError, subprocess.SubprocessError) as exc:
        return [], f"git unavailable: {exc}"
    if code != 0:
        return [], (err.strip() or "git status failed")
    prefix = prefix.strip()
    paths, fields, skip = [], out.split("\0"), False
    for field in fields:
        if skip:  # the old name of a rename or copy follows its entry; it is not a path that exists now
            skip = False
            continue
        if len(field) < 4:
            continue
        name = field[3:]
        skip = field[0] in "RC" or field[1] in "RC"
        if prefix:
            if not name.startswith(prefix):
                continue
            name = name[len(prefix):]
        paths.append(name)
    return paths, ""
