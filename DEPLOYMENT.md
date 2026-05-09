# GitHub Actions Deployment

The recommended deployment path is now GitHub Actions, not the legacy manual `npm run deploy` / `gh-pages` branch flow.

Each push to `main` runs `.github/workflows/deploy.yml`:

1. Check out the repo.
2. Set up Node 20.
3. Install dependencies with `npm ci`.
4. Run `npm run test`.
5. Run `npm run build`.
6. Upload `./dist` as a Pages artifact.
7. Deploy using GitHub's official Pages Actions.

Repository Pages settings should be:

```text
Settings -> Pages -> Build and deployment -> Source: GitHub Actions
```

The old `npm run deploy` command is retained as a legacy/manual fallback only. Prefer pushing to `main` and letting Actions deploy after tests pass.

## GitHub Actions Troubleshooting

- If the page does not update, check the repository Actions tab first and confirm the latest "Deploy GitHub Pages" run succeeded.
- If Pages does not deploy, check `Settings -> Pages` and confirm the source is set to `GitHub Actions`.
- If tests fail in Actions, deployment is blocked. That is expected because failed tests should prevent publishing.

# Legacy Manual Deployment Workflow

This project is deployed from mac2 using GitHub CLI, SSH remotes, Vite, and the `gh-pages` npm package.

## mac2 Setup

GitHub CLI is installed in the user directory, not with Homebrew:

```bash
~/.local/bin/gh
```

Make sure the shell can find it:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

This PATH line has also been added to `~/.zshrc` for future shells.

Current GitHub username:

```text
laicaimacmini-lgtm
```

Check authentication:

```bash
gh auth status
gh api user --jq .login
```

## Repository Creation

Use GitHub CLI to create the repo automatically:

```bash
gh repo create sell-put-assistant --public --source=. --remote=origin
```

If `origin` already exists or points somewhere else, reset it to the SSH remote:

```bash
git remote remove origin 2>/dev/null || true
git remote add origin git@github.com:laicaimacmini-lgtm/sell-put-assistant.git
```

Expected remote format:

```text
git@github.com:laicaimacmini-lgtm/sell-put-assistant.git
```

## Vite Pages Configuration

GitHub Pages project sites need the Vite base path to match the repo name.

`vite.config.js` should include:

```js
base: '/sell-put-assistant/',
```

`package.json` should include a homepage in this format:

```json
"homepage": "https://laicaimacmini-lgtm.github.io/sell-put-assistant"
```

## Build, Push, Deploy

Install dependencies and build:

```bash
npm install
npm run build
```

Push the main branch:

```bash
git branch -M main
git push -u origin main
```

Deploy the built `dist` folder to the `gh-pages` branch:

```bash
npm run deploy
```

Verify the deployment branch exists:

```bash
git ls-remote --heads origin gh-pages
```

Final Pages URL:

```text
https://laicaimacmini-lgtm.github.io/sell-put-assistant
```

## Troubleshooting

### Host key verification failed

GitHub's SSH host key is missing from mac2's `known_hosts`.

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
ssh-keyscan github.com >> ~/.ssh/known_hosts
chmod 600 ~/.ssh/known_hosts
ssh -T git@github.com
```

### Permission denied (publickey)

The GitHub host key is known, but GitHub does not accept the local SSH key. Add the mac2 public key to GitHub:

```bash
cat ~/.ssh/id_ed25519.pub
```

GitHub path:

```text
Settings -> SSH and GPG keys -> New SSH key
```

Use key type `Authentication Key`.

### Repository not found

The remote repo does not exist or the authenticated account cannot access it.

Check the remote:

```bash
git remote -v
```

Create or verify the repo with GitHub CLI:

```bash
gh repo view laicaimacmini-lgtm/sell-put-assistant
gh repo create sell-put-assistant --public --source=. --remote=origin
```

Then reset the SSH remote if needed:

```bash
git remote remove origin 2>/dev/null || true
git remote add origin git@github.com:laicaimacmini-lgtm/sell-put-assistant.git
```

### GitHub Pages shows 404

A new Pages deployment can take 1-2 minutes to become available. Also confirm:

```bash
git ls-remote --heads origin gh-pages
```

If the branch exists but the site still 404s after a few minutes, check the repository's Pages settings in GitHub and confirm it is serving from the `gh-pages` branch.
