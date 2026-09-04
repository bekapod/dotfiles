---
name: github-cli
description: Use GitHub through the installed gh CLI for pull requests, checks, reviews, and issue metadata.
---

# GitHub CLI

Use `bash` with the installed `gh` CLI. There is no GitHub Pi extension or wrapper.

- Inspect PRs with `gh pr view`, `gh pr diff`, and `gh pr checks`. Inspect issues with `gh issue view`.
- Prefer `--json` with an explicit field list for reads.
- Ask before mutations such as creating or merging a PR, posting a comment, or changing labels.
- For a stack, use `gh stack init`, `gh stack add`, `gh stack rebase`, and `gh stack submit`. Read the repository PR template before submitting and use it for each PR description.
- Verify work from the resulting diff, checks, and PR state. Do not rely on an agent's self-report.
- Keep credentials and tokens out of prompts and command output.
