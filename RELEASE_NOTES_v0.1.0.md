# Release Notes v0.1.0

## Summary

First public release of `opencode-session-csv-exporter`.

This plugin exports local `opencode` session metadata into a single CSV file in the global opencode config directory so you can quickly remember what each session was about and where it was opened.

## Included

- Automatic CSV export on opencode startup
- Automatic refresh while the current session continues
- Exact session `directory` path in the CSV
- First saved user prompt for quick recall
- Bilingual README
- Install and uninstall scripts
- GitHub issue templates and PR template

## Output File

The plugin writes:

```text
~/.config/opencode/opencode_sessions.csv
```

## Main CSV Columns

- `session_id`
- `title`
- `directory`
- `session_path`
- `agent`
- `model`
- `message_count`
- `input_count`
- `first_prompt`
- `created_at`
- `updated_at`

## Notes

- Requires a recent Node version with built-in `node:sqlite`
- Reads local opencode session metadata from the local opencode database
- Does not switch the opencode UI to an old thread; it only exports metadata
