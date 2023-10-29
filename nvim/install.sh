#!/usr/bin/env zsh

set -e

if [ -d "${HOME}/.config/nvim" ]; then
echo "\n✅ AstroNvim is already installed"
else
echo "\n📦 Installing AstroNvim"
git clone --depth 1 https://github.com/AstroNvim/AstroNvim ~/.config/nvim
fi

