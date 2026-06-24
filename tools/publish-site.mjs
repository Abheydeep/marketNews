import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brandFaviconSvg, brandHeadLinks, brandMarkCss, brandMarkHtml, brandSocialCardSvg } from "./brand-assets.mjs";
import { cockpitPage, homepageHeroContent } from "./cockpit-page.mjs";
import { articleLeadId, dailyLeadForDigest, publicSourceSelectionForDigest } from "./core.mjs";
import { assertPublicBriefingCopy, sanitizeLegacyPublicBriefingCopy } from "./editorial-guardrails.mjs";
import { marketCalendarState } from "./market-calendar.mjs";
import { publicSnapshotSourceLabel } from "./market-snapshot-labels.mjs";
import { multibaggerStateWithMarketQuotes } from "./multibagger-data.mjs";
import { bottomTabBarCss, bottomTabBarHtml, mobileShellScript, mobileTypographyCss, proPolishCss } from "./mobile-shell.mjs";
import { multibaggerPage } from "./multibagger-page.mjs";
import { articleLooksMarketRelevant, assertSourceVerification, sourceUrlLooksArticleLevel, verifySourceArticles } from "./news-sources.mjs";
import { publicDigestPayload, redactedDigestPayload } from "./public-payload.mjs";
import { log } from "./logger.mjs";
const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const date = readArg("--date") ?? todayInIst();
const scheduledTime = readArg("--scheduled-time") ?? "07:15";
const label = scheduledTime.replace(":", "");
const dailyDir = join(rootDir, "out", "daily");
const archiveDir = join(rootDir, "archive", "daily");
const archivedMovesDir = join(rootDir, "archive", "moves");
const publicationEventsPath = join(rootDir, "data", "publication-events.json");
const siteDir = join(rootDir, "out", "site");
const sourceJson = join(dailyDir, `${date}-${label}-digest.json`);
const archivedJson = join(archiveDir, `${date}-${label}-digest.json`);
const siteOrigin = process.env.PUBLIC_SITE_ORIGIN ?? "https://marketnarrative.in";
const adminSiteOrigin = process.env.ADMIN_SITE_ORIGIN ?? "https://admin.marketnarrative.in";
const subscribeEmail = process.env.PUBLIC_SUBSCRIBE_EMAIL ?? "abhey@marketnarrative.in";
const contactEmail = process.env.PUBLIC_CONTACT_EMAIL ?? subscribeEmail;
const subscribeUrl = (process.env.PUBLIC_SUBSCRIBE_URL ?? "").trim() || "/subscribe/";
const subscribeFormAction = (process.env.PUBLIC_SUBSCRIBE_FORM_ACTION ?? "").trim() || `https://formsubmit.co/${subscribeEmail}`;
const skipArchiveWrite = process.env.SKIP_ARCHIVE_WRITE === "true";
const includeSourceDigestPreview = skipArchiveWrite && process.env.LOCAL_PREVIEW_DIGEST === "true";
const publicBuildDate = process.env.PUBLIC_BUILD_DATE ?? todayInIst();
const publicLatestStatus = process.env.PUBLIC_LATEST_STATUS ?? "";
let sourceDigestLoadedFromArchive = false;
await mkdir(archiveDir, { recursive: true });
const sourceDigest = await loadSourceDigest();
const existingDigests = await loadArchivedDigests();
if (!skipArchiveWrite && !sourceDigestLoadedFromArchive) {
  const sourceVerification = publicArchiveVerificationForDigest(
    sourceDigest,
    assertNewDigestSourceIntegrity(sourceDigest, previousDigestFor(sourceDigest, existingDigests))
  );
  const archivedDigest = redactedDigestPayload(sourceVerification
    ? { ...sourceDigest, sourceVerification }
    : sourceDigest);
  await writeGuardedFile(archivedJson, `${JSON.stringify(archivedDigest, null, 2)}\n`);
}
function publicArchiveVerificationForDigest(digest, verification) {
  if (!verification) {
    return verification;
  }
  const calendar = marketCalendarState(digest.digestDate);
  if (calendar.isTradingSession) {
    return verification;
  }
  return {
    ...verification,
    isVerifiedForPublicArchive: false
  };
}
const digests = (await loadArchivedDigests()).map(enrichPublicDigest);
if (!digests.length) {
  throw new Error("No archived digests are available to publish");
}
const publicArchiveDigests = digests.filter(isVerifiedPublicDigest);
const publicationEvents = await loadPublicationEvents();
const weekdayDigests = digests.filter(isWeekdayDigest);
const sourcePreviewDigests = includeSourceDigestPreview && !sourceDigestLoadedFromArchive ? [sourceDigest] : [];
const archiveHomeDigests = sourcePreviewDigests.length ? sourcePreviewDigests : publicArchiveDigests.length ? publicArchiveDigests : weekdayDigests.slice(0, 1);
if (!archiveHomeDigests.length) {
  throw new Error("No weekday archived digests are available to publish");
}
const archiveTimelineEntries = sortArchiveEntries([...archiveHomeDigests, ...publicationEvents]);
const allArchiveTimelineEntries = sortArchiveEntries([...digests, ...publicationEvents]);

await rm(siteDir, { recursive: true, force: true });
await mkdir(siteDir, { recursive: true });
await writeFile(join(siteDir, ".nojekyll"), "", "utf8");
await writeFile(join(siteDir, "favicon.ico"), "", "utf8");
await writeFile(join(siteDir, "favicon.svg"), brandFaviconSvg(), "utf8");
await writeFile(join(siteDir, "apple-touch-icon.svg"), brandFaviconSvg(), "utf8");
await writeFile(join(siteDir, "og-card.svg"), ogCardSvg(), "utf8");
await writeFile(join(siteDir, "sw.js"), serviceWorkerJs(), "utf8");
await cp(join(rootDir, "out", "vercel", "assets"), join(siteDir, "assets"), { recursive: true, force: true }).catch((error) => { if (error.code !== "ENOENT") throw error; });

for (const digest of digests) {
  const slug = slugForDigest(digest);
  const digestDir = join(siteDir, slug);
  const tradingGuideDir = join(digestDir, "trading-guide");
  const related = relatedVerifiedEditions(digest, publicArchiveDigests);
  const pageDigest = {
    ...digest,
    canonicalPath: `/${slug}/`,
    ...related
  };
  const tradingGuideDigest = {
    ...pageDigest,
    canonicalPath: `/${slug}/trading-guide/`
  };
  await mkdir(digestDir, { recursive: true });
  await writeGuardedFile(
    join(digestDir, "index.html"),
    cockpitPage(pageDigest, "public-view", { includeStudio: false, theme: "glass-v2", multibaggerHref: "/multibagger/" })
  );
  await mkdir(tradingGuideDir, { recursive: true });
  await writeGuardedFile(
    join(tradingGuideDir, "index.html"),
    cockpitPage(tradingGuideDigest, "trading-guide-view", { includeStudio: false, theme: "glass-v2", multibaggerHref: "/multibagger/" })
  );
  await writeGuardedFile(
    join(digestDir, "digest.json"),
    `${JSON.stringify(publicDigestPayload(pageDigest), null, 2)}\n`
  );
}

const latest = archiveHomeDigests[0];
await writeLatestRedirects(latest);
for (const event of publicationEvents) {
  const slug = slugForDigest(event);
  const eventDir = join(siteDir, slug);
  const eventGuideDir = join(eventDir, "trading-guide");
  await mkdir(eventGuideDir, { recursive: true });
  await writeGuardedFile(join(eventDir, "index.html"), publicationEventPage(event, latest, false));
  await writeGuardedFile(join(eventGuideDir, "index.html"), publicationEventPage(event, latest, true));
}
const publicMultibaggerState = await multibaggerStateWithMarketQuotes();
const adminDigest = {
  ...sourceDigest,
  canonicalPath: "/"
};
const darkPreviewDir = join(siteDir, "dark-preview");
const adminDir = join(siteDir, "admin");
const multibaggerDir = join(siteDir, "multibagger");
const aboutDir = join(siteDir, "about");
const subscribeDir = join(siteDir, "subscribe");
const indicesDir = join(siteDir, "indices");
const moneyFlowDir = join(siteDir, "money-flow", "fii-dii");
const marketStatsDir = join(siteDir, "market-statistics");
const movesDir = join(siteDir, "moves");
const contactDir = join(siteDir, "contact");
const privacyDir = join(siteDir, "privacy");
const termsDir = join(siteDir, "terms");
await mkdir(darkPreviewDir, { recursive: true });
await writeGuardedFile(
  join(darkPreviewDir, "index.html"),
  cockpitPage({ ...latest, canonicalPath: "/dark-preview/" }, "public-view", { includeStudio: false, theme: "glass-v2", multibaggerHref: "/multibagger/" })
);
await writeGuardedFile(join(darkPreviewDir, "digest.json"), `${JSON.stringify(publicDigestPayload(latest), null, 2)}\n`);
await mkdir(multibaggerDir, { recursive: true });
await writeGuardedFile(
  join(multibaggerDir, "index.html"),
  multibaggerPage(publicMultibaggerState, { latestBriefingPath: "/latest/" })
);
await writeGuardedFile(join(multibaggerDir, "state.json"), `${JSON.stringify(publicMultibaggerState, null, 2)}\n`);
await mkdir(aboutDir, { recursive: true });
await writeGuardedFile(join(aboutDir, "index.html"), aboutPage(latest, publicArchiveDigests.length ? publicArchiveDigests : archiveHomeDigests));
await mkdir(subscribeDir, { recursive: true });
await writeGuardedFile(join(subscribeDir, "index.html"), subscribePage());
await mkdir(indicesDir, { recursive: true });
await writeGuardedFile(join(indicesDir, "index.html"), indicesPage(latest));
await mkdir(moneyFlowDir, { recursive: true });
await writeGuardedFile(join(moneyFlowDir, "index.html"), moneyFlowPage(latest));
await mkdir(marketStatsDir, { recursive: true });
await writeGuardedFile(join(marketStatsDir, "index.html"), marketStatisticsPage(latest));
await mkdir(movesDir, { recursive: true });
await writeGuardedFile(join(movesDir, "index.html"), movesHubPage(latest));
await cp(archivedMovesDir, movesDir, { recursive: true, force: true }).catch((error) => { if (error.code !== "ENOENT") throw error; });
await mkdir(contactDir, { recursive: true });
await writeGuardedFile(join(contactDir, "index.html"), contactPage());
await mkdir(privacyDir, { recursive: true });
await writeGuardedFile(join(privacyDir, "index.html"), privacyPage());
await mkdir(termsDir, { recursive: true });
await writeGuardedFile(join(termsDir, "index.html"), termsPage());

await mkdir(join(adminDir, "components"), { recursive: true });
await mkdir(join(adminDir, "multibagger"), { recursive: true });
await writeFile(
  join(adminDir, "index.html"),
  cockpitPage(adminDigest, "studio-view", {
    includeStudio: true,
    theme: "glass-v2",
    requireAuth: true,
    multibaggerState: publicMultibaggerState,
    siteOrigin: adminSiteOrigin
  }),
  "utf8"
);
await writeFile(join(adminDir, "favicon.ico"), "", "utf8");
await writeFile(join(adminDir, "favicon.svg"), brandFaviconSvg(), "utf8");
await writeFile(join(adminDir, "apple-touch-icon.svg"), brandFaviconSvg(), "utf8");
await writeFile(join(adminDir, "digest.json"), `${JSON.stringify(publicDigestPayload(latest), null, 2)}\n`, "utf8");
await writeFile(
  join(adminDir, "components", "index.html"),
  cockpitPage(adminDigest, "components-view", {
    includeStudio: true,
    theme: "glass-v2",
    requireAuth: true,
    multibaggerState: publicMultibaggerState,
    siteOrigin: adminSiteOrigin
  }),
  "utf8"
);
await writeFile(
  join(adminDir, "multibagger", "index.html"),
  cockpitPage(adminDigest, "multibagger-admin-view", {
    includeStudio: true,
    theme: "glass-v2",
    requireAuth: true,
    multibaggerState: publicMultibaggerState,
    siteOrigin: adminSiteOrigin
  }),
  "utf8"
);
await writeGuardedFile(join(siteDir, "index.html"), archivePage(archiveTimelineEntries, allArchiveTimelineEntries, latest));
await writeFile(join(siteDir, "404.html"), notFoundPage(), "utf8");
await writeGuardedFile(join(siteDir, "digest.json"), `${JSON.stringify(publicDigestPayload(latest), null, 2)}\n`);
await writeGuardedFile(
  join(siteDir, "archive.json"),
  `${JSON.stringify({
    digests: archiveHomeDigests.map(redactedDigestPayload),
    publicationEvents: publicationEvents.map(publicationEventPayload)
  }, null, 2)}\n`
);
await writeFile(join(siteDir, "robots.txt"), robotsTxt(), "utf8");
await writeFile(join(siteDir, "sitemap.xml"), sitemapXml(allArchiveTimelineEntries), "utf8");
await writeFile(
  join(siteDir, "README.txt"),
  [
    "Market Narrative static site export",
    `Latest source date: ${latest.digestDate}`,
    `Latest run label: ${(latest.scheduledFor ?? "").slice(11, 16).replace(":", "") || label}`,
    `Latest daily page: ${slugForDigest(latest)}/`,
    "Root index.html is the digest archive, not a single daily briefing.",
    ""
  ].join("\n"),
  "utf8"
);

log.info("static site published", { siteDir, archiveEntry: join(siteDir, "index.html"), latestPage: join(siteDir, slugForDigest(latest), "index.html"), digestDate: latest.digestDate });

await writeSlugRedirects(digests);

async function writeGuardedFile(path, contents) {
  assertPublicBriefingCopy(path, contents);
  await writeFile(path, contents, "utf8");
}

async function writeLatestRedirects(latestDigest) {
  const latestSlug = slugForDigest(latestDigest);
  const latestDir = join(siteDir, "latest");
  const latestGuideDir = join(latestDir, "trading-guide");
  await mkdir(latestGuideDir, { recursive: true });
  await writeGuardedFile(join(latestDir, "index.html"), redirectPage(`/${latestSlug}/`, "latest briefing"));
  await writeGuardedFile(join(latestGuideDir, "index.html"), redirectPage(`/${latestSlug}/trading-guide/`, "latest trading guide"));
}

function serviceWorkerJs() {
  return [
    "self.addEventListener('install', (event) => {",
    "  self.skipWaiting();",
    "});",
    "self.addEventListener('activate', (event) => {",
    "  event.waitUntil(self.clients.claim());",
    "});",
    ""
  ].join("\n");
}

