#!/usr/bin/env zsh

set -e

if ! command -v volta >/dev/null 2>&1; then
  printf "\n📦 Installing volta\n"
  curl https://get.volta.sh | bash
else
  printf "\n⬆️ volta already installed (%s)\n" "$(volta --version)"
fi
