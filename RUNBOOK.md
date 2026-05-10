# Runbook

## Standard Development Flow

From mac2:

```bash
cd /Users/laicai/projects/sell-put-assistant
npm run test
npm run build
git status
git add .
git commit -m "Your commit message"
git push
```

After `git push` to `main`, GitHub Actions automatically deploys GitHub Pages.

The workflow file is:

```text
.github/workflows/deploy.yml
```

The live site is:

```text
https://laicaimacmini-lgtm.github.io/sell-put-assistant
```

## Check GitHub Actions

Using GitHub CLI on mac2:

```bash
export PATH="$HOME/.local/bin:$PATH"
gh run list --limit 5
```

Or open the GitHub repo and check the Actions tab.

Expected workflow name:

```text
Deploy GitHub Pages
```

## Deployment Source

GitHub Pages should be configured as:

```text
Settings -> Pages -> Build and deployment -> Source: GitHub Actions
```

This has already been switched for the current repo.

## Manual Fallback

`npm run deploy` is retained only as a legacy/manual backup for the old `gh-pages` branch flow.

Prefer GitHub Actions. Use manual fallback only if Actions or GitHub Pages artifact deployment is unavailable and the reason is understood.

## Common Checks

Before pushing:

```bash
npm run test
npm run build
```

If Actions deployment does not update the page:

1. Check `gh run list --limit 5` or the Actions tab.
2. Confirm the latest `Deploy GitHub Pages` run succeeded.
3. Confirm Pages source is `GitHub Actions`.
4. If tests failed, fix the failing test or code path before deploying.

## Local Options Proxy

Real options data uses a local Node proxy so API keys never enter the GitHub Pages frontend.

Setup:

```bash
cd /Users/laicai/projects/sell-put-assistant
cp .env.example .env
```

Default mock provider:

```bash
OPTIONS_DATA_PROVIDER=mock
```

Future Tradier provider:

```bash
OPTIONS_DATA_PROVIDER=tradier
TRADIER_TOKEN=your-local-token-only
```

Run proxy + Vite together:

```bash
VITE_OPTIONS_API_BASE=http://localhost:8787 npm run dev:full
```

Run proxy only:

```bash
npm run server
```

Endpoint:

```text
GET http://localhost:8787/api/options-chain?ticker=SMH&expiration=2026-06-19
```

GitHub Pages will not call mac2 localhost. Without `VITE_OPTIONS_API_BASE`, the UI shows a local proxy reminder.

## Options Provider Smoke Test

Run the local provider smoke test before wiring or changing a real options provider:

```bash
npm run smoke:options
```

Explicit mock example:

```bash
npm run smoke:options -- --ticker SMH --expiration 2026-06-19 --provider mock
```

Future Tradier example:

```bash
OPTIONS_DATA_PROVIDER=tradier TRADIER_TOKEN=xxx npm run smoke:options -- --ticker SMH --expiration 2026-06-19
```

The smoke test checks normalized response shape, put count, mid, delta, and DTE. It only validates data reads and must never be extended to trade or place orders. Keep tokens in local `.env` or shell environment only.

## Tradier Provider Check

Tradier is implemented for market/options chain reads only. Do not add order or trading endpoints.

Use a local `.env` for token safety:

```bash
OPTIONS_DATA_PROVIDER=tradier
TRADIER_TOKEN=your_token_here
```

Run the smoke test:

```bash
npm run smoke:options -- --provider tradier --ticker SMH --expiration 2026-06-19
```

If the command fails with `Missing TRADIER_TOKEN for Tradier provider`, add the token to local `.env` or the shell environment. If it fails with no puts, verify the expiration is listed for that ticker.

Run full local UI + proxy:

```bash
VITE_OPTIONS_API_BASE=http://localhost:8787 npm run dev:full
```

## Alternative Options Providers

Provider priority now favors lower-friction data access before Tradier:

1. `mock`: default and safe for development.
2. `alphavantage`: personal API key fallback.
3. `marketdata`: dedicated options market data API.
4. `tradier`: optional and requires Tradier Brokerage/API access; not preferred because it may require brokerage KYC.

Smoke tests for missing-token behavior:

```bash
npm run smoke:options -- --provider alphavantage --ticker SMH --expiration 2026-06-19
npm run smoke:options -- --provider marketdata --ticker SMH --expiration 2026-06-19
npm run smoke:options -- --provider tradier --ticker SMH --expiration 2026-06-19
```

With real local tokens, put credentials in `.env` and do not commit them. The smoke test validates data reads only; it must not trade or place orders.

