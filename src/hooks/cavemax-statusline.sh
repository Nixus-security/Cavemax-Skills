#!/usr/bin/env bash
# cavemax statusline badge — POSIX/macOS/Linux
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
FLAG="$CLAUDE_DIR/.cavemax-active"
[ -e "$FLAG" ] || exit 0

# Refuse symlinks + oversized files (mirror .ps1 hardening).
[ -L "$FLAG" ] && exit 0
[ -f "$FLAG" ] || exit 0
size=$(wc -c < "$FLAG" 2>/dev/null || echo 999)
[ "$size" -gt 32 ] && exit 0

mode=$(head -c 32 "$FLAG" 2>/dev/null | tr -d '\n' | tr '[:upper:]' '[:lower:]')
mode=$(printf '%s' "$mode" | tr -cd 'a-z0-9-')
case "$mode" in
  safe|max|brutal|mute) ;;
  *) exit 0 ;;
esac

esc=$(printf '\033')
if [ "$mode" = "max" ]; then
  printf '%s[38;5;208m[CAVEMAX]%s[0m' "$esc" "$esc"
else
  printf '%s[38;5;208m[CAVEMAX:%s]%s[0m' "$esc" "$(printf '%s' "$mode" | tr '[:lower:]' '[:upper:]')" "$esc"
fi
