#!/usr/bin/env zsh

set -e

if ! command -v pi &> /dev/null; then
  curl -fsSL https://pi.dev/install.sh | sh
else
  pi update --all --approve
fi

GONDOLIN_SRC=$(find "$HOME/.volta/tools" -path "*/pi-coding-agent/examples/extensions/gondolin" -type d 2>/dev/null | head -1)
GONDOLIN_DST="$HOME/.pi/gondolin"

if [ -d "$GONDOLIN_SRC" ]; then
  rm -rf "$GONDOLIN_DST"
  cp -R "$GONDOLIN_SRC" "$GONDOLIN_DST"
  cd "$GONDOLIN_DST" && npm install --ignore-scripts
fi
