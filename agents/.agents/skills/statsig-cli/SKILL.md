---
name: statsig-cli
description: Use the Statsig CLI (siggy) to manage feature gates, experiments, dynamic configs, and segments from the terminal. Use when asked to create, list, update, delete, or check feature flags, experiments, or configs in Statsig.
---

# Statsig CLI (siggy)

Use `bash` with the installed `siggy` CLI. There is no Statsig Pi extension or wrapper.

## Quick Reference

| Task | Command |
|------|---------|
| Check install | `siggy --version` |
| List gates | `siggy gates list` |
| Create a gate | `siggy gates create <gate-name>` |
| Get gate details | `siggy gates get <gate-id>` |
| Check gate for user | `siggy gates check <gate-id> --user '{"userID":"..."}' ` |
| Update a gate | `siggy gates update <gate-id> '<json>'` |
| Delete a gate | `siggy gates delete <gate-id>` |
| List experiments | `siggy experiments list` |
| List dynamic configs | `siggy dyncon list` |
| List segments | `siggy segments list` |
| Get help | `siggy --help` |
| Get command help | `siggy <command> --help` |

## Commands

### Gates (Feature Flags)

```bash
siggy gates list                                    # List all gates
siggy gates list --limit 10                         # Paginated
siggy gates create my-new-gate                      # Create a gate
siggy gates get my-gate-id                          # Get gate details
siggy gates update my-gate-id '<gate-properties>'   # Update gate (JSON body)
siggy gates delete my-gate-id                       # Delete gate
siggy gates delete my-gate-id --force               # Delete without confirm
siggy gates check my-gate-id --user '{"userID":"user123"}'  # Evaluate gate
```

### Experiments

```bash
siggy experiments list                                          # List all
siggy experiments create my-experiment                          # Create
siggy experiments get my-experiment-id                          # Get details
siggy experiments update my-experiment-id '<experiment-json>'   # Update
siggy experiments delete my-experiment-id                       # Delete
```

### Dynamic Configs

```bash
siggy dyncon list                                       # List all
siggy dyncon create my-config                           # Create
siggy dyncon get my-config-id                           # Get details
siggy dyncon update my-config-id '<config-json>'        # Update
siggy dyncon delete my-config-id                        # Delete
```

### Segments

```bash
siggy segments list                                     # List all
siggy segments create my-segment                        # Create
siggy segments get my-segment-id                        # Get details
siggy segments update my-segment-id '<segment-json>'    # Update
siggy segments delete my-segment-id                     # Delete
```

### Config (CLI Settings)

```bash
siggy config                    # View current configuration
```

## Configuring a Gate (Team, Tags, Unit ID)

After creating a gate, use `siggy gates update` to set ownership and targeting metadata. All fields are optional — only pass what you need.

```bash
siggy gates update my-gate-id '{"teamID":"<team-id>","tags":["TagName"],"idType":"<unit-id-name>","targetApps":["<app-name>"]}'
```

### Finding the right values

**Team ID** — look up an existing gate owned by the same team and copy its `teamID`:
```bash
siggy gates get some-other-gate-on-that-team | python3 -c "import json,sys; g=json.load(sys.stdin); print(g.get('teamID'))"
```

**Tags** — use the exact tag name string. Inspect an existing gate to see accepted values:
```bash
siggy gates get some-other-gate | python3 -c "import json,sys; g=json.load(sys.stdin); print(g.get('tags'))"
```

**Unit ID (`idType`)** — controls which identifier Statsig uses to evaluate the gate:

| Value | When to use |
|-------|-------------|
| `"userID"` | Target individual users (default) |
| Any custom ID name | Target a custom entity; must match the key used in `customIDs` when initializing the Statsig SDK |

Inspect an existing gate that targets the same entity to find the right `idType`:
```bash
siggy gates get some-relevant-gate | python3 -c "import json,sys; g=json.load(sys.stdin); print(g.get('idType'))"
```

## JSON Bodies

For `update` commands that require a JSON body, refer to the [Console API schema](https://docs.statsig.com/console-api/introduction). The OpenAPI spec is at https://api.statsig.com/openapi/20240601.json.

## Subcommand Discovery

The CLI is self-documenting. When in doubt:

```bash
siggy --help              # List all top-level commands
siggy <command> --help    # Command-specific subcommands and options
```

New commands may exist beyond what's listed here. Always check `--help` for the latest.

## Guidelines

- **Read operations are safe.** `list`, `get`, `check`, and `config` (without args) are non-destructive.
- **Ask before mutations.** Creating, updating, or deleting gates, experiments, configs, or segments changes production state. Confirm with the user before running these.
- **Prefer `--help` for discovery.** The CLI evolves; use `--help` to discover current options rather than guessing flags.
- **Keep keys out of output.** Never echo API keys in responses or logs.

## Error Handling

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `command not found` | Not installed or not on PATH | `npm install -g @statsig/siggy` or use `npx siggy` |
| Entity not found | Wrong ID or name | `siggy <entity> list` to find the correct ID |
