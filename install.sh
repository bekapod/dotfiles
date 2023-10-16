#!/usr/bin/env sh

set -e

DOTFILES_LOCATION=$(pwd)
export DOTFILES_LOCATION;

if [ -d "${HOME}/.config/nvim" ]; then
echo "✅ AstroNvim is already installed"
else
echo "📄 Installing AstroNvim"
git clone --depth 1 https://github.com/AstroNvim/AstroNvim ~/.config/nvim
fi

./bin/dotfiles install oh-my-zsh
./bin/dotfiles install brew

echo "🔗 Creating symlinks"
stow nvim starship zsh

echo "👷‍♀️ Manual installation/updates"
echo "oh-my-zsh      omz update"
