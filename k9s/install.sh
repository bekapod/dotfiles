#!/usr/bin/env zsh

set -e

K9S_CONFIG_PATH="${XDG_CONFIG_HOME:-$HOME/Library/Application Support}/k9s"
if [ -d "${K9S_CONFIG_PATH}/skins/catppuccin" ]; then
  printf "\n✅ catppuccin skin for k9s is already installed\n"
else
  git clone https://github.com/catppuccin/k9s.git "${K9S_CONFIG_PATH}/skins/catppuccin" --depth 1
  cp "${K9S_CONFIG_PATH}/skins/catppuccin/dist/macchiato.yml" "${K9S_CONFIG_PATH}/skin.yml"
fi
