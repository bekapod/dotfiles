#!/usr/bin/env zsh

set -e

if [ -d "${HOME}/.nvm" ]; then
  printf "\n⬆️ Updating nvm\n"
else
  printf "\n📦 Installing nvm\n"
fi

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
