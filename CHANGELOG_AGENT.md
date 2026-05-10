# Agent Changelog

## 2026-05-09 — Add MarketData quote diagnostics and data quality fields

### Problem
MarketData.app free plan returns end-of-day data (up to 2 trading days stale). Users had no visibility into when the data was last updated, leading to confusion when comparing tool quotes against live broker prices.

### Root Cause
The `updated` unix timestamp in MarketData.app columnar API responses was not being surfaced to the UI. Additionally, no bid/ask quality classification existed to distinguish live bid/ask quotes from last-price fallbacks.

### Solution
- Added `dataQualityFrom` helper in `server/optionsProvider.js` classifying each put as `bid_ask | mid_only | last_fallback | invalid`
- Exposed `premiumSource`, `dataQuality`, `quoteDate` fields per put and top-level `quoteDate` on the chain response
- `optionsChain.js` passes these fields through normalization and prefers `bid_ask` candidates in selection; excludes `invalid` puts
- `RealOptionsPanel.jsx` shows a **Quote Diagnostics** section with data-as-of time, staleness warning (>4 hrs), quality counts, and broker observed price input with >1% mismatch warning
- `App.jsx` comparison table premium cell shows bid/ask hint when available and `last-fallback` badge otherwise
- 10 new tests added (83 total, was 73)

### Files Changed
- `server/optionsProvider.js` — dataQualityFrom, quoteDate extraction
- `src/lib/optionsChain.js` — field passthrough, bid_ask preference
- `src/components/RealOptionsPanel.jsx` — quote diagnostics UI
- `src/App.jsx` — bid/ask hint, last-fallback badge
- `src/styles.css` — new CSS classes
- `server/optionsProvider.test.js` — 6 new tests
- `src/lib/optionsChain.test.js` — 4 new tests


## 2026-05-09 — Fix auto-fetch to fire on page open

### Problem
Auto-fetch was implemented but never actually triggered on page load because:
1. `useState('mock')` as default — component opened in mock mode, useEffect skipped
2. `useRef(new Set())` dedup with no cleanup — React StrictMode double-invocation caused the second effect run to be silently skipped

### Fix
- Default provider now initializes to `'marketdata'` when `VITE_OPTIONS_API_BASE` is set (lazy useState initializer)
- Replaced `useRef(new Set())` with single-key `autoFetchKeyRef` + cleanup function that resets the ref on unmount, making StrictMode double-mount work correctly
- Added `cancelled` flag to prevent stale state updates from aborted fetches
- Fixed `chain.puts.length` JSX crash when puts is undefined

### Tests Updated
- "fetches mock options data": now waits for auto-fetch then switches to mock before manual fetch
- "fetches Yahoo expirations": now accounts for auto-fetch on marketdata before switching to yahoo
- "does not auto-fetch when provider is not marketdata": now clears apiBase so provider defaults to mock

### Result
Page opens → auto-fetch fires immediately when MarketData proxy is available → no manual "Fetch Expirations" click needed

## 2026-05-09 — Add MarketData local dev scripts

### Changes
- package.json: Added `server:marketdata`, `dev:marketdata`, `smoke:marketdata` scripts
- LOCAL_DEV.md: New file documenting SSH tunnel + `npm run dev:marketdata` workflow
- RUNBOOK.md: Added "Recommended Local Real-Data Workflow" section
- CURRENT_STATE.md: Updated to reflect new shortcuts

### Details
- `npm run dev:marketdata` sets `OPTIONS_DATA_PROVIDER=marketdata` and `VITE_OPTIONS_API_BASE=http://localhost:8787` automatically
- `npm run smoke:marketdata` is shorthand for `smoke:options --provider marketdata --ticker SMH`
- No tokens printed, no .env committed, no trading APIs

### Test results
- 53/53 tests pass
- Build: success


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

## 2026-05-09 — Add MarketData background dev service

Added `scripts/marketDataDevService.js` for persistent background process management.

### Changes

- `scripts/marketDataDevService.js`: new ESM script — start/stop/restart/status/logs
  - Spawns detached Express server (port 8787) and Vite (port 5173) as background processes
  - Writes pid files to `.runtime/server.pid` and `.runtime/vite.pid`
  - Appends all stdout/stderr to `.runtime/marketdata-dev.log`
  - Verifies ports are listening after start; confirms ports released after stop
  - Redacts token-shaped values from status/log output
  - Binds Vite to 127.0.0.1 only — not public network
- `package.json`: added 6 new scripts
  - `bg:marketdata:start`, `bg:marketdata:stop`, `bg:marketdata:restart`
  - `bg:marketdata:status`, `bg:marketdata:logs`, `update:marketdata`
- `.gitignore`: added `.runtime/` and `*.log`
- `LOCAL_DEV.md`: added "Background Dev Service" section with full workflow
- `RUNBOOK.md`: added "Background MarketData Dev Service" section
- `CURRENT_STATE.md`: updated with new scripts and background service status

### Validation

