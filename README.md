# LEGACY — Family Tree

A playable family dynasty simulation for desktop and iPhone.

## Cloudflare Workers deployment

The production Worker is `familytree-584d` at https://familytree-584d.ianpageebersole-ca8.workers.dev/. This must match the `name` field in `wrangler.jsonc` so installed iPhone apps retain the same hostname and local saves.

Connect this repository to the existing `familytree-584d` Worker. Select branch `main`, repository root `/`, leave the build command empty, and use deploy command `npx wrangler deploy`.

The wrangler.jsonc file deploys the contents of public/ as static assets. No JavaScript build step or API keys are required for gameplay.

Open the deployed URL in Safari, then Share → Add to Home Screen. Saves are stored locally on the same browser and hostname. Export saves regularly from the game menu.

This is a prototype with simplified demographic models and a 2,000-person limit.
