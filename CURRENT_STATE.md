# Current State

Date: 2026-05-09

## Product Status

Sell Put Assistant is a personal risk/reward workflow tool for cash-secured puts and wheel strategy review. It is not an investment advice tool, not a recommendation engine, and not an automated trading tool.

Current latest functionality includes:

- Single setup calculator for one cash-secured put candidate.
- Broker execution reminders for E*Trade, Fidelity, and Other.
- Risk sections for market trend, reward/risk, position sizing, and cash requirement.
- Compare Put Strikes table for comparing multiple sell put candidates side by side.
- Default SMH comparison examples for strikes 245, 240, and 235.
- Sorting comparison rows by reward/risk, annualized return, downside buffer, or cash required.
- Balanced candidate highlighting that weighs reward/risk, delta, position size, strike vs support, and DTE.
- Risk flags for poor reward/risk, aggressive delta, not enough cash, heavy size, and non-ideal DTE.

## Deployment Status

GitHub Actions automatic deployment is complete.

Every push to `main` runs:

1. Install dependencies with `npm ci`.
2. Run `npm run test`.
3. Run `npm run build`.
4. Deploy the built `dist/` artifact to GitHub Pages.

GitHub Pages source has been switched to GitHub Actions.

Latest known deployment workflow status: success.

## Repository State

Latest feature/deployment commit:

```text
e66218f Add strike comparison table and GitHub Actions deploy
```

Current test status:

```text
34 tests passed
```

Live URL:

```text
https://laicaimacmini-lgtm.github.io/sell-put-assistant
```

## Real Options Data Architecture

First-stage Real Options Data architecture has been added. It includes:

- Local Express proxy under `server/`.
- Mock options provider for SMH, NVDA, and MU.
- Provider abstraction for `mock | tradier | marketdata | alpaca`.
- Tradier request/mapping stub with server-side token checks.
- Frontend Real Options Data panel that fetches through `VITE_OPTIONS_API_BASE` when configured.
- GitHub Pages-safe behavior when no API base is configured.

Security boundaries:

- No API token is stored in frontend code.
- No API token is committed to git.
- Real trading APIs and order placement are out of scope.
- The tool remains education/personal workflow only, not financial advice.

Latest real options architecture commit:

```text
2934013 Add real options data proxy architecture
```

## Options Provider Smoke Test

A local CLI smoke test is available for the options provider abstraction:

```bash
npm run smoke:options
```

It validates provider response shape and sample put fields. It does not trade, recommend trades, or expose provider tokens to the frontend.

## Tradier Provider Status

Tradier provider is implemented for options chain market data reads through the local server proxy. It calls only:

```text
GET /markets/options/chains
```

It requires local `TRADIER_TOKEN` and supports optional `TRADIER_BASE_URL`. Missing tokens, auth failures, rejected requests, unexpected formats, and empty put chains return clear errors. No trading or order endpoint is connected.
