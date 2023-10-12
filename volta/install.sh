#!/usr/bin/env zsh

set -e

if test ! $(which volta); then
  printf "\n📦 Installing volta\n"
  /bin/bash -c "$(curl https://get.volta.sh)"
fi
