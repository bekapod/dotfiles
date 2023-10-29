#!/usr/bin/env zsh

set -e

if [ -d "${HOME}/.tmux/plugins/tpm" ]; then
  printf "\n✅ tpm is already installed\n"
else
  printf "\n📦 Installing tpm\n"
  sh -c "$(git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm)"
fi
