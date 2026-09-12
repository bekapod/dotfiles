#!/usr/bin/env zsh

set -euo pipefail

SCRIPT_DIR=${0:A:h}
GONDOLIN_OVERLAY="$SCRIPT_DIR/gondolin"
GONDOLIN_DST="$HOME/.pi/gondolin"
GBDK_VERSION="4.5.0"
GBDK_HOME="$HOME/.local/share/gbdk-linux-arm64/$GBDK_VERSION"
GBDK_URL="https://github.com/gbdk-2020/gbdk-2020/releases/download/$GBDK_VERSION/gbdk-linux-arm64.tar.gz"
GBDK_SHA256="31eb2235f0fdb60163d0b1e9574a022098d6069cd56606a1daca4478a46e0439"

if ! command -v pi &> /dev/null; then
  curl -fsSL https://pi.dev/install.sh | sh
else
  pi update --all --approve
fi

GONDOLIN_SRC=$(find "$HOME/.volta/tools" -path "*/pi-coding-agent/examples/extensions/gondolin" -type d 2>/dev/null | head -1)

if [[ ! -d "$GONDOLIN_SRC" ]]; then
  print -u2 "Gondolin example extension not found after installing Pi."
  exit 1
fi

rm -rf "$GONDOLIN_DST"
cp -R "$GONDOLIN_SRC" "$GONDOLIN_DST"
cp "$GONDOLIN_OVERLAY/index.ts" "$GONDOLIN_DST/index.ts"
cp "$GONDOLIN_OVERLAY/Dockerfile.gbdk" "$GONDOLIN_DST/Dockerfile.gbdk"
cp "$GONDOLIN_OVERLAY/gbdk-image.json" "$GONDOLIN_DST/gbdk-image.json"
cp "$GONDOLIN_OVERLAY/.dockerignore" "$GONDOLIN_DST/.dockerignore"
(cd "$GONDOLIN_DST" && npm install --ignore-scripts)

if [[ ! -x "$GBDK_HOME/bin/lcc" ]]; then
  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT
  curl -fsSL "$GBDK_URL" -o "$tmp/gbdk.tar.gz"
  print -r -- "$GBDK_SHA256  $tmp/gbdk.tar.gz" | shasum -a 256 -c -
  tar -xzf "$tmp/gbdk.tar.gz" -C "$tmp"
  mkdir -p "${GBDK_HOME:h}"
  mv "$tmp/gbdk" "$GBDK_HOME"
fi

if ! docker info &> /dev/null; then
  print -u2 "Docker must be running to build the Gondolin GBDK image."
  exit 1
fi

E2FSPROGS_PREFIX=$(brew --prefix e2fsprogs 2>/dev/null || true)
if [[ -z "$E2FSPROGS_PREFIX" || ! -x "$E2FSPROGS_PREFIX/sbin/mke2fs" ]]; then
  print -u2 "e2fsprogs is required to build Gondolin images. Install it with: brew install e2fsprogs"
  exit 1
fi

docker build --platform linux/arm64 --tag gondolin-gbdk:bookworm --file "$GONDOLIN_DST/Dockerfile.gbdk" "$GONDOLIN_DST"
PATH="$E2FSPROGS_PREFIX/bin:$E2FSPROGS_PREFIX/sbin:$PATH" \
  node "$GONDOLIN_DST/node_modules/@earendil-works/gondolin/dist/bin/gondolin.js" \
  build --config "$GONDOLIN_DST/gbdk-image.json" --tag gbdk:latest
