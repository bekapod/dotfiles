#!/usr/bin/env zsh

set -e

if test ! $(which brew); then
  printf "\n📦 Installing brew\n"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  printf "\n✅ brew is already installed\n"
fi

printf "\n📦 Installing brew packages\n"

BREW_PACKAGES=(
  ansible
  ansible-lint
  awscli
  elixir
  exercism
  fig
  flyctl
  gh
  git
  gleam
  glow
  go
  hugo
  jq
  k9s
  kubectx
  kubernetes-cli
  lazygit
  neovim
  mongosh
  pyenv
  ripgrep
  rust
  starship
  stow
  tmux
  volta
)
for pkg in "${BREW_PACKAGES[@]}"; do printf "installing %s\n" "${pkg}" && brew install "${pkg}"; done

brew autoremove -v
brew cleanup --prune=all
