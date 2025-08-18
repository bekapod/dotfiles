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
  bun
  duckdb
  elixir
  exercism
  fd
  flyctl
  fzf
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
  jesseduffield/lazydocker/lazydocker
  jesseduffield/lazygit/lazygit
  neovim
  miller
  mongosh
  pipx
  pnpm
  poppler
  pyenv
  ripgrep
  rlwrap
  rust
  starship
  stow
  tmux
  tmuxinator
  wget
  yazi
)
BREW_CASKS=(
  bruno
  ghostty
)
for pkg in "${BREW_PACKAGES[@]}"; do printf "installing %s\n" "${pkg}" && brew install "${pkg}"; done
for pkg in "${BREW_CASKS[@]}"; do printf "installing %s\n" "${pkg}" && brew install --cask "${pkg}"; done

brew autoremove -v
brew cleanup --prune=all
