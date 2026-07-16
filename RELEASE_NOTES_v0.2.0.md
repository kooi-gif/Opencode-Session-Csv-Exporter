# Release Notes v0.2.0

## Summary

Added companion `save-history.js` plugin for automatic structured history snapshots, and a `/his_sess` TUI command for quick CSV access.

## New in v0.2.0

- **New plugin `save-history.js`**: automatically captures session events and saves structured snapshots (raw JSON + human-readable summary) to the workspace `history/` directory
- **New command `/his_sess`**: a global TUI command that opens the global CSV in your default program
- **Updated `install.js`**: now also copies `save-history.js` and `his_sess.md` to the global opencode config
- **Improved `AGENTS.md`**: includes descriptions of both plugins and the command
- **Comprehensive README**: documents both plugins, the command, and the updated directory structure

## Included Components

| Component | Description |
|-----------|-------------|
| `session-csv.js` | Exports session metadata to global CSV |
| `save-history.js` | Auto-saves structured history snapshots to workspace `history/` |
| `/his_sess` | TUI command to open global CSV |

## Upgrade Note

Users upgrading from v0.1.0 should re-run `node install.js` or `npm run install:opencode` and restart opencode.
