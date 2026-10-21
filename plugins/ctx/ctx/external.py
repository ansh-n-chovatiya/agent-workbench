"""Optional second reviewers: Codex and Gemini, used only when installed and switched on (D6, phase 6).

Nothing here runs unless a person asks (`ctx review <unit> --with codex`), the tool is on the PATH, and the person
switched it on **for this machine** in `~/.claude/ctx/external.yaml` (`$CTX_GLOBAL_ROOT/external.yaml`). The switch is
not read from the project's `ctx.yaml`: that file is committed, so whoever authored a repository could otherwise
decide that your code is sent to a third party. The review package contains code, so it is sent to that tool's
provider only on that explicit request; the tool runs read-only in an empty temporary directory, never in the
repository, with a timeout. Whatever it says is recorded as low-confidence findings from that source, so it can
never block a unit by itself: the orchestrator or the owner confirms or disputes each one. Every failure is a
message, never an error that stops the normal review.
"""
import os
import re
import shutil
import signal
import subprocess
import tempfile

from . import improve, miniyaml, paths

AGENTS = {
    "codex": {"label": "Codex (OpenAI)", "bin": "codex", "install": "npm install -g @openai/codex"},
    "gemini": {"label": "Gemini (Google)", "bin": "gemini", "install": "npm install -g @google/gemini-cli"},
}
DEFAULT_TIMEOUT = 300
MAX_FINDINGS = 20
SEVERITIES = ("critical", "important", "minor")

PROMPT = (
    "You are a second, independent code reviewer. Read only: do not edit files or run commands. The review package "
    "below is the complete change. Report each real problem (broken behaviour, data loss, security, a missed "
    "acceptance criterion, a caller the change breaks) on its own line, exactly: "
    "FINDING | severity | file:line | one-line summary | why it matters. severity is critical, important or minor. "
    "Say nothing about style. If there is nothing to report, write NONE."
)
_LINE = re.compile(r"^[\s>*`-]*FINDING\s*\|(.+)$", re.IGNORECASE)


def installed(name):
    """The executable's path, or None."""
    return shutil.which(AGENTS[name]["bin"])


def version(name, timeout=10):
    """The tool's version number, or "" (it prints something else, or cannot be run)."""
    path = installed(name)
    if not path:
        return ""
    try:
        done = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=timeout)
    except (OSError, subprocess.SubprocessError):
        return ""
    found = re.search(r"\d+\.\d+(?:\.\d+)?[\w.+-]*", (done.stdout or done.stderr or "")[:200])
    return found.group(0)[:30] if found else ""


def user_file():
    return paths.global_root() / "external.yaml"


def switched_on(config, name):
    """True only when this machine's user file says so; the project's config is never consulted."""
    try:
        data = miniyaml.loads(user_file().read_text(encoding="utf-8"))
    except (OSError, ValueError, miniyaml.MiniYamlError):
        return False
    section = data.get(name) if isinstance(data, dict) else None
    return isinstance(section, dict) and section.get("enabled") is True


def timeout_seconds(config):
    try:
        value = int(((config or {}).get("external") or {}).get("timeout_seconds") or DEFAULT_TIMEOUT)
    except (TypeError, ValueError):
        return DEFAULT_TIMEOUT
    return min(value, 900) if value > 0 else DEFAULT_TIMEOUT


def readiness(config, name):
    """`(ok, why)`: ready only when installed and switched on, with the next step spelled out when not."""
    info = AGENTS[name]
    if not installed(name):
        return False, f"{info['label']} is not installed (`{info['bin']}` not on PATH). Optional: {info['install']}"
    if not switched_on(config, name):
        return False, (f"{info['label']} is installed but off. To use it on this machine, create {user_file()} "
                       f"containing `{name}:` and, indented under it, `enabled: true`. Note this sends the review "
                       f"package (which contains code) to {info['label'].split('(')[1][:-1]}; the project's own "
                       "ctx.yaml cannot switch it on.")
    return True, ""


