# Hosting

The current ready-to-host output is a static website.

## Generate Today's 8:30 Summary

```bash
npm run daily:generate -- --date 2026-04-29 --scheduled-time 08:30
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

Not yet. The current implementation uses mock seed data, then exports a static HTML page.

To make it change daily:

1. Replace mock adapters with real market/news APIs.
2. Run `npm run daily:generate` every weekday at 8:30 AM IST.
3. Run `npm run site:publish` after generation.
4. Deploy the updated `out/site/` folder to the host.

To make it change intraday as indices/stocks move:

1. Add a live data feed such as Kite Connect, Yahoo Finance polling, or another licensed data provider.
2. Store fresh quotes in the backend.
3. Re-render or hydrate the frontend from an API.
4. Use WebSockets or periodic refresh for live updates.

For the resume MVP, daily 8:30 regeneration is the clean first production milestone. Live market updates should be phase two because they require API credentials, rate-limit handling, and market-data licensing decisions.
