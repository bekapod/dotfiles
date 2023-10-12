#!/usr/bin/env zsh

set -e

if test ! $(which brew); then
  printf "\n📦 Installing brew\n"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

printf "\n📦 Installing brew packages\n"

BREW_PACKAGES=(
  awscli
  exercism
  flyctl
  gh
  gleam
  glow
  go
  hugo
  jq
  neovim
  pyenv
  ripgrep
  rust
  starship
  stow
)
for pkg in "${BREW_PACKAGES[@]}"; do printf "installing %s\n" "${pkg}" && brew install "${pkg}"; done

brew autoremove -v
brew cleanup --prune=all
