#!/usr/bin/env zsh

set -e

if [ -d "${HOME}/.oh-my-zsh" ]; then
  printf "oh-my-zsh is already installed\n"
else
  printf "\n📦 Installing oh-my-zsh\n"
  sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
fi
