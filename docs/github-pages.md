# GitHub Pages Hosting

This repo is configured to publish the Market Narrative static site through GitHub Pages.

## What Happens on GitHub

The workflow in `.github/workflows/pages.yml`:

1. Runs on every push to `main`.
2. Runs every weekday at 08:30 IST.
3. Generates the daily summary.
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

The hosted page updates when the GitHub Action runs. Right now the generator uses mock seed data. To make the hosted page track real market movement, replace the mock adapters with real APIs and keep the same scheduled workflow.
