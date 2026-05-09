# Agent Project Rules

All agents working on this repository must follow these rules before making changes.

## Project Handoff Rules

Before starting work, read these files in order:

1. `AGENTS.md`
2. `CURRENT_STATE.md`
3. `DECISIONS.md`
4. `RUNBOOK.md`
5. `CHANGELOG_AGENT.md`

After reading, summarize the current project state, deployment mode, recent completed work, and known risks before editing code.

## Machine Rules

All project operations must happen on mac2.

Project path:

```text
/Users/laicai/projects/sell-put-assistant
```

Do not create or modify this project on the local client machine.

## Engineering Rules

Before making changes, run:

```bash
git status
```

After functional changes, run:

```bash
npm run test
npm run build
```

Pushes to `main` are deployed by GitHub Actions.

Do not use `npm run deploy` as the main deployment path. It is retained only as a legacy/manual fallback.

## Product Rules

This project is a personal risk/reward workflow tool.

It is not:

- A stock recommendation tool.
- A financial advisor.
- An automated trading system.
- A brokerage order-entry system.

Do not add real order placement, automated trading, or brokerage trading API behavior.

All user-facing copy should keep an education / personal workflow / not financial advice tone.

## Options Data Safety Rules

API tokens must never be written into frontend code.

API tokens must never be committed to git.

GitHub Pages must not directly call real options APIs.

Real options data must go through the local server proxy or a future secure backend.

`.env` must remain ignored by git.

`.env.example` may contain placeholder field names only. It must not contain real secrets.

## Documentation Rules

After each important feature or architecture change, update:

- `CURRENT_STATE.md`
- `DECISIONS.md`
- `RUNBOOK.md`
- `CHANGELOG_AGENT.md`

Keep these docs useful for future Codex, Claude Code, ChatGPT, or human handoff.
