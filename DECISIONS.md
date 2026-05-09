# Decisions

## Use GitHub Actions for Deployment

GitHub Actions is now the recommended deployment path instead of manually running `npm run deploy`.

Reasons:

- Deployment is tied to `main`, so the live site tracks reviewed and pushed code.
- Tests and production build run before publishing, reducing the chance of shipping a broken UI or broken calculation logic.
- The workflow is reproducible for Codex, Claude Code, ChatGPT, or any future collaborator without needing local deploy steps.
- It uses GitHub's official Pages artifact flow instead of the older `gh-pages` branch publish flow.

`npm run deploy` remains only as a legacy/manual fallback.

## Require Test and Build Before Deploy

Deployment must run `npm run test` and `npm run build` first.

Reasons:

- The app is a personal risk/reward workflow tool, so calculation regressions are more important than cosmetic regressions.
- Unit tests cover cash requirement, reward/risk, DTE, delta, position sizing, and multi-strike comparison behavior.
- UI tests confirm core rendering and key interactions remain usable.
- Failed tests should block deployment. That is expected behavior.

## Prioritize Compare Put Strikes for v2

Compare Put Strikes was chosen as the v2 priority because it matches the daily workflow better than a single setup calculator alone.

Reasons:

- Sell put decisions often require comparing several strikes and premiums at once.
- Reward/risk, annualized return, downside buffer, and cash usage need to be viewed together.
- The balanced recommendation avoids treating a single high-yield signal as a trade decision.
- It reinforces the user's framework: market trend, reward/risk, position sizing, and cash requirement remain separate checks.

## Keep Options Tokens Server-Side

Real options data is routed through a local proxy instead of the static GitHub Pages frontend.

Reasons:

- GitHub Pages cannot safely hold provider tokens.
- API keys must stay in local `.env` files or future server-side secret storage.
- The frontend should only consume normalized put-chain data and never know provider credentials.
- This keeps the project as a decision-support workflow tool, not a trading integration.

The first implementation uses mock data by default and reserves Tradier, MarketData.app, and Alpaca for future provider work.

## Prefer Lower-Friction Market Data Providers Before Tradier

Tradier remains implemented, but it is no longer the preferred first real-data provider because real-time stock/options access is tied to Tradier Brokerage/API access and may require brokerage KYC fields such as address, tax ID, and date of birth.

For this personal risk/reward workflow tool, the preferred exploration order is now:

1. Mock data for safe local development.
2. Alpha Vantage for lower-friction personal API key experiments.
3. MarketData.app for dedicated market data.
4. Tradier only when the user already has appropriate Brokerage/API access.

This keeps the project focused on market/options data reads only and avoids turning it into a brokerage integration.


## Yahoo Finance as Unofficial No-Token Options Fallback

Yahoo Finance is added as an unofficial, zero-token fallback provider.

Reasons:
- Alpha Vantage, MarketData.app, and Tradier all require API tokens or brokerage accounts.
- Yahoo Finance options endpoint requires no token.
- Enables quick sanity checks without any credential setup.

Trade-offs accepted:
- Unofficial endpoint: no SLA, may 401/403 without notice.
- No Greeks returned: delta is always null; comparison table falls back to OTM/strike-proximity sort.
- Not suitable for production; strictly a local development fallback.
