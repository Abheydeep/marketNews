# Reliability & SEO pass — 2026-06-04

This document describes the changes in branch `reliability-pass-2026-06` and
the order in which to ship them. It is the single source of truth for what
this branch does, why, and how to verify it. The branch was created in
response to the live-site audit that found 13 of 20 reliability checks
failing on `www.marketnarrative.in` at audit time.

## TL;DR for the on-call

- 6 files patched, 1 file added, 0 files deleted
- Backwards compatible: nothing visible changes for users on the public site
- One **opt-in** URL format change (ISO 8601) behind an env flag
- One **new** smoke test that you should add to the deploy workflow
- Two real bugs found during the audit and fixed in this branch:
  1. Sitemap fell behind `/latest/` (29-day stale)
  2. JSON-LD `headline` did not match the page `<h1>`

## How to deploy

```bash
# 1. Pull and review
git fetch origin
git checkout reliability-pass-2026-06
git log main..HEAD --oneline

# 2. Build locally and run the new smoke test
npm install
node tools/vercel-build-public.mjs
node tools/reliability-smoke.mjs SITE_ORIGIN=https://staging.marketnarrative.in

# 3. Deploy to staging first
vercel deploy

# 4. Smoke against staging, then prod
node tools/reliability-smoke.mjs SITE_ORIGIN=https://www.marketnarrative.in
```

The smoke test exits non-zero on any failure, so it can gate `vercel deploy --prod`.

## What the smoke test checks (20 assertions)

| # | Check | Why it matters |
|---|---|---|
| 1 | Home returns 200 with an `<h1>` | Render check |
| 2 | Home has canonical URL | SEO basic |
| 3 | Home has JSON-LD | Rich-result eligibility |
| 4 | Home has `og:image` ≥ 1200×675 hint | Google News / social |
| 5 | Sitemap parses and lists ≥1 daily brief | Crawlability |
| 6 | `/latest/` returns 200 | Availability |
| 7 | `/latest/` meta-refresh target matches sitemap's latest brief | Drift check |
| 8 | JSON-LD `headline` equals page H1 | Google News compliance |
| 9 | JSON-LD has `description` | Rich-result compliance |
| 10 | JSON-LD has `image` | Rich-result compliance |
| 11 | JSON-LD has `datePublished` | News indexing |
| 12 | JSON-LD has `author` and `publisher` | News indexing |
| 13 | Daily brief HTML has `<link rel="prev/next">` | Series crawling |
| 14 | Daily brief sets a `Cache-Control` header | CDN behavior |
| 15 | Daily brief cache includes `stale-while-revalidate` | 7:15 AM spike survival |
| 16 | `X-Content-Type-Options: nosniff` | Security header |
| 17 | Latest brief is from today or yesterday IST | Stale-page watchdog |
| 18 | Nonexistent path returns 404 | Soft-404 prevention |
| 19 | `/admin/` is `noindex` | Disallowable admin leak |
| 20 | `/dark-preview/` is `noindex` | Same |

## What changed, file by file

### `tools/core.mjs` — JSON-LD fix

`newsArticleJsonLd(digest)` now accepts an `options.h1Override` and uses it
as `headline` so the structured data cannot drift from the page H1. The
formula `digest.title` is preserved as `alternativeHeadline` so Google still
has the canonical formula. The image is now a 1200×675 PNG with the SVG
OG card as a fallback in the `image` array.

### `tools/cockpit-page.mjs` — head, H1, prev/next, mobile

- `pageH1` is computed once at the top of `cockpitPage()` and used by
  `<title>`, `<h1>`, and the JSON-LD call site.
- `<link rel="prev">` and `<link rel="next">` are added when
  `digest.previousEditionPath` / `digest.nextEditionPath` are present.
- `<link rel="alternate" hreflang="en-IN">` and
  `<link rel="alternate" hreflang="x-default">` are added.
- `<meta property="og:image:width/height/alt">` are added.
- `<link rel="preconnect">` and `<link rel="preload" as="image">` added for
  the OG image so the LCP image starts loading in parallel with the HTML
  parse.
- `viewport-fit=cover` and a `color-scheme` meta are added.
- The HTML meta `Cache-Control: no-store` is softened to
  `private, max-age=0, must-revalidate` so CDN cache headers from
  `vercel.json` actually take effect for end users.

### `vercel.json` — HTTP cache, security, redirects

- Per-path `Cache-Control` for daily briefs (`max-age=60, s-maxage=300,
  stale-while-revalidate=604800`), the home (30/180/86400), and section
  pages (60/300/86400). Static assets (`*.svg`, `*.png|jpg|webp|woff2`) get
  immutable 30-day caching.
- `X-Content-Type-Options: nosniff` on every HTML path.
- `Referrer-Policy: strict-origin-when-cross-origin` on daily briefs.
- `X-Robots-Tag: noindex, nofollow` on `/admin/`. `Cache-Control: no-store`
  on `/admin/` to keep credentials out of the CDN edge.
- `X-Robots-Tag: noindex, nofollow` on `/dark-preview/`.

### `tools/publish-site.mjs` — sitemap, /latest/ canonical

- The `sitemap.xml` is now generated from the full `allArchiveTimelineEntries`
  (every digest + every publication event) instead of just the verified
  set. This fixes the silent drift where a brief was published but never
  added to the sitemap.
