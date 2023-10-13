#!/usr/bin/env sh

set -e

DOTFILES_LOCATION=$(pwd)
export DOTFILES_LOCATION;

echo "🔗 Creating symlinks"
stow starship zsh

./bin/dotfiles install oh-my-zsh
./bin/dotfiles install brew


echo "👷‍♀️ Manual installation/updates"
echo "oh-my-zsh      omz update"
