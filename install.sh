#!/usr/bin/env zsh

set -e

DOTFILES_LOCATION=$(pwd)
export DOTFILES_LOCATION;

./bin/dotfiles install oh-my-zsh
./bin/dotfiles install brew
./bin/dotfiles install chtsh
./bin/dotfiles install gh
./bin/dotfiles install nvm
./bin/dotfiles install tmux

stow git k9s oh-my-zsh mongodb nvim starship tmux wezterm yazi zsh
echo "🔗 Creating symlinks\n"

./bin/dotfiles install yazi

echo "👷‍♀️ Manual installation/updates"
echo "oh-my-zsh      omz update"
echo "tpm            <ctrl+space>U"
echo "yazi           ya pack -u"