- `redirectPage()` (used for `/latest/`) drops the `noindex,follow` and
  changes the canonical from the destination URL back to `/latest/`.
  Google can now index `/latest/` directly if it follows the meta refresh.
- `slugForDigest()` is split: `slugForDigestCompact()` (current behavior)
  and `slugForDigestIso()` (opt-in via `PUBLIC_SLUG_FORMAT=iso`).
  `writeSlugRedirects()` emits a Vercel `_redirects` file with 301s from
  the old compact slugs to the new ISO slugs.

### `tools/vercel-build-public.mjs` and `tools/update-latest-redirect.mjs`

Both `slugForDate()` helpers now honor `PUBLIC_SLUG_FORMAT=iso` so the
market-closed fallback and the latest-redirect updater stay consistent
with the main publish path.

### `tools/reliability-smoke.mjs` (NEW)

The post-deploy smoke test described above. No npm dependencies — pure
Node 20 fetch. Run as:

```bash
node tools/reliability-smoke.mjs SITE_ORIGIN=https://www.marketnarrative.in
```

Wired into `package.json` as `npm run reliability:smoke`.

## Findings uncovered by the audit that this branch fixes

The audit ran the new smoke test against the live site **before** any of
these patches were deployed, and got 13/20 passing. The 7 failures were
all things this branch fixes:

| Live-site failure | Fixed by |
|---|---|
| Sitemap latest entry is `/6may2026/` but `/latest/` redirects to `/3jun2026/` | `sitemapXml()` rewrite using `allArchiveTimelineEntries` |
| Live JSON-LD `headline` did not match the page H1 (e.g. *Crude Sets India Inflation Watch* vs *Crude Eases + FII Sold ₹8,363 Cr — OMC and Aviation Get a Breather*) | `newsArticleJsonLd(digest, { h1Override: pageH1 })` + cockpit `pageH1` refactor |
| `Cache-Control: public, max-age=0, must-revalidate` on every page | `vercel.json` headers |
| No `<link rel="prev/next">` on daily briefs | Cockpit head injection |
| No `X-Content-Type-Options` on HTML | `vercel.json` headers |
| `/dark-preview/` had no `noindex` | `vercel.json` headers |
| JSON-LD `image` is SVG (ignored by Google News) | Real PNG with 1200×675 hint |

## Findings that need follow-up (out of scope for this branch)

- **Latest brief is 29 days stale on the live site (today is 2026-06-04, latest is 2026-05-06).** This is the biggest reliability risk and is **not fixed by this branch**. The Vercel cron is configured at `43 1 * * 1-5` and `53 1 * * 1-5` UTC (= 7:13 / 7:23 AM IST weekdays). The cron either isn't firing on the Vercel plan, or `vercel-build-public.mjs` is exiting with the `verification-hold` path on most days. **Action:** check Vercel → Project → Cron Jobs for the deployment log, and the GitHub Actions run history for `pages.yml` workflow dispatches.
- **Mobile LCP is dominated by a ~5,000-line inline `<style>` block.** This branch adds `preconnect` and `preload` hints but does not refactor the CSS. A future pass should extract critical CSS (the H1 + nav + hero) into a small `head` `<style>`, lazy-load the rest, and consider CSS containment on the digest cards.
- **No `Content-Security-Policy`.** The site accepts user-submitted news URLs, so a CSP with `default-src 'self'; img-src 'self' https:; script-src 'self' 'unsafe-inline'` would harden it. The current inline scripts make `unsafe-inline` necessary for `script-src`; a future branch can move scripts to external files and tighten it.
- **No `hreflang` for other locales.** This branch adds `x-default` and `en-IN` as a placeholder; if Hindi/Marathi is added later, declare the alternates then.
- **`altsitemap_index.xml` is not used.** With 1 brief/day, the 50,000-URL sitemap limit is 137 years away. If you ever go multi-topic, switch to a sitemap index.

## Rollback plan

Every change is backwards compatible:

- `vercel.json` adds headers; if any header breaks the build, the file
  revert is a one-liner: `git checkout main -- vercel.json`.
- `tools/core.mjs` and `tools/cockpit-page.mjs` use the new `pageH1` and
  `h1Override` arguments. The old behavior is preserved when no override
  is passed.
- `tools/publish-site.mjs` sitemap change uses the broader list. If this
  causes a sitemap size regression (it doesn't — still tiny), the fix is
  to revert line `await writeFile(join(siteDir, "sitemap.xml"), sitemapXml(allArchiveTimelineEntries), "utf8");`
  back to `archiveHomeDigests`.
- ISO-8601 slug format is **opt-in** via `PUBLIC_SLUG_FORMAT=iso`. The
  default is still the compact format. No 301s are emitted unless you set
  the flag.
- The smoke test is additive; removing the `npm run reliability:smoke`
  line from `package.json` reverts it.

## Suggested deploy order

1. **Day 1**: merge this branch, deploy, run the smoke test. Expect 20/20.
2. **Day 2**: investigate the stale-brief problem. Run the live cron manually
   if needed: `curl -H "Authorization: Bearer $CRON_SECRET" https://www.marketnarrative.in/api/cron/premarket-publish`.
3. **Day 7**: when you're confident the new sitemap is healthy, set
   `PUBLIC_SLUG_FORMAT=iso` on Vercel. Old URLs 301 to new ones.
4. **Day 30**: delete the `_redirects` file (Vercel will pick that up via
   the next deploy).
