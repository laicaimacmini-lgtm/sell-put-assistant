# Current State

Date: 2026-05-09 (updated)

## Product Status

Sell Put Assistant is a personal risk/reward workflow tool for cash-secured puts and wheel strategy review. It is not an investment advice tool, not a recommendation engine, and not an automated trading tool.

Current latest functionality includes:

- Single setup calculator for one cash-secured put candidate.
- Broker execution reminders for E*Trade, Fidelity, and Other.
- Risk sections for market trend, reward/risk, position sizing, and cash requirement.
- Compare Put Strikes table for comparing multiple sell put candidates side by side.
- Default SMH comparison examples for strikes 245, 240, and 235.
- MarketData.app expiration picker: auto-fetches available put expirations and selects 30-60 DTE preferred date.
- Smoke script auto-selects expiration for providers that support discovery (yahoo, marketdata).
- One-command local dev shortcuts: `npm run dev:marketdata`, `npm run smoke:marketdata`, `npm run server:marketdata`.
- `LOCAL_DEV.md` documents the full SSH tunnel + dev server workflow for real-data local testing.
- Sorting comparison rows by reward/risk, annualized return, downside buffer, or cash required.
- **NEW**: After fetching a real MarketData.app put chain, Trade Inputs Current Price is automatically synced from `underlyingPrice` in the API response.
- **NEW**: Support quick fill buttons (-3%, -5%, -8%, -10%) to set support level relative to current price.
- **NEW**: Support stale warning shown when support level is outside valid range (< 70% or > 100% of current price).
- **NEW**: Target (Resistance) quick fill buttons (+3%, +5%, +8%, +10%) to plan upside targets as % of current price.
- **NEW**: Target stale warning when target is below current price.
- **NEW**: Auto-fetch: when provider=MarketData.app and local proxy available, page auto-fetches expirations and put chain on load. Provider now defaults to MarketData.app when proxy is detected, so fetch starts immediately on page open without any manual switch.
- **NEW**: Apply prompt shown after real chain fetch: guides user to click Use in Comparison Table to replace example rows with live data.
- **NEW**: Stale comparison warning shown while comparison rows contain example data not reflecting current price.
- **NEW**: Use in Comparison Table now REPLACES example rows with live candidates and clears stale warning.
- **NEW**: Auto apply toggle (default OFF): when ON, fetch success automatically applies candidates to comparison table.
- **NEW**: Refresh MarketData button re-runs the full fetch flow and shows last-updated timestamp.
- Balanced candidate highlighting that weighs reward/risk, delta, position size, strike vs support, and DTE.
- Risk flags for poor reward/risk, aggressive delta, not enough cash, heavy size, and non-ideal DTE.

- **NEW**: Quote diagnostics panel in MarketData fetch section: shows data-as-of timestamp, staleness warning (>4 hrs), bid_ask / last_fallback / invalid quality counts, and broker price mismatch input.
- **NEW**: , , and  fields on every put from MarketData.app provider. Candidate selection prefers bid_ask quality and excludes invalid puts.
- **NEW**: Bid/Ask hint shown in comparison table premium cell when real bid and ask are available; last-fallback badge shown when only last-price data is available.
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
40 tests passed
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

## Provider Priority Update

Tradier is retained but downgraded to optional because it can require Tradier Brokerage/API access and brokerage KYC. The preferred order for real-data exploration is now:

1. `mock` as the default safe provider.
2. `alphavantage` as a lower-friction personal API key option.
3. `marketdata` as a dedicated market data provider.
4. `tradier` as optional brokerage-account-backed access.

Alpha Vantage and MarketData.app providers are implemented defensively behind the local proxy. No token is committed and no frontend code receives provider credentials.


## Yahoo Finance Provider (Unofficial Fallback)

Yahoo Finance is now available as an unofficial, no-token fallback options provider.

- Provider key: yahoo
- Delta unavailable (delta: null always); comparison table uses OTM/strike fallback
- Expiration discovery: /api/options-expirations?ticker=SMH&provider=yahoo
- Auto-selection: smoke script picks 30-60 DTE if no expiration supplied
- Reliability: unofficial endpoint; may return 401/403 without notice

Provider order (updated):
1. mock - always works, default
2. alphavantage - personal API key, delta available
3. marketdata - dedicated market data, delta available
4. tradier - brokerage account required, delta available
5. yahoo - unofficial fallback, no token, no delta


## MarketData.app Provider Validated (2026-05-09)

MarketData.app provider fully validated end-to-end.

- MARKETDATA_TOKEN loaded from /Users/laicai/.env symlink (3 vars injected via dotenvx)
- Bug fixed: URL construction used  which dropped the  path segment; fixed to 
- Added  query param to filter server-side
- Improved 404/no_data/auth error handling with actionable messages
- Smoke test PASS: SMH 2026-06-05, 131 puts, 131 with delta, all Greeks present
- Valid SMH expirations confirmed: 2026-06-05, 2026-06-12, 2026-07-17
- Invalid (no_data 404): 2026-05-16, 2026-05-30, 2026-06-19, 2026-06-20
- All 49 tests pass, production build clean


## MarketData.app Provider Validated (2026-05-09)

MarketData.app provider fully validated end-to-end.

- MARKETDATA_TOKEN loaded from /Users/laicai/.env symlink (3 vars injected via dotenvx)
- Bug fixed: URL construction dropped /v1 path segment; fixed to string concat instead of new URL with absolute path
- Added side=put query param to filter server-side
- Improved 404/no_data/auth error handling with actionable messages
- Smoke test PASS: SMH 2026-06-05, 131 puts, 131 with delta, all Greeks present
- Valid SMH expirations: 2026-06-05, 2026-06-12, 2026-07-17
- Invalid expirations (no_data): 2026-05-16, 2026-05-30, 2026-06-19, 2026-06-20
- All 49 tests pass, production build clean

## Background MarketData Dev Service (2026-05-09)

A persistent background dev service is now available for MarketData.app local development.

- `npm run bg:marketdata:start` — start Express (8787) + Vite (5173) as detached background processes
- `npm run bg:marketdata:stop` — stop via pid files
- `npm run bg:marketdata:restart` — stop + start (use after code changes)
- `npm run bg:marketdata:status` — pid health + port status + last 20 log lines
- `npm run bg:marketdata:logs` — last 100 lines of `.runtime/marketdata-dev.log`
- `npm run update:marketdata` — git pull + install + test + build + restart (clean tree only)
- Service binds only to 127.0.0.1 — not exposed to public network
- `.runtime/` is gitignored; contains pid files and combined log
- `LOCAL_DEV.md` updated with background workflow and SSH tunnel instructions


## Webull OpenAPI Provider Evaluation (2026-05-10)

Webull OpenAPI has been evaluated as a possible provider for fresher options bid/ask data. Current conclusion: **candidate only, not ready as an implemented data provider**.

- Official docs list single-stock options as a trading product, but the Market Data API overview marks US Options as not supported for Webull users.
- No official market-data-only option chain endpoint was found in the reviewed docs.
- Webull may require OpenAPI approval, App Key/App Secret credentials, access token flow, and a separate OpenAPI market data subscription.
- A `webull` provider scaffold now exists only to guard credentials and document the boundary; it does not call Webull APIs.
- The project must not call Webull trading/order endpoints for quote discovery.

Evaluation details: `docs/WEBULL_PROVIDER_EVAL.md`.
