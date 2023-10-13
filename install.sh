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

echo "🔗 Creating symlinks"
stow nvim starship zsh

./bin/dotfiles install oh-my-zsh
./bin/dotfiles install brew

echo "👷‍♀️ Manual installation/updates"
echo "oh-my-zsh      omz update"
