# LEGACY — Family Tree

A playable family dynasty simulation for desktop and iPhone.

## Cloudflare Workers deployment

The production Worker is `familytree-584d` at https://familytree-584d.ianpageebersole-ca8.workers.dev/. This must match the `name` field in `wrangler.jsonc` so installed iPhone apps retain the same hostname and local saves.

Connect this repository to the existing `familytree-584d` Worker. Select branch `main`, repository root `/`, leave the build command empty, and use deploy command `npx wrangler deploy`.

The wrangler.jsonc file deploys the contents of public/ as static assets. No JavaScript build step or API keys are required for gameplay.

Open the deployed URL in Safari, then Share → Add to Home Screen. Saves are stored locally on the same browser and hostname. Export saves regularly from the game menu.

This is a prototype with simplified demographic models and a 2,000-person limit.

## Automatic deployments

Every push to `main` runs `.github/workflows/deploy.yml`. It validates JavaScript and tests, deploys to the original `familytree-584d` Worker, then verifies `/version.json`.

One-time setup: In your Cloudflare account, create an API token with permission to edit Workers scripts in the target account and locate its Cloudflare Account ID. In the GitHub repository, go to **Settings → Secrets and variables → Actions → New repository secret** and add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Do not commit these credentials or paste them in chat. Then use the **Actions → Deploy LEGACY to Cloudflare → Run workflow** control to publish immediately. Alternate secret names `CF_API_TOKEN` and `CF_ACCOUNT_ID` are supported. You must have access to the correct Cloudflare account for `ianpageebersole-ca8.workers.dev`.