## Yahoo Finance Provider (Unofficial Fallback)

Yahoo Finance provider is implemented as an unofficial local-only fallback. It calls the undocumented Yahoo Finance options endpoint and does not require an API token.

**Important limitations:**
- Yahoo Finance does not return Greeks (delta, gamma, theta, vega). Delta is always .
- This is an unofficial endpoint and may return 401/403 at any time without notice.
- The provider auto-selects expirations from Yahoo's expiration list; no manual date needed.

Smoke test (auto-selects expiration, 30–60 DTE preferred):



Explicit expiration (must be a date Yahoo offers for the ticker):



If the command fails with 'Yahoo Finance rejected the request', the unofficial endpoint is unavailable. Use , , , or  as alternatives.

Fetch expirations via API:



The UI shows a 'Delta unavailable for this provider.' message when delta-based sorting is not possible and falls back to OTM/strike-proximity selection for the comparison table.

## Recommended Local Real-Data Workflow (MarketData.app)

For the fastest real-data development loop, use the dedicated shortcuts:

### Smoke test first

```bash
npm run smoke:marketdata
```

Confirms MARKETDATA_TOKEN is loaded, auto-selects a 30-60 DTE expiration, and validates the put chain shape.

### Start full dev server

```bash
npm run dev:marketdata
```

Starts Express proxy on 8787 and Vite on 5173 with `OPTIONS_DATA_PROVIDER=marketdata` and `VITE_OPTIONS_API_BASE=http://localhost:8787` pre-set.

### SSH tunnel (run on your local machine)

```bash
ssh -L 5173:127.0.0.1:5173 -L 8787:127.0.0.1:8787 mac2
```

### Browser URL (on your local machine)

```
http://localhost:5173/sell-put-assistant/
```

See `LOCAL_DEV.md` for the full step-by-step guide including troubleshooting.

## Background MarketData Dev Service

Run the MarketData.app local dev mode as a persistent background service on mac2.

### Start

```bash
cd /Users/laicai/projects/sell-put-assistant
npm run bg:marketdata:start
```

### SSH tunnel (local machine)

```bash
ssh -L 5173:127.0.0.1:5173 -L 8787:127.0.0.1:8787 mac2
```

Browser: `http://localhost:5173/sell-put-assistant/`

### Manage the service

```bash
npm run bg:marketdata:status   # show pid/port health + last 20 log lines
npm run bg:marketdata:logs     # last 100 log lines
npm run bg:marketdata:restart  # stop + start
npm run bg:marketdata:stop     # shut down
```

### Update after new commits

```bash
git pull --ff-only && npm install && npm run test && npm run build && npm run bg:marketdata:restart
# or:
npm run update:marketdata
```

Only run `update:marketdata` when the working tree is clean (no local uncommitted changes).


## Webull OpenAPI Candidate Provider

Webull is currently an evaluation-only candidate, not an active options data provider.

Scaffold behavior:

```bash
npm run smoke:options -- --provider webull --ticker SMH --expiration 2026-06-19
```

Expected without credentials:

```text
Missing WEBULL OpenAPI credentials
```

Potential future local `.env` fields:

```text
WEBULL_APP_KEY=
WEBULL_APP_SECRET=
WEBULL_ACCESS_TOKEN=
```

Do not put these in frontend code and do not commit `.env`.

Before implementing real Webull calls, confirm with Webull support:

1. US options chain market-data endpoint exists.
2. It returns bid/ask/last and, if available, delta/IV/OI/volume.
3. Market-data-only access is allowed without using trading/order endpoints.
4. Required OpenAPI approval and separate market data subscription.

See `docs/WEBULL_PROVIDER_EVAL.md` for the current research notes.


## Broker Quote Override Workflow

Use MarketData.app to screen candidates, then use broker quotes for order-sensitive calculations.

Recommended workflow:

1. Run the local MarketData flow and fetch put chain candidates.
2. Click `Use in Comparison Table`.
3. Open E*Trade/Fidelity/your broker option chain.
4. Copy the live put bid and ask into `Broker Bid` and `Broker Ask` for the matching strike.
5. The app computes Broker Mid and uses it as `effectivePremium` for max profit, return on cash, annualized return, and reward/risk.
6. If broker quote is stale, crossed, or differs from MarketData, treat the broker chain as authoritative for order entry and re-check before placing any order manually.

Important:

- Broker quote is authoritative for order entry.
- Use limit orders only.
- This app never places trades and never connects to broker trading/order APIs.
- MarketData can be delayed or stale, so do not use MarketData premium as the final limit price without broker confirmation.
