#!/usr/bin/env zsh

set -e

tpm_dir="${HOME}/.tmux/plugins/tpm"

if [ -d $tpm_dir ]; then
  printf "\n⬆️ Updating tpm\n"
  cd $tpm_dir
  git pull origin master
else
  printf "\n📦 Installing tpm\n"
  git clone https://github.com/tmux-plugins/tpm $tpm_dir
fi
