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
20 tests passed
```

Live URL:

```text
https://laicaimacmini-lgtm.github.io/sell-put-assistant
```
