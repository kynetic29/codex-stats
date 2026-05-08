# CodexStats

Dedicated-monitor dashboard for tracking:

- Codex subscription usage from local `~/.codex/sessions/**/*.jsonl` logs
- 5-hour and 7-day subscription window percentages from Codex `token_count` events
- optional OpenAI organization API spend from the official `/v1/organization/costs` endpoint

## What It Shows

- live 5-hour and 7-day gauges
- recent Codex sessions with per-session token totals
- 7-day activity chart
- model breakdown for the active 5-hour window
- optional API spend card and monthly spend summary
- exportable session and request data

## Setup

On first launch:

1. Choose the monitor for the fullscreen dashboard.
2. Optionally add an OpenAI admin key if you want organization API cost tracking.

Without an admin key, the app still works for local Codex subscription monitoring.

## Local Development

```bash
npm install
npm run dev
npm test
npm run build
```

## Distribution

Build the Windows installer locally:

```bash
npm run package
```

The installer is written to `release/`.

Tagged releases publish automatically through GitHub Actions. To create a new
release, bump the version, push the commit, and push the generated tag:

```bash
npm run version:patch
git push
git push --tags
```

Use `version:minor` or `version:major` for larger releases. The `v*` tag starts
the release workflow, which runs `npm run release` and uploads the installer to
the GitHub release. Packaged builds also check GitHub for updates through
`electron-updater`.

## Notes

- The dashboard reads local Codex logs and does not require browser login flow.
- If current Codex logs include live rate-limit percentages, the gauges show authoritative percentages.
- If live percentages are unavailable, the app falls back to learned manual estimates. Use `Ctrl+Shift+L` to record a limit hit.
