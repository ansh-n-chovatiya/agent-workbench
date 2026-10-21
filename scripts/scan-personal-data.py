#!/usr/bin/env python3
"""Scan tracked working files, and optionally historical added lines, offline."""

import argparse
import ast
import re
import subprocess
import sys
from pathlib import Path


EMAIL = re.compile(
    r"[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@"
    r"(?:[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}|localhost)(?![a-zA-Z0-9-])"
)
HOME = re.compile(r"/(?:Users|home)/[^/\s\"'`<>:;,()\[\]{}]+")
# Claude Code names a project folder after its path with every separator turned into a dash (`-Users-you-Desktop-x`),
# and Windows homes use backslashes: both carry the same account name.
HOME_DASH = re.compile(r"(?<![A-Za-z0-9])-(Users|home)-([A-Za-z0-9._]+)(?=-|\b)")
HOME_WIN = re.compile(r"[A-Za-z]:\\{1,2}Users\\{1,2}([^\\/\s\"'`<>:;,()\[\]{}]+)")
ALLOWED_EMAILS = {"ansh.n.chovatiya@gmail.com", "noreply@anthropic.com"}
ALLOWED_DOMAINS = {"example.com", "example.org", "localhost", "users.noreply.github.com"}
# Account names that are obviously placeholders or CI accounts, for the dash-encoded and Windows forms.
ALLOWED_PLACEHOLDER_NAMES = {"me", "name", "...", "public", "default", "runner~1", "runneradmin"}
ALLOWED_HOMES = {"/Users/you", "/Users/example", "/Users/victim", "/Users/x", "/home/runner", "/home/user", "/home/you", "/home/victim"}


def git(root, *args):
    return subprocess.check_output(["git", *args], cwd=str(root))


def private_patterns(root):
    path = root / ".scan-private-patterns"
    if not path.exists():
        return []
    patterns = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if line.strip() and not line.lstrip().startswith("#"):
            try:
                patterns.append(re.compile(line))
            except re.error as error:
                raise ValueError("%s:%d: %s" % (path.name, number, error))
    return patterns


def findings(line, patterns):
    for match in EMAIL.finditer(line):
        email = match.group()
        address = email.lower()
        domain = address.rsplit("@", 1)[1]
        if address not in ALLOWED_EMAILS and domain not in ALLOWED_DOMAINS:
            yield "email", email
    for match in HOME.finditer(line):
        if match.group() not in ALLOWED_HOMES:
            yield "home path", match.group()
    allowed_names = {home.rsplit("/", 1)[1] for home in ALLOWED_HOMES} | ALLOWED_PLACEHOLDER_NAMES
    for match in HOME_DASH.finditer(line):
        if match.group(2) not in allowed_names:
            yield "home path", match.group()
    for match in HOME_WIN.finditer(line):
        if match.group(1).lower() not in {n.lower() for n in allowed_names}:
            yield "home path", match.group()
    for pattern in patterns:
        for match in pattern.finditer(line):
            yield "private pattern", match.group()


def tracked_lines(root):
    for name in git(root, "ls-files", "-z").split(b"\0"):
        if not name:
            continue
        path = root / name.decode("utf-8", "surrogateescape")
        # Never follow a tracked symlink into files outside the repository.
        if path.is_symlink() or not path.is_file():
            continue
        data = path.read_bytes()
        if b"\0" in data:
            continue
        try:
            content = data.decode("utf-8")
        except UnicodeDecodeError:
            continue
        for number, line in enumerate(content.splitlines(), 1):
            yield name.decode("utf-8", "replace"), number, line


def history_lines(root):
    # Stream patches to avoid retaining the repository's entire history in RAM.
    command = ["git", "-c", "core.quotePath=false", "log", "--all", "--root",
               "-m", "--format=SCAN-COMMIT:%H", "--no-ext-diff", "--no-textconv",
               "--no-renames", "--unified=0", "-p"]
    with subprocess.Popen(command, cwd=str(root), stdout=subprocess.PIPE) as proc:
        path, commit, number, in_hunk = None, "", 0, False
        for raw in proc.stdout:
            line = raw.decode("utf-8", "replace").rstrip("\n")
            if line.startswith("SCAN-COMMIT:"):
                commit = line.split(":", 1)[1]
                path, in_hunk = None, False
            elif line.startswith("diff --git "):
                path, in_hunk = None, False
            elif not in_hunk and line.startswith("+++ "):
                path = line[4:]
                if path.startswith('"'):
                    path = ast.literal_eval(path)
                if path == "/dev/null":
                    path = None
                elif path.startswith("b/"):
                    path = path[2:]
            elif line.startswith("@@ "):
                match = re.match(r"@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@", line)
                if match:
                    number, in_hunk = int(match.group(1)), True
            elif in_hunk and line.startswith("+"):
                if path is not None and "\0" not in line:
                    yield "%s@%s" % (path, commit), number, line[1:]
                number += 1
            elif in_hunk and line.startswith(" "):
                number += 1
        if proc.wait() != 0:
            raise subprocess.CalledProcessError(proc.returncode, command)


def scan(lines, patterns):
    count = 0
    for path, number, line in lines:
        for kind, matched in findings(line, patterns):
            # Escape controls so one match always occupies one output line.
            matched = matched.encode("unicode_escape").decode("ascii")
            if len(matched) > 200:
                matched = matched[:197] + "..."
            print("%s:%d: %s: %s" % (path, number, kind, matched))
            count += 1
    return count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--history", action="store_true", help="also scan all historical added lines")
    args = parser.parse_args()
    try:
        root = Path(git(Path.cwd(), "rev-parse", "--show-toplevel").decode().strip())
        patterns = private_patterns(root)
        count = scan(tracked_lines(root), patterns)
        if args.history:
            count += scan(history_lines(root), patterns)
        return 1 if count else 0
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print("scan error: %s" % error, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