function redirectPage(targetHref, label) {
  // The canonical stays on /latest/ — search engines that resolve the meta-refresh
  // will treat the destination as a duplicate, not the canonical. The previous
  // implementation pointed canonical at the destination and added noindex, which
  // leaked link equity and made /latest/ unindexable.
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ${brandHeadLinks(siteOrigin)}
  <meta name="robots" content="index,follow">
  <meta http-equiv="refresh" content="0; url=${escapeHtml(targetHref)}">
  <link rel="canonical" href="${escapeHtml(siteOrigin)}/${label === "latest trading guide" ? "latest/trading-guide/" : "latest/"}">
  <title>Market Narrative ${escapeHtml(label)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{height:100%;overflow-x:hidden;background:#050816;color:#f8fafc;font-family:system-ui,sans-serif}
    body{display:flex;align-items:center;justify-content:center;min-height:100vh}
    .redir{text-align:center;padding:24px}
    .redir p{color:#b8c4d8;font-size:.9rem;margin-top:8px}
    .redir a{color:#60a5fa;text-decoration:none;font-size:.85rem;display:block;margin-top:16px}
    ${bottomTabBarCss()}
    ${mobileTypographyCss()}
    ${proPolishCss()}
  </style>
  <script>location.replace(${JSON.stringify(targetHref)});</script>
</head>
<body class="has-btb">
  <div class="redir">
    <p>Redirecting…</p>
    <p>Educational market research only; not SEBI-registered investment advice.</p>
    <a href="${escapeHtml(targetHref)}">Open ${escapeHtml(label)}</a>
  </div>
  ${bottomTabBarHtml(label === "latest trading guide" ? "guide" : "latest")}
  ${mobileShellScript()}
</body>
</html>`;
}

function notFoundPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ${brandHeadLinks(siteOrigin)}
  <meta name="robots" content="noindex,follow">
  <title>Page Not Found | Market Narrative</title>
</head>
<body>
  <main>
    <h1>Market Narrative</h1>
    <p>This briefing page is not available. Open the latest Nifty and Bank Nifty pre-market briefing instead.</p>
    <a href="/latest/">Open latest briefing</a>
  </main>
</body>
</html>`;
}

function publicationEventPage(event, latest, isTradingGuide) {
  const slug = slugForDigest(event);
  const latestSlug = slugForDigest(latest);
  const canonicalPath = isTradingGuide ? `/${slug}/trading-guide/` : `/${slug}/`;
  const latestHref = isTradingGuide ? `/${latestSlug}/trading-guide/` : `/${latestSlug}/`;
  const pageTitle = isBackfilledEvent(event)
    ? `${event.title} | Market Narrative`
    : `${formatDigestDate(event.digestDate)} publication record | Market Narrative`;
  const pageDescription = event.dailyLead?.headline ?? event.title ?? `Archived pre-market briefing for ${formatDigestDate(event.digestDate)}.`;
  const heading = isTradingGuide
    ? `No live trading guide was archived for ${formatDigestDate(event.digestDate)}.`
    : isBackfilledEvent(event)
      ? event.title
      : `No public briefing was archived for ${formatDigestDate(event.digestDate)}.`;
  const artifactName = isTradingGuide ? "trading guide" : "pre-market briefing";
  const contextLines = event.publicationEvent.contextLines ?? [];
  const sources = event.publicationEvent.sources ?? [];
  const watchItems = event.publicationEvent.watchItems ?? event.watchItems ?? [];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ${brandHeadLinks(siteOrigin)}
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta name="twitter:description" content="${escapeHtml(pageDescription)}">
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="${escapeHtml(siteOrigin)}${escapeHtml(canonicalPath)}">
  <title>${escapeHtml(pageTitle)}</title>
  <style>
    body { margin: 0; min-height: 100vh; font-family: Inter, Arial, sans-serif; color: #111827; background: #f8fafc; }
    main { max-width: 760px; margin: 0 auto; padding: 72px 24px; }
    .eyebrow { color: #b45309; font-size: 13px; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; }
    h1 { font-size: clamp(36px, 6vw, 58px); line-height: 1.08; margin: 12px 0 20px; letter-spacing: 0; }
    p { color: #374151; font-size: 18px; line-height: 1.68; margin: 0 0 18px; }
    .panel { border: 1px solid #e5e7eb; border-radius: 14px; background: #ffffff; display: grid; gap: 10px; margin: 26px 0; padding: 18px; }
    .panel span { color: #6b7280; font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
    .panel strong { color: #111827; font-size: 18px; line-height: 1.45; }
    .grid { display: grid; gap: 14px; margin: 22px 0; }
    .source-card { border: 1px solid #e5e7eb; border-radius: 14px; background: #ffffff; padding: 16px; }
    .source-card span, .section-label { color: #6b7280; display: block; font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
    .source-card h2 { color: #111827; font-size: 20px; line-height: 1.3; margin: 8px 0; }
    .source-card p, li { color: #374151; font-size: 16px; line-height: 1.58; }
    ul { padding-left: 22px; }
    a { display: inline-block; margin: 8px 12px 0 0; color: #ffffff; background: #111827; padding: 12px 16px; border-radius: 8px; text-decoration: none; font-weight: 850; }
    .source-card a { color: #0f766e; background: transparent; margin: 0; padding: 0; border-radius: 0; }
    a.secondary { color: #111827; background: #e5e7eb; }
    .disclaimer { color: #6b7280; font-size: 14px; margin-top: 26px; }
  </style>
</head>
<body>
  <main>
    <div class="eyebrow">${escapeHtml(event.publicationEvent.label)}</div>
    <h1>${escapeHtml(heading)}</h1>
    <p>This trading-day slot is preserved in the archive so the public record does not skip the date.</p>
    <p>${escapeHtml(event.publicationEvent.summary)}</p>
    <section class="panel" aria-label="Publication record">
      <span>Why there is no ${escapeHtml(artifactName)}</span>
      <strong>${escapeHtml(event.publicationEvent.reason)}</strong>
    </section>
    ${isBackfilledEvent(event) && !isTradingGuide ? `
      <section class="panel" aria-label="Evidence grade">
        <span>Evidence grade</span>
        <strong>${escapeHtml(evidenceGradeLabel(event.publicationEvent.evidenceGrade))}. ${escapeHtml(event.publicationEvent.indiaPublisherCoverage)}</strong>
      </section>
      ${contextLines.length ? `
        <section aria-label="Backfilled context">
          <span class="section-label">Backfilled context</span>
          <ul>
            ${contextLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
          </ul>
        </section>
      ` : ""}
      ${sources.length ? `
        <section class="grid" aria-label="Source cards">
          ${sources.map((source) => `
            <article class="source-card">
              <span>${escapeHtml(source.sourceName || "Source")} · ${escapeHtml(formatGeneratedTime(source.publishedAt))}</span>
              <h2>${escapeHtml(source.headline)}</h2>
              <p><strong>India read:</strong> ${escapeHtml(source.indiaImpact || "Use as global context until Indian breadth confirms.")}</p>
              <p><strong>Watch:</strong> ${escapeHtml(source.watchFor || "Wait for first-range confirmation.")}</p>
              <a href="${escapeHtml(source.sourceUrl)}" target="_blank" rel="noreferrer">Read source</a>
            </article>
          `).join("")}
        </section>
      ` : ""}
      ${watchItems.length ? `
        <section aria-label="What to watch">
          <span class="section-label">What to watch</span>
          <ul>
            ${watchItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </section>
      ` : ""}
    ` : ""}
    ${isTradingGuide ? `
      <section class="panel" aria-label="Trading guide boundary">
        <span>Trading guide boundary</span>
        <strong>This backfill does not recreate entry, stop, target, PCR, OI, or first-range levels. Use it only as historical context.</strong>
      </section>
    ` : ""}
    <p>The latest verified trading-day edition remains ${escapeHtml(formatDigestDate(latest.digestDate))}. Use that only as historical context, not as a reconstructed ${escapeHtml(formatDigestDate(event.digestDate))} market read.</p>
    <a href="${escapeHtml(latestHref)}">${escapeHtml(isTradingGuide ? "Open latest verified trading guide" : "Open latest verified briefing")}</a>
    <a class="secondary" href="/">Open archive</a>
    <p class="disclaimer">Educational market research only. This is not SEBI-registered investment advice, a research recommendation, or a solicitation to buy or sell securities or derivatives. No returns are assured.</p>
  </main>
</body>
</html>`;
}

function absoluteUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${siteOrigin}${path.startsWith("/") ? path : `/${path}`}`;
}

async function loadArchivedDigests() {
  const fileNames = await readdir(archiveDir);
  const digestFiles = fileNames
    .filter((fileName) => /^\d{4}-\d{2}-\d{2}-\d{4}-digest\.json$/.test(fileName))
    .sort();

  const digestsByKey = new Map();
  for (const fileName of digestFiles) {
    const digest = sanitizeLegacyPublicBriefingCopy(JSON.parse(await readFile(join(archiveDir, fileName), "utf8")));
    const key = `${digest.digestDate}-${scheduledLabelForDigest(digest)}`;
    digestsByKey.set(key, digest);
  }
  if (includeSourceDigestPreview && !sourceDigestLoadedFromArchive) {
    digestsByKey.set(`${sourceDigest.digestDate}-${scheduledLabelForDigest(sourceDigest)}`, sourceDigest);
  }

  return [...digestsByKey.values()].sort((left, right) => {
    const leftTime = Date.parse(left.scheduledFor ?? `${left.digestDate}T07:15:00+05:30`);
    const rightTime = Date.parse(right.scheduledFor ?? `${right.digestDate}T07:15:00+05:30`);
    return rightTime - leftTime;
  });
}

async function loadPublicationEvents() {
  try {
    const payload = JSON.parse(await readFile(publicationEventsPath, "utf8"));
    return (Array.isArray(payload.events) ? payload.events : [])
      .map(publicationEventAsArchiveEntry)
      .sort(compareArchiveEntries);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function publicationEventAsArchiveEntry(event) {
  const date = event.date || event.digestDate;
  const sources = (event.sources ?? []).map((source, index) => ({
    publishedAt: source.publishedAt,
    sourceId: `${event.status || "publication-event"}-${index + 1}`,
    sourceName: source.sourceName,
    headline: source.headline,
    summary: source.summary || source.indiaImpact || source.headline,
    takeaway: source.takeaway || source.indiaImpact || source.headline,
    whyItMatters: source.whyItMatters || source.indiaImpact || source.headline,
    indiaImpact: source.indiaImpact,
    watchFor: source.watchFor,
    sourceUrl: source.sourceUrl,
    sentimentScore: 0,
    entityName: source.entityName || event.title || "Market",
    category: source.category || "global_risk"
  }));
  return {
    digestDate: date,
    scheduledFor: event.scheduledFor || `${date}T07:15:00+05:30`,
    generatedAt: event.createdAt || event.scheduledFor || `${date}T07:15:00+05:30`,
    title: event.title || `${formatDigestDate(date)} briefing record`,
    archiveSummary: event.summary || "No public pre-market briefing was archived for this date.",
    deskNote: event.reason || "No public pre-market briefing was archived for this date.",
    sentimentLabel: "NEUTRAL",
    overallSentiment: 0,
    marketSnapshots: [],
    news: sources,
    themes: [],
    tradeSetups: [],
    watchItems: event.watchItems ?? [
      "Use the latest verified trading-day edition only as historical context.",
      "Do not reconstruct a live pre-open view after the fact."
    ],
    publicationEvent: {
      status: event.status || "publication_record",
      label: event.label || "Publication Record",
      summary: event.summary || "No public pre-market briefing was archived for this date.",
      reason: event.reason || "The public archive has no verified briefing record for this date.",
      latestVerifiedDate: event.latestVerifiedDate || "",
      createdAt: event.createdAt || "",
      evidenceGrade: event.evidenceGrade || "",
      indiaPublisherCoverage: event.indiaPublisherCoverage || "",
      contextLines: event.contextLines ?? [],
      watchItems: event.watchItems ?? [],
      sources
    },
    sourceVerification: {
      mode: "publication_event",
      verifiedArticleCount: sources.length,
      publisherCount: new Set(sources.map((source) => source.sourceName).filter(Boolean)).size,
      categoryCount: new Set(sources.map((source) => source.category).filter(Boolean)).size,
      blockedReason: event.reason || "No public pre-market briefing was archived for this date.",
      isVerifiedForPublicArchive: false
    }
  };
}

function publicationEventPayload(event) {
  return {
    date: event.digestDate,
    scheduledFor: event.scheduledFor,
    status: event.publicationEvent?.status ?? "publication_record",
    label: event.publicationEvent?.label ?? "Publication Record",
    title: event.title,
    summary: event.publicationEvent?.summary ?? event.archiveSummary,
    reason: event.publicationEvent?.reason ?? event.deskNote,
    latestVerifiedDate: event.publicationEvent?.latestVerifiedDate ?? "",
    evidenceGrade: event.publicationEvent?.evidenceGrade ?? "",
    sources: event.publicationEvent?.sources ?? []
  };
}

function sortArchiveEntries(entries) {
  return [...entries].sort(compareArchiveEntries);
}

function compareArchiveEntries(left, right) {
  const leftTime = Date.parse(left.scheduledFor ?? `${left.digestDate}T07:15:00+05:30`);
  const rightTime = Date.parse(right.scheduledFor ?? `${right.digestDate}T07:15:00+05:30`);
  return rightTime - leftTime;
}

async function loadSourceDigest() {
  try {
    return sanitizeLegacyPublicBriefingCopy(JSON.parse(await readFile(sourceJson, "utf8")));
  } catch (error) {
    if (error?.code !== "ENOENT" && !skipArchiveWrite) {
      throw error;
    }
    if (error?.code === "ENOENT") {
      console.warn(`Source digest missing at ${sourceJson}; falling back to archived digest ${archivedJson}.`);
    }
    sourceDigestLoadedFromArchive = true;
    return sanitizeLegacyPublicBriefingCopy(JSON.parse(await readFile(archivedJson, "utf8")));
  }
}

function assertNewDigestSourceIntegrity(digest, previousDigest) {
  const hasVerification = digest.sourceVerification || digest.newsDataMode === "live";
  if (!hasVerification) {
    return null;
  }
  const publicStackVerification = verifySourceArticles(digest.news ?? [], {
    mode: digest.sourceVerification?.mode ?? digest.newsDataMode ?? "live",
    previousDigest
  });
  assertSourceVerification(publicStackVerification);
  if (digest.sourceVerification) {
    assertSourceVerification(digest.sourceVerification);
  }
  const badSource = (digest.news ?? []).find((article) => !sourceUrlLooksArticleLevel(article.sourceUrl));
  if (badSource) {
    throw new Error(`Source verification failed: ${badSource.sourceName || "source"} links to a section page (${badSource.sourceUrl})`);
  }
  const offTopic = (digest.news ?? []).find((article) => !articleLooksMarketRelevant(article));
  if (offTopic) {
    throw new Error(`Source verification failed: ${offTopic.sourceName || "source"} is not market-relevant (${offTopic.headline || offTopic.title})`);
  }
  return digest.sourceVerification ?? publicStackVerification;
}

function previousDigestFor(digest, digests) {
  const currentTime = Date.parse(digest.scheduledFor ?? `${digest.digestDate}T07:15:00+05:30`);
  return [...digests]
    .filter(isVerifiedPublicDigest)
    .filter((item) => Date.parse(item.scheduledFor ?? `${item.digestDate}T07:15:00+05:30`) < currentTime)
    .sort((left, right) =>
      Date.parse(right.scheduledFor ?? `${right.digestDate}T07:15:00+05:30`) -
      Date.parse(left.scheduledFor ?? `${left.digestDate}T07:15:00+05:30`)
    )[0] ?? null;
}

function enrichPublicDigest(digest) {
  const verified = isVerifiedPublicDigest(digest);
  const filteredNews = verified
    ? (digest.news ?? [])
      .filter((article) => sourceUrlLooksArticleLevel(article.sourceUrl) && articleLooksMarketRelevant(article))
      .map(sanitizePublicArticleCopy)
    : (digest.news ?? []);
  const selection = verified ? safePublicSourceSelection(digest.digestDate, filteredNews) : null;
  const visibleUrls = new Set(selection?.publicSummary?.visibleSourceUrls ?? digest.publicSourceSelection?.visibleSourceUrls ?? []);
  const news = visibleUrls.size
    ? filteredNews.filter((article) => visibleUrls.has(article.sourceUrl))
    : filteredNews;
  const themes = verified ? publicThemesForNews(digest.digestDate, news) : (digest.themes ?? []);
  const overallSentiment = verified ? publicWeightedSentiment(news) : digest.overallSentiment;
  const sentimentLabel = verified ? publicLabelFromScore(overallSentiment) : digest.sentimentLabel;
  const recomputedDailyLead = verified ? dailyLeadForDigest(digest.digestDate, news, { marketSnapshots: digest.marketSnapshots ?? [] }) : digest.dailyLead;
  const dailyLead = verified && digestDailyLeadIsVisible(digest.dailyLead, news)
    ? digest.dailyLead
    : recomputedDailyLead;
  const coherentTitle = verified && dailyLead ? titleForDailyLead(dailyLead) : digest.title;
  const coherentArchiveSummary = verified && dailyLead
    ? compactWords(`${dailyLead.label}: ${dailyLead.indiaImpact}`, 38)
    : (digest.archiveSummary || archiveCardSummary({ ...digest, news }));
  const coherentDeskNote = digest.deskNote
    || (verified && dailyLead
      ? legacyDeskNote({ ...digest, news, dailyLead })
      : legacyDeskNote({ ...digest, news }));
  return {
    ...digest,
    title: coherentTitle,
    news,
    themes,
    dailyLead,
    publicSourceSelection: selection?.publicSummary ?? digest.publicSourceSelection,
    overallSentiment,
    sentimentLabel,
    onePageSummary: verified
      ? publicOnePageSummary({ ...digest, news, themes, overallSentiment, sentimentLabel })
      : digest.onePageSummary,
    sourceVerification: digest.sourceVerification
      ? {
        ...digest.sourceVerification,
        isVerifiedForPublicArchive: verified
      }
      : undefined,
    legacyAuditStatus: verified
      ? undefined
      : isWeekdayDigest(digest)
        ? "Edition archived."
        : "Non-trading-day archive retained for continuity.",
    archiveSummary: coherentArchiveSummary,
    deskNote: coherentDeskNote,
    watchItems: Array.isArray(digest.watchItems) && digest.watchItems.length
      ? digest.watchItems.slice(0, 3).map((item) => sanitizeGeneratedTemplateText(item))
      : fallbackWatchItems({ ...digest, news }),
    generatedAt: digest.generatedAt || digest.publishedAt || `${digest.digestDate}T07:15:00+05:30`
  };
}

function digestDailyLeadIsVisible(dailyLead, news = []) {
  return dailyLead?.selectionMethod === "agent_rerank" &&
    news.some((article) => articleLeadId(article) === dailyLead.sourceArticleId);
}

function sanitizePublicArticleCopy(article) {
  const headline = String(article?.headline || "");
  const text = `${headline} ${article?.summary || ""}`.toLowerCase();
  const patched = { ...article };
  const staleTemplate = /evidence matters only if margins, guidance,? or demand can travel to listed Indian peers\.?/i;
  if (staleTemplate.test(String(patched.takeaway || ""))) {
    if (/\bjobs day\b|\bsemiconductor earnings\b/.test(text)) {
      patched.takeaway = "US jobs data and chip earnings set Nasdaq risk appetite; Nifty IT only inherits it if exporters participate.";
    } else if (/\bpalantir\b/.test(text)) {
      patched.takeaway = "Palantir's expected revenue jump is a Nifty IT sentiment cue only if Indian exporters participate.";
    } else if (/\bs&p 500 profits?\b|\bs&p 500 earnings\b|\bprofits haven\b/.test(text)) {
      patched.takeaway = "Rich S&P 500 profits support global risk appetite, but India needs breadth beyond a few US mega-cap winners.";
    } else if (/\bai trade\b|\bit'?s a boom\b|\bstrong earnings\b.*\bmarket gains\b/.test(text)) {
      patched.takeaway = "AI-led earnings momentum supports risk appetite; the India read is Nifty IT breadth, not a broad-index signal.";
    } else if (/\bbig tech\b/.test(text)) {
      patched.takeaway = "Big Tech capex discipline supports Nasdaq tone; Nifty IT still needs exporter breadth and USD/INR confirmation.";
    } else {
      patched.takeaway = String(patched.takeaway || "").replace(staleTemplate, "matters for India only if margins, guidance, or demand can travel to listed peers.");
    }
  }
  for (const field of ["takeaway", "indiaImpact", "watchFor", "whyItMatters"]) {
    patched[field] = sanitizeGeneratedTemplateText(patched[field], patched);
  }
  return patched;
}

function sanitizeGeneratedTemplateText(value, article = {}) {
  let text = String(value || "");
  if (!text) {
    return text;
  }
  const articleText = `${article.headline || ""} ${article.summary || ""}`.toLowerCase();
  text = text
    .replace(
      /Brent,\s*OMC margins,\s*aviation fuel and inflation expectations are the India open transmission line\.?/gi,
      "Brent direction decides the India read-through for OMCs, aviation, paints, tyres, and inflation expectations."
    )
    .replace(
      /translate it into levels,\s*breadth and sector leadership before assigning it trading weight\.?/gi,
      "Treat it as a global risk-appetite cue only after Indian breadth confirms."
    )
    .replace(
      /treat it as Global Tech earnings-quality evidence until India gets matching sector breadth\.?/gi,
      "Treat it as a Nifty IT watch item only if Indian exporters confirm."
    )
    .replace(
      /Watch Brent at the 6 AM IST print;\s*above \$108 keeps OMC and aviation headline risk alive\.?/gi,
      "Watch Brent direction before the Europe open; India impact needs OMC, aviation, and inflation confirmation."
    )
    .replace(
      /evidence matters only if margins,\s*guidance,?\s*or demand can travel to listed Indian peers\.?/gi,
      "matters for India only if margins, guidance, or demand can travel to listed peers."
    )
    .replace(
      /Watch Market during the first-hour range;\s*trade it only if it broadens into sector leadership\.?/gi,
      "Watch first-range high/low, VWAP, advance-decline, and Bank Nifty breadth through 9:45-10:00 AM IST."
    )
    .replace(
      /Watch ([A-Za-z][A-Za-z\s/&+-]{1,40}) during the first-hour range;\s*trade it only if it broadens into sector leadership\.?/gi,
      (_match, entity) => `Watch ${entity.trim()} peer breadth after 9:45 AM; no index bias unless banks and Nifty hold VWAP.`
    )
    .replace(
      /([A-Za-z][A-Za-z\s/&+-]{1,40}) is only a conditional India input;\s*require first-range breadth and related sector participation before using it for trade bias\.?/gi,
      (_match, entity) => `${entity.trim()} needs related Indian peer breadth before it becomes more than a watchlist cue.`
    )
    .replace(
      /use it as a ([A-Za-z][A-Za-z\s/&+-]{1,40}) watch input only if a related Indian sector confirms the move\.?/gi,
      (_match, entity) => `treat ${entity.trim()} as a watchlist cue only after related Indian sector breadth confirms.`
    )
    .replace(
      /([A-Za-z][A-Za-z\s/&+-]{1,40}) is a watch input,\s*not a trade bias,\s*until Nifty breadth and Bank Nifty confirm\.?/gi,
      (_match, entity) => `${entity.trim()} stays on the watchlist until Nifty breadth and Bank Nifty confirm.`
    );
  if (/blue owl|spacex|carvana|used car/i.test(articleText)) {
    text = text.replace(/Bank Nifty, private banks and NBFCs are the direct check\.?/gi, "Global-only context: no direct India trade read; use it only if index futures, sector breadth, currency, or rates confirm after the open.");
  }
  return cleanArchiveSentence(text);
}

function safePublicSourceSelection(date, news) {
  try {
    return publicSourceSelectionForDigest(date, news);
  } catch {
    return null;
  }
}

function publicThemesForNews(date, news) {
  const groups = new Map();
  for (const article of news ?? []) {
    const category = article.category || "market";
    groups.set(category, [...(groups.get(category) ?? []), article]);
  }
  return [...groups.entries()]
    .map(([category, groupedArticles]) => {
      const lead = groupedArticles
        .slice()
        .sort((left, right) => impactScore(right) - impactScore(left))[0];
      return {
        digestDate: date,
        themeType: category,
        title: publicTitleForCategory(category),
        summary: lead?.summary || lead?.takeaway || lead?.headline || "Verified market source cluster.",
        sentimentScore: roundPublic(publicWeightedSentiment(groupedArticles), 3),
        evidenceCount: groupedArticles.length,
        sourceCount: groupedArticles.length
      };
    })
    .sort((left, right) => left.sentimentScore - right.sentimentScore);
}

function publicWeightedSentiment(news) {
  const items = news ?? [];
  const weights = items.reduce((sum, article) => sum + publicArticleWeight(article), 0);
  if (!weights) {
    return 0;
  }
  return items.reduce((sum, article) => sum + articleTone(article) * publicArticleWeight(article), 0) / weights;
}

function publicArticleWeight(article) {
  return Number.isFinite(Number(article?.entityMatchScore)) ? Number(article.entityMatchScore) : 1;
}

function publicLabelFromScore(score) {
  if (score >= 0.25) return "BULLISH";
  if (score <= -0.25) return "BEARISH";
  if (Math.abs(score) < 0.1) return "NEUTRAL";
  return "VOLATILE";
}

function publicTitleForCategory(category) {
  return {
    macro_negative: "Macro Pressure",
    global_risk: "Global Risk",
    neutral_volatile: "Opening Volatility",
    sector_negative: "Sector Pressure",
    sector_positive: "Sector Support",
    macro_positive: "Global Earnings & Risk Appetite"
  }[category] || "Market Cues";
}

function roundPublic(value, places) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(places)) : 0;
}

function publicOnePageSummary(digest) {
  const marketLine = (digest.marketSnapshots ?? [])
    .map((snapshot) => `${snapshot.name} ${formatSnapshotChange(snapshot)}`)
    .join(", ");
  const themeLines = (digest.themes ?? [])
    .map((theme) => `- ${theme.title}: ${theme.summary}`)
    .join("\n");
  const setupLines = (digest.tradeSetups ?? []).length
    ? digest.tradeSetups.map((setup) =>
      `- ${setup.symbol} ${setup.direction} entry ${setup.entry}, stop ${setup.stopLoss}, target ${setup.target} (RR ${setup.riskReward})`
    ).join("\n")
    : "- No clean 1:2 RR setup is active yet; wait for fresh opening-range confirmation.";
  return [
    `Market Mood: ${digest.sentimentLabel}`,
    `Global Cues: ${marketLine}`,
    `Narrative Themes:\n${themeLines}`,
    `Validated Trading Setups:\n${setupLines}`,
    "Educational note: Educational market research only. This is not SEBI-registered investment advice, a research recommendation, or a solicitation to buy or sell securities or derivatives. No returns are assured; use your own risk plan."
  ].join("\n\n");
}

function isVerifiedPublicDigest(digest) {
  return Boolean(isWeekdayDigest(digest) && digest.sourceVerification && !digest.sourceVerification.blockedReason && digest.sourceVerification.isVerifiedForPublicArchive !== false);
}

function isWeekdayDigest(digest) {
  return isWeekdayDate(digest.digestDate);
}

function isWeekdayDate(value) {
  return marketCalendarState(value).isTradingSession;
}

function relatedVerifiedEditions(digest, verifiedDigests) {
  const index = verifiedDigests.findIndex((item) => item.digestDate === digest.digestDate && scheduledLabelForDigest(item) === scheduledLabelForDigest(digest));
  if (index === -1) {
    return {};
  }
  return {
    nextEditionPath: index > 0 ? `../${slugForDigest(verifiedDigests[index - 1])}/` : "",
    previousEditionPath: index < verifiedDigests.length - 1 ? `../${slugForDigest(verifiedDigests[index + 1])}/` : ""
  };
}

function legacyDeskNote(digest) {
  const driver = highestImpactArticle(digest);
  return driver
    ? `${cleanArchiveSentence(driver.takeaway || driver.summary || driver.headline)} This archived edition is retained for historical context; newer editions use the verified article-link source ledger.`
    : "This archived edition is retained for historical context; newer editions use the verified article-link source ledger.";
}

function fallbackWatchItems(digest) {
  const items = (digest.news ?? [])
    .map((article) => cleanArchiveSentence(article.watchFor))
    .filter(Boolean);
  return [...new Set(items)].slice(0, 3);
}

function archivePage(digests, allDigests = digests, latestDigest = null) {
  const latest = latestDigest ?? digests.find(isVerifiedPublicDigest) ?? digests[0];
  const pageTitle = "Nifty Today Analysis - Pre-Market Briefing for Nifty & Bank Nifty | Market Narrative";
  const pageDescription = "Daily Nifty today analysis at 7:15 AM IST covering GIFT Nifty, FII DII data, crude oil, Asia cues and Bank Nifty opening bias.";
  const recentGrid = recentArchiveGridHtml(allDigests.slice(0, 7));
  const latestState = homepageLatestState(latest);
  const primaryAction = homepagePrimaryAction(latestState, latest);
  const heroContent = homepageHeroContent(latest);
  const jsonLdDigests = digests.filter(isVerifiedPublicDigest);
  const homepageFaq = homepageFaqItems();
  const cards = digests
    .map((digest) => {
      const slug = slugForDigest(digest);
      const toneClass = archiveToneClass(digest);
      const chipValues = archiveChips(digest);
      const chips = chipValues
        .map((chip) => `<span>${escapeHtml(chip)}</span>`)
        .join("");
      const searchText = archiveSearchText(digest, chipValues);
      const tags = archiveTagValues(digest, chipValues);
      return `
        <div class="digest-card ${toneClass}" data-archive-card data-archive-search="${escapeHtml(searchText)}" data-archive-tags="${escapeHtml(tags.join("|"))}">
          <div class="card-summary-head">
            <div class="card-topline">
              <span>${escapeHtml(formatDigestDate(digest.digestDate))}</span>
              ${sentimentSparklineHtml(digest)}
            </div>
            <h2>${escapeHtml(archiveCardTitle(digest))}</h2>
            <p class="card-summary">${escapeHtml(archiveCardSummary(digest))}</p>
          </div>
          <div class="archive-card-details">
            ${archiveMarketSnapshotHtml(digest)}
            <a class="open-link" href="./${slug}/">Open briefing &rarr;</a>
          </div>
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ${brandHeadLinks(siteOrigin)}
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <meta name="author" content="Abhey Deep">
  <meta name="keywords" content="nifty today analysis, pre market analysis nifty, bank nifty analysis today, gift nifty today, fii dii data today, indian stock market analysis today">
  <meta name="geo.region" content="IN">
  <meta name="geo.placename" content="India">
  <meta name="language" content="English">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <meta name="theme-color" content="#050816">
  <link rel="canonical" href="${escapeHtml(siteOrigin)}/">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_IN">
  <meta property="og:site_name" content="Market Narrative">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta property="og:url" content="${escapeHtml(siteOrigin)}/">
  <meta property="og:image" content="${escapeHtml(siteOrigin)}/og-card.svg">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="675">
  <meta property="og:image:alt" content="Market Narrative Nifty pre-market analysis briefing">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Nifty Today Analysis - Pre-Market Briefing | Market Narrative">
  <meta name="twitter:description" content="${escapeHtml(pageDescription)}">
  <meta name="twitter:image" content="${escapeHtml(siteOrigin)}/og-card.svg">
  <title>${escapeHtml(pageTitle)}</title>
  ${jsonLdScript(archivePageJsonLd(latest, jsonLdDigests.length ? jsonLdDigests : [latest], pageTitle, pageDescription, homepageFaq))}
  <style>
    :root {
      --paper: #050816;
      --ink: #f8fafc;
      --muted: #b8c4d8;
      --line: rgba(255, 255, 255, 0.14);
      --panel: rgba(15, 23, 42, 0.62);
    }

    * { box-sizing: border-box; }

    /* === Global mobile base (Tier 1) === */
    html, body { overflow-x: hidden; }
    body {
      padding-left: env(safe-area-inset-left, 0px);
      padding-right: env(safe-area-inset-right, 0px);
    }
    img, svg, video, canvas { max-width: 100%; height: auto; }
    a, button { touch-action: manipulation; }
    a, button, [tabindex] { -webkit-tap-highlight-color: transparent; }
    *:focus { outline: none; }
    *:focus-visible {
      outline: 2px solid #22d3ee;
      outline-offset: 2px;
      border-radius: 4px;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    /* === End global mobile base === */

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 15% 4%, rgba(20, 184, 166, 0.32), transparent 32vw),
        radial-gradient(circle at 82% 0%, rgba(96, 165, 250, 0.30), transparent 34vw),
        radial-gradient(circle at 70% 86%, rgba(244, 63, 94, 0.18), transparent 28vw),
        linear-gradient(135deg, #030712 0%, #08111f 46%, #111827 100%);
      color: var(--ink);
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background:
        linear-gradient(120deg, rgba(255, 255, 255, 0.045), transparent 42%),
        radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.035), transparent 42%);
    }

    body > * {
      position: relative;
      z-index: 1;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      background: rgba(3, 7, 18, 0.66);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(18px);
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.25);
    }

    .shell {
      width: min(1040px, calc(100% - 36px));
      margin: 0 auto;
    }

    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 64px;
      gap: 16px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 20px;
      font-weight: 850;
    }

    .brand-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: linear-gradient(135deg, #22d3ee, #6366f1 54%, #f43f5e);
      color: #fff;
      font-size: 15px;
      font-weight: 900;
    }

      ${brandMarkCss()}

    .subscribe-link {
      border-radius: 8px;
      background: rgba(52, 211, 153, 0.15);
      border: 1px solid rgba(52, 211, 153, 0.34);
      color: #bbf7d0;
      padding: 10px 13px;
      font-size: 13px;
      font-weight: 900;
    }

    .latest-link {
      border-radius: 8px;
      background: linear-gradient(135deg, #06b6d4, #6366f1);
      color: #fff;
      padding: 10px 13px;
      font-size: 13px;
      font-weight: 900;
    }

    .nav-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
    }

    .nav-link {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.52);
      padding: 10px 13px;
      color: #f8fafc;
      font-size: 13px;
      font-weight: 900;
    }

    .share-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-top: 18px;
    }

    .share-row span,
    .byline {
      color: #9fb0c8;
      font-size: 13px;
      font-weight: 850;
    }

    .freshness-banner {
      align-items: center;
      border: 1px solid rgba(103, 232, 249, 0.24);
      border-radius: 14px;
      background: rgba(14, 165, 233, 0.14);
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      justify-content: space-between;
      margin-top: 18px;
      max-width: 900px;
      padding: 14px 15px;
    }

    .freshness-banner.closed {
      border-color: rgba(251, 191, 36, 0.32);
      background: rgba(146, 64, 14, 0.18);
    }

    .freshness-banner.hold {
      border-color: rgba(248, 113, 113, 0.34);
      background: rgba(127, 29, 29, 0.18);
    }

    .freshness-banner span {
      color: #bae6fd;
      display: block;
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .freshness-banner.closed span {
      color: #fde68a;
    }

    .freshness-banner strong {
      color: #f8fafc;
      display: block;
      font-size: 17px;
      line-height: 1.25;
      margin-top: 4px;
    }

    .freshness-banner p {
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 720;
      line-height: 1.45;
      margin: 4px 0 0;
      max-width: 650px;
    }

    .freshness-banner a {
      border: 1px solid rgba(103, 232, 249, 0.26);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.72);
      color: #f8fafc;
      flex: 0 0 auto;
      font-size: 13px;
      font-weight: 950;
      padding: 10px 12px;
    }

    .share-link,
    .share-copy-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 999px;
      background: rgba(2, 6, 23, 0.42);
      color: #e5e7eb;
      width: 42px;
      height: 42px;
      padding: 0;
    }

    .share-copy-btn {
      cursor: pointer;
      font: inherit;
    }

    .share-copy-btn[data-copy-state="copied"] {
      border-color: rgba(52, 211, 153, 0.5);
      background: rgba(6, 78, 59, 0.38);
      color: #86efac;
    }

    .share-icon {
      width: 18px;
      height: 18px;
      display: block;
    }

    .hero-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 22px;
      max-width: 900px;
    }

    .hero-action {
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.66);
      display: grid;
      gap: 5px;
      min-height: 86px;
      padding: 13px 14px;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
    }

    .hero-action:hover {
      border-color: rgba(103, 232, 249, 0.45);
      background: rgba(15, 23, 42, 0.86);
      transform: translateY(-2px);
    }

    .hero-action strong {
      color: #f8fafc;
      font-size: 17px;
      line-height: 1.2;
    }

    .hero-action span {
      color: #9fb0c8;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.45;
    }

    .subscribe-strip {
      align-items: center;
      border: 1px solid rgba(52, 211, 153, 0.28);
      border-radius: 14px;
      background: rgba(6, 78, 59, 0.20);
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      justify-content: space-between;
      margin-top: 16px;
      max-width: 900px;
      padding: 14px 15px;
    }

    .subscribe-strip strong {
      color: #f8fafc;
      display: block;
      font-size: 16px;
      line-height: 1.25;
    }

    .subscribe-strip span {
      color: #bbf7d0;
      display: block;
      font-size: 13px;
      font-weight: 720;
      line-height: 1.45;
      margin-top: 3px;
    }

    .subscribe-strip a {
      border: 1px solid rgba(187, 247, 208, 0.32);
      border-radius: 8px;
      background: rgba(5, 46, 22, 0.66);
      color: #f0fdf4;
      flex: 0 0 auto;
      font-size: 13px;
      font-weight: 950;
      padding: 10px 12px;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    main {
      padding: 42px 0 72px;
    }

    .hero {
      margin-bottom: 30px;
    }

    .eyebrow {
      margin: 0 0 10px;
      color: #9fb0c8;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 820px;
      margin: 0 0 14px;
      font-size: clamp(38px, 7vw, 72px);
      line-height: 0.98;
      letter-spacing: 0;
    }

    .hero p {
      max-width: 780px;
      margin: 0;
      color: #cbd5e1;
      font-size: 18px;
      line-height: 1.65;
    }

    .summary-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin: 28px 0 34px;
    }

    .summary-chip,
    .digest-card {
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.46));
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(14px);
    }

    .summary-chip {
      padding: 16px;
    }

    .summary-chip span {
      display: block;
      color: #9fb0c8;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .summary-chip strong {
      display: block;
      margin-top: 6px;
      font-size: 24px;
      line-height: 1.1;
    }

    .workflow-strip {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin: -6px 0 34px;
    }

    .workflow-step {
      border: 1px solid rgba(255, 255, 255, 0.13);
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.54);
      display: grid;
      gap: 7px;
      min-height: 128px;
      padding: 15px;
    }

    .workflow-step span {
      color: #67e8f9;
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .workflow-step strong {
      color: #f8fafc;
      font-size: 19px;
      line-height: 1.18;
    }

    .workflow-step p {
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 720;
      line-height: 1.5;
      margin: 0;
    }

    .archive-filter {
      border: 1px solid rgba(255, 255, 255, 0.13);
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.54);
      display: grid;
      gap: 12px;
      margin: 0 0 18px;
      padding: 14px;
    }

    .archive-filter-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .archive-filter-head strong {
      color: #f8fafc;
      font-size: 16px;
      line-height: 1.25;
    }

    .archive-filter-head span {
      color: #9fb0c8;
      font-size: 12px;
      font-weight: 850;
    }

    .archive-filter-controls {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(180px, 0.6fr);
      gap: 10px;
    }

    .archive-filter input,
    .archive-filter select {
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.46);
      color: #f8fafc;
      font: inherit;
      font-size: 14px;
      min-height: 42px;
      padding: 10px 11px;
      width: 100%;
    }

    .archive-title {
      margin: 0 0 16px;
      color: #f8fafc;
      font-size: 22px;
    }

    .digest-grid {
      display: grid;
      gap: 16px;
    }

    .digest-card {
      padding: 22px;
      --tone: #67e8f9;
      --tone-soft: rgba(103, 232, 249, 0.13);
      transition: transform 160ms ease, box-shadow 160ms ease;
    }

    .digest-card[hidden] {
      display: none;
    }

    .digest-card summary {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 18px;
      align-items: center;
      list-style: none;
      cursor: pointer;
    }

    .digest-card summary::-webkit-details-marker {
      display: none;
    }

    .card-summary-head {
      min-width: 0;
    }

    .card-disclosure {
      position: relative;
      display: inline-flex;
      width: 36px;
      height: 36px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 999px;
      background: rgba(2, 6, 23, 0.38);
    }

    .card-disclosure::before,
    .card-disclosure::after {
      content: "";
      position: absolute;
      width: 14px;
      height: 2px;
      border-radius: 999px;
      background: var(--tone);
    }

    .card-disclosure::after {
      transform: rotate(90deg);
      transition: transform 160ms ease;
    }

    .digest-card[open] .card-disclosure::after {
      transform: rotate(0deg);
    }

    .digest-card.tone-bullish {
      --tone: #34d399;
      --tone-soft: rgba(52, 211, 153, 0.15);
    }

    .digest-card.tone-bearish {
      --tone: #fb7185;
      --tone-soft: rgba(251, 113, 133, 0.15);
    }

    .digest-card.tone-neutral {
      --tone: #fbbf24;
      --tone-soft: rgba(251, 191, 36, 0.15);
    }

    .digest-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.28);
      box-shadow: 0 22px 70px rgba(0, 0, 0, 0.30), 0 0 0 1px var(--tone-soft), inset 0 1px 0 rgba(255, 255, 255, 0.11);
    }

    .card-topline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      color: #9fb0c8;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .digest-card h2 {
      margin: 12px 0 10px;
      color: #f8fafc;
      font-size: 26px;
      line-height: 1.2;
    }

    .digest-card p,
    .session-driver strong {
      margin: 0;
      color: #cbd5e1;
      font-size: 15px;
      line-height: 1.6;
    }

    .card-summary {
      display: -webkit-box;
      min-height: 48px;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .archive-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }

    .archive-chips span {
      border-radius: 999px;
      background: var(--tone-soft);
      padding: 7px 10px;
      color: #dbeafe;
      font-size: 12px;
      font-weight: 850;
    }

    .sentiment-sparkline {
      width: 92px;
      height: 36px;
      border: 1px solid rgba(255, 255, 255, 0.13);
      border-radius: 999px;
      background: rgba(2, 6, 23, 0.34);
      padding: 5px 8px;
      flex: 0 0 auto;
    }

    .sentiment-sparkline svg {
      display: block;
      width: 100%;
      height: 100%;
    }

    .spark-area {
      fill: var(--tone-soft);
    }

    .spark-line {
      fill: none;
      stroke: var(--tone);
      stroke-width: 4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .session-driver {
      display: grid;
      gap: 5px;
      margin-top: 16px;
      border-left: 3px solid var(--tone);
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.28);
      padding: 12px 14px;
    }

    .archive-card-details {
      display: grid;
      gap: 14px;
      margin-top: 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding-top: 18px;
    }

    .source-quality-pill {
      display: inline-flex;
      width: fit-content;
      border: 1px solid rgba(103, 232, 249, 0.24);
      border-radius: 999px;
      background: rgba(8, 145, 178, 0.13);
      padding: 8px 11px;
      color: #cffafe;
      font-size: 12px;
      font-weight: 850;
    }

    .archive-snapshot-grid,
    .archive-source-preview {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
    }

    .archive-snapshot,
    .archive-source-row {
      border: 1px solid rgba(255, 255, 255, 0.10);
      border-radius: 10px;
      background: rgba(2, 6, 23, 0.26);
      padding: 11px 12px;
    }

    .archive-snapshot span,
    .archive-source-row span {
      display: block;
      color: #9fb0c8;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .archive-snapshot strong,
    .archive-source-row strong {
      display: block;
      margin-top: 4px;
      color: #e5e7eb;
      font-size: 14px;
      line-height: 1.45;
    }

    .archive-source-row a {
      display: inline-flex;
      margin-top: 8px;
      color: #67e8f9;
      font-size: 12px;
      font-weight: 900;
    }

    .session-driver span {
      color: #9fb0c8;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .open-link {
      display: inline-flex;
      margin-top: 18px;
      color: #67e8f9;
      font-size: 14px;
      font-weight: 900;
    }

    .recent-archive-section {
      margin-top: 34px;
    }

    .recent-archive-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 12px;
      margin-top: 14px;
    }

    .recent-archive-link {
      display: grid;
      gap: 7px;
      min-height: 126px;
      border: 1px solid rgba(255, 255, 255, 0.13);
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.50);
      padding: 14px;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
    }

    .recent-archive-link:hover,
    .recent-archive-link:focus-visible {
      transform: translateY(-2px);
      border-color: rgba(103, 232, 249, 0.42);
      background: rgba(15, 23, 42, 0.70);
      outline: none;
    }

    .recent-archive-link span {
      color: #9fb0c8;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .recent-archive-link strong {
      color: #f8fafc;
      font-size: 15px;
      line-height: 1.35;
    }

    .recent-status {
      align-self: end;
      color: #67e8f9;
      font-size: 12px;
      font-weight: 900;
    }

    .recent-status.archived {
      color: #94a3b8;
    }

    .seo-section,
    .faq-section,
    .site-footer-links {
      border-top: 1px solid var(--line);
      margin-top: 34px;
      padding-top: 28px;
    }

    .seo-section h2,
    .faq-section h2 {
      color: #f8fafc;
      font-size: 24px;
      letter-spacing: 0;
      margin: 0 0 12px;
    }

    .seo-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .seo-copy-card,
    .faq-section details {
      background: rgba(15, 23, 42, 0.58);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
    }

    .seo-copy-card h3 {
      color: #f8fafc;
      font-size: 16px;
      margin: 0 0 8px;
    }

    .seo-copy-card p,
    .faq-section p {
      color: #cbd5e1;
      font-size: 14px;
      line-height: 1.7;
      margin: 0;
    }

    .faq-list {
      display: grid;
      gap: 10px;
    }

    .faq-section summary {
      cursor: pointer;
      color: #f8fafc;
      font-weight: 850;
      line-height: 1.35;
    }

    .faq-section details p {
      margin-top: 10px;
    }

    .site-footer-links {
      color: #94a3b8;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding-bottom: 36px;
    }

    .site-footer-links a {
      border: 1px solid var(--line);
      border-radius: 8px;
      color: #f8fafc;
      font-size: 13px;
      font-weight: 800;
      padding: 9px 11px;
    }

    @media (max-width: 760px) {
      .hero-actions,
      .workflow-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .workflow-step {
        min-height: auto;
      }
    }

    @media (max-width: 640px) {
      .nav-inner {
        align-items: start;
        flex-direction: column;
        gap: 12px;
        padding: 12px 0;
      }

      .nav-actions {
        flex-wrap: nowrap;
        justify-content: flex-start;
        overflow-x: auto;
        padding-bottom: 2px;
        width: 100%;
      }

      .latest-link,
      .nav-link,
      .subscribe-link {
        flex: 0 0 auto;
        padding: 9px 11px;
        text-align: center;
      }

      main {
        padding-top: 28px;
      }

      .hero {
        margin-bottom: 22px;
      }

      .hero-actions {
        grid-template-columns: 1fr;
        gap: 8px;
        margin-top: 16px;
      }

      .archive-filter-controls {
        grid-template-columns: 1fr;
      }

      .seo-grid {
        grid-template-columns: 1fr;
      }

      .archive-filter-head,
      .subscribe-strip {
        align-items: flex-start;
        flex-direction: column;
      }

      .workflow-strip {
        grid-template-columns: 1fr;
        gap: 8px;
        margin-top: -10px;
      }

      .hero-action {
        min-height: 54px;
        padding: 12px;
      }

      .hero-action span {
        display: none;
      }
    }
    ${bottomTabBarCss()}
    ${mobileTypographyCss()}
    ${proPolishCss()}
  </style>
</head>
<body class="archive-dark has-btb">
  <nav class="topbar">
    <div class="shell">
      <div class="nav-inner">
        <div class="brand">${brandMarkHtml()}<span>Market Narrative</span></div>
        <div class="nav-actions">
          <a class="nav-link" href="./">Archive</a>
          <a class="latest-link" href="./latest/">Latest briefing</a>
          <a class="nav-link" href="./latest/trading-guide/">Trading Guide</a>
          <a class="nav-link" href="./money-flow/fii-dii/">FII/DII</a>
          <a class="nav-link" href="./market-statistics/">Stats</a>
          <a class="nav-link" href="./multibagger/">Portfolio</a>
          <a class="nav-link" href="./about/">About</a>
          <a class="subscribe-link" href="${escapeHtml(subscribeHref())}">Subscribe</a>
        </div>
      </div>
    </div>
  </nav>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">${escapeHtml(heroContent.eyebrow)}</p>
      <h1>${escapeHtml(heroContent.h1)}</h1>
      <h2 class="subheadline" style="font-size: 1.1rem; color: var(--stone); margin-top: 8px; font-weight: 500;">${escapeHtml(heroContent.subheadline)}</h2>
      <p class="byline">By Abhey Deep / Market Narrative</p>
      ${homepageFreshnessBannerHtml(latestState)}
      <div class="hero-actions" aria-label="Primary actions">
        <a class="hero-action" href="./latest/">
          <strong>${escapeHtml(primaryAction.label)}</strong>
          <span>${escapeHtml(primaryAction.detail)}</span>
        </a>
        <a class="hero-action" href="./latest/trading-guide/">
          <strong>Open Trading Guide</strong>
          <span>Use the bias, gates, and no-trade zone checklist.</span>
        </a>
        <a class="hero-action" href="./multibagger/">
          <strong>Track Portfolio</strong>
          <span>Follow the public multibagger model and changes.</span>
        </a>
      </div>
      <div class="subscribe-strip" aria-label="Subscribe to Market Narrative">
        <div>
          <strong>Get the next trading-day 7:15 AM brief — straight to your inbox before the market opens.</strong>
          <p class="fine-print">Educational market research only; not SEBI-registered investment advice, a recommendation, or a promise of returns.</p>
        </div>
        <a href="${escapeHtml(subscribeHref())}">Join daily email</a>
      </div>
      ${archiveShareRowHtml()}
    </section>
    <section class="summary-row" aria-label="Archive summary">
      <div class="summary-chip"><span>Latest edition</span><strong>${escapeHtml(formatDigestDate(latest.digestDate))}</strong></div>
      <div class="summary-chip"><span>Coverage</span><strong>Nifty / Bank Nifty</strong></div>
      <div class="summary-chip"><span>Today's focus</span><strong>${escapeHtml(archiveFocus(latest))}</strong></div>
      <div class="summary-chip"><span>Last verified update</span><strong>${escapeHtml(formatGeneratedTime(latest.generatedAt || latest.publishedAt || `${latest.digestDate}T07:15:00+05:30`))}</strong></div>
    </section>
    <section class="workflow-strip" aria-label="Daily trader workflow">
      <article class="workflow-step">
        <span>1. Today's brief</span>
        <strong>Bias, Nifty level, Bank Nifty signal in 90 seconds</strong>
      </article>
      <article class="workflow-step">
        <span>2. Trading Guide</span>
        <strong>Specific levels, no-trade zone, stop logic</strong>
      </article>
      <article class="workflow-step">
        <span>3. Sources</span>
        <strong>The articles behind every India read</strong>
      </article>
    </section>
    <h2 class="archive-title">Past briefings</h2>
    <section class="archive-filter" aria-label="Search archived briefings">
      <div class="archive-filter-head">
        <strong>Search the archive</strong>
        <span id="archiveResultCount">${escapeHtml(String(digests.length))} briefings shown · try crude, Bank Nifty, IT, rates, or a date</span>
      </div>
      <div class="archive-filter-controls">
        <input id="archiveSearch" type="search" aria-label="Search archive by keyword" autocomplete="off" autocapitalize="none">
        <select id="archiveTagFilter" aria-label="Filter archive by driver">
          <option value="all">All</option>
          <option value="crude-energy">Crude / Energy</option>
          <option value="banks">Banks</option>
          <option value="rates">Rates</option>
          <option value="global-tech">Global Tech</option>
          <option value="currency">Currency</option>
          <option value="geopolitical">Geopolitical</option>
        </select>
      </div>
    </section>
    <section class="digest-grid">
      ${cards}
    </section>
    <section class="recent-archive-section" aria-label="Recent briefing navigation">
      <h2 class="archive-title">Recent Briefing Navigation</h2>
      ${recentGrid}
    </section>
    ${homepageSeoSectionHtml()}
    ${homepageFaqSectionHtml(homepageFaq)}
    ${siteFooterLinksHtml()}
  </main>
  <script>
    document.querySelectorAll('[data-copy-url]').forEach((button) => {
      button.addEventListener('click', async () => {
        const label = button.querySelector('.sr-only');
        try {
          await navigator.clipboard.writeText(button.dataset.copyUrl || location.href);
          button.dataset.copyState = 'copied';
          button.setAttribute('aria-label', 'Copied');
          button.title = 'Copied';
          if (label) label.textContent = 'Copied';
        } catch {
          button.setAttribute('aria-label', 'Copy failed');
          button.title = 'Copy failed';
          if (label) label.textContent = 'Copy failed';
        }
        setTimeout(() => {
          delete button.dataset.copyState;
          button.setAttribute('aria-label', 'Copy link');
          button.title = 'Copy link';
          if (label) label.textContent = 'Copy link';
        }, 1800);
      });
    });

    const archiveSearch = document.getElementById('archiveSearch');
    const archiveTagFilter = document.getElementById('archiveTagFilter');
    const archiveResultCount = document.getElementById('archiveResultCount');
    const archiveCards = Array.from(document.querySelectorAll('[data-archive-card]'));
    function applyArchiveFilter() {
      const query = (archiveSearch?.value || '').trim().toLowerCase();
      const tag = archiveTagFilter?.value || 'all';
      let visible = 0;
      for (const card of archiveCards) {
        const matchesQuery = !query || (card.dataset.archiveSearch || '').includes(query);
        const tags = (card.dataset.archiveTags || '').split('|');
        const matchesTag = tag === 'all' || tags.includes(tag);
        const show = matchesQuery && matchesTag;
        card.hidden = !show;
        if (show) visible += 1;
      }
      if (archiveResultCount) {
        archiveResultCount.textContent = visible + ' briefing' + (visible === 1 ? '' : 's') + ' shown';
      }
    }
    archiveSearch?.addEventListener('input', applyArchiveFilter);
    archiveTagFilter?.addEventListener('change', applyArchiveFilter);
    applyArchiveFilter();
  </script>
  ${bottomTabBarHtml("archive")}
  ${mobileShellScript()}
</body>
</html>`;
}

function aboutPage(latest, archiveDigests = []) {
  const pageTitle = "About Market Narrative | Abhey Deep";
  const pageDescription = "About Abhey Deep and Market Narrative, a daily 7:15 AM IST Nifty and Bank Nifty pre-market briefing built around source verification, trader language, and public research boundaries.";
  const editionCount = verifiedEditionCount(archiveDigests);
  const editionLabel = editionCount === 1 ? "1 verified briefing" : `${editionCount} verified briefings`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ${brandHeadLinks(siteOrigin)}
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <meta name="author" content="Abhey Deep">
  <meta name="keywords" content="Abhey Deep, Market Narrative, Nifty briefing, Bank Nifty briefing, Indian market trader, pre-market research">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <meta name="theme-color" content="#050816">
  <link rel="canonical" href="${escapeHtml(siteOrigin)}/about/">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_IN">
  <meta property="og:site_name" content="Market Narrative">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta property="og:url" content="${escapeHtml(siteOrigin)}/about/">
  <meta property="og:image" content="${escapeHtml(siteOrigin)}/og-card.svg">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="675">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(pageDescription)}">
  <meta name="twitter:image" content="${escapeHtml(siteOrigin)}/og-card.svg">
  <title>${escapeHtml(pageTitle)}</title>
  ${jsonLdScript(aboutPageJsonLd(pageTitle, pageDescription))}
  <style>
    :root {
      --paper: #050816;
      --ink: #f8fafc;
      --muted: #b8c4d8;
      --line: rgba(255, 255, 255, 0.14);
      --cyan: #22d3ee;
      --green: #34d399;
      --amber: #fbbf24;
    }

    * { box-sizing: border-box; }

    /* === Global mobile base (Tier 1) === */
    html, body { overflow-x: hidden; }
    body {
      padding-left: env(safe-area-inset-left, 0px);
      padding-right: env(safe-area-inset-right, 0px);
    }
    img, svg, video, canvas { max-width: 100%; height: auto; }
    a, button { touch-action: manipulation; }
    a, button, [tabindex] { -webkit-tap-highlight-color: transparent; }
    *:focus { outline: none; }
    *:focus-visible {
      outline: 2px solid #22d3ee;
      outline-offset: 2px;
      border-radius: 4px;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    /* === End global mobile base === */

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 16% 0%, rgba(34, 211, 238, 0.26), transparent 32vw),
        radial-gradient(circle at 82% 4%, rgba(52, 211, 153, 0.18), transparent 30vw),
        linear-gradient(135deg, #030712 0%, #08111f 48%, #111827 100%);
      color: var(--ink);
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    a { color: inherit; text-decoration: none; }

    .shell {
      width: min(1040px, calc(100% - 36px));
      margin: 0 auto;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      background: rgba(3, 7, 18, 0.72);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(18px);
    }

    .nav-inner {
      align-items: center;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      min-height: 64px;
    }

    .brand {
      align-items: center;
      display: flex;
      gap: 12px;
      font-size: 20px;
      font-weight: 850;
      white-space: nowrap;
    }

    .brand-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: linear-gradient(135deg, #22d3ee, #6366f1 54%, #f43f5e);
      color: #fff;
      font-size: 15px;
      font-weight: 900;
    }

    ${brandMarkCss()}

    .tabs {
      align-items: stretch;
      display: flex;
      gap: 24px;
      min-height: 64px;
    }

    .tab-link {
      align-items: center;
      border-bottom: 2px solid transparent;
      color: var(--muted);
      display: inline-flex;
      font-size: 14px;
      font-weight: 700;
      padding: 0 1px;
    }

    .tab-link.active {
      border-bottom-color: var(--cyan);
      color: var(--ink);
      font-weight: 850;
    }

    main {
      padding: 52px 0 72px;
    }

    .hero {
      border-bottom: 1px solid var(--line);
      margin-bottom: 24px;
      padding-bottom: 28px;
    }

    .eyebrow {
      color: var(--cyan);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.12em;
      margin: 0 0 12px;
      text-transform: uppercase;
    }

    h1 {
      font-size: clamp(40px, 7vw, 70px);
      letter-spacing: 0;
      line-height: 0.98;
      margin: 0;
      max-width: 860px;
    }

    .hero p {
      color: var(--muted);
      font-size: 18px;
      line-height: 1.65;
      margin: 18px 0 0;
      max-width: 760px;
    }

    .about-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .about-card,
    .method-card {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.62);
      padding: 18px;
    }

    .about-card h2,
    .method-card h2 {
      color: #fff;
      font-size: 22px;
      line-height: 1.15;
      margin: 0 0 10px;
    }

    .about-card p,
    .method-card p,
    .method-card li {
      color: var(--muted);
      font-size: 15px;
      line-height: 1.65;
    }

    .about-card p,
    .method-card p {
      margin: 0;
    }

    .method-card {
      grid-column: 1 / -1;
    }

    .archive-proof-card {
      background: linear-gradient(135deg, rgba(34, 211, 238, 0.14), rgba(52, 211, 153, 0.10)), rgba(15, 23, 42, 0.62);
    }

    .archive-proof-card strong {
      color: #f8fafc;
    }

    .archive-proof-link {
      align-items: center;
      border: 1px solid rgba(34, 211, 238, 0.34);
      border-radius: 8px;
      color: #cffafe;
      display: inline-flex;
      font-size: 13px;
      font-weight: 900;
      margin-top: 14px;
      padding: 9px 11px;
    }

    .method-list {
      display: grid;
      gap: 10px;
      margin: 12px 0 0;
      padding-left: 20px;
    }

    .about-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }

    .about-actions a {
      border-radius: 8px;
      background: rgba(34, 211, 238, 0.12);
      border: 1px solid rgba(34, 211, 238, 0.32);
      color: #cffafe;
      font-size: 13px;
      font-weight: 900;
      padding: 10px 12px;
    }

    .about-actions a.subscribe {
      background: rgba(52, 211, 153, 0.16);
      border-color: rgba(52, 211, 153, 0.34);
      color: #bbf7d0;
    }

    @media (max-width: 760px) {
      .nav-inner {
        align-items: flex-start;
        flex-direction: column;
        padding: 12px 0 0;
      }

      .tabs {
        gap: 16px;
        min-height: 48px;
        overflow-x: auto;
        width: 100%;
      }

      .about-grid {
        grid-template-columns: 1fr;
      }
    }
    ${bottomTabBarCss()}
    ${mobileTypographyCss()}
    ${proPolishCss()}
  </style>
</head>
<body class="has-btb">
  <nav class="topbar">
    <div class="shell">
      <div class="nav-inner">
        <a class="brand" href="/">${brandMarkHtml()}<span>Market Narrative</span></a>
        <div class="tabs" aria-label="Market Narrative sections">
          <a class="tab-link" href="/">Archive</a>
          <a class="tab-link" href="/latest/">Public Briefing</a>
          <a class="tab-link" href="/latest/trading-guide/">Trading Guide</a>
          <a class="tab-link" href="/multibagger/">Portfolio</a>
          <span class="tab-link active" aria-current="page">About</span>
        </div>
      </div>
    </div>
  </nav>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">About Market Narrative</p>
      <h1>Independent pre-market context for Indian traders.</h1>
      <p>I built Market Narrative to answer one practical morning question: what is the market nerve before the Indian cash open, and what must confirm before that view matters?</p>
      <div class="about-actions">
        <a href="/latest/">Read latest briefing</a>
        <a href="/latest/trading-guide/">Open Trading Guide</a>
        <a class="subscribe" href="${escapeHtml(subscribeHref())}">Join daily email</a>
      </div>
    </section>
    <section class="about-grid">
      <article class="about-card">
        <h2>What you get here</h2>
        <p>A daily 7:15 AM IST public briefing for Nifty and Bank Nifty: global cues, India read-through, opening gates, Bank Nifty confirmation, sector watch, and source cards in one workflow.</p>
      </article>
      <article class="about-card">
        <h2>Why not just headlines?</h2>
        <p>Moneycontrol and news sites tell you what happened. Market Narrative focuses on what Indian traders should verify first: price acceptance, breadth, source quality, and where not to chase.</p>
      </article>
      <article class="about-card">
        <h2>Who is Abhey Deep?</h2>
        <p>I'm Abhey Deep - a software engineer and Indian market trader. I built Market Narrative because I couldn't find a pre-market brief that told me what to verify, not just what happened.</p>
      </article>
      <article class="about-card">
        <h2>What this is not</h2>
        <p>This is educational market research, not SEBI-registered investment advice, a recommendation, or a promise of returns. No page places trades or asks readers to buy or sell securities.</p>
      </article>
      <article class="method-card">
        <h2>Methodology</h2>
        <p>The workflow is designed around what a trader can verify quickly:</p>
        <ul class="method-list">
          <li>Every source card links to the original article, so you can verify any claim in one tap instead of hunting through a homepage.</li>
          <li>Global headlines become an India read-through only when the Nifty, Bank Nifty, rupee, crude, rates, or sector channel is clear.</li>
          <li>The Trading Guide keeps opinion away from execution by separating bias, no-trade zones, Bank Nifty confirmation, and invalidation levels.</li>
          <li>The public multibagger tracker stays separate from the morning brief, so long-term research never blurs into pre-open trading bias.</li>
        </ul>
      </article>
      <article class="method-card archive-proof-card">
        <h2>Published record</h2>
        <p><strong>${escapeHtml(editionLabel)} published since launch.</strong> Browse the archive to see each edition's market focus, source ledger, and Nifty/Bank Nifty read-through.</p>
        <a class="archive-proof-link" href="/">Browse the archive</a>
      </article>
    </section>
  </main>
  ${bottomTabBarHtml("about")}
  ${mobileShellScript()}
</body>
</html>`;
}

function subscribePage() {
  const pageTitle = "Join The 7:15 AM Brief | Market Narrative";
  const pageDescription = "Join the Market Narrative daily email flow for the 7:15 AM IST Nifty and Bank Nifty pre-market briefing.";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ${brandHeadLinks(siteOrigin)}
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <meta name="author" content="Abhey Deep">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <meta name="theme-color" content="#050816">
  <link rel="canonical" href="${escapeHtml(siteOrigin)}/subscribe/">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_IN">
  <meta property="og:site_name" content="Market Narrative">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta property="og:url" content="${escapeHtml(siteOrigin)}/subscribe/">
  <meta property="og:image" content="${escapeHtml(siteOrigin)}/og-card.svg">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="675">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(pageDescription)}">
  <meta name="twitter:image" content="${escapeHtml(siteOrigin)}/og-card.svg">
  <title>${escapeHtml(pageTitle)}</title>
  ${jsonLdScript(subscribePageJsonLd(pageTitle, pageDescription))}
  <style>
    :root {
      --paper: #050816;
      --ink: #f8fafc;
      --muted: #b8c4d8;
      --line: rgba(255, 255, 255, 0.14);
      --cyan: #22d3ee;
      --green: #34d399;
    }

    * { box-sizing: border-box; }

    /* === Global mobile base (Tier 1) === */
    html, body { overflow-x: hidden; }
    body {
      padding-left: env(safe-area-inset-left, 0px);
      padding-right: env(safe-area-inset-right, 0px);
    }
    img, svg, video, canvas { max-width: 100%; height: auto; }
    a, button { touch-action: manipulation; }
    a, button, [tabindex] { -webkit-tap-highlight-color: transparent; }
    *:focus { outline: none; }
    *:focus-visible {
      outline: 2px solid #22d3ee;
      outline-offset: 2px;
      border-radius: 4px;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    /* === End global mobile base === */

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 16% 0%, rgba(34, 211, 238, 0.26), transparent 32vw),
        radial-gradient(circle at 82% 4%, rgba(52, 211, 153, 0.18), transparent 30vw),
        linear-gradient(135deg, #030712 0%, #08111f 48%, #111827 100%);
      color: var(--ink);
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    a { color: inherit; text-decoration: none; }

    .shell {
      width: min(820px, calc(100% - 36px));
      margin: 0 auto;
    }

    .topbar {
      background: rgba(3, 7, 18, 0.72);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(18px);
    }

    .nav-inner {
      align-items: center;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      min-height: 64px;
    }

    .brand {
      align-items: center;
      display: flex;
      gap: 12px;
      font-size: 20px;
      font-weight: 850;
      white-space: nowrap;
    }

    ${brandMarkCss()}

    .tabs {
      align-items: stretch;
      display: flex;
      gap: 20px;
      min-height: 64px;
    }

    .tab-link {
      align-items: center;
      border-bottom: 2px solid transparent;
      color: var(--muted);
      display: inline-flex;
      font-size: 14px;
      font-weight: 700;
      padding: 0 1px;
    }

    .tab-link.active {
      border-bottom-color: var(--cyan);
      color: var(--ink);
      font-weight: 850;
    }

    main {
      padding: 54px 0 80px;
    }

    .eyebrow {
      color: var(--cyan);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.12em;
      margin: 0 0 12px;
      text-transform: uppercase;
    }

    h1 {
      font-size: clamp(40px, 7vw, 68px);
      letter-spacing: 0;
      line-height: 0.98;
      margin: 0;
      max-width: 780px;
    }

    .lede {
      color: var(--muted);
      font-size: 18px;
      line-height: 1.65;
      margin: 18px 0 0;
      max-width: 700px;
    }

    .subscribe-panel {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.68);
      margin-top: 26px;
      padding: 20px;
    }

    .sent-note {
      border: 1px solid rgba(52, 211, 153, 0.38);
      border-radius: 8px;
      background: rgba(52, 211, 153, 0.12);
      color: #bbf7d0;
      display: none;
      font-weight: 850;
      margin-bottom: 14px;
      padding: 12px;
    }

    .sent-note[hidden] {
      display: none !important;
    }

    body[data-sent="true"] .sent-note {
      display: block;
    }

    form {
      display: grid;
      gap: 12px;
    }

    label {
      color: #e5e7eb;
      display: grid;
      gap: 7px;
      font-size: 13px;
      font-weight: 850;
    }

    input,
    select {
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.54);
      color: #f8fafc;
      font: inherit;
      min-height: 44px;
      padding: 10px 11px;
      width: 100%;
    }

    button {
      border: 0;
      border-radius: 8px;
      background: linear-gradient(135deg, #06b6d4, #34d399);
      color: #022c22;
      cursor: pointer;
      font: inherit;
      font-size: 15px;
      font-weight: 950;
      min-height: 46px;
      padding: 11px 14px;
    }

    .fine-print {
      color: #93a4bd;
      font-size: 13px;
      line-height: 1.6;
      margin: 14px 0 0;
    }

    .honey-field {
      display: none;
    }

    @media (max-width: 760px) {
      .nav-inner {
        align-items: flex-start;
        flex-direction: column;
        padding: 12px 0 0;
      }

      .tabs {
        gap: 16px;
        min-height: 48px;
        overflow-x: auto;
        width: 100%;
      }
    }
    ${bottomTabBarCss()}
    ${mobileTypographyCss()}
    ${proPolishCss()}
  </style>
</head>
<body class="has-btb">
  <nav class="topbar">
    <div class="shell">
      <div class="nav-inner">
        <a class="brand" href="/">${brandMarkHtml()}<span>Market Narrative</span></a>
        <div class="tabs" aria-label="Market Narrative sections">
          <a class="tab-link" href="/">Archive</a>
          <a class="tab-link" href="/latest/">Public Briefing</a>
          <a class="tab-link" href="/latest/trading-guide/">Trading Guide</a>
          <a class="tab-link" href="/multibagger/">Portfolio</a>
          <a class="tab-link" href="/about/">About</a>
          <span class="tab-link active" aria-current="page">Subscribe</span>
        </div>
      </div>
    </div>
  </nav>
  <main class="shell">
    <p class="eyebrow">Daily Email</p>
    <h1>Get the 7:15 AM market nerve before the open.</h1>
    <p class="lede">Join the email flow for the daily Nifty and Bank Nifty brief: global cue, India read-through, first level to verify, Bank Nifty filter, and source ledger.</p>
    <section class="subscribe-panel" aria-label="Join daily Market Narrative email">
      <div class="sent-note" hidden aria-live="polite"></div>
      <form action="${escapeHtml(subscribeFormAction)}" method="POST">
        <input type="hidden" name="_subject" value="New Market Narrative daily brief subscriber">
        <input type="hidden" name="_template" value="table">
        <input type="hidden" name="_next" value="${escapeHtml(`${siteOrigin}/subscribe/?sent=1`)}">
        <label class="honey-field" aria-hidden="true">Leave this empty
          <input type="text" name="_honey" tabindex="-1" autocomplete="off">
        </label>
        <label>Email
          <input name="email" type="email" autocomplete="email" required>
        </label>
        <label>What should the brief help you trade?
          <select name="market_focus">
            <option value="Nifty and Bank Nifty">Nifty and Bank Nifty</option>
            <option value="Bank Nifty first">Bank Nifty first</option>
            <option value="Sector watch">Sector watch</option>
            <option value="Long-term portfolio context">Long-term portfolio context</option>
          </select>
        </label>
        <button type="submit">Join daily email</button>
      </form>
      <p class="fine-print">Educational market research only; this is not SEBI-registered investment advice. No spam, no trade calls, and no recommendation to buy or sell securities or derivatives. Your email is used only for the Market Narrative daily brief. If you do not receive a confirmation email within a few minutes, try again or write directly to ${escapeHtml(subscribeEmail)}.</p>
    </section>
  </main>
  <script>
    if (new URLSearchParams(window.location.search).get('sent') === '1') {
      document.body.dataset.sent = 'true';
      const sentNote = document.querySelector('.sent-note');
      if (sentNote) {
        sentNote.textContent = ['Request received.', 'Check your inbox for the confirmation note.'].join(' ');
        sentNote.hidden = false;
      }
    }
  </script>
  ${bottomTabBarHtml("subscribe")}
  ${mobileShellScript()}
</body>
</html>`;
}

function moneyFlowPage(latest) {
  const pageTitle = "FII DII Data Today - Institutional Flow & F&O Positioning | Market Narrative";
  const pageDescription = "FII DII data today with interpretation for Nifty traders. Track FII selling, DII absorption, institutional flow and Bank Nifty context.";
  const flow = latest?.fiiDiiFlows ?? null;
  const flowDate = flow?.date || latest?.digestDate || todayInIst();
  const fiiNet = Number(flow?.fiiNet ?? 0);
  const diiNet = Number(flow?.diiNet ?? 0);
  const hasFlow = Boolean(flow) && (Math.abs(fiiNet) > 0 || Math.abs(diiNet) > 0);
  const absorption = fiiNet < 0 && diiNet > 0
    ? `${Math.round((diiNet / Math.abs(fiiNet)) * 100)}%`
    : "not applicable";
  const body = `
    <section class="metric-grid" aria-label="Latest institutional flow snapshot">
      <article class="metric-card"><span>FII cash flow</span><strong class="${fiiNet >= 0 ? "up" : "down"}">${escapeHtml(hasFlow ? formatCrore(fiiNet) : "Unavailable")}</strong><p>${escapeHtml(flowDate)} provisional cash-market read.</p></article>
      <article class="metric-card"><span>DII cash flow</span><strong class="${diiNet >= 0 ? "up" : "down"}">${escapeHtml(hasFlow ? formatCrore(diiNet) : "Unavailable")}</strong><p>Domestic institutional buying or selling against FII flow.</p></article>
      <article class="metric-card"><span>DII absorption ratio</span><strong>${escapeHtml(absorption)}</strong><p>How much domestic buying offset FII selling in the latest available data.</p></article>
    </section>
    <section class="copy-stack">
      <h2>How to read today's FII DII data</h2>
      <p>FII DII data today is useful because it shows whether institutional money is supporting or resisting the Nifty move. Heavy FII selling today can pressure the next session, but the read changes when DII buying today absorbs most of that outflow. The useful question is not just whether FIIs sold; it is whether the selling came with weak breadth, Bank Nifty pressure, USD/INR stress, or index futures short build-up.</p>
      <h2>What FII F&O positioning tells you that cash data does not</h2>
      <p>Cash flow tells you what institutions did in the spot market. FII F&O data adds the forward-looking layer: index futures, stock futures, options positioning, and whether the desk is hedging or pressing a directional view. If FII cash selling comes with index-futures short build-up, the signal is stronger. If cash selling comes with futures covering, the market may be rotating rather than breaking down.</p>
      <h2>Understanding the DII absorption ratio</h2>
      <p>The DII absorption ratio compares domestic buying against FII net selling. If FIIs sell Rs 2,000 cr and DIIs buy Rs 3,000 cr, absorption is 150%, which means domestic institutions more than absorbed the foreign outflow. That can cushion Nifty even on weak global cues. If absorption is low, the same FII selling can matter more for the opening range.</p>
    </section>
    <section class="faq-section">
      <h2>FII DII questions traders ask</h2>
      ${faqDetailsHtml(fiiDiiFaqItems())}
    </section>
  `;
  return staticSeoPage({
    path: "/money-flow/fii-dii/",
    pageTitle,
    pageDescription,
    eyebrow: "Institutional Flow",
    h1: "FII DII Data Today - Institutional Flow & Positioning",
    ogImageUrl: latest?.ogImageUrl,
    bodyHtml: body,
    jsonLd: seoGraph([
      organizationJsonLd(),
      websiteJsonLd(),
      breadcrumbJsonLd([
        { name: "Market Narrative", url: `${siteOrigin}/` },
        { name: "FII DII Data", url: `${siteOrigin}/money-flow/fii-dii/` }
      ]),
      {
        "@type": "WebPage",
        "@id": `${siteOrigin}/money-flow/fii-dii/#webpage`,
        url: `${siteOrigin}/money-flow/fii-dii/`,
        name: pageTitle,
        description: pageDescription,
        inLanguage: "en-IN",
        isPartOf: { "@id": `${siteOrigin}/#website` },
        publisher: { "@id": `${siteOrigin}/#organization` },
        dateModified: latest?.generatedAt ?? latest?.publishedAt ?? latest?.digestDate
      },
      faqPageJsonLd(`${siteOrigin}/money-flow/fii-dii/#faq`, fiiDiiFaqItems())
    ])
  });
}

function marketStatisticsPage(latest) {
  const pageTitle = "India Market Statistics Today - Nifty Breadth, VIX & Flow | Market Narrative";
  const pageDescription = "India market statistics today for Nifty traders: index context, India VIX, FII DII flow, sector cues and market health explanation.";
  const snapshots = Array.isArray(latest?.marketSnapshots) ? latest.marketSnapshots : [];
  const keySymbols = ["NIFTY", "BANKNIFTY", "GIFTNIFTY", "INDIAVIX", "USDINR", "BRENT", "GOLD"];
  const selected = keySymbols
    .map((symbol) => snapshots.find((snapshot) => snapshot.symbol === symbol))
    .filter(Boolean);
  const health = marketHealthScore(selected, latest?.fiiDiiFlows);
  const body = `
    <section class="metric-grid" aria-label="Latest market statistics">
      <article class="metric-card"><span>Market health score</span><strong>${escapeHtml(String(health.score))}/100</strong><p>${escapeHtml(health.label)}</p></article>
      ${selected.slice(0, 5).map((snapshot) => `
        <article class="metric-card">
          <span>${escapeHtml(snapshot.symbol)}</span>
          <strong class="${Number(snapshot.changePercent || 0) >= 0 ? "up" : "down"}">${escapeHtml(formatSnapshotChange(snapshot))}</strong>
          <p>${escapeHtml(marketDisplayNameForSnapshot(snapshot))} - ${escapeHtml(formatIndexValue(snapshot))}</p>
        </article>
      `).join("")}
    </section>
    <section class="copy-stack">
      <h2>How to read India market statistics today</h2>
      <p>Market statistics help separate a real Nifty move from a narrow index print. The first check is index direction, then Bank Nifty confirmation, India VIX, FII DII flow, crude oil, USD/INR, and whether the sector move is broad enough to sustain after the opening range. A green Nifty with weak banks and rising VIX is less useful than a smaller move with breadth support.</p>
      <h2>Nifty breadth, advance decline and market health</h2>
      <p>The advance decline ratio shows whether more NSE stocks are rising than falling. When Nifty rises but the advance decline ratio is weak, the move is usually concentrated in index heavyweights. Market Narrative treats breadth as confirmation, not decoration: the briefing waits for Bank Nifty and sector participation before turning global cues into an India-open view.</p>
      <h2>Why India VIX matters before the open</h2>
      <p>India VIX tells you whether options traders are pricing calm or stress. A falling VIX with stable USD/INR and supportive FII DII flow usually makes gap follow-through easier. A rising VIX into a green open can mean traders are hedging the move, so the first 15-30 minutes matter more than the headline.</p>
    </section>
    <section class="faq-section">
      <h2>Market statistics questions</h2>
      ${faqDetailsHtml(marketStatsFaqItems())}
    </section>
  `;
  return staticSeoPage({
    path: "/market-statistics/",
    pageTitle,
    pageDescription,
    eyebrow: "Market Statistics",
    h1: "India Market Statistics Today - Nifty Breadth & Health Score",
    ogImageUrl: latest?.ogImageUrl,
    bodyHtml: body,
    jsonLd: seoGraph([
      organizationJsonLd(),
      websiteJsonLd(),
      breadcrumbJsonLd([
        { name: "Market Narrative", url: `${siteOrigin}/` },
        { name: "Market Statistics", url: `${siteOrigin}/market-statistics/` }
      ]),
      {
        "@type": "WebPage",
        "@id": `${siteOrigin}/market-statistics/#webpage`,
        url: `${siteOrigin}/market-statistics/`,
        name: pageTitle,
        description: pageDescription,
        inLanguage: "en-IN",
        isPartOf: { "@id": `${siteOrigin}/#website` },
        publisher: { "@id": `${siteOrigin}/#organization` },
        dateModified: latest?.generatedAt ?? latest?.publishedAt ?? latest?.digestDate
      },
      faqPageJsonLd(`${siteOrigin}/market-statistics/#faq`, marketStatsFaqItems())
    ])
  });
}

function movesHubPage(latest) {
  const pageTitle = "Why Stocks Move - Daily Nifty Stock Move Explanations | Market Narrative";
  const pageDescription = "Find out why Nifty, Bank Nifty and Indian stocks moved today with source-backed market move explanations and India read-through.";
  const body = `
    <section class="copy-stack">
      <h2>Why Indian stocks move</h2>
      <p>Market Narrative move articles explain the reason behind sharp moves in Nifty, Bank Nifty, sector indices, and important Indian stocks. The goal is simple: answer why the market rose or fell today without turning the page into tips, targets, or trade calls.</p>
      <h2>What each move article includes</h2>
      <p>Each article is designed to explain what happened, the source-backed reason, the India read-through, and what to watch next. For index moves, the article focuses on breadth, FII DII flow, crude oil, USD/INR, sector leadership, and whether Bank Nifty confirmed the move.</p>
      <h2>Latest briefing context</h2>
      <p>The latest full pre-market context is still the daily briefing. Move articles are post-event explainers; use them to understand the market, not as a recommendation to buy, sell, or hold securities.</p>
      <p><a class="inline-cta" href="/latest/">Open the latest Nifty pre-market briefing</a></p>
    </section>
  `;
  return staticSeoPage({
    path: "/moves/",
    pageTitle,
    pageDescription,
    eyebrow: "Move Explanations",
    h1: "Why Indian Stocks Move - Daily Explanations",
    bodyHtml: body,
    jsonLd: seoGraph([
      organizationJsonLd(),
      websiteJsonLd(),
      breadcrumbJsonLd([
        { name: "Market Narrative", url: `${siteOrigin}/` },
        { name: "Why Stocks Move", url: `${siteOrigin}/moves/` }
      ]),
      {
        "@type": "CollectionPage",
        "@id": `${siteOrigin}/moves/#webpage`,
        url: `${siteOrigin}/moves/`,
        name: pageTitle,
        description: pageDescription,
        inLanguage: "en-IN",
        isPartOf: { "@id": `${siteOrigin}/#website` },
        publisher: { "@id": `${siteOrigin}/#organization` },
        dateModified: latest?.generatedAt ?? latest?.publishedAt ?? latest?.digestDate
      }
    ])
  });
}

function contactPage() {
  const pageTitle = "Contact Market Narrative - Feedback, Corrections & Partnerships";
  const pageDescription = "Contact Market Narrative for feedback, data corrections, broken pages, press enquiries, or partnerships.";
  const body = `
    <section class="copy-stack">
      <h2>Feedback and corrections</h2>
      <p>Email <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a> for feedback, source corrections, data errors, broken pages, press enquiries, or partnerships. For data issues, include the page URL, the specific number or line that looks wrong, and the source you are comparing it with.</p>
      <h2>Response window</h2>
      <p>Corrections to market data or article inaccuracies are prioritised on trading days. Normal response time is within 48 hours; urgent data corrections are reviewed as soon as possible.</p>
    </section>
  `;
  return staticSeoPage({
    path: "/contact/",
    pageTitle,
    pageDescription,
    eyebrow: "Contact",
    h1: "Contact Market Narrative",
    bodyHtml: body,
    jsonLd: seoGraph([
      organizationJsonLd(),
      websiteJsonLd(),
      breadcrumbJsonLd([
        { name: "Market Narrative", url: `${siteOrigin}/` },
        { name: "Contact", url: `${siteOrigin}/contact/` }
      ]),
      {
        "@type": "ContactPage",
        "@id": `${siteOrigin}/contact/#webpage`,
        url: `${siteOrigin}/contact/`,
        name: pageTitle,
        description: pageDescription,
        inLanguage: "en-IN",
        isPartOf: { "@id": `${siteOrigin}/#website` },
        publisher: { "@id": `${siteOrigin}/#organization` }
      }
    ])
  });
}

function privacyPage() {
  const pageTitle = "Privacy Policy - Market Narrative";
  const pageDescription = "Plain-English privacy policy for Market Narrative, including analytics, external links, and contact details.";
  const body = `
    <section class="copy-stack">
      <p><strong>Last updated:</strong> ${escapeHtml(formatDigestDate(todayInIst()))}</p>
      <h2>What data we collect</h2>
      <p>Market Narrative does not require accounts or logins. The public briefing pages can be read without registration. If you join the email list, the email provider receives the address you submit so the daily brief can be delivered.</p>
      <h2>Analytics</h2>
      <p>The site may use Vercel Analytics or similar privacy-focused measurement to understand page performance and traffic patterns. We do not use advertising networks, third-party tracking pixels, or behavioural ad retargeting.</p>
      <h2>External links</h2>
      <p>Briefing pages link to source articles and market-data pages owned by third parties. Market Narrative is not responsible for their privacy practices or content.</p>
      <h2>Privacy contact</h2>
      <p>For privacy questions, email <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>. This policy is governed by the laws of India.</p>
    </section>
  `;
  return staticSeoPage({
    path: "/privacy/",
    pageTitle,
    pageDescription,
    eyebrow: "Privacy",
    h1: "Privacy Policy",
    bodyHtml: body,
    jsonLd: seoGraph([
      organizationJsonLd(),
      websiteJsonLd(),
      breadcrumbJsonLd([
        { name: "Market Narrative", url: `${siteOrigin}/` },
        { name: "Privacy Policy", url: `${siteOrigin}/privacy/` }
      ]),
      {
        "@type": "WebPage",
        "@id": `${siteOrigin}/privacy/#webpage`,
        url: `${siteOrigin}/privacy/`,
        name: pageTitle,
        description: pageDescription,
        inLanguage: "en-IN",
        isPartOf: { "@id": `${siteOrigin}/#website` },
        publisher: { "@id": `${siteOrigin}/#organization` }
      }
    ])
  });
}

function termsPage() {
  const pageTitle = "Terms of Use - Market Narrative";
  const pageDescription = "Plain-English terms of use for Market Narrative, including educational use, data accuracy, external links, and liability limits.";
  const body = `
    <section class="copy-stack">
      <h2>Educational market research only</h2>
      <p>Market Narrative publishes market information and analysis for educational purposes. Nothing on this site is SEBI-registered investment advice, a research recommendation, or a solicitation to buy or sell securities or derivatives.</p>
      <h2>Data accuracy</h2>
      <p>The site uses public market data, exchange information, publisher articles, and automated checks, but it cannot guarantee real-time accuracy. Always verify prices, levels, corporate announcements, and source articles before acting.</p>
      <h2>Intellectual property</h2>
      <p>The desk notes, explanations, page layouts, and interpretations are original Market Narrative content. Underlying market data and linked source articles remain owned by their respective publishers or data providers.</p>
      <h2>No liability</h2>
      <p>You are responsible for your own trading and investment decisions. Market Narrative is not liable for gains, losses, missed trades, data delays, source errors, or decisions made after reading the site.</p>
      <h2>External links and governing law</h2>
      <p>External links are provided for verification and context. Market Narrative does not control or endorse third-party pages. These terms are governed by the laws of India.</p>
    </section>
  `;
  return staticSeoPage({
    path: "/terms/",
    pageTitle,
    pageDescription,
    eyebrow: "Terms",
    h1: "Terms of Use",
    bodyHtml: body,
    jsonLd: seoGraph([
      organizationJsonLd(),
      websiteJsonLd(),
      breadcrumbJsonLd([
        { name: "Market Narrative", url: `${siteOrigin}/` },
        { name: "Terms of Use", url: `${siteOrigin}/terms/` }
      ]),
      {
        "@type": "WebPage",
        "@id": `${siteOrigin}/terms/#webpage`,
        url: `${siteOrigin}/terms/`,
        name: pageTitle,
        description: pageDescription,
        inLanguage: "en-IN",
        isPartOf: { "@id": `${siteOrigin}/#website` },
        publisher: { "@id": `${siteOrigin}/#organization` }
      }
    ])
  });
}

function staticSeoPage({ path, pageTitle, pageDescription, eyebrow, h1, bodyHtml, jsonLd, ogImageUrl = "" }) {
  const canonical = `${siteOrigin}${path}`;
  const socialImage = ogImageUrl || `${siteOrigin}/og-card.svg`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ${brandHeadLinks(siteOrigin)}
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <meta name="author" content="Abhey Deep">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <meta name="theme-color" content="#050816">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_IN">
  <meta property="og:site_name" content="Market Narrative">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(socialImage)}">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="675">\n  <meta property="og:image:type" content="${socialImage.endsWith(".jpg") ? "image/jpeg" : "image/svg+xml"}">\n  <meta property="og:image:alt" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(pageDescription)}">
  <meta name="twitter:image" content="${escapeHtml(socialImage)}">
  <title>${escapeHtml(pageTitle)}</title>
  ${jsonLdScript(jsonLd)}
  <style>
    :root { --paper:#050816; --ink:#f8fafc; --muted:#b8c4d8; --line:rgba(255,255,255,.14); --panel:rgba(15,23,42,.66); --cyan:#22d3ee; --green:#34d399; --red:#fb7185; }
    * { box-sizing: border-box; }
    html, body { margin:0; min-height:100%; overflow-x:hidden; }
    body { background: radial-gradient(circle at 15% 0%, rgba(34,211,238,.18), transparent 30vw), linear-gradient(135deg,#030712 0%,#08111f 48%,#111827 100%); color:var(--ink); font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif; -webkit-font-smoothing:antialiased; }
    a { color:inherit; text-decoration:none; }
    .shell { width:min(1040px, calc(100% - 36px)); margin:0 auto; }
    .topbar { position:sticky; top:0; z-index:20; background:rgba(3,7,18,.72); border-bottom:1px solid var(--line); backdrop-filter:blur(18px); }
    .nav-inner { align-items:center; display:flex; gap:16px; justify-content:space-between; min-height:64px; }
    .brand { align-items:center; display:flex; gap:12px; font-size:20px; font-weight:850; }
    ${brandMarkCss()}
    .tabs { align-items:center; display:flex; flex-wrap:wrap; gap:12px; }
    img, svg, video, canvas { max-width:100%; height:auto; }
    a, button, summary, input, select { touch-action:manipulation; }
    .tabs a { align-items:center; border:1px solid var(--line); border-radius:8px; color:var(--muted); display:inline-flex; font-size:13px; font-weight:800; min-height:44px; padding:8px 10px; }
    main { padding:52px 0 36px; }
    .hero { border-bottom:1px solid var(--line); margin-bottom:28px; padding-bottom:28px; }
    .eyebrow { color:var(--cyan); font-size:12px; font-weight:950; letter-spacing:.12em; margin:0 0 12px; text-transform:uppercase; }
    h1 { font-size:clamp(38px,7vw,68px); letter-spacing:0; line-height:1; margin:0; max-width:900px; }
    .hero p { color:var(--muted); font-size:18px; line-height:1.65; margin:18px 0 0; max-width:820px; }
    .copy-stack { display:grid; gap:16px; }
    .copy-stack h2, .faq-section h2 { color:var(--ink); font-size:24px; letter-spacing:0; margin:20px 0 0; }
    .copy-stack p, .faq-section p { color:var(--muted); font-size:16px; line-height:1.75; margin:0; max-width:860px; }
    .copy-stack a, .inline-cta { color:#cffafe; font-weight:900; text-decoration:underline; text-underline-offset:3px; }
    .metric-grid { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); margin-bottom:28px; }
    .metric-card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:16px; }
    .metric-card span { color:var(--muted); display:block; font-size:12px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
    .metric-card strong { display:block; font-size:28px; margin:8px 0; }
    .metric-card strong.up { color:var(--green); }
    .metric-card strong.down { color:var(--red); }
    .metric-card p { color:var(--muted); font-size:13px; line-height:1.5; margin:0; }
    .faq-section { border-top:1px solid var(--line); margin-top:30px; padding-top:22px; }
    .faq-list { display:grid; gap:10px; margin-top:14px; }
    .faq-list details { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:15px; }
    .faq-list summary { cursor:pointer; font-weight:850; line-height:1.35; }
    .faq-list p { margin-top:10px; }
    .site-footer-links { border-top:1px solid var(--line); color:var(--muted); display:flex; flex-wrap:wrap; gap:12px; margin-top:34px; padding:24px 0 36px; }
    .site-footer-links a { border:1px solid var(--line); border-radius:8px; color:var(--ink); font-size:13px; font-weight:800; padding:9px 11px; }
    .disclaimer { color:var(--muted); font-size:12px; line-height:1.6; margin-top:16px; }
    @media (max-width:720px) {
      .nav-inner { align-items:flex-start; flex-direction:column; padding:12px 0; }
      .tabs { overflow-x:auto; width:100%; flex-wrap:nowrap; -webkit-overflow-scrolling:touch; }
      main { padding-top:34px; }
      .metric-grid { grid-template-columns:1fr; }
      .copy-stack h2, .faq-section h2 { font-size:20px; line-height:1.2; }
    }
    ${bottomTabBarCss()}
    ${mobileTypographyCss()}
    ${proPolishCss()}
  </style>
</head>
<body class="has-btb">
  <nav class="topbar">
    <div class="shell nav-inner">
      <a class="brand" href="/">${brandMarkHtml()}<span>Market Narrative</span></a>
      <div class="tabs" aria-label="Market Narrative sections">
        <a href="/">Archive</a>
        <a href="/latest/">Latest Briefing</a>
        <a href="/money-flow/fii-dii/">FII/DII</a>
        <a href="/market-statistics/">Statistics</a>
        <a href="/moves/">Moves</a>
        <a href="/about/">About</a>
      </div>
    </div>
  </nav>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">${escapeHtml(eyebrow)}</p>
      <h1>${escapeHtml(h1)}</h1>
      <p>${escapeHtml(pageDescription)}</p>
    </section>
    ${bodyHtml}
    ${siteFooterLinksHtml()}
    <p class="disclaimer">Educational market research only; this is not SEBI-registered investment advice, a research recommendation, or a solicitation to buy or sell securities or derivatives. No returns are assured; use your own risk plan.</p>
  </main>
  ${bottomTabBarHtml(staticPageActiveKey(path))}
  ${mobileShellScript()}
</body>
</html>`;
}

function staticPageActiveKey(path) {
  if (path === "/") return "archive";
  if (path.startsWith("/latest/")) return "latest";
  if (path.startsWith("/multibagger/")) return "portfolio";
  if (path.startsWith("/subscribe/")) return "subscribe";
  return "more";
}

function archivePageJsonLd(latest, digests, pageTitle, pageDescription, faqItems = []) {
  return seoGraph([
    organizationJsonLd(),
    websiteJsonLd(),
    breadcrumbJsonLd([
      { name: "Market Narrative", url: `${siteOrigin}/` }
    ]),
    {
      "@type": "CollectionPage",
      "@id": `${siteOrigin}/#archive`,
      url: `${siteOrigin}/`,
      name: pageTitle,
      description: pageDescription,
      inLanguage: "en-IN",
      isPartOf: { "@id": `${siteOrigin}/#website` },
      publisher: { "@id": `${siteOrigin}/#organization` },
      author: { "@id": `${siteOrigin}/about/#abhey-deep` },
      about: ["Nifty 50", "Bank Nifty", "GIFT Nifty", "Indian stock market", "pre-market briefing"],
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: digests.length,
        itemListElement: digests.slice(0, 8).map((digest, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${siteOrigin}/${slugForDigest(digest)}/`,
          name: digest.title || `${formatDigestDate(digest.digestDate)} Market Narrative briefing`,
          datePublished: digest.publishedAt ?? `${digest.digestDate}T07:15:00+05:30`
        }))
      },
      dateModified: latest?.generatedAt ?? latest?.publishedAt ?? latest?.digestDate
    },
    faqPageJsonLd(`${siteOrigin}/#faq`, faqItems)
  ]);
}

function aboutPageJsonLd(pageTitle, pageDescription) {
  return seoGraph([
    organizationJsonLd(),
    websiteJsonLd(),
    personJsonLd(),
    breadcrumbJsonLd([
      { name: "Market Narrative", url: `${siteOrigin}/` },
      { name: "About Abhey Deep", url: `${siteOrigin}/about/` }
    ]),
    {
      "@type": "AboutPage",
      "@id": `${siteOrigin}/about/#webpage`,
      url: `${siteOrigin}/about/`,
      name: pageTitle,
      description: pageDescription,
      inLanguage: "en-IN",
      isPartOf: { "@id": `${siteOrigin}/#website` },
      publisher: { "@id": `${siteOrigin}/#organization` },
      mainEntity: { "@id": `${siteOrigin}/about/#abhey-deep` }
    }
  ]);
}

function subscribePageJsonLd(pageTitle, pageDescription) {
  return seoGraph([
    organizationJsonLd(),
    websiteJsonLd(),
    breadcrumbJsonLd([
      { name: "Market Narrative", url: `${siteOrigin}/` },
      { name: "Subscribe", url: `${siteOrigin}/subscribe/` }
    ]),
    {
      "@type": "WebPage",
      "@id": `${siteOrigin}/subscribe/#webpage`,
      url: `${siteOrigin}/subscribe/`,
      name: pageTitle,
      description: pageDescription,
      inLanguage: "en-IN",
      isPartOf: { "@id": `${siteOrigin}/#website` },
      publisher: { "@id": `${siteOrigin}/#organization` },
      potentialAction: {
        "@type": "RegisterAction",
        target: `${siteOrigin}/subscribe/`,
        name: "Join the Market Narrative daily email brief"
      }
    }
  ]);
}

function indicesPageJsonLd(pageTitle, pageDescription, digest) {
  const snapshots = (digest.marketSnapshots ?? [])
    .filter((snapshot) => snapshot?.symbol)
    .slice(0, 20);
  return seoGraph([
    organizationJsonLd(),
    websiteJsonLd(),
    breadcrumbJsonLd([
      { name: "Market Narrative", url: `${siteOrigin}/` },
      { name: "Global Indices Watch", url: `${siteOrigin}/indices/` }
    ]),
    {
      "@type": "WebPage",
      "@id": `${siteOrigin}/indices/#webpage`,
      url: `${siteOrigin}/indices/`,
      name: pageTitle,
      description: pageDescription,
      inLanguage: "en-IN",
      isPartOf: { "@id": `${siteOrigin}/#website` },
      publisher: { "@id": `${siteOrigin}/#organization` },
      about: ["Nifty 50", "Bank Nifty", "GIFT Nifty", "Asian markets", "US markets", "Brent crude", "USD INR"],
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: snapshots.length,
        itemListElement: snapshots.map((snapshot, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: marketDisplayNameForSnapshot(snapshot),
          item: {
            "@type": "Thing",
            name: marketDisplayNameForSnapshot(snapshot),
            alternateName: snapshot.symbol,
            description: `${marketDisplayNameForSnapshot(snapshot)} reference move: ${formatSnapshotChange(snapshot)}`
          }
        }))
      }
    }
  ]);
}

function seoGraph(nodes) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean)
  };
}

function homepageSeoSectionHtml() {
  const sections = [
    {
      title: "What is Market Narrative?",
      body: "Market Narrative is a pre market analysis nifty briefing for Indian traders who want a clear read before the cash market opens. The daily briefing covers Nifty 50, Bank Nifty, global cues, institutional flow, and the first confirmation levels to watch at 9:15 AM IST. It is published before 7:15 AM IST on trading days and written for readers who need context, not noise."
    },
    {
      title: "What the briefing covers every morning",
      body: "Each Nifty today analysis combines GIFT Nifty today context, FII DII data today, crude oil impact for India, Asia market cues, Bank Nifty analysis today, and the opening bias. The goal is to show what changed overnight, which sector has the market nerve, and what must confirm before the first move deserves weight."
    },
    {
      title: "How to read the pre-market briefing",
      body: "Start with the 2-minute summary, then use the Trading Guide levels only as conditional preparation. The desk note explains the story; the opening range decides whether it matters. Searchers looking for a Nifty prediction today should read Market Narrative as a conditional market map, not a certainty."
    },
    {
      title: "Why FII DII data matters for Nifty",
      body: "FII selling today can pressure Nifty when it arrives with weak breadth, USD/INR stress, or index-futures shorts. DII absorption changes the read: strong domestic buying can cushion foreign outflow. That institutional flow is one of the most important pre-market signals for Indian stock market analysis today."
    },
    {
      title: "Published before 7:15 AM IST every trading day",
      body: "The site is built for the morning window before the Indian cash open. Read it alongside your broker terminal, official exchange data, and live charts. Market Narrative is share market analysis today India readers can scan quickly, then verify with opening breadth and Bank Nifty confirmation."
    },
    {
      title: "Free and no account required",
      body: "The public archive, latest briefing, FII DII page, market statistics, and move explainers are free to read. No account is required. The positioning is simple: Indian stock market analysis today, written with source links and a no-advice boundary."
    }
  ];
  return `
    <section class="seo-section" aria-label="About this Nifty pre-market briefing">
      <h2>What is Market Narrative?</h2>
      <div class="seo-grid">
        ${sections.map((section) => `
          <article class="seo-copy-card">
            <h3>${escapeHtml(section.title)}</h3>
            <p>${escapeHtml(section.body)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function homepageFaqItems() {
  return [
    {
      name: "What is a pre-market analysis for Nifty?",
      text: "A pre-market analysis for Nifty is a morning read of the global and domestic signals likely to shape the Nifty 50 open before 9:15 AM IST. It looks at GIFT Nifty, FII DII flow, US markets, Asian markets, crude oil, USD/INR, and Bank Nifty confirmation."
    },
    {
      name: "How does GIFT Nifty affect Nifty's opening?",
      text: "GIFT Nifty trades before NSE opens and gives a rough indication of the gap direction. The gap does not guarantee follow-through; cash-market breadth, Bank Nifty participation, and the first opening range decide whether the move holds."
    },
    {
      name: "What is the best time to read pre-market analysis for Indian stocks?",
      text: "The useful window is usually 7:00 AM to 9:00 AM IST. By then US markets have closed, Asian markets are active, and crude, dollar, gold, and GIFT Nifty signals can be compared before the Indian cash market opens."
    },
    {
      name: "How does crude oil affect Nifty and Bank Nifty?",
      text: "Crude oil affects India through fuel costs, inflation expectations, the trade deficit, USD/INR, OMCs, aviation, tyres, paints, and rate expectations. Bank Nifty needs separate confirmation because crude can move macro sentiment without directly moving bank breadth."
    },
    {
      name: "What does Bank Nifty confirmation mean?",
      text: "Bank Nifty confirmation means banking stocks support the Nifty move. If Nifty rises but Bank Nifty lags, the move is weaker. If both hold VWAP and breadth improves, the opening move has better confirmation."
    },
    {
      name: "Is Market Narrative free to use?",
      text: "Yes. The latest briefing, archive, FII DII page, market statistics, indices board, and move explanations are free to read. The site publishes educational market research only, not investment advice."
    }
  ];
}

function fiiDiiFaqItems() {
  return [
    {
      name: "What is FII DII data and why does it matter?",
      text: "FII DII data shows how much foreign and domestic institutional investors bought or sold in Indian equities. Because these flows are large, they often influence Nifty, Bank Nifty, and sector breadth."
    },
    {
      name: "What does FII DII data today mean for Nifty tomorrow?",
      text: "FII DII data is one input for the next session's opening bias. FII selling with weak DII absorption is pressure; FII selling absorbed by strong DII buying is less bearish and needs confirmation from the opening range."
    },
    {
      name: "Why does Nifty fall when FII sells?",
      text: "Nifty can fall when FIIs sell because foreign institutions own a meaningful share of the free float. The signal is stronger when cash selling aligns with index futures shorts, weak breadth, and rupee pressure."
    },
    {
      name: "What is the DII absorption ratio?",
      text: "The DII absorption ratio compares domestic institutional buying with FII net selling. A ratio above 100% means DIIs bought more than FIIs sold, which can cushion the market."
    }
  ];
}

function marketStatsFaqItems() {
  return [
    {
      name: "What is Nifty advance decline ratio?",
      text: "The advance decline ratio compares the number of rising stocks with falling stocks. A broad rally has healthier participation than an index move driven by a few heavyweights."
    },
    {
      name: "What does India VIX tell traders?",
      text: "India VIX measures expected volatility through options pricing. Rising VIX into a rally can signal hedging, while falling VIX with breadth support usually makes a move cleaner."
    },
    {
      name: "Why does market breadth matter for Nifty traders?",
      text: "Breadth shows whether the market move is broad or narrow. A Nifty gap is more reliable when Bank Nifty, sector breadth, and advance-decline participation confirm it."
    }
  ];
}

function homepageFaqSectionHtml(items) {
  return `
    <section class="faq-section" id="faq">
      <h2>Nifty pre-market analysis FAQ</h2>
      ${faqDetailsHtml(items)}
    </section>
  `;
}

function faqDetailsHtml(items) {
  return `
    <div class="faq-list">
      ${items.map((item) => `
        <details>
          <summary>${escapeHtml(item.name)}</summary>
          <p>${escapeHtml(item.text)}</p>
        </details>
      `).join("")}
    </div>
  `;
}

function faqPageJsonLd(id, items) {
  if (!items.length) {
    return null;
  }
  return {
    "@type": "FAQPage",
    "@id": id,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.name,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.text
      }
    }))
  };
}

function siteFooterLinksHtml() {
  return `
    <footer class="site-footer-links" aria-label="Market Narrative site links">
      <a href="/">Archive</a>
      <a href="/latest/">Latest briefing</a>
      <a href="/money-flow/fii-dii/">FII DII data</a>
      <a href="/market-statistics/">Market statistics</a>
      <a href="/indices/">Global indices</a>
      <a href="/moves/">Move explanations</a>
      <a href="/multibagger/">Portfolio tracker</a>
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
      <a href="/privacy/">Privacy Policy</a>
      <a href="/terms/">Terms of Use</a>
    </footer>
  `;
}

function formatCrore(value) {
  const sign = Number(value) >= 0 ? "+" : "-";
  const abs = Math.abs(Number(value) || 0);
  return `${sign}Rs ${Number(abs.toFixed(0)).toLocaleString("en-IN")} cr`;
}

function marketHealthScore(snapshots, flow) {
  const valid = snapshots.filter((snapshot) => Number.isFinite(Number(snapshot.changePercent)));
  const positives = valid.filter((snapshot) => Number(snapshot.changePercent) > 0).length;
  const breadthScore = valid.length ? positives / valid.length : 0.5;
  const vix = valid.find((snapshot) => snapshot.symbol === "INDIAVIX");
  const vixPenalty = Number(vix?.changePercent ?? 0) > 2 ? 10 : 0;
  const flowBoost = Number(flow?.diiNet ?? 0) > Math.abs(Number(flow?.fiiNet ?? 0)) ? 8 : 0;
  const score = Math.max(0, Math.min(100, Math.round(45 + breadthScore * 45 + flowBoost - vixPenalty)));
  const label = score >= 70
    ? "supportive but still needs opening-range confirmation"
    : score >= 45
      ? "mixed; Bank Nifty and breadth must confirm"
      : "defensive; avoid treating a gap as confirmation";
  return { score, label };
}

function organizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": `${siteOrigin}/#organization`,
    name: "Market Narrative",
    url: `${siteOrigin}/`,
    logo: {
      "@type": "ImageObject",
      url: `${siteOrigin}/favicon.svg`
    },
    founder: { "@id": `${siteOrigin}/about/#abhey-deep` },
    description: "Daily Indian pre-market briefing for Nifty 50 and Bank Nifty traders, with FII DII data, GIFT Nifty context, source cards and market statistics.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      email: contactEmail
    }
  };
}

function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${siteOrigin}/#website`,
    name: "Market Narrative",
    alternateName: ["Market Narrative India", "Abhey Deep Market Narrative"],
    url: `${siteOrigin}/`,
    description: "Daily pre-market briefing for Nifty 50 and Bank Nifty traders published at 7:15 AM IST on trading days.",
    inLanguage: "en-IN",
    publisher: { "@id": `${siteOrigin}/#organization` }
  };
}

function personJsonLd() {
  return {
    "@type": "Person",
    "@id": `${siteOrigin}/about/#abhey-deep`,
    name: "Abhey Deep",
    url: `${siteOrigin}/about/`,
    worksFor: { "@id": `${siteOrigin}/#organization` },
    jobTitle: "Software engineer and Indian market trader",
    description: "Abhey Deep builds Market Narrative, a daily Nifty and Bank Nifty pre-market briefing focused on source verification and trader-ready context."
  };
}

function breadcrumbJsonLd(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

function jsonLdScript(value) {
  return `<script type="application/ld+json">${jsonLdPayload(value)}</script>`;
}

function jsonLdPayload(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}

function archiveSourceQualityLine(digest) {
  if (isPublicationEvent(digest)) {
    if (isBackfilledEvent(digest)) {
      const count = digest.publicationEvent.sources?.length ?? 0;
      return `${digest.publicationEvent.label} - ${count} article-level source links - ${evidenceGradeLabel(digest.publicationEvent.evidenceGrade)}`;
    }
    return `${digest.publicationEvent.label} - no verified public briefing was archived for this date`;
  }
  const verification = digest.sourceVerification;
  if (!verification) {
    return "Edition archived";
  }
  if (digest.publicSourceSelection) {
    const indiaCoverage = digest.publicSourceSelection.indiaPublisherCoverage
      ? ` - ${digest.publicSourceSelection.indiaPublisherCoverage}`
      : "";
    return `Top ${digest.publicSourceSelection.visibleCount} India read-through notes selected from ${verification.verifiedArticleCount} verified article links${indiaCoverage}`;
  }
  const blocked = verification.blockedReason ? ` - blocked: ${verification.blockedReason}` : "";
  return `${verification.verifiedArticleCount} verified article links - ${verification.publisherCount} publishers - ${verification.categoryCount} categories - ${verification.mode} mode${blocked}`;
}

function isPublicationEvent(digest) {
  return Boolean(digest?.publicationEvent);
}

function isBackfilledEvent(digest) {
  return isPublicationEvent(digest) && digest.publicationEvent.status === "backfilled_context";
}

function subscribeHref() {
  return subscribeUrl;
}

function homepageLatestState(latest) {
  const latestDate = latest?.digestDate || "";
  const buildDate = publicBuildDate;
  const calendar = marketCalendarState(buildDate);
  if (latestDate === buildDate && publicLatestStatus !== "verification-hold" && publicLatestStatus !== "market-closed") {
    return {
      kind: "published",
      className: "live",
      label: "Today's briefing is live",
      title: `Verified ${formatDigestDate(latestDate)} pre-market read`,
      detail: "Use the latest briefing for the 7:15 AM IST market map, then confirm with the Trading Guide before the cash open.",
      ctaLabel: "Open today's brief",
      ctaHref: "./latest/"
    };
  }
  if (publicLatestStatus === "market-closed" || !calendar.isTradingSession) {
    const closedLabel = calendar.state === "exchange_holiday" ? "Market holiday" : "Market closed today";
    return {
      kind: "market-closed",
      className: "closed",
      label: closedLabel,
      title: `No trading-day brief for ${formatDigestDate(buildDate)}`,
      detail: `Latest verified trading-day edition: ${formatDigestDate(latestDate)}. Treat it as archive context until the next open.`,
      ctaLabel: "Open status page",
      ctaHref: "./latest/"
    };
  }
  return {
    kind: "verification-hold",
    className: "hold",
    label: "Under Verification",
    title: "Today's brief is being verified — check back shortly.",
    detail: `Last published: ${formatDigestDate(latestDate)}.`,
    ctaLabel: "Review latest status",
    ctaHref: "./latest/"
  };
}

function homepagePrimaryAction(state, latest) {
  if (state.kind === "published") {
    return {
      label: "Read today's brief",
      detail: "Start with the verified 2-minute pre-market read."
    };
  }
  return {
    label: state.kind === "market-closed" ? "Check market status" : "Check latest status",
    detail: `Latest verified trading-day edition: ${formatDigestDate(latest.digestDate)}.`
  };
}

function homepageFreshnessBannerHtml(state) {
  return `
    <div class="freshness-banner ${escapeHtml(state.className)}" role="status" aria-label="Latest briefing status">
      <div>
        <span>${escapeHtml(state.label)}</span>
        <strong>${escapeHtml(state.title)}</strong>
        <p>${escapeHtml(state.detail)}</p>
      </div>
      <a href="${escapeHtml(state.ctaHref)}">${escapeHtml(state.ctaLabel)}</a>
    </div>
  `;
}

function verifiedEditionCount(digests) {
  const verifiedCount = (digests ?? []).filter(isVerifiedPublicDigest).length;
  return verifiedCount || (digests ?? []).length;
}

function archiveFilterOptions(digests) {
  // Unused now since we have a hardcoded list, but kept for compatibility if needed elsewhere
  return "";
}

function archiveSearchText(digest, chips = archiveChips(digest)) {
  return [
    digest.digestDate,
    formatDigestDate(digest.digestDate),
    digest.title,
    digest.dailyLead?.label,
    digest.dailyLead?.driverType,
    digest.dailyLead?.indiaImpact,
    digest.archiveSummary,
    digest.sentimentLabel,
    archiveFocus(digest),
    ...chips,
    ...(digest.news ?? []).flatMap((article) => [
      article.headline,
      article.entityName,
      article.category,
      article.sourceName,
      article.indiaImpact,
      article.watchFor
    ])
  ].filter(Boolean).join(" ").toLowerCase();
}

function archiveTagValues(digest, chips = archiveChips(digest)) {
  const text = [
    digest.dailyLead?.driverType,
    digest.dailyLead?.label,
    digest.dailyLead?.summary,
    ...chips,
    ...digest.marketSnapshots?.map(s => s.symbol) || [],
    ...(digest.news || []).map(n => n.category + " " + n.takeaway)
  ].join(" ").toLowerCase();

  const tags = [];
  if (text.match(/crude|energy|brent|oil|opec/)) tags.push("crude-energy");
  if (text.match(/bank|bnf|hdfc|icici/)) tags.push("banks");
  if (text.match(/rate|yield|bond|fed |rbi /)) tags.push("rates");
  if (text.match(/tech|nasdaq|it |tcs|infosys/)) tags.push("global-tech");
  if (text.match(/currenc|usdinr|rupee|dxy/)) tags.push("currency");
  if (text.match(/geopolitic|war|israel|iran|russia/)) tags.push("geopolitical");

  return tags;
}

function slugifyTag(value) {
  return cleanArchiveSentence(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCaseTag(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.length <= 3 ? part.toUpperCase() : `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function archiveShareRowHtml() {
  const url = `${siteOrigin}/`;
  const text = "Market Narrative pre-market briefing archive";
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  return `
    <div class="share-row" aria-label="Share Market Narrative archive">
      <span>Share this archive</span>
      <a class="share-link" href="https://wa.me/?text=${encodedText}%20${encodedUrl}" target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" title="Share on WhatsApp">${shareIconHtml("whatsapp")}<span class="sr-only">WhatsApp</span></a>
      <a class="share-link" href="https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}" target="_blank" rel="noopener noreferrer" aria-label="Share on X" title="Share on X">${shareIconHtml("x")}<span class="sr-only">X</span></a>
      <a class="share-link" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn" title="Share on LinkedIn">${shareIconHtml("linkedin")}<span class="sr-only">LinkedIn</span></a>
      <button class="share-copy-btn" type="button" data-copy-url="${escapeHtml(url)}" aria-label="Copy link" title="Copy link">${shareIconHtml("copy")}<span class="sr-only">Copy link</span></button>
    </div>
  `;
}

function shareIconHtml(type) {
  const icons = {
    whatsapp: `<svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.1 19.2 6 16.1a7.6 7.6 0 1 1 2.9 2.6l-3.8.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.1 8.6c.2-.4.4-.5.7-.5h.5c.2 0 .4.1.5.4l.7 1.7c.1.3 0 .5-.2.7l-.4.4c.6 1.1 1.5 2 2.7 2.6l.5-.5c.2-.2.4-.3.7-.2l1.6.8c.3.1.4.3.4.6v.4c0 .4-.2.7-.5.9-.7.4-1.9.3-3.3-.4-1.6-.8-3-2.1-3.8-3.8-.7-1.4-.9-2.5-.6-3.1Z" fill="currentColor"/></svg>`,
    x: `<svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5l14 14M19 5 5 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
    linkedin: `<svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10v7M8 7.7v.1M12 17v-4.1c0-1.7 1-2.9 2.6-2.9 1.5 0 2.4 1 2.4 2.9V17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`,
    copy: `<svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8" y="8" width="10" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M6 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`
  };
  return icons[type] || icons.copy;
}

function recentArchiveGridHtml(digests) {
  const items = (digests ?? []).map((digest) => {
    const verified = isVerifiedPublicDigest(digest);
    const slug = slugForDigest(digest);
    const title = isPublicationEvent(digest)
      ? compactWords(digest.title || "Publication record", 10)
      : verified
      ? compactWords(digest.title || "Market briefing", 10)
      : "Archived market briefing";
    const status = isPublicationEvent(digest)
      ? digest.publicationEvent.label
      : verified
      ? `${digest.sourceVerification.verifiedArticleCount} verified links`
      : "Edition archived";
    return `
      <a class="recent-archive-link" href="./${slug}/">
        <span>${escapeHtml(formatDigestDate(digest.digestDate))}</span>
        <strong>${escapeHtml(title)}</strong>
        <small class="recent-status${verified ? "" : " archived"}">${escapeHtml(status)}</small>
      </a>
    `;
  }).join("");
  return `<div class="recent-archive-grid">${items}</div>`;
}

function archiveMarketSnapshotHtml(digest) {
  const symbols = ["NIFTY", "BANKNIFTY", "DXY", "BRENT"];
  const snapshots = symbols
    .map((symbol) => (digest.marketSnapshots ?? []).find((item) => item.symbol === symbol))
    .filter(Boolean)
    .slice(0, 4);
  if (!snapshots.length) {
    return "";
  }
  return `
    <div class="archive-snapshot-grid" aria-label="Market snapshot summary">
      ${snapshots.map((snapshot) => `
        <article class="archive-snapshot">
          <span>${escapeHtml(snapshot.symbol)}</span>
          <strong>${escapeHtml(formatSnapshotValue(snapshot))}</strong>
        </article>
      `).join("")}
    </div>
  `;
}

function archiveSourcePreviewHtml(digest) {
  const sources = weightedArchiveSources(digest).slice(0, 3);
  if (!sources.length) {
    return "";
  }
  return `
    <div class="archive-source-preview" aria-label="Source headline preview">
      ${sources.map((article) => `
        <article class="archive-source-row">
          <span>${escapeHtml(article.sourceName || "Source")}</span>
          <strong>${escapeHtml(compactWords(article.headline || article.title || "", 13))}</strong>
          ${sourceUrlLooksArticleLevel(article.sourceUrl)
            ? `<a href="${escapeHtml(article.sourceUrl)}" target="_blank" rel="noreferrer">Read source</a>`
            : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function weightedArchiveSources(digest) {
  return [...(digest.news ?? [])].sort((left, right) => impactScore(right) - impactScore(left));
}

function archiveCardTitle(digest) {
  if (isPublicationEvent(digest)) {
    return digest.title || "Publication record";
  }
  return isVerifiedPublicDigest(digest) ? digest.title : "Archived market briefing";
}

function archiveOpenLabel(digest) {
  return isPublicationEvent(digest) ? "Read publication record" : "Open briefing";
}

function formatSnapshotValue(snapshot) {
  const value = Number.isFinite(Number(snapshot.closeValue)) ? Number(snapshot.closeValue).toFixed(2) : "n/a";
  const change = Number.isFinite(Number(snapshot.changePercent)) ? ` (${formatSnapshotChange(snapshot)})` : "";
  return `${snapshot.name || snapshot.symbol}: ${value}${change}`;
}

function archiveCardSummary(digest) {
  if (isPublicationEvent(digest)) {
    return digest.publicationEvent.summary;
  }
  if (!isVerifiedPublicDigest(digest)) {
    return "Archived continuity page. Newer editions use verified article-level sources and India read-through selection.";
  }
  if (digest.dailyLead?.indiaImpact) {
    let summary = digest.dailyLead.indiaImpact;
    summary = summary.replace(/^[^:]+:\s*/i, ""); // Remove any leading label like "Direct index read-through:"
    return compactWords(summary, 38);
  }
  if (digest.archiveSummary) {
    return digest.archiveSummary;
  }
  const primary = cleanArchiveSentence(digest.themes?.[0]?.summary);
  const driver = highestImpactArticle(digest);
  const secondary = cleanArchiveSentence(driver?.indiaImpact || driver?.takeaway || driver?.summary);
  return compactWords([primary, secondary].filter(Boolean).join(" "), 38) || "A disciplined pre-market read for index levels, sector context, and the opening range.";
}

function previousSessionDriver(digest) {
  if (isPublicationEvent(digest)) {
    return digest.publicationEvent.reason;
  }
  if (digest.dailyLead?.indiaImpact) {
    return cleanArchiveSentence(digest.dailyLead.indiaImpact);
  }
  const driver = highestImpactArticle(digest);
  return (
    cleanArchiveSentence(driver?.takeaway || driver?.indiaImpact || driver?.summary) ||
    cleanArchiveSentence(digest.themes?.[0]?.summary) ||
    "Global cues and domestic breadth set the tone for the opening range."
  );
}

function titleForDailyLead(dailyLead) {
  const text = `${dailyLead?.label || ""} ${dailyLead?.headline || ""} ${dailyLead?.indiaImpact || ""}`.toLowerCase();
  if (dailyLead?.driverType === "crude" && /\b(iran|hormuz|trump|strike|war|deal)\b/.test(text)) {
    return "Iran Deal Hopes Pull Brent Below $90";
  }
  return {
    crude: "Brent Move Sets The Morning Risk",
    rates: "Rates Shape Opening Range",
    currency: "Currency Pressure Tests Nifty Open",
    tech: "Tech Breadth Tests Nifty Follow-Through",
    banks: "Bank Nifty Breadth Sets The Open",
    asia: "Asia Risk Appetite Frames Nifty Open",
    market: "Market Breadth Shapes Nifty Open"
  }[dailyLead.driverType] || `${dailyLead.label || "Market Breadth"} Shapes Nifty Open`;
}

function archiveToneClass(digest) {
  if (isPublicationEvent(digest)) {
    return "tone-neutral";
  }
  const label = String(digest.sentimentLabel ?? "").toUpperCase();
  if (label === "BULLISH") {
    return "tone-bullish";
  }
  if (label === "BEARISH") {
    return "tone-bearish";
  }
  return "tone-neutral";
}

function sentimentSparklineHtml(digest) {
  const toneClass = archiveToneClass(digest);
  const label = String(digest.sentimentLabel ?? "neutral").toLowerCase();
  const paths = {
    "tone-bullish": {
      line: "M4 23 C18 20 26 18 36 14 C48 9 58 11 72 5",
      area: "M4 23 C18 20 26 18 36 14 C48 9 58 11 72 5 L72 28 L4 28 Z"
    },
    "tone-bearish": {
      line: "M4 6 C18 9 28 10 38 15 C50 21 60 22 72 26",
      area: "M4 6 C18 9 28 10 38 15 C50 21 60 22 72 26 L72 28 L4 28 Z"
    },
    "tone-neutral": {
      line: "M4 16 C15 9 25 23 36 16 C48 9 57 22 72 15",
      area: "M4 16 C15 9 25 23 36 16 C48 9 57 22 72 15 L72 28 L4 28 Z"
    }
  }[toneClass];
  return `
    <span class="sentiment-sparkline" role="img" aria-label="Market bias: ${escapeHtml(label)}">
      <svg viewBox="0 0 76 32" aria-hidden="true" focusable="false">
        <path class="spark-area" d="${paths.area}"></path>
        <path class="spark-line" d="${paths.line}"></path>
      </svg>
    </span>
  `;
}

function archiveChips(digest) {
  if (isPublicationEvent(digest)) {
    return isBackfilledEvent(digest)
      ? ["Backfilled", "Global cue only", "Historical context"]
      : ["Publication record", "No public brief", "Hold"];
  }
  const leadChip = digest.dailyLead?.label ? compactWords(cleanArchiveSentence(digest.dailyLead.label), 3) : "";
  const articles = weightedArchiveSources(digest).slice(0, 3);
  const chips = articles.map((article) =>
    compactWords(cleanArchiveSentence(article.entityName || article.category || article.sourceName || "Market"), 3)
  ).filter(Boolean);
  return [...new Set([leadChip, ...chips].filter(Boolean))].slice(0, 3);
}

function archiveFocus(digest) {
  if (isPublicationEvent(digest)) {
    return isBackfilledEvent(digest) ? "Backfilled context" : "Publication record";
  }
  if (digest.dailyLead?.label) {
    let focusLabel = digest.dailyLead.label.replace(/breadth/ig, "confirmation");
    return compactWords(cleanArchiveSentence(focusLabel), 4);
  }
  const driver = highestImpactArticle(digest);
  if (driver) {
    return compactWords(cleanArchiveSentence(driver.entityName || driver.category || "Opening range"), 4);
  }
  const title = cleanArchiveSentence(digest.themes?.[0]?.title);
  return title ? compactWords(title, 4) : "Opening range";
}

function highestImpactArticle(digest) {
  return [...(digest.news ?? [])].sort((left, right) => impactScore(right) - impactScore(left))[0] ?? null;
}

function evidenceGradeLabel(value) {
  return {
    full: "Full India-source briefing",
    limited: "Limited briefing",
    global_cue_only: "Global cue only",
    held: "Held"
  }[String(value || "").toLowerCase()] || "Backfilled context";
}

function impactScore(article) {
  return Math.abs(articleTone(article)) * Math.max(0.5, Number.isFinite(Number(article?.entityMatchScore)) ? Number(article.entityMatchScore) : 1);
}

function articleTone(article) {
  if (Number.isFinite(Number(article?.sentimentScore))) {
    return Number(article.sentimentScore);
  }
  const label = String(article?.sentimentLabel || "").toLowerCase();
  if (label.includes("positive") || label.includes("bullish")) return 0.35;
  if (label.includes("negative") || label.includes("bearish")) return -0.35;
  return 0;
}

function cleanArchiveSentence(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

function compactWords(value, maxWords) {
  const words = cleanArchiveSentence(value).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function indicesPage(digest) {
  const groups = [
    ["India", ["NIFTY", "BANKNIFTY", "GIFTNIFTY", "INDIAVIX"]],
    ["US Overnight", ["SPX", "NDX", "DJI"]],
    ["Asia", ["NIKKEI", "HSI", "SHCOMP", "KOSPI", "TAIEX", "STI", "ASX200"]],
    ["Macro", ["BRENT", "DXY", "USDINR", "GOLD"]]
  ]
    .map(([title, symbols]) => {
      const snapshots = symbols
        .map((symbol) => (digest.marketSnapshots ?? []).find((item) => item.symbol === symbol))
        .filter(Boolean);
      if (!snapshots.length) return "";
      return `
        <section class="indices-group">
          <div class="indices-group-head">
            <h2>${escapeHtml(title)}</h2>
            <span>${escapeHtml(snapshots.length)} tracked</span>
          </div>
          <div class="indices-grid">
            ${snapshots.map(indexSnapshotCard).join("")}
          </div>
        </section>
      `;
    })
    .join("");
  const lastUpdated = formatGeneratedTime(digest.generatedAt || digest.publishedAt || `${digest.digestDate}T07:15:00+05:30`);
  const pageTitle = "Global Indices Watch | Market Narrative";
  const pageDescription = "Live and reference global indices watch for Nifty, Bank Nifty, US markets, Asian markets, crude, dollar, rupee and gold with captured Yahoo price-series context.";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ${brandHeadLinks(siteOrigin)}
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <link rel="canonical" href="${escapeHtml(siteOrigin)}/indices/">
  ${jsonLdScript(indicesPageJsonLd(pageTitle, pageDescription, digest))}
  <style>
    ${brandMarkCss()}
    :root {
      --bg: #050816;
      --panel: #0b1220;
      --panel-2: #111827;
      --line: rgba(148, 163, 184, 0.22);
      --text: #f8fafc;
      --muted: #94a3b8;
      --up: #34d399;
      --down: #fb7185;
      --flat: #fbbf24;
      --cyan: #67e8f9;
    }
    * { box-sizing: border-box; }
    html, body { overflow-x: hidden; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    img, svg, video, canvas { max-width: 100%; height: auto; }
    a, button, summary { touch-action: manipulation; }
    .shell { width: min(1160px, calc(100% - 32px)); margin: 0 auto; }
    .topbar { border-bottom: 1px solid var(--line); background: rgba(5, 8, 22, 0.86); position: sticky; top: 0; backdrop-filter: blur(16px); z-index: 10; }
    .nav-inner { min-height: 60px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--text); text-decoration: none; font-weight: 900; }
    .tabs { display: flex; gap: 14px; overflow-x: auto; }
    .tab-link { align-items: center; color: var(--muted); display: inline-flex; min-height: 44px; text-decoration: none; font-size: 13px; font-weight: 800; white-space: nowrap; }
    .tab-link.active { color: var(--cyan); }
    .hero { padding: 46px 0 26px; }
    .eyebrow { margin: 0 0 10px; color: var(--cyan); font-size: 12px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
    h1 { margin: 0; max-width: 780px; font-size: clamp(34px, 5vw, 64px); line-height: 1.02; letter-spacing: 0; }
    .hero p { max-width: 760px; color: #cbd5e1; font-size: 17px; line-height: 1.7; }
    .indices-group { margin: 24px 0; }
    .indices-group-head { display: flex; justify-content: space-between; align-items: end; gap: 16px; margin-bottom: 12px; }
    .indices-group-head h2 { margin: 0; font-size: 18px; letter-spacing: 0; }
    .indices-group-head span { color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .indices-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
    .index-card { display: grid; gap: 12px; min-width: 0; padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: linear-gradient(180deg, rgba(15, 23, 42, .96), rgba(15, 23, 42, .72)); color: inherit; text-decoration: none; cursor: pointer; text-align: left; appearance: none; }
    .index-card:hover { border-color: rgba(103, 232, 249, .5); }
    .index-card-top { display: flex; justify-content: space-between; gap: 12px; }
    .index-card strong { font-size: 22px; }
    .index-card small, .index-meta { color: var(--muted); font-size: 12px; line-height: 1.45; }
    .seo-context p { color: #cbd5e1; line-height: 1.6; margin: 0; }
    .idx-m { display:none;position:fixed;inset:0;z-index:200;background:rgba(5,8,22,.9);align-items:center;justify-content:center }
    .idx-m.open { display:flex }
    .idx-panel { background:#0b1220;border:1px solid rgba(148,163,184,.22);border-radius:12px;padding:24px 28px;width:min(580px,calc(100vw - 32px));max-height:90vh;overflow-y:auto;position:relative }
    .idx-close { position:absolute;top:12px;right:16px;background:none;border:none;color:var(--muted);font-size:24px;cursor:pointer;line-height:1;padding:0 }
    .seo-context { border-top: 1px solid var(--line); display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 34px 0 0; padding-top: 22px; }
    .seo-context h2 { font-size: 16px; margin: 0 0 8px; }
    .move.up { color: var(--up); }
    .move.down { color: var(--down); }
    .move.flat { color: var(--flat); }
    .index-spark { width: 100%; height: 58px; display: block; }
    .index-spark path.area { opacity: .14; }
    .index-spark path.line { fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .footer-note { margin: 38px 0 46px; padding-top: 18px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; line-height: 1.6; }
    @media (max-width: 760px) {
      .hero { padding: 30px 0 18px; }
      .indices-group { margin: 18px 0; }
      .indices-group-head { align-items: flex-start; flex-direction: column; gap: 4px; }
      .indices-grid { grid-template-columns: 1fr; }
      .index-card { gap: 10px; padding: 14px; }
      .index-card-top { align-items: flex-start; }
      .index-card strong { font-size: 18px; line-height: 1.18; }
      .index-card-top > strong { text-align: right; }
      .seo-context { grid-template-columns: 1fr; }
      .footer-note { margin-bottom: 84px; }
    }
    @media (max-width: 380px) {
      .index-card-top { flex-direction: column; }
      .index-card-top > strong { text-align: left; }
    }
    ${bottomTabBarCss()}
    ${mobileTypographyCss()}
    ${proPolishCss()}
  </style>
</head>
<body class="has-btb">
  <nav class="topbar">
    <div class="shell nav-inner">
      <a class="brand" href="/">${brandMarkHtml()}<span>Market Narrative</span></a>
      <div class="tabs">
        <a class="tab-link" href="/latest/">Public Briefing</a>
        <span class="tab-link active" aria-current="page">Indices</span>
        <a class="tab-link" href="/multibagger/">Portfolio</a>
        <a class="tab-link" href="/about/">About</a>
      </div>
    </div>
  </nav>
  <main class="shell">
    <header class="hero">
      <p class="eyebrow">Global Indices Watch</p>
      <h1>Nifty, Bank Nifty, Asia, US futures context and macro hedges in one board.</h1>
      <p>Captured from the same Yahoo price-series snapshots used in the daily briefing. Last briefing update: ${escapeHtml(lastUpdated)} IST. Use this as market context; the Trading Guide still owns execution levels.</p>
    </header>
    ${groups}
    <section class="seo-context" aria-label="How to use the indices board"><div><h2>What this board tracks</h2><p>Market Narrative tracks Nifty, Bank Nifty, GIFT Nifty, US indices, Asian markets, Brent crude, USD/INR, DXY and gold from captured Yahoo price-series snapshots so the morning brief has one consistent reference layer.</p></div><div><h2>How traders use it before open</h2><p>Use the board to separate overnight risk appetite from India confirmation: US close for sentiment, Asia for handoff, GIFT Nifty for gap context, Bank Nifty for confirmation, and crude or rupee for macro pressure.</p></div></section>
    <p class="footer-note">Educational market research only. This is not SEBI-registered investment advice, a research recommendation, or a solicitation to buy or sell securities or derivatives. No returns are assured; use your own risk plan.</p>
  </main>
  ${bottomTabBarHtml("more")}
  <div class="idx-m" id="idx-m" onclick="if(event.target===this)this.classList.remove('open')"><div class="idx-panel"><button class="idx-close" onclick="document.getElementById('idx-m').classList.remove('open')" aria-label="Close">×</button><small id="idx-sym" style="display:block;margin-bottom:4px"></small><h3 id="idx-name" style="margin:0 0 6px;font-size:22px"></h3><strong id="idx-val" class="move" style="display:block;font-size:16px;margin-bottom:12px"></strong><svg id="idx-svg" viewBox="0 0 540 200" style="width:100%;height:200px;display:block;margin-bottom:12px"></svg><p id="idx-ctx" style="color:#cbd5e1;line-height:1.6;margin:0;font-size:14px"></p></div></div>
  <script>function openIndexHash(){const id=window.location.hash?.slice(1);if(!id)return;const el=document.getElementById(id);if(el?.tagName==="BUTTON")el.click();}window.addEventListener("hashchange",openIndexHash);openIndexHash();(function(){var m=document.getElementById("idx-m");document.querySelectorAll(".index-card").forEach(function(c){c.addEventListener("click",function(){var d=c.dataset,s=document.getElementById("idx-svg"),t=d.cls==="up"?"#34d399":d.cls==="down"?"#fb7185":"#fbbf24";document.getElementById("idx-sym").textContent=c.querySelector("small").textContent;document.getElementById("idx-name").textContent=d.name;var v=document.getElementById("idx-val");v.className="move "+d.cls;v.textContent=c.querySelector(".move").textContent+" \xb7 "+d.val;document.getElementById("idx-ctx").textContent=d.ctx;var pts=JSON.parse(d.pts||"[]");if(pts.length>1){var mn=Math.min.apply(null,pts),mx=Math.max.apply(null,pts),r=Math.max(1e-9,mx-mn),p=pts.map(function(v,i){return(i?"L":"M")+(4+i/(pts.length-1)*532).toFixed(1)+" "+(190-(v-mn)/r*180).toFixed(1);}).join(" ");s.innerHTML="<path d='"+p+" L536 196 L4 196 Z' fill='"+t+"' opacity='.14'/><path d='"+p+"' fill='none' stroke='"+t+"' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/>";}else{s.innerHTML="<line x1='4' y1='100' x2='536' y2='100' stroke='"+t+"' stroke-width='2'/>";}m.classList.add("open");});});}());</script>
  ${mobileShellScript()}
</body>
</html>`;
}

function indexSnapshotCard(snapshot) {
  const change = Number(snapshot.changePercent || 0);
  const cls = change > 0.05 ? "up" : change < -0.05 ? "down" : "flat";
  const pts = escapeHtml(JSON.stringify((snapshot.chartPoints ?? []).map((p) => Number(p.close)).filter(Number.isFinite)));
  return `<button id="${escapeHtml(String(snapshot.symbol || "").toLowerCase())}" class="index-card" data-pts="${pts}" data-cls="${escapeHtml(cls)}" data-val="${escapeHtml(formatIndexValue(snapshot))}" data-ctx="${escapeHtml(indexSnapshotContext(snapshot))}" data-name="${escapeHtml(marketDisplayNameForSnapshot(snapshot))}">
  <div class="index-card-top"><div><small>${escapeHtml(snapshot.symbol)}</small><strong>${escapeHtml(marketDisplayNameForSnapshot(snapshot))}</strong></div><strong class="move ${escapeHtml(cls)}">${escapeHtml(formatSnapshotChange(snapshot))}</strong></div>
  ${snapshotSparklineSvgForPublish(snapshot)}<div class="index-meta">${escapeHtml(formatIndexValue(snapshot))} · ${escapeHtml(publicSnapshotSourceLabel(snapshot))}</div>
  </button>`;
}

function snapshotSparklineSvgForPublish(snapshot) {
  const points = Array.isArray(snapshot.chartPoints)
    ? snapshot.chartPoints.map((point) => Number(point.close)).filter((value) => Number.isFinite(value))
    : [];
  const change = Number(snapshot.changePercent || 0);
  const stroke = change > 0.05 ? "#34d399" : change < -0.05 ? "#fb7185" : "#fbbf24";
  if (points.length < 2) {
    return `<svg class="index-spark" viewBox="0 0 220 58" aria-hidden="true"><path class="line" d="M4 29 H216" stroke="${stroke}"></path></svg>`;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1e-9, max - min);
  const path = points.map((value, index) => {
    const x = 4 + (index / Math.max(1, points.length - 1)) * 212;
    const y = 52 - ((value - min) / range) * 46;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  const area = `${path} L216 56 L4 56 Z`;
  return `<svg class="index-spark" viewBox="0 0 220 58" aria-hidden="true"><path class="area" d="${area}" fill="${stroke}"></path><path class="line" d="${path}" stroke="${stroke}"></path></svg>`;
}
function formatIndexValue(snapshot) {
  const value = Number(snapshot.closeValue);
  const close = Number.isFinite(value)
    ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : "value unavailable";
  const time = snapshot.dataTimestamp ? formatGeneratedTime(snapshot.dataTimestamp) : "";
  return time ? `${close} at ${time} IST` : close;
}
function indexSnapshotContext(snapshot) {
  const region = snapshot.marketRegion || regionForSnapshotSymbol(snapshot.symbol);
  const direction = Number(snapshot.changePercent || 0) >= 0 ? "supportive" : "pressure";
  return `${marketDisplayNameForSnapshot(snapshot)} is part of the ${region} read. The captured Yahoo series is ${direction} on this snapshot; use it as context, then let Nifty breadth and Bank Nifty decide whether the open confirms.`;
}
function regionForSnapshotSymbol(symbol) {
  if (["SPX", "NDX", "DJI"].includes(symbol)) return "US overnight";
  if (["NIKKEI", "HSI", "SHCOMP", "KOSPI", "TAIEX", "STI", "ASX200"].includes(symbol)) return "Asia handoff";
  if (["BRENT", "DXY", "USDINR", "GOLD"].includes(symbol)) return "macro hedge";
  return "India reference";
}
function robotsTxt() {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /_vercel/",
    "Disallow: /admin/",
    "Disallow: /dark-preview/",
    `Sitemap: ${siteOrigin}/sitemap.xml`,
    ""
  ].join("\n");
}

function sitemapXml(allDigests) {
  // Only include digests that actually have content, plus the latest digest to keep the crawler fresh
  const digests = allDigests.filter((d) => d.briefing || d === allDigests[0]);
  const urls = [
    { loc: `${siteOrigin}/`, lastmod: digests[0]?.digestDate, changefreq: "daily", priority: "1.0" },
    { loc: `${siteOrigin}/latest/`, lastmod: digests[0]?.digestDate, changefreq: "daily", priority: "0.9" },
    { loc: `${siteOrigin}/latest/trading-guide/`, lastmod: digests[0]?.digestDate, changefreq: "daily", priority: "0.8" },
    { loc: `${siteOrigin}/indices/`, lastmod: digests[0]?.digestDate, changefreq: "daily", priority: "0.8" },
    { loc: `${siteOrigin}/money-flow/fii-dii/`, lastmod: digests[0]?.digestDate, changefreq: "daily", priority: "0.9" },
    { loc: `${siteOrigin}/market-statistics/`, lastmod: digests[0]?.digestDate, changefreq: "daily", priority: "0.9" },
    { loc: `${siteOrigin}/moves/`, lastmod: digests[0]?.digestDate, changefreq: "daily", priority: "0.7" },
    { loc: `${siteOrigin}/multibagger/`, lastmod: "2026-05-01", changefreq: "weekly", priority: "0.7" },
    { loc: `${siteOrigin}/about/`, lastmod: digests[0]?.digestDate, changefreq: "monthly", priority: "0.7" },
    { loc: `${siteOrigin}/subscribe/`, lastmod: digests[0]?.digestDate, changefreq: "monthly", priority: "0.6" },
    { loc: `${siteOrigin}/contact/`, lastmod: digests[0]?.digestDate, changefreq: "yearly", priority: "0.4" },
    { loc: `${siteOrigin}/privacy/`, lastmod: digests[0]?.digestDate, changefreq: "yearly", priority: "0.3" },
    { loc: `${siteOrigin}/terms/`, lastmod: digests[0]?.digestDate, changefreq: "yearly", priority: "0.3" },
    ...digests.map((digest) => ({
      loc: `${siteOrigin}/${slugForDigest(digest)}/trading-guide/`,
      lastmod: digest.digestDate,
      changefreq: "monthly",
      priority: "0.6"
    })),
    ...digests.map((digest) => ({
      loc: `${siteOrigin}/${slugForDigest(digest)}/`,
      lastmod: digest.digestDate,
      changefreq: "monthly",
      priority: "0.7"
    }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${escapeHtml(url.loc)}</loc>
    ${url.lastmod ? `<lastmod>${escapeHtml(url.lastmod)}</lastmod>` : ""}
    ${url.changefreq ? `<changefreq>${escapeHtml(url.changefreq)}</changefreq>` : ""}
    ${url.priority ? `<priority>${escapeHtml(url.priority)}</priority>` : ""}
  </url>`).join("\n")}
</urlset>
`;
}

function ogCardSvg() {
  return brandSocialCardSvg();
}

function slugForDigest(digest) {
  return resolveSlugFormat() === "iso" ? slugForDigestIso(digest) : slugForDigestCompact(digest);
}

function slugForDigestCompact(digest) {
  const date = digest.digestDate;
  const [year, month, day] = date.split("-");
  const monthName = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][Number(month) - 1];
  return `${Number(day)}${monthName}${year}`;
}

function slugForDigestIso(digest) {
  // ISO 8601 date slug: 2026-06-03. Sorts naturally, matches sitemap lastmod, and
  // reads unambiguously across locales. Kept opt-in via PUBLIC_SLUG_FORMAT=iso
  // so existing inbound links don't break on the day it's enabled. Pair with
  // the 301 redirect map emitted by writeSlugRedirects() before flipping.
  const date = String(digest.digestDate ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return slugForDigestCompact(digest);
  }
  return date;
}

function resolveSlugFormat() {
  return String(process.env.PUBLIC_SLUG_FORMAT ?? "compact").toLowerCase() === "iso" ? "iso" : "compact";
}

async function writeSlugRedirects(digests) {
  // When PUBLIC_SLUG_FORMAT=iso, write a static _redirects file that maps the
  // old /3jun2026/ paths to /2026-06-03/ with 301s. The file lives at the site
  // root; Vercel picks it up automatically for static hosting.
  if (resolveSlugFormat() !== "iso") {
    return;
  }
  const lines = [
    "# Auto-generated by tools/publish-site.mjs — old compact slugs -> new ISO slugs",
    "# Remove this file once crawlers have re-indexed (typically 2-4 weeks)."
  ];
  for (const digest of digests) {
    const compact = slugForDigestCompact(digest);
    const iso = slugForDigestIso(digest);
    if (compact !== iso) {
      lines.push(`/${compact}/ /${iso}/ 301`);
      lines.push(`/${compact}/trading-guide/ /${iso}/trading-guide/ 301`);
    }
  }
  await writeFile(join(siteDir, "_redirects"), `${lines.join("\n")}\n`, "utf8");
  process.stdout.write(`Wrote ${lines.length - 2} slug redirects to ${join(siteDir, "_redirects")}\n`);
}

function scheduledLabelForDigest(digest) {
  if (digest.scheduledFor) {
    return digest.scheduledFor.slice(11, 16);
  }
  return "07:15";
}

function formatDigestDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00+05:30`));
}

function formatGeneratedTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "Unavailable";
  }
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function formatChange(changePercent) {
  return `${changePercent >= 0 ? "+" : ""}${Number(changePercent).toFixed(2)}%`;
}

function formatSnapshotChange(snapshot) {
  const changePercent = Number(snapshot?.changePercent || 0);
  if (snapshot?.symbol === "BRENT" && Math.abs(changePercent) < 0.005) {
    const value = Number(snapshot?.closeValue);
    const label = Number.isFinite(value)
      ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
      : "shown";
    return `last close ${label}`;
  }
  return formatChange(changePercent);
}

function topAsiaSymbols() {
  return ["NIKKEI", "HSI", "SHCOMP", "KOSPI", "TAIEX"];
}

function marketDisplayNameForSnapshot(snapshot) {
  const country = countryForSymbol(snapshot.symbol);
  return country ? `${country} - ${snapshot.name}` : snapshot.name;
}

function countryForSymbol(symbol) {
  return {
    NIKKEI: "Japan",
    HSI: "Hong Kong",
    SHCOMP: "Mainland China",
    KOSPI: "South Korea",
    TAIEX: "Taiwan",
    STI: "Singapore",
    ASX200: "Australia"
  }[symbol] || "";
}

function sentimentColor(label) {
  return {
    BULLISH: "#34d399",
    BEARISH: "#fb7185",
    VOLATILE: "#fbbf24",
    NEUTRAL: "#dbeafe"
  }[label] ?? "#dbeafe";
}

function todayInIst() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
