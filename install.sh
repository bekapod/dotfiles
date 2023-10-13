#!/usr/bin/env sh

set -e

DOTFILES_LOCATION=$(pwd)
export DOTFILES_LOCATION;

./bin/dotfiles install oh-my-zsh
./bin/dotfiles install brew

stow starship zsh

echo "👷‍♀️ Manual installation/updates"
echo "oh-my-zsh      omz update"
