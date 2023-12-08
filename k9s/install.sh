#!/usr/bin/env zsh

set -e

K9S_CONFIG_PATH="${XDG_CONFIG_HOME:-$HOME/Library/Application Support}/k9s"
k9s_skin_dir="${K9S_CONFIG_PATH}/skins/catppuccin"

if [ -d $k9s_skin_dir ]; then
  printf "\n⬆️ Updating k9s skin\n"
  cd $k9s_skin_dir
  git pull origin main
else
  git clone https://github.com/catppuccin/k9s.git $k9s_skin_dir --depth 1
fi

cp "${K9S_CONFIG_PATH}/skins/catppuccin/dist/macchiato.yml" "${K9S_CONFIG_PATH}/skin.yml"
