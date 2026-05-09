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
