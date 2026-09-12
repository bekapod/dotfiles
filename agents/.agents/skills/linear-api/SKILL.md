---
name: linear-api
description: Safe, narrow guidance for using the existing Linear GraphQL tool.
---

# Linear API

Use the existing `linear_api` tool for Linear data.

- Use GraphQL queries for reads, with `first`, filters, and only the fields needed.
- When the user supplies an issue identifier such as `GAM-57`, look it up directly with the `issue` query's `id` argument—not an `issues` filter. Linear accepts an identifier here:
  ```graphql
  query IssueByIdentifier($identifier: String!) {
    issue(id: $identifier) {
      id
      identifier
      title
    }
  }
  ```
  Pass `{ "identifier": "GAM-57" }`. Use `issues` filters only for searches that do not have an exact identifier.
- Use mutations only when the user explicitly asks to change Linear. The extension confirms mutations interactively.
- When working from an issue, fetch the issue and the relevant comments or relations before acting on it.
- State the issue identifier and what the response says when it matters to the task.
- Never put API keys in prompts or command output.
