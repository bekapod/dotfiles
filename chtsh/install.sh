#!/usr/bin/env sh

set -e

path="${HOME}/.local/bin"
mkdir -p "$path"

curl https://cht.sh/:cht.sh >"$path/cht.sh"
chmod +x "$path/cht.sh"

curl https://cheat.sh/:zsh >~/.oh-my-zsh/custom/plugins/_cht
