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
