# Session CSV Exporter

This plugin exports a CSV named `opencode_sessions.csv` into the global opencode config directory.

The CSV includes:
- session title
- session id
- exact session directory
- model and agent
- timestamps
- first saved user prompt

Default output path:
- `~/.config/opencode/opencode_sessions.csv`

## Save History

The companion `save-history.js` plugin automatically saves structured history snapshots into the workspace `history/` directory.

## Commands

- `/his_sess`: open the global session CSV in your default program.

Restart `opencode` after installing or updating this plugin.
