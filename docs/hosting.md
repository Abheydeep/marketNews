# Hosting

The current ready-to-host output is a static website.

## Generate Today's 8:30 Summary

```bash
npm run daily:generate -- --date 2026-04-29 --scheduled-time 08:30
```

For hosted market snapshots from Yahoo Finance, run:

```bash
npm run daily:generate -- --date 2026-04-29 --scheduled-time 08:30 --market-data live
```

## Prepare Static Site Folder

```bash
npm run site:publish -- --date 2026-04-29 --scheduled-time 08:30
```

This creates:

- `out/site/index.html`
- `out/site/digest.json`

Upload `out/site/` to any static host:

- Netlify drag-and-drop
- Vercel static project
- GitHub Pages
- AWS S3 + CloudFront
- Cloudflare Pages

## Will It Change Automatically?

On GitHub Pages, yes, within the limits of a static host. The workflow republishes `out/site` every 5 minutes across weekday Indian and US market windows. The page also checks `digest.json` every minute, so visitors see the newest published quote file without a manual refresh. Local dated `file://` previews check the public GitHub Pages digest first before falling back to the local JSON file.

The quote snapshots and chart series are fetched server-side by GitHub Actions. The browser does not fake ticks. Clicking an index opens a first-party canvas preview from the captured series and links to TradingView for the external interactive chart.

To make it change daily:

1. Run `npm run daily:generate -- --market-data live` every weekday at 8:30 AM IST.
3. Run `npm run site:publish` after generation.
4. Deploy the updated `out/site/` folder to the host.

To make it tick-by-tick as indices/stocks move:

1. Add an always-on backend with a licensed live data feed such as Kite Connect or another market data provider.
2. Store fresh quotes in the backend.
3. Re-render or hydrate the frontend from an API.
4. Use WebSockets or periodic refresh for live updates.

For the resume MVP, the GitHub Pages version is near-real-time through scheduled republishes. True tick-by-tick updates should be phase two because they require API credentials, rate-limit handling, and market-data licensing decisions.
