# Agent Changelog

## 2026-05-09 — Add MarketData expiration picker

### Changes
- server/optionsProvider.js: Added `fetchMarketDataExpirations` calling `GET /v1/options/expirations/{ticker}/?side=put`
- server/optionsProvider.js: `fetchOptionsExpirations` now dispatches to marketdata provider
- scripts/smokeOptionsProvider.js: `resolveExpiration` auto-calls `fetchOptionsExpirations` for yahoo and marketdata providers; logs `Auto-selected expiration:`
- src/lib/optionsChain.js: Added `pickExpiration` helper (30-60 DTE preferred, fallback to nearest future)
- src/components/RealOptionsPanel.jsx: `handleFetchExpirations` now uses `pickExpiration` for auto-selection
- server/optionsProvider.test.js: 4 new MarketData expirations tests (mapping, no_data, missing token, 401)

### Test results
- 53/53 tests pass
- Build: success


## 2026-05-09

Completed:

- Added Compare Put Strikes multi-strike comparison table.
- Added GitHub Actions automatic GitHub Pages deployment.
- Switched Pages source to GitHub Actions.

Validation:

- Tests: 40 tests passed.
- Build: passed.
- Deploy: GitHub Actions success.

Commit:

```text
e66218f Add strike comparison table and GitHub Actions deploy
```

Notes:

- The app remains a personal risk/reward workflow tool, not financial advice and not an automated trading system.
- `npm run deploy` is now legacy/manual fallback only.

## 2026-05-09

Completed:

- Added first-stage Real Options Data proxy architecture.
- Added local Express server and mock options chain provider.
- Added provider abstraction with Tradier stub and token safety checks.
- Added frontend Real Options Data panel and comparison-table import flow.

Validation:

- Tests: 40 tests passed.
- Build: passed.

Commit:

```text
Add real options data proxy architecture
```

Notes:

- No API tokens are committed.
- No real trading API or order placement is implemented.

Latest real options architecture commit:

```text
2934013 Add real options data proxy architecture
```

## 2026-05-09

Completed:

- Added options provider smoke test CLI.
- Added normalized options-chain validation helper.
- Added tests for mock provider success, invalid response failure, and missing real provider token failure.

Validation:

- Smoke test: passed.
- Tests: 40 tests passed.
- Build: passed.

Commit:

```text
Add options provider smoke test
```

## 2026-05-09

Completed:

- Implemented Tradier options chain provider for market data reads.
- Added robust Tradier response mapping for array and single-object responses.
- Added clear errors for missing token, auth failure, rejected request, unexpected format, and empty put chains.
- Enhanced options provider smoke test output with valid mid/delta counts and sample rows.

Validation:

- Mock smoke test: passed.
- Tradier missing-token smoke: clear failure.
- Tests: 40 tests passed.
- Build: passed.

Commit:

```text
Implement Tradier options provider
```

Notes:

- No token is committed.
- No Tradier trading/order endpoint is connected.

## 2026-05-09

Completed:

- Added Alpha Vantage options data provider behind the local proxy.
- Added MarketData.app options data provider behind the local proxy.
- Kept Tradier provider but marked it optional / brokerage-account required in docs and UI.
- Added provider dropdown and provider descriptions in Real Options Data panel.

Validation:

- Mock smoke test: passed.
- Missing-token smoke checks: clear failures for Alpha Vantage, MarketData.app, and Tradier.
- Tests: 40 tests passed.
- Build: passed.

Commit:

```text
Add alternative options data providers
```

Notes:

- No real tokens are committed.
- No trading/order endpoint is connected.


## 2026-05-09 - Add Yahoo Finance Options Provider Fallback

Implemented Yahoo Finance as an unofficial, no-token fallback options provider.

Changes:
- server/optionsProvider.js: Yahoo fetch, expiration discovery, put mapping (delta: null)
- server/index.js: /api/options-expirations endpoint, fixed import
- src/lib/optionsChain.js: fixed Codex syntax errors, hasDelta null-handling, fetchOptionsExpirations, hasUnavailableDelta
- src/components/RealOptionsPanel.jsx: yahoo dropdown, Fetch Expirations button, delta-unavailable message
- scripts/smokeOptionsProvider.js: auto-select 30-60 DTE expiration, formatDelta(null)
- Tests: 49/49 passed. Build: passed.
- Mock smoke: PASS. Yahoo smoke: expected FAIL (unofficial endpoint unavailable - clear error)

Commit: Add Yahoo options provider fallback

## 2026-05-09 — MarketData URL bug fix and full validation

### Bug Fixed
- fetchMarketDataOptionsChain used new URL(path, base) with an absolute path, which dropped the /v1 segment from MARKETDATA_BASE_URL. Fixed to string interpolation: URL(baseUrl + /options/chain/ticker/).

### Changes
- Added side=put query param to MarketData API request
- Improved error handling: distinct messages for 401/403 (auth), 400 (bad request), 404+no_data (invalid expiration), 404 generic, s=error, s=no_data on 200

### Validation
- Smoke test PASS: SMH 2026-06-05 — 131 puts, all with delta, all Greeks present
- npm run test: 49/49 pass
- npm run build: clean