- `npm run smoke:marketdata`: PASS (SMH, auto-selected 2026-06-12, 117 puts, 117 with delta)
- `npm run test`: 53/53 passed
- `npm run build`: clean (224.85 kB JS, 9.56 kB CSS)
- `npm run bg:marketdata:start`: ✓ port 8787 listening, ✓ port 5173 listening
- `npm run bg:marketdata:status`: ✓ both pids running
- `npm run bg:marketdata:restart`: ✓ clean stop + start cycle
- API verified: `curl http://localhost:8787/api/options-expirations?ticker=SMH&provider=marketdata` → 22 expirations
- Background service left running for immediate SSH tunnel access

---

## 2026-05-09 — Underlying Price Sync + Support Quick Fill

### Changes

**server/optionsProvider.js**
- `fetchMarketDataOptionsChain`: extracts `underlyingPrice` from columnar array (`data.underlyingPrice[0]`) or scalar field; uses `normalizeNumber` to prevent NaN; returns `{ underlyingPrice: number|null, underlyingPriceSource: 'marketdata'|null }` alongside puts.

**src/components/RealOptionsPanel.jsx**
- Added `onChainFetched` prop; called after successful fetch with `{ puts, underlyingPrice, underlyingPriceSource }`.
- Added `priceSyncMsg` state: shows "Updated current price from MarketData.app: $xxx.xx" / "Estimated..." / "Underlying price unavailable" depending on response.

**src/App.jsx**
- Added `handleChainFetched({ underlyingPrice })`: syncs `form.currentPrice` via `setForm` when `underlyingPrice` is a valid finite number.
- Added support quick fill buttons: -3%, -5%, -8%, -10% of current price, rounded to 2 decimals.
- Added `supportStale` derived boolean + inline warning when `support < currentPrice * 0.7 || support > currentPrice`.
- Passes `onChainFetched={handleChainFetched}` to `RealOptionsPanel`.

**src/styles.css**
- Added `.quick-fill-row`, `.quick-fill-btn`, `.support-stale-warning`, `.price-sync-msg` styles.

### Validation

- `npm run test`: 59/59 passed (6 new tests: 3 provider underlyingPrice, 3 frontend sync/quickfill/warning)
- `npm run build`: clean (226.21 kB JS, 10.21 kB CSS)
- `npm run bg:marketdata:restart`: ✓ port 8787 listening, ✓ port 5173 listening

## 2026-05-09 — Live chain UX, stale warnings, auto-fetch

### Added
- Target quick fill buttons (+3%, +5%, +8%, +10%): sets Resistance/Target as % above current price (planning helper only, not a recommendation).
- Target stale warning: shown when target is below current price.
- Stale comparison warning: shown while comparison rows are example data (comparisonRowsSource === "example") or max strike < 70% of current price.
- Apply prompt: after a real chain fetch, prompts user to click "Use in Comparison Table" to replace example rows.
- "Use in Comparison Table" now REPLACES comparison rows (was already replacing, now sets source to 'live' to clear stale warning).
- Apply success confirmation shown after rows replaced.
- Auto-fetch: when provider=marketdata and local proxy available, auto-runs expiration + chain fetch on page load (per-ticker dedup via useRef Set).
- Auto apply toggle (default OFF): when ON, fetch success auto-applies candidates without manual click.
- Refresh MarketData button: re-runs full fetch flow, respects auto-apply toggle.
- Last updated timestamp shown after each fetch.
- 14 new tests covering all new behaviors (73 total, all passing).

### Changed
- RealOptionsPanel: added comparisonRowsSource prop, chainApplied state, autoApply state, lastUpdated state, autoLoading state, autoFetchedRef.
- App.jsx: added comparisonRowsSource state, passes it to RealOptionsPanel and uses it for stale comparison warning.


## 2026-05-10 — Evaluate Webull OpenAPI Options Provider

Completed:

- Reviewed official Webull OpenAPI docs for options market-data suitability.
- Added `docs/WEBULL_PROVIDER_EVAL.md` with findings, risks, and next manual actions.
- Added safe `webull` provider scaffold that does not call real APIs or trading/order endpoints.
- Added placeholder env vars to `.env.example`.
- Added Webull provider dropdown copy for the Real Options Data panel.

Findings:

- Webull supports single-stock options as a trading product, but official Market Data API docs mark US Options as not supported for Webull users.
- No official option chain market-data endpoint was found in the reviewed docs.
- Webull likely requires OpenAPI approval and may require a separate OpenAPI market data subscription.

Safety:

- No Webull token or secret was printed or committed.
- No trading/order endpoint was connected.


## 2026-05-10 — Add Broker Quote Override

Completed:

- Added Broker Bid / Broker Ask inputs per comparison row.
- Added Broker Mid calculation and Broker Override badge.
- Added `effectivePremium` and `effectivePremiumSource` logic so comparison-row reward/risk, max profit, return on cash, and annualized return use broker mid when bid/ask are supplied.
- Preserved original MarketData bid/ask/mid display for transparency.
- Added row warnings for crossed broker quote and material broker-vs-MarketData quote differences.
- Added `Clear Override` control to return to MarketData premium.
- Added Quote Diagnostics button to use broker observed underlying price as Current Price.
- Added tests for broker mid, effective premium, reward/risk recalculation, UI warnings, clear override, and broker observed price.

Safety:

- No tokens printed or committed.
- No broker trading/order API added.
- Broker quote is explicitly treated as manually entered and authoritative for order entry.
