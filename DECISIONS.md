# Decisions

## Use GitHub Actions for Deployment

GitHub Actions is now the recommended deployment path instead of manually running `npm run deploy`.

Reasons:

- Deployment is tied to `main`, so the live site tracks reviewed and pushed code.
- Tests and production build run before publishing, reducing the chance of shipping a broken UI or broken calculation logic.
- The workflow is reproducible for Codex, Claude Code, ChatGPT, or any future collaborator without needing local deploy steps.
- It uses GitHub's official Pages artifact flow instead of the older `gh-pages` branch publish flow.

`npm run deploy` remains only as a legacy/manual fallback.

## Require Test and Build Before Deploy

Deployment must run `npm run test` and `npm run build` first.

Reasons:

- The app is a personal risk/reward workflow tool, so calculation regressions are more important than cosmetic regressions.
- Unit tests cover cash requirement, reward/risk, DTE, delta, position sizing, and multi-strike comparison behavior.
- UI tests confirm core rendering and key interactions remain usable.
- Failed tests should block deployment. That is expected behavior.

## Prioritize Compare Put Strikes for v2

Compare Put Strikes was chosen as the v2 priority because it matches the daily workflow better than a single setup calculator alone.

Reasons:

- Sell put decisions often require comparing several strikes and premiums at once.
- Reward/risk, annualized return, downside buffer, and cash usage need to be viewed together.
- The balanced recommendation avoids treating a single high-yield signal as a trade decision.
- It reinforces the user's framework: market trend, reward/risk, position sizing, and cash requirement remain separate checks.
