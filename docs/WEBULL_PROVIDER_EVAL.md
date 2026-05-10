# Webull OpenAPI Provider Evaluation

Date: 2026-05-10

## Summary

Webull OpenAPI is **not a clear fit yet** as a primary options-chain provider for Sell Put Assistant.

Official Webull documentation confirms OpenAPI support for US single-stock options as a trading product, but the Market Data API overview currently lists **US Options as not supported** for Webull users in the supported market-data table. The official Market Data API endpoint list covers stock, futures, crypto, event, and streaming endpoints, but does not expose an options chain endpoint in the documented market-data reference.

This project must not call trading/order endpoints. Webull remains a candidate provider only if Webull support confirms a market-data-only options chain endpoint and the required OpenAPI permissions/subscription.

## Official Sources Reviewed

- About Webull OpenAPI: https://developer.webull.com/apis/docs/about-open-api/
- Market Data API Overview: https://developer.webull.com/apis/docs/market-data-api/overview/
- Subscribe Advanced Quotes: https://developer.webull.com/apis/docs/market-data-api/subscribe-quotes/
- SDKs and Tools: https://developer.webull.com/apis/docs/sdk/
- Webull OpenAPI product page: https://www.webull.com/open-api

## Findings

### US Options Market Data Support

- Webull OpenAPI lists **Single-Stock Options** under trading products.
- The Market Data API overview lists **US Options: X** for Webull users.
- The documented Market Data API endpoints include stocks, futures, crypto, event contracts, and streaming subscriptions, but no documented options chain endpoint was found.

Conclusion: options trading support exists, but documented options market data / option chain support is not confirmed.

### Option Chain Endpoint

No official market-data-only option chain endpoint was found in the reviewed docs.

Do not use Trading API option order endpoints as a workaround. This project only reads market/options data.

### Fields Needed By This Project

Sell Put Assistant needs:

- bid
- ask
- last
- delta
- implied volatility
- open interest
- volume
- expiration / DTE

Official docs reviewed do not confirm an options chain response shape or these fields for US options market data.

### Account, Approval, and Subscription Requirements

Likely requirements before any real test:

- Webull US brokerage account / eligible OpenAPI client status.
- OpenAPI application approval.
- App key and app secret.
- Token/access-token flow as required by Webull OpenAPI.
- Separate OpenAPI market data subscription if market data access is needed.

Important: Webull states OpenAPI advanced quote subscriptions are separate from mobile/desktop platform subscriptions.

### Authentication

Official docs describe:

- App Key
- App Secret
- HMAC-SHA1 request signature
- reusable access token for account/trading operations

The official SDK handles authentication and signatures.

### SDK Availability

Official SDKs:

- Python: `webull-openapi-python-sdk`
- Java: `webull-openapi-java-sdk`

Local mac2 check:

- `python3 -m pip show webull`: not installed
- `python3 -m pip show webullsdk`: not installed
- `python3 -m pip show webull-openapi`: not installed
- `npm view @webull/openapi`: not found
- `npm view webull-openapi`: not found
- `npm view webull`: package exists, but it is not the official OpenAPI SDK documented by Webull

## Proposed Provider Architecture If Confirmed Later

Provider key:

```text
webull
```

Environment variables:

```text
WEBULL_APP_KEY=
WEBULL_APP_SECRET=
WEBULL_ACCESS_TOKEN=
```

Local-only flow:

1. Frontend calls mac2 local proxy only.
2. Local proxy validates credentials exist.
3. Provider calls only official Webull market-data endpoints.
4. Provider maps response into the existing normalized `puts[]` shape.
5. Provider never calls trading/order endpoints.
6. Provider never sends secrets to the frontend.

## Current Scaffold Decision

A provider skeleton is allowed, but it intentionally does not call Webull yet.

Behavior:

- Missing credentials: `Missing WEBULL OpenAPI credentials`
- Credentials present: returns a clear `501` scaffold-only error until an official options-chain market-data endpoint is confirmed

## Risks

- Official docs currently indicate US options market data is not available in the Market Data API for Webull users.
- OpenAPI approval may be required.
- Separate OpenAPI market data subscription may be required.
- Mobile/desktop quote subscriptions may not apply to OpenAPI.
- Using trading endpoints for quote discovery would violate this project boundary.
- Webull may provide options quotes through non-public/support-enabled endpoints not visible in public docs; this needs confirmation from Webull support before implementation.

## Recommended Next Manual Actions

1. Ask Webull OpenAPI support whether US single-stock option chain market data is available through OpenAPI.
2. Ask for the exact market-data endpoint and response fields for bid/ask/last/Greeks/OI/volume.
3. Confirm whether OPRA / advanced quote subscription applies to OpenAPI options data.
4. Confirm whether a brokerage account and OpenAPI app approval are required for market-data-only access.
5. Only after confirmation, install the official Python SDK locally and add a smoke test guarded by local `.env` credentials.