def status_lines(config):
    """Lines for `ctx doctor`: what is installed, what is on, and nothing that runs anything."""
    out = []
    for name in AGENTS:
        path = installed(name)
        state = "on" if switched_on(config, name) else "off"
        if path:
            out.append(f"  {name}: installed {version(name)} · {state} · ready={readiness(config, name)[0]}")
        else:
            out.append(f"  {name}: not installed (optional) · {state}")
    return out


def command(name, workdir, outfile):
    """`(argv, stdin_is_package)`; both tools get the instruction and the package, read-only, in `workdir`."""
    path = installed(name)
    if name == "codex":
        return [path, "exec", "--sandbox", "read-only", "--skip-git-repo-check", "--ephemeral", "--color", "never",
                "-C", workdir, "-o", outfile, "-"]
    return [path, "--approval-mode", "plan", "-o", "text", "-p", PROMPT]


def parse(text):
    """`[(severity, where, summary, why)]` from `FINDING | ...` lines; unknown severities become minor."""
    found = []
    for line in str(text or "").splitlines():
        match = _LINE.match(line)
        if not match:
            continue
        parts = [p.strip() for p in match.group(1).split("|", 3)]
        if len(parts) < 3 or not parts[2]:
            continue
        severity = parts[0].lower()
        # Another party's text goes into the briefing of every later session: scrub paths, emails and secrets, and keep
        # it to one short line so it cannot carry instructions or markup.
        clean = lambda text, n: improve.scrub_text(text, n)  # noqa: E731
        found.append((severity if severity in SEVERITIES else "minor", clean(parts[1], 120), clean(parts[2], 200),
                      clean(parts[3] if len(parts) > 3 else "", 200)))
        if len(found) >= MAX_FINDINGS:
            break
    return found


def _kill_tree(proc):
    """Stop the tool and whatever it started: the real CLIs are wrappers around a child that does the work."""
    try:
        if os.name != "nt":
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        else:
            proc.kill()
    except (OSError, ProcessLookupError):
        pass


def run_review(config, name, package_text):
    """`(findings, raw, problem)`. Never raises; `problem` is a sentence when nothing usable came back."""
    ok, why = readiness(config, name)
    if not ok:
        return [], "", why
    with tempfile.TemporaryDirectory(prefix="ctx-external-") as workdir:
        outfile = os.path.join(workdir, "last-message.txt")
        argv = command(name, workdir, outfile)
        stdin = (PROMPT + "\n\n" if name == "codex" else "") + package_text
        try:
            proc = subprocess.Popen(argv, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                    cwd=workdir, text=True, start_new_session=(os.name != "nt"))
        except OSError as exc:
            return [], "", f"{AGENTS[name]['label']} could not be run: {type(exc).__name__}"
        try:
            stdout, stderr = proc.communicate(stdin, timeout=timeout_seconds(config))
        except subprocess.TimeoutExpired:
            _kill_tree(proc)
            proc.communicate()
            return [], "", f"{AGENTS[name]['label']} did not answer within {timeout_seconds(config)}s; skipped"
        except (OSError, subprocess.SubprocessError) as exc:
            _kill_tree(proc)
            return [], "", f"{AGENTS[name]['label']} could not be run: {type(exc).__name__}"
        done = subprocess.CompletedProcess(argv, proc.returncode, stdout, stderr)
        raw = done.stdout or ""
        if name == "codex":
            try:
                with open(outfile, encoding="utf-8") as handle:
                    raw = handle.read() or raw
            except OSError:
                pass
        if done.returncode != 0 and not raw.strip():
            return [], "", (f"{AGENTS[name]['label']} exited {done.returncode}: "
                            f"{(done.stderr or '').strip().splitlines()[-1][:120] if (done.stderr or '').strip() else 'no output'}")
    return parse(raw), raw, ""
