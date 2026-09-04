---
name: linear-api
description: Safe, narrow guidance for using the existing Linear GraphQL tool.
---

# Linear API

Use the existing `linear_api` tool for Linear data.

- Use GraphQL queries for reads, with `first`, filters, and only the fields needed.
- Use mutations only when the user explicitly asks to change Linear. The extension confirms mutations interactively.
- When working from an issue, fetch the issue and the relevant comments or relations before acting on it.
- State the issue identifier and what the response says when it matters to the task.
- Never put API keys in prompts or command output.
