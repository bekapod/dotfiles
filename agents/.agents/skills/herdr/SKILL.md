---
name: herdr
description: Use Herdr as an optional configured worker runner through the deterministic launcher.
---

# Herdr

Herdr starts independent Pi agents in terminal panes.

- To start one from the current Pi session, use `/herdr <prompt>`. It creates a right-hand pane in the current repository and starts a fresh `pi --no-session` agent there.
- Give the new agent one clear, bounded task and enough context to begin. It does not share this session's conversation.
- Herdr work is asynchronous. Read the pane output and verify changes locally. Do not rely on the worker's self-report.
- Use `gh stack` through the GitHub CLI when the work belongs in a PR stack.
