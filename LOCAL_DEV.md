# Local MarketData Development

This mode runs real MarketData.app options data locally on mac2 through the local proxy.
The GitHub Pages production site never receives API tokens — they stay in `/Users/laicai/.env` on mac2 only.

## Prerequisites

- MARKETDATA_TOKEN must be set in `/Users/laicai/.env` on mac2
- `.env` symlink must point to the global env: `ln -sf /Users/laicai/.env /Users/laicai/projects/sell-put-assistant/.env`
- Node 24 via nvm must be active on mac2

## Quick smoke test (before starting the UI)

On mac2:

```bash
cd /Users/laicai/projects/sell-put-assistant
npm run smoke:marketdata
```

Expected output:

```
Auto-selected expiration: YYYY-MM-DD
Status: PASS
Puts returned: ...
Count with delta: ...
```

## Start the full local dev server

**Terminal 1 — open SSH tunnel on your local machine:**

```bash
ssh -L 5173:127.0.0.1:5173 -L 8787:127.0.0.1:8787 mac2
```

**Terminal 2 — start the dev server on mac2:**

```bash
ssh mac2
cd /Users/laicai/projects/sell-put-assistant
npm run dev:marketdata
```

**Browser — open on your local machine:**

```
http://localhost:5173/sell-put-assistant/
```

## Page workflow

1. Set **Provider** to `MarketData.app`
2. Enter a **Ticker** (SMH / NVDA / QQQ / MU)
3. Click **Fetch Expirations** — auto-selects 30–60 DTE preferred date
4. Click **Fetch Put Chain**
5. Click **Use in Comparison Table** to add to the comparison grid

## What the scripts do

| Script | What it runs |
|---|---|
| `npm run server:marketdata` | Express proxy on 8787 with `OPTIONS_DATA_PROVIDER=marketdata` |
| `npm run dev:marketdata` | Both proxy + Vite with `VITE_OPTIONS_API_BASE=http://localhost:8787` |
| `npm run smoke:marketdata` | Smoke test for MarketData.app / SMH |

## Troubleshooting

- **API calls fail** → Run `npm run smoke:marketdata` first to confirm token and connectivity
- **Page can't reach API** → Confirm the SSH tunnel has port 8787 forwarded
- **Frontend won't load** → Confirm the SSH tunnel has port 5173 forwarded
- **Wrong provider used** → Make sure you ran `npm run dev:marketdata`, not `npm run dev:full`
- **Token missing** → Check `/Users/laicai/.env` on mac2 has `MARKETDATA_TOKEN=...`
- **Never commit `.env`** → `.gitignore` already excludes it; do not force-add

## Safety reminders

- MARKETDATA_TOKEN is never printed, never committed, never sent to the frontend
- This tool is a personal risk/reward workflow helper, not financial advice
- No order placement or automated trading is connected

---

## Background Dev Service (recommended for persistent access)

Instead of keeping a terminal open with `npm run dev:marketdata`, run it as a background service on mac2.

### Start the background service

On mac2:

```bash
cd /Users/laicai/projects/sell-put-assistant
npm run bg:marketdata:start
```

The service starts Express (port 8787) and Vite (port 5173) as detached background processes. Logs go to `.runtime/marketdata-dev.log`.

### Access from your local machine

**Terminal 1 — SSH tunnel (keep open):**

```bash
ssh -L 5173:127.0.0.1:5173 -L 8787:127.0.0.1:8787 mac2
```

**Browser:**

```
http://localhost:5173/sell-put-assistant/
```

### Check status

```bash
npm run bg:marketdata:status
```

### View logs

```bash
npm run bg:marketdata:logs
```

### Stop

```bash
npm run bg:marketdata:stop
```

### Restart (e.g. after code changes)

```bash
npm run bg:marketdata:restart
```

### Update workflow (after pulling new commits)

```bash
ssh mac2
cd /Users/laicai/projects/sell-put-assistant
git pull --ff-only
npm install
npm run test
npm run build
npm run bg:marketdata:restart
```

Or use the convenience script (only when working tree is clean):

```bash
npm run update:marketdata
```

> **Warning:** `update:marketdata` runs `git pull --ff-only`. Only use it when there are no uncommitted local changes.

### Runtime files

`.runtime/` is gitignored. It contains:

| File | Contents |
|---|---|
| `server.pid` | Express process PID |
| `vite.pid` | Vite process PID |
| `marketdata-dev.log` | Combined stdout/stderr log |


## Broker Quote Override Local Testing

When MarketData.app looks delayed versus E*Trade/Fidelity:

1. Fetch MarketData candidates locally.
2. Click `Use in Comparison Table`.
3. Enter broker option-chain bid/ask in the row-level `Broker Bid` and `Broker Ask` fields.
4. Confirm the row shows `Broker Override` and `Using broker override`.
5. Use the recomputed reward/risk and position sizing as a personal workflow check only.

MarketData is for screening. Broker bid/ask is authoritative for order entry. The app does not place orders.

If the underlying price differs materially, enter the broker observed price in Quote Diagnostics and click `Use broker price as Current Price`.
