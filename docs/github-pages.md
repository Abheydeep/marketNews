# GitHub Pages Hosting

This repo is configured to publish the Market Narrative static site through GitHub Pages.

## What Happens on GitHub

The workflow in `.github/workflows/pages.yml`:

1. Runs on every push to `main`.
2. Runs every 5 minutes across weekday Indian and US market windows, including 08:30 IST.
3. Fetches live Yahoo Finance market snapshots, generates the daily summary, and runs tests.
4. Publishes `out/site` to GitHub Pages.

## First-Time GitHub Setup

1. Create an empty GitHub repository.
2. Push this local repo to GitHub.
3. In GitHub, open the repository settings.
4. Go to **Pages**.
5. Under **Build and deployment**, choose **GitHub Actions**.
6. Open the **Actions** tab and run `Publish Market Narrative Site`, or push to `main`.

The public URL will look like:

```text
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

## Article Polishing Secrets

The briefing generator can write without an LLM key, but article-card polishing needs one model provider secret.

Add any one of these under **Settings → Secrets and variables → Actions → New repository secret**:

- `OPENAI_API_KEY` for OpenAI polishing.
- `ANTHROPIC_API_KEY` for Anthropic polishing.
- `NVIDIA_API_KEY` for NVIDIA/OpenAI-compatible desk-agent polishing.
- `GEMINI_API_KEY` for Gemini polishing.

Provider priority is Anthropic, then OpenAI, then NVIDIA, then Gemini. To choose a specific NVIDIA model, add `NVIDIA_MODEL`; otherwise the generator uses `meta/llama-4-maverick-17b-128e-instruct`. To choose a specific Gemini model, add `GEMINI_MODEL`; otherwise the generator uses `gemini-flash-latest`.

When `NVIDIA_API_KEY` is present, the article-card enricher runs in desk-agent mode: it sees prior India angles from earlier source cards and uses the editorial guardrails as reasoning context, while the deterministic source filters and public-copy QA remain the publish fallback and safety net.

The scheduled Pages workflow passes these secrets only to the `daily:generate` step. The static publisher and public pages never receive or expose provider keys. Add the same key to Vercel project environment variables if Vercel is generating fresh public artifacts instead of publishing checked-in archives.

## Data Behavior

The hosted page updates when the GitHub Action runs. The workflow uses `--market-data live`, so index values are server-side snapshots from Yahoo Finance rather than browser-generated ticks. The page checks `digest.json` every minute and updates when GitHub Pages has a newer published file. Local `file://` previews with a canonical dated path also check the public GitHub Pages digest first, so a local reload does not stay pinned to an old generated file.

Clicking an index opens a first-party canvas chart from the captured price series. The modal also links to the matching TradingView chart for the external interactive view.

## Public Copy Gate

Release branches cannot bypass the public-copy gate. Run `npm test`, `npm run test:deploy`, and `npm run public:copy:qa` before publishing. The local pre-push hook runs the guard automatically after `npm run hooks:install`; GitHub Actions repeats the same checks on PRs and `main` pushes.

## Multibagger Tracker

The static export also publishes the public 5x model tracker at:

```text
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/multibagger/
```

The public tracker uses public model data only: the April 27, 2026 model entry date, target weights, reference entry prices, latest server quote snapshots, public model actions, published monthly review decisions, risks, watchlist context, and source links. Admin-only review controls live at `/admin/multibagger/` and are protected by the same static demo login gate as the rest of the admin studio. In production, the Spring backend endpoints under `/api/admin/multibagger/**` should handle account image uploads and monthly review generation; uploaded images must not be copied into `out/site`.
