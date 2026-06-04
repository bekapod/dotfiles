#!/usr/bin/env zsh

set -e

if ! command -v rustup >/dev/null 2>&1; then
  printf "\n📦 Installing rustup\n"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  . "$HOME/.cargo/env"
else
  printf "\n⬆️ Updating rustup\n"
  rustup update
fi

printf "\n📦 Installing rust-analyzer component\n"
rustup component add rust-analyzer
