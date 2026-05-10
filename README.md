# Sell Put Assistant

Sell Put Assistant is a personal MVP dashboard for reviewing cash-secured put and wheel strategy setups. It is an education and workflow helper, not an investment advice tool and not an automated trading system.

The app lets you manually enter a ticker, current price, target put strike, premium, DTE, delta, support, target level, cash available, contract count, and broker. It then calculates cash required, max profit, breakeven, return on cash, annualized return, downside buffer, distance to support, cash usage, and a simplified reward/risk ratio.

## V2 Features

- Compare Put Strikes table for reviewing several manual sell put candidates side by side.
- Sort candidates by reward/risk, annualized return, downside buffer, or cash required.
- Highlight a balanced candidate using reward/risk, delta, position sizing, strike vs support, and DTE.
- Show risk flags for poor reward/risk, aggressive delta, not enough cash, heavy size, and non-ideal DTE.

## Workflow Principles

- No single signal should directly equal a trade decision.
- Market trend, position sizing, reward/risk, and cash requirement are shown separately.
- New positions must review reward/risk first.
- Reward/Risk >= 2 is treated as a stronger setup.
- Reward/Risk from 1.5 to 2 is watchlist or small-size only.
- Reward/Risk < 1.5 is marked as poor risk/reward.
- Broker notes are reminders only. They do not place trades.

## Default Watchlist

QQQ, SMH, NVDA, MU, AVGO, MSFT, AMZN, QLD, JAAA

## Local Development

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Build

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```


## Deployment

GitHub Pages deployment now runs through GitHub Actions. Every push to `main` triggers a workflow that installs dependencies, runs tests, builds the Vite app, and deploys `dist/` to GitHub Pages.

Live URL:

```text
https://laicaimacmini-lgtm.github.io/sell-put-assistant
```

For first-time setup, set the repository Pages source to GitHub Actions:

```text
Settings -> Pages -> Source -> GitHub Actions
```

The `npm run deploy` script is kept only as a legacy/manual fallback for the older `gh-pages` branch workflow. The recommended deployment path is GitHub Actions on push to `main`.

## Legacy Manual Deployment

This project is configured for GitHub Pages with Vite base path `/sell-put-assistant/` and the `gh-pages` package.

The placeholder homepage is:

```json
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/sell-put-assistant"
```

After creating a GitHub repository, update `homepage` if needed, then run:

```bash
git remote add origin git@github.com:YOUR_GITHUB_USERNAME/sell-put-assistant.git
git branch -M main
git push -u origin main
npm run deploy
```

The deploy script publishes the `dist` folder to the `gh-pages` branch.

## Disclaimer

For education and personal workflow only. Not financial advice. This tool does not connect to brokerage APIs, does not guarantee returns, does not recommend securities, and does not automate trading. Always review risk/reward, position sizing, cash requirement, market trend, assignment risk, and your own account constraints before making any decision.

## Real Options Data

The app now includes a Real Options Data panel for future real put-chain workflows. GitHub Pages remains a static frontend and does not contain API tokens. Real options data must go through the local Node proxy in `server/`.

Local full-stack dev:

```bash
cp .env.example .env
VITE_OPTIONS_API_BASE=http://localhost:8787 npm run dev:full
```

Run only the proxy:

```bash
npm run server
```

Provider selection is server-side only:

```bash
OPTIONS_DATA_PROVIDER=mock
OPTIONS_DATA_PROVIDER=tradier
```

Secrets stay in local `.env` and must never be committed or added to frontend code:

```bash
TRADIER_TOKEN=
MARKETDATA_TOKEN=
ALPACA_KEY=
ALPACA_SECRET=
```

If `VITE_OPTIONS_API_BASE` is not set, the GitHub Pages UI shows a local proxy reminder instead of throwing an error. This project does not connect to trading APIs and does not place orders.

## Options Provider Smoke Test

Use the smoke test to verify that the local options provider returns a normalized option chain. This reads from the server-side provider abstraction only and never trades.

Mock provider:

```bash
npm run smoke:options
```

With explicit args:

```bash
npm run smoke:options -- --ticker SMH --expiration 2026-06-19 --provider mock
```

Future Tradier check:

```bash
OPTIONS_DATA_PROVIDER=tradier TRADIER_TOKEN=xxx npm run smoke:options -- --ticker SMH --expiration 2026-06-19
```

Never write tokens into code and never commit `.env`. The smoke test validates data reads only; it does not place trades.

## Tradier Local Provider

Tradier is supported through the local server proxy for market/options data only. The app does not call Tradier trading/order endpoints and does not place trades.

Recommended local setup:

```bash
cp .env.example .env
# edit .env locally; do not commit it
OPTIONS_DATA_PROVIDER=tradier
TRADIER_TOKEN=your_token_here
```

Smoke test:

```bash
npm run smoke:options -- --provider tradier --ticker SMH --expiration 2026-06-19
```

Full local UI + proxy:

```bash
VITE_OPTIONS_API_BASE=http://localhost:8787 npm run dev:full
```

GitHub Pages does not store provider tokens. Real options data is only available through the local proxy or a future secure backend. This remains an education and personal workflow tool, not financial advice.

## Options Data Provider Priority

Real options data remains local-proxy only. Provider priority is:

1. `mock`: default built-in sample data.
2. `alphavantage`: lower-friction personal API key option.
3. `marketdata`: dedicated options market data API.
4. `tradier`: optional; requires Tradier Brokerage/API access and may require brokerage KYC.

Local `.env` examples:

```bash
OPTIONS_DATA_PROVIDER=alphavantage
ALPHAVANTAGE_API_KEY=your_key_here
```

```bash
OPTIONS_DATA_PROVIDER=marketdata
MARKETDATA_TOKEN=your_token_here
```

```bash
OPTIONS_DATA_PROVIDER=tradier
TRADIER_TOKEN=your_token_here
```

Tokens must stay in local `.env` or shell environment only. GitHub Pages does not store tokens and does not directly call real options APIs.


### Yahoo Finance Provider (Unofficial Fallback)

Yahoo Finance is available as a no-token fallback. No credentials needed.



Limitations: unofficial endpoint, no delta/Greeks, may 401/403 without notice.
The UI shows a delta-unavailable message and uses OTM/strike fallback for comparison.


## Webull OpenAPI Evaluation

Webull OpenAPI is tracked as a candidate provider because broker-side quotes may be fresher than some delayed market-data feeds. It is not active yet.

Current conclusion:

- Official docs mention single-stock options as a trading product.
- Official Market Data API docs mark US Options as not supported for Webull users.
- No official market-data-only option chain endpoint was found.
- Webull likely requires OpenAPI approval and may require a separate OpenAPI market-data subscription.

A safe `webull` provider scaffold exists only to return clear credential/scaffold errors. It does not call trading/order endpoints and does not send credentials to the frontend.

See `docs/WEBULL_PROVIDER_EVAL.md` for details.


## Broker Quote Override

MarketData.app can be useful for screening expirations, strikes, delta, IV, open interest, and volume, but quotes may be delayed or stale. For order-sensitive calculations, enter the broker bid/ask manually in the comparison table.

When Broker Bid and Broker Ask are both provided, the app uses broker mid as `effectivePremium` for max profit, return on cash, annualized return, breakeven, and reward/risk. Original MarketData bid/ask/mid stays visible for transparency.

Broker quote is authoritative for order entry. This tool does not connect to broker trading APIs, does not place orders, and remains a personal education/workflow helper.
