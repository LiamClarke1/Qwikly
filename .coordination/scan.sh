#!/usr/bin/env bash
# Supervisor scan — run from Terminal 1 to check on Terminals 2/3/4
# Usage: bash .coordination/scan.sh
set -u
ROOT="$HOME/qwikly-site"
cd "$ROOT" || exit 1

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
dim()  { printf "\033[2m%s\033[0m\n" "$1"; }
green(){ printf "\033[32m%s\033[0m\n" "$1"; }
red()  { printf "\033[31m%s\033[0m\n" "$1"; }
yel()  { printf "\033[33m%s\033[0m\n" "$1"; }

scan_worktree() {
  local label="$1"
  local path="$2"
  local branch="$3"

  bold "── $label ($branch) ──"
  if [ ! -d "$path" ]; then red "  worktree missing: $path"; return; fi

  cd "$path" || return
  local actual_branch; actual_branch=$(git branch --show-current 2>/dev/null)
  if [ "$actual_branch" != "$branch" ]; then
    red "  branch drift: expected $branch, got $actual_branch"
  fi

  local ahead behind
  ahead=$(git rev-list --count main..HEAD 2>/dev/null)
  behind=$(git rev-list --count HEAD..main 2>/dev/null)
  mb=$(git merge-base main HEAD 2>/dev/null)
  changed=$(git diff --name-only "$mb"..HEAD 2>/dev/null | wc -l | tr -d ' ')
  echo "  commits ahead of main: $ahead   behind: $behind   files changed since fork: $changed"

  local dirty; dirty=$(git status --porcelain | wc -l | tr -d ' ')
  if [ "$dirty" -gt 0 ]; then
    yel "  uncommitted changes: $dirty file(s)"
    git status --porcelain | head -8 | sed 's/^/    /'
  else
    dim "  working tree clean"
  fi

  echo "  recent commits:"
  git log --oneline -5 main..HEAD 2>/dev/null | sed 's/^/    /'

  cd "$ROOT" || return
  echo
}

bold "═══ QWIKLY HARDENING SUPERVISOR SCAN ═══"
date
echo

scan_worktree "Terminal 2 — Security" "$ROOT/.worktrees/security"          "fix/security-hardening"
scan_worktree "Terminal 3 — Backend"  "$ROOT/.worktrees/backend"           "fix/backend-reliability"
scan_worktree "Terminal 4 — Design"   "$ROOT/.worktrees/design"            "fix/design-polish"

bold "── Status board summary ──"
if [ -f "$ROOT/.coordination/STATUS.md" ]; then
  grep -E "^### Status:|^- \[[ x]\] T[234]\." "$ROOT/.coordination/STATUS.md" \
    | awk '
      /^### Status:/ { print ""; print $0; next }
      /^- \[x\]/ { printf "  \033[32m%s\033[0m\n", $0; next }
      /^- \[ \]/ { printf "  \033[2m%s\033[0m\n", $0; next }
    '
else
  red "STATUS.md not found"
fi

echo
bold "── Scope violations (file edited by wrong branch) ──"
# A change is a violation if (a) at least one branch's lane glob matches the file,
# and (b) the branch making the change has no glob that matches.
LANES="$ROOT/.coordination/LANES.txt"
if [ ! -f "$LANES" ]; then
  yel "  no LANES.txt — skipping"
else
  violations=0
  for b in fix/security-hardening fix/backend-reliability fix/design-polish; do
    for f in $(git diff --name-only "$(git merge-base main "$b")" "$b" 2>/dev/null); do
      # Get globs claimed by SOME branch
      claimed_by=""
      while read -r line; do
        [ -z "$line" ] && continue
        case "$line" in \#*) continue;; esac
        lb=$(printf "%s" "$line" | awk '{print $1}')
        lg=$(printf "%s" "$line" | awk '{print $2}')
        # Bash 3.2 friendly glob test via case
        case "$f" in
          $lg) claimed_by="$claimed_by $lb" ;;
        esac
      done < "$LANES"
      claimed_by=$(printf "%s" "$claimed_by" | tr ' ' '\n' | sort -u | tr '\n' ' ')
      # If file isn't claimed at all, skip (it's free territory)
      [ -z "$(printf "%s" "$claimed_by" | tr -d ' ')" ] && continue
      # If branch b is among the claimants, fine
      case " $claimed_by " in
        *" $b "*) continue ;;
      esac
      red "  VIOLATION: $b touched $f (lane belongs to:$claimed_by)"
      violations=$((violations + 1))
    done
  done
  [ "$violations" -eq 0 ] && green "  no scope violations"
fi

echo
bold "── Cross-terminal file collisions ──"
# Detect if two worker branches have touched the same file (would conflict at merge).
# macOS bash 3.2 has no associative arrays, so we use a temp file.
tmp=$(mktemp)
for b in fix/security-hardening fix/backend-reliability fix/design-polish; do
  git diff --name-only "$(git merge-base main "$b")" "$b" 2>/dev/null | while read -r f; do
    [ -n "$f" ] && printf "%s\t%s\n" "$f" "$b"
  done
done > "$tmp"
collisions=$(awk -F'\t' '{ files[$1] = files[$1] " " $2 } END { for (f in files) { n = split(files[f], parts, " "); if (n > 2) print f": "files[f] } }' "$tmp")
if [ -n "$collisions" ]; then
  red "  COLLISIONS:"
  echo "$collisions" | sed 's/^/    /'
else
  green "  no collisions"
fi
rm -f "$tmp"

echo
bold "── Build gate (main repo, fast TS check only) ──"
cd "$ROOT" || exit 1
ts_out=$(npx --no-install tsc --noEmit 2>&1)
ts_errors=$(printf "%s\n" "$ts_out" | grep -c "error TS")
if [ "$ts_errors" -eq 0 ]; then
  green "  main: tsc clean"
else
  yel "  main: $ts_errors TS errors (expected until T3.2 lands)"
  printf "%s\n" "$ts_out" | grep "error TS" | head -5 | sed 's/^/    /'
fi
