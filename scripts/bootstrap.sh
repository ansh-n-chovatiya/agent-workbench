#!/usr/bin/env bash
# One-command profile setup for a machine that should use the agent-workbench plugins (D14).
#
#   scripts/bootstrap.sh            show what would change (a dry run; nothing is written)
#   scripts/bootstrap.sh --yes      do it
#
# It adds the agent-workbench marketplace, installs ctx and ctx-optimize, and adds a status line to the Claude
# settings file only if none is set (the old file is backed up first and no existing key is ever changed). Running it
# again changes nothing. It never writes secrets. Honours CLAUDE_CONFIG_DIR. Needs `claude` and python3 (3.8+).
set -euo pipefail

SOURCE="ansh-n-chovatiya/agent-workbench"
MARKET="agent-workbench"
PLUGINS="ctx ctx-optimize"
APPLY=0

usage() { sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; }

while [ $# -gt 0 ]; do
  case "$1" in
    --yes|-y) APPLY=1 ;;
    --dry-run) APPLY=0 ;;
    --source) shift; SOURCE="${1:?--source needs a value}" ;;
    -h|--help) usage; exit 0 ;;
    *) echo "bootstrap: unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

command -v claude >/dev/null 2>&1 || { echo "bootstrap: 'claude' is not on PATH; install Claude Code first" >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "bootstrap: python3 is required" >&2; exit 1; }
python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)' || { echo "bootstrap: python 3.8 or newer is required" >&2; exit 1; }

CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SETTINGS="$CONFIG_DIR/settings.json"
changed=0

say() { printf '%s\n' "$*"; }
act() {  # act "<what>" cmd args...
  local what="$1"; shift
  changed=1
  if [ "$APPLY" = 1 ]; then say "doing: $what"; "$@"; else say "would: $what"; fi
}

json_has() {  # json_has <key> <value>  (stdin: JSON list of objects)
  python3 -c 'import json, sys
key, value = sys.argv[1], sys.argv[2]
sys.exit(0 if any(isinstance(x, dict) and x.get(key) == value for x in json.load(sys.stdin)) else 1)' "$1" "$2"
}

# 0. A settings file we cannot read as a JSON object is the user's to fix: say so before changing anything.
if [ -f "$SETTINGS" ] && ! python3 -c 'import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
sys.exit(0 if isinstance(data, dict) else 1)' "$SETTINGS" 2>/dev/null; then
  echo "bootstrap: $SETTINGS is not a valid JSON object; fix or move it first (nothing was changed)" >&2
  exit 1
fi

# 1. marketplace
if claude plugin marketplace list --json 2>/dev/null | json_has name "$MARKET"; then
  say "ok: marketplace $MARKET is already added"
else
  act "add the $MARKET marketplace ($SOURCE)" claude plugin marketplace add "$SOURCE"
fi

# 2. plugins
for p in $PLUGINS; do
  # Installed for this user, not merely present at some project scope or switched off: a project-scope copy is
  # missing in every other project.
  if claude plugin list --json 2>/dev/null | python3 -c 'import json, sys
pid = sys.argv[1]
sys.exit(0 if any(isinstance(x, dict) and x.get("id") == pid and x.get("scope", "user") == "user"
                  and x.get("enabled", True) is not False for x in json.load(sys.stdin)) else 1)' "$p@$MARKET"; then
    say "ok: $p@$MARKET is already installed"
  else
    act "install $p@$MARKET" claude plugin install "$p@$MARKET" -s user
  fi
done

# 3. status line: only if none is set. The marketplace clone path is stable across plugin updates; the plugin cache
#    path carries the version and would break on update.
LOCATION="$(claude plugin marketplace list --json 2>/dev/null | python3 -c 'import json, sys
for m in json.load(sys.stdin):
    if isinstance(m, dict) and m.get("name") == sys.argv[1]:
        print(m.get("installLocation", ""))' "$MARKET" || true)"
if [ -n "$LOCATION" ]; then
  BIN="$LOCATION/plugins/ctx-optimize/bin/ctx-optimize"
else
  BIN="<the $MARKET marketplace clone>/plugins/ctx-optimize/bin/ctx-optimize"
fi

has_statusline() {
  [ -f "$SETTINGS" ] && python3 -c 'import json, sys
sys.exit(0 if "statusLine" in json.load(open(sys.argv[1])) else 1)' "$SETTINGS"
}

add_statusline() {
  python3 - "$SETTINGS" "$BIN" <<'PY'
import json, os, shlex, shutil, sys, time
path, binary = sys.argv[1], sys.argv[2]
command = shlex.quote(binary) + " statusline"
data = {}
real = os.path.realpath(path)  # a symlinked settings file stays a symlink; its target is what we update
if os.path.exists(path):
    shutil.copy2(path, path + ".bak-bootstrap-" + time.strftime("%Y%m%d%H%M%S"))
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
if "statusLine" in data:
    sys.exit(0)
data["statusLine"] = {"type": "command", "command": command, "refreshInterval": 10}
os.makedirs(os.path.dirname(real) or ".", exist_ok=True)
mode = (os.stat(real).st_mode & 0o7777) if os.path.exists(real) else 0o600
tmp = real + ".tmp"
fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, mode)
with os.fdopen(fd, "w", encoding="utf-8") as fh:
    json.dump(data, fh, indent=2)
    fh.write("\n")
os.chmod(tmp, mode)
os.replace(tmp, real)
PY
}

if has_statusline; then
  say "ok: a status line is already set in $SETTINGS (left alone)"
else
  act "add the ctx-optimize status line to $SETTINGS" add_statusline
fi

if [ "$changed" = 0 ]; then
  say "nothing to do: this machine is already set up"
elif [ "$APPLY" = 0 ]; then
  say "dry run only; run again with --yes to apply"
else
  say "done"
fi
