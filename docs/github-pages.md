# GitHub Pages Hosting

This repo is configured to publish the Market Narrative static site through GitHub Pages.

## What Happens on GitHub

The workflow in `.github/workflows/pages.yml`:

1. Runs on every push to `main`.
2. Runs every 15 minutes across weekday Indian and US market windows, including 08:30 IST.
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

## Data Behavior

The hosted page updates when the GitHub Action runs. The workflow uses `--market-data live`, so index values are server-side snapshots from Yahoo Finance rather than browser-generated ticks. The page checks `digest.json` every minute and updates when GitHub Pages has a newer published file.

Clicking an index opens a TradingView chart, so the detailed chart is real market data rather than a local canvas mock.
