#!/usr/bin/env zsh

set -e

DOTFILES_LOCATION=$(pwd)
export DOTFILES_LOCATION;

./bin/dotfiles install oh-my-zsh
./bin/dotfiles install brew
./bin/dotfiles install git
./bin/dotfiles install volta
./bin/dotfiles install uv
./bin/dotfiles install rustup
./bin/dotfiles install doom

stow agents ghostty git herdr k9s oh-my-zsh mongodb nvim pi-agent plannotator starship yazi zsh
echo "🔗 Creating symlinks\n"

./bin/dotfiles install pi-agent
./bin/dotfiles install plannotator
./bin/dotfiles install yazi

echo "👷‍♀️ Manual installation/updates"
echo "oh-my-zsh      omz update"
echo "yazi           ya pkg upgrade"
