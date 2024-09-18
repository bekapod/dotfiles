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
  lazygit
  jesseduffield/lazydocker/lazydocker
  neovim
  mongosh
  pipx
  pnpm
  pyenv
  ripgrep
  rlwrap
  rust
  starship
  stow
  tmux
  tmuxinator
  wezterm
  wget
)
for pkg in "${BREW_PACKAGES[@]}"; do printf "installing %s\n" "${pkg}" && brew install "${pkg}"; done

brew autoremove -v
brew cleanup --prune=all

printf "\n📦 Installing argcomplete for pipx completions\n"
pipx install argcomplete
