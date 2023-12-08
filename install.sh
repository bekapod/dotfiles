#!/usr/bin/env zsh

set -e

DOTFILES_LOCATION=$(pwd)
export DOTFILES_LOCATION;

./bin/dotfiles install oh-my-zsh
./bin/dotfiles install brew
./bin/dotfiles install gh
./bin/dotfiles install k9s
./bin/dotfiles install nvim
./bin/dotfiles install nvm
./bin/dotfiles install tmux

stow oh-my-zsh mongodb nvim starship tmux wezterm zsh
echo "🔗 Creating symlinks\n"

echo "👷‍♀️ Manual installation/updates"
echo "oh-my-zsh      omz update"
