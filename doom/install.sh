#!/usr/bin/env zsh

set -euo pipefail

DOOM_DIR="$HOME/.config/emacs"

if [[ ! -d "$DOOM_DIR/.git" ]]; then
    git clone --depth 1 https://github.com/doomemacs/core "$DOOM_DIR"
fi

cd "$(dirname "$0")/.."
stow -t "$HOME" doom

"$DOOM_DIR/bin/doom" install
