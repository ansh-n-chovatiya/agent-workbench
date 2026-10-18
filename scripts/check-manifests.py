#!/usr/bin/env python3
"""Validate the local Claude Code marketplace using only the Python stdlib."""

import json
import re
import sys
from pathlib import Path, PurePosixPath


# SemVer 2.0: numeric prerelease identifiers cannot have leading zeroes.
NUMBER = r"(?:0|[1-9][0-9]*)"
PRE = r"(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)"
SEMVER = re.compile(
    NUMBER + r"\." + NUMBER + r"\." + NUMBER
    + r"(?:-" + PRE + r"(?:\." + PRE + r")*)?"
    + r"(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?"
)


def read_object(path, label, problems):
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        problems.append("%s: cannot read JSON (%s)" % (label, error))
        return None
    if not isinstance(value, dict):
        problems.append("%s: must be a JSON object" % label)
        return None
    return value


def validate(root):
    """Return every detected problem; never mutate the marketplace tree."""
    root = Path(root).resolve()
    problems = []
    marketplace = read_object(root / ".claude-plugin/marketplace.json",
                              "marketplace", problems)
    if marketplace is None:
        return problems
    if not isinstance(marketplace.get("name"), str) or not marketplace["name"].strip():
        problems.append("marketplace: name must be a nonempty string")
    owner = marketplace.get("owner")
    if not isinstance(owner, dict) or not isinstance(owner.get("name"), str) or not owner["name"].strip():
        problems.append("marketplace: owner must have a nonempty name")
    plugins = marketplace.get("plugins")
    if not isinstance(plugins, list):
        problems.append("marketplace: plugins must be an array")
        return problems
    seen = set()
    for index, entry in enumerate(plugins):
        label = "plugins[%d]" % index
        if not isinstance(entry, dict):
            problems.append("%s: must be an object" % label)
            continue
        name = entry.get("name")
        if not isinstance(name, str) or not name.strip():
            problems.append("%s: name must be a nonempty string" % label)
        else:
            if name in seen:
                problems.append("%s: duplicate plugin name %r" % (label, name))
            seen.add(name)
            if name.startswith(("claude-", "anthropic-")):
                problems.append("%s: reserved plugin name prefix" % label)
        source = entry.get("source")
        if (not isinstance(source, str) or not source.startswith("./")
                or source == "./" or "\\" in source
                or ".." in PurePosixPath(source).parts
                or PurePosixPath(source[2:]).is_absolute()):
            problems.append("%s: source must be a relative ./... path without .." % label)
            continue
        directory = root / source
        # A syntactically local symlink must not escape the repository either.
        try:
            directory.resolve().relative_to(root)
        except (ValueError, OSError, RuntimeError):
            problems.append("%s: source resolves outside the repository or is invalid" % label)
            continue
        if not directory.is_dir():
            problems.append("%s: source directory does not exist" % label)
            continue
        manifest = read_object(directory / ".claude-plugin/plugin.json", label + " manifest", problems)
        if manifest is not None:
            if manifest.get("name") != name:
                problems.append("%s: manifest name must equal entry name" % label)
            version = manifest.get("version")
            if not isinstance(version, str) or SEMVER.fullmatch(version) is None:
                problems.append("%s: manifest version must be semver" % label)
            license_name = manifest.get("license")
            if not isinstance(license_name, str) or not license_name.strip():
                problems.append("%s: manifest license must be a nonempty string" % label)
        if not (directory / "LICENSE").is_file():
            problems.append("%s: LICENSE file is missing" % label)
    return problems


def main():
    problems = validate(Path(__file__).resolve().parents[1])
    for problem in problems:
        # Escape controls in untrusted JSON so each problem occupies one line.
        print(problem.encode("unicode_escape").decode("ascii"))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
