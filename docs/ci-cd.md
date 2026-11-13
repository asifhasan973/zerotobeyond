# Cloudflare production deployment

Production branch: `main` · output: `apps/web/dist/`.

## Automatic releases

`.github/workflows/deploy.yml` runs for pushes and merges to `main`, or a manual
workflow dispatch on `main`. It installs locked pnpm dependencies via `pnpm/action-setup@v4` with Node.js 22,
builds the production frontend via `pnpm run build`, deploys through Wrangler 4.151.2, and verifies the
live URL. Releases run sequentially. Action versions are pinned to commit SHAs.

Missing credentials fail immediately; a green run cannot silently skip deployment.
Cloudflare credentials are available only to credential validation and deployment,
not dependency installation or the frontend build. Fork pull requests do not deploy.

## Repository secrets

Configure these in GitHub repository Settings → Secrets and variables → Actions:

- `CLOUDFLARE_ACCOUNT_ID`: the account containing the Pages project.
- `CLOUDFLARE_API_TOKEN`: a dedicated API token with Account → Cloudflare Pages → Edit,
  scoped to that Cloudflare account. No DNS, account administration or token
  provisioning permission is needed. Store its value only as a GitHub Actions secret.

The Cloudflare connection used for interactive releases cannot provision persistent
API tokens. An account administrator must create the dedicated CI token before the
first automatic release. Revoke/replace it if access is no longer needed.

Optional public GitHub Actions variables control loading timing:
`VITE_LOADING_PROGRESS_MULTIPLIER`, `VITE_SLIDE_DISPLAY_MIN_MS`, and
`VITE_INTRO_SPLASH_DISPLAY_MS`. Empty values use application defaults.

## Caching and previous host

`apps/web/public/_headers` enables immutable caching for hashed assets, daily revalidation
for audio, and fresh HTML/service-worker checks. Pages serves the SPA fallback.

`vercel.json` disables automatic Git deployments to Vercel. Existing Vercel
releases are retained; Cloudflare is the production URL for new releases.

## Manual releases

After authenticating Wrangler to the same account:

```sh
pnpm run build
wrangler pages deploy apps/web/dist --project-name=zerotobeyond --branch=main
```

## Troubleshooting

Check the [GitHub Actions run](https://github.com/asifhasan973/zerotobeyond/actions/workflows/deploy.yml).
Authentication errors require checking the dedicated token's permissions and
account scope. Install/build failures happen before publication, leaving the
current Cloudflare release available.

## Space tutor API

`functions/api/tutor.ts` is the Cloudflare Pages endpoint for `/api/tutor`. Add `GEMINI_API_KEY` as an encrypted Pages environment secret before deploying this feature. Optional `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite`. Never use a `VITE_` prefix for either setting.

Local Vite development reads the same server-only settings from the ignored root `.env.local`. Questions and a bounded text excerpt of the current page are sent to Gemini; chat history stays in memory and is cleared on reload. The model receives project guidance and NASA references, not custom model training. Request size, response size, timeout and per-instance request limits are bounded. Provider/account quotas remain the authoritative global usage limit.
