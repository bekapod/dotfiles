#!/usr/bin/env zsh

set -e

if test ! $(which brew); then
  printf "\n📦 Installing brew\n"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  printf "\n⬆️ Updating brew\n"
  brew update
fi

printf "\n📦 brew taps\n"
brew tap oven-sh/bun

printf "\n📦 Installing brew packages\n"

BREW_PACKAGES=(
  ansible
  ansible-lint
  awscli
  bruno
  bun
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
  tmuxinator
  volta
  wezterm
)
for pkg in "${BREW_PACKAGES[@]}"; do printf "installing %s\n" "${pkg}" && brew install "${pkg}"; done

brew autoremove -v
brew cleanup --prune=all
