#!/usr/bin/env zsh

set -e

# ── plannotator binary (the curl installer handles install AND update) ──
# Core skills (review/annotate/last + reference) land in ~/.agents/skills
# and ~/.claude/skills — both stow-tracked, so they get committed.
if ! command -v plannotator &> /dev/null; then
  echo "📦 Installing plannotator"
else
  echo "⬆️  Updating plannotator"
fi
curl -fsSL https://plannotator.ai/install.sh | bash -s -- \
  --no-extras --model-invocable none

# ── Herdr Annotate plugin (bundles plannotator-tui; reinstall == update) ──
if herdr plugin list 2>/dev/null | grep -q "annotate"; then
  echo "⬆️  Updating Herdr Annotate plugin"
else
  echo "📦 Installing Herdr Annotate plugin"
fi
herdr plugin install plannotator/herdr-annotate --yes
herdr config check && herdr server reload-config
