#!/usr/bin/env zsh

set -e

if test ! $(which brew); then
  printf "\n📦 Installing brew\n"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  printf "\n⬆️ Updating brew\n"
  brew update
fi

printf "\n📦 Installing brew packages\n"
brew bundle --file="$(dirname "$0")/Brewfile"
