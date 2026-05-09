# Local Options Data Proxy

This server is a local-only API proxy for future real options data integrations. It keeps provider tokens out of the GitHub Pages frontend.

## Run Locally

```bash
cp .env.example .env
npm run server
```

Full local app + proxy:

```bash
npm run dev:full
```

Frontend local API base:

```bash
VITE_OPTIONS_API_BASE=http://localhost:8787
```

## Endpoint

```text
GET /api/options-chain?ticker=SMH&expiration=2026-06-19
```

## Providers

```bash
OPTIONS_DATA_PROVIDER=mock
OPTIONS_DATA_PROVIDER=tradier
OPTIONS_DATA_PROVIDER=marketdata
OPTIONS_DATA_PROVIDER=alpaca
```

Default provider is `mock`.

Tradier is stubbed with the expected request structure and normalized response mapping. MarketData.app and Alpaca are reserved for future implementation.

## Secrets

Never put API tokens in frontend code. Keep tokens in local `.env` only:

```bash
TRADIER_TOKEN=
MARKETDATA_TOKEN=
ALPACA_KEY=
ALPACA_SECRET=
```

`.env` is ignored by git. `.env.example` contains placeholders only.

## Tradier Provider Smoke Test

Tradier support uses the market data endpoint only:

```text
GET https://api.tradier.com/v1/markets/options/chains
```

It does not use trading or order endpoints.

Recommended local setup keeps tokens out of shell history and git:

```bash
cp .env.example .env
# edit .env locally; do not commit it
OPTIONS_DATA_PROVIDER=tradier
TRADIER_TOKEN=your_token_here
```

Run the smoke test:

```bash
npm run smoke:options -- --provider tradier --ticker SMH --expiration 2026-06-19
```

Or run the full local app with proxy:

```bash
VITE_OPTIONS_API_BASE=http://localhost:8787 npm run dev:full
```

If the smoke test returns no puts, check whether the expiration is valid for the ticker. Tradier tokens must never be committed or placed in frontend code.
