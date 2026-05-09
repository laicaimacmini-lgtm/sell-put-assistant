# Sell Put Assistant

Sell Put Assistant is a personal MVP dashboard for reviewing cash-secured put and wheel strategy setups. It is an education and workflow helper, not an investment advice tool and not an automated trading system.

The app lets you manually enter a ticker, current price, target put strike, premium, DTE, delta, support, target level, cash available, contract count, and broker. It then calculates cash required, max profit, breakeven, return on cash, annualized return, downside buffer, distance to support, cash usage, and a simplified reward/risk ratio.

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

## GitHub Pages Deployment

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
