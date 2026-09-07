## Permissions

Never ask for conversational confirmation before a tool call.
Invoke the tool directly and use its built-in permission flow.
If permission is denied, report the denial and do not retry without a new request.

## Tool preferences

- Use the `grep` tool for searching file contents, not `grep` via bash.
- Use the `find` tool for finding files by pattern, not `find` via bash.
