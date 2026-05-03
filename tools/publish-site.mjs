import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brandFaviconSvg, brandHeadLinks, brandMarkCss, brandMarkHtml, brandSocialCardSvg } from "./brand-assets.mjs";
import { cockpitPage } from "./cockpit-page.mjs";
import { assertPublicBriefingCopy } from "./editorial-guardrails.mjs";
import { multibaggerStateWithMarketQuotes } from "./multibagger-data.mjs";
import { multibaggerPage } from "./multibagger-page.mjs";
import { articleLooksMarketRelevant, assertSourceVerification, sourceUrlLooksArticleLevel, verifySourceArticles } from "./news-sources.mjs";
import { publicDigestPayload, redactedDigestPayload } from "./public-payload.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const date = readArg("--date") ?? todayInIst();
const scheduledTime = readArg("--scheduled-time") ?? "07:15";
const label = scheduledTime.replace(":", "");
const dailyDir = join(rootDir, "out", "daily");
const archiveDir = join(rootDir, "archive", "daily");
const siteDir = join(rootDir, "out", "site");
const sourceJson = join(dailyDir, `${date}-${label}-digest.json`);
const archivedJson = join(archiveDir, `${date}-${label}-digest.json`);
const siteOrigin = process.env.PUBLIC_SITE_ORIGIN ?? "https://marketnarrative.in";
const adminSiteOrigin = process.env.ADMIN_SITE_ORIGIN ?? "https://admin.marketnarrative.in";
const skipArchiveWrite = process.env.SKIP_ARCHIVE_WRITE === "true";

await mkdir(archiveDir, { recursive: true });
const sourceDigest = await loadSourceDigest();
const existingDigests = await loadArchivedDigests();
if (!skipArchiveWrite) {
  const sourceVerification = assertNewDigestSourceIntegrity(sourceDigest, previousDigestFor(sourceDigest, existingDigests));
  const archivedDigest = redactedDigestPayload(sourceVerification
    ? { ...sourceDigest, sourceVerification }
    : sourceDigest);
  await writeGuardedFile(archivedJson, `${JSON.stringify(archivedDigest, null, 2)}\n`);
}

const digests = (await loadArchivedDigests()).map(enrichPublicDigest);
if (!digests.length) {
  throw new Error("No archived digests are available to publish");
}
const publicArchiveDigests = digests.filter(isVerifiedPublicDigest);
const weekdayDigests = digests.filter(isWeekdayDigest);
const archiveHomeDigests = publicArchiveDigests.length ? publicArchiveDigests : weekdayDigests.slice(0, 1);
if (!archiveHomeDigests.length) {
  throw new Error("No weekday archived digests are available to publish");
}

await rm(siteDir, { recursive: true, force: true });
await mkdir(siteDir, { recursive: true });
await writeFile(join(siteDir, ".nojekyll"), "", "utf8");
await writeFile(join(siteDir, "favicon.ico"), "", "utf8");
await writeFile(join(siteDir, "favicon.svg"), brandFaviconSvg(), "utf8");
await writeFile(join(siteDir, "apple-touch-icon.svg"), brandFaviconSvg(), "utf8");
await writeFile(join(siteDir, "og-card.svg"), ogCardSvg(), "utf8");

for (const digest of digests) {
  const slug = slugForDigest(digest);
  const digestDir = join(siteDir, slug);
  const related = relatedVerifiedEditions(digest, publicArchiveDigests);
  const pageDigest = {
    ...digest,
    canonicalPath: `/${slug}/`,
    ...related
  };
  await mkdir(digestDir, { recursive: true });
  await writeGuardedFile(
    join(digestDir, "index.html"),
    cockpitPage(pageDigest, "public-view", { includeStudio: false, theme: "glass-v2" })
  );
  await writeGuardedFile(
    join(digestDir, "digest.json"),
    `${JSON.stringify(publicDigestPayload(pageDigest), null, 2)}\n`
  );
}

const latest = archiveHomeDigests[0];
const publicMultibaggerState = await multibaggerStateWithMarketQuotes();
const adminDigest = {
  ...sourceDigest,
  canonicalPath: "/"
};
const darkPreviewDir = join(siteDir, "dark-preview");
const adminDir = join(siteDir, "admin");
const multibaggerDir = join(siteDir, "multibagger");
await mkdir(darkPreviewDir, { recursive: true });
await writeGuardedFile(
  join(darkPreviewDir, "index.html"),
  cockpitPage({ ...latest, canonicalPath: "/dark-preview/" }, "public-view", { includeStudio: false, theme: "glass-v2" })
);
await writeGuardedFile(join(darkPreviewDir, "digest.json"), `${JSON.stringify(publicDigestPayload(latest), null, 2)}\n`);
await mkdir(multibaggerDir, { recursive: true });
await writeGuardedFile(
  join(multibaggerDir, "index.html"),
  multibaggerPage(publicMultibaggerState, { latestBriefingPath: `/${slugForDigest(latest)}/` })
);
await writeGuardedFile(join(multibaggerDir, "state.json"), `${JSON.stringify(publicMultibaggerState, null, 2)}\n`);
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
await writeGuardedFile(join(siteDir, "index.html"), archivePage(archiveHomeDigests, digests));
await writeGuardedFile(join(siteDir, "digest.json"), `${JSON.stringify(publicDigestPayload(latest), null, 2)}\n`);
await writeGuardedFile(join(siteDir, "archive.json"), `${JSON.stringify({ digests: archiveHomeDigests.map(redactedDigestPayload) }, null, 2)}\n`);
await writeFile(join(siteDir, "robots.txt"), robotsTxt(), "utf8");
await writeFile(join(siteDir, "sitemap.xml"), sitemapXml(archiveHomeDigests), "utf8");
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

process.stdout.write(`Static site ready: ${siteDir}\n`);
process.stdout.write(`Archive entry point: ${join(siteDir, "index.html")}\n`);
process.stdout.write(`Latest daily page: ${join(siteDir, slugForDigest(latest), "index.html")}\n`);

async function writeGuardedFile(path, contents) {
  assertPublicBriefingCopy(path, contents);
  await writeFile(path, contents, "utf8");
}

async function loadArchivedDigests() {
  const fileNames = await readdir(archiveDir);
  const digestFiles = fileNames
    .filter((fileName) => /^\d{4}-\d{2}-\d{2}-\d{4}-digest\.json$/.test(fileName))
    .sort();

  const digestsByKey = new Map();
  for (const fileName of digestFiles) {
    const digest = JSON.parse(await readFile(join(archiveDir, fileName), "utf8"));
    const key = `${digest.digestDate}-${scheduledLabelForDigest(digest)}`;
    digestsByKey.set(key, digest);
  }

  return [...digestsByKey.values()].sort((left, right) => {
    const leftTime = Date.parse(left.scheduledFor ?? `${left.digestDate}T07:15:00+05:30`);
    const rightTime = Date.parse(right.scheduledFor ?? `${right.digestDate}T07:15:00+05:30`);
    return rightTime - leftTime;
  });
}

async function loadSourceDigest() {
  try {
    return JSON.parse(await readFile(sourceJson, "utf8"));
  } catch (error) {
    if (!skipArchiveWrite) {
      throw error;
    }
    return JSON.parse(await readFile(archivedJson, "utf8"));
  }
}

function assertNewDigestSourceIntegrity(digest, previousDigest) {
  const hasVerification = digest.sourceVerification || digest.newsDataMode === "live";
  if (!hasVerification) {
    return null;
  }
  const verification = verifySourceArticles(digest.news ?? [], {
    mode: digest.sourceVerification?.mode ?? digest.newsDataMode ?? "live",
    previousDigest
  });
  assertSourceVerification(verification);
  const badSource = (digest.news ?? []).find((article) => !sourceUrlLooksArticleLevel(article.sourceUrl));
  if (badSource) {
    throw new Error(`Source verification failed: ${badSource.sourceName || "source"} links to a section page (${badSource.sourceUrl})`);
  }
  const offTopic = (digest.news ?? []).find((article) => !articleLooksMarketRelevant(article));
  if (offTopic) {
    throw new Error(`Source verification failed: ${offTopic.sourceName || "source"} is not market-relevant (${offTopic.headline || offTopic.title})`);
  }
  return verification;
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
  const news = verified
    ? (digest.news ?? []).filter((article) => sourceUrlLooksArticleLevel(article.sourceUrl) && articleLooksMarketRelevant(article))
    : (digest.news ?? []);
  const themes = verified ? publicThemesForNews(digest.digestDate, news) : (digest.themes ?? []);
  const overallSentiment = verified ? publicWeightedSentiment(news) : digest.overallSentiment;
  const sentimentLabel = verified ? publicLabelFromScore(overallSentiment) : digest.sentimentLabel;
  return {
    ...digest,
    news,
    themes,
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
        ? "Legacy source audit unavailable - direct archive page retained for continuity and hidden from public briefing cards."
        : "Non-trading-day archive retained for continuity and hidden from public briefing cards.",
    archiveSummary: digest.archiveSummary || archiveCardSummary({ ...digest, news }),
    deskNote: digest.deskNote || legacyDeskNote({ ...digest, news }),
    watchItems: Array.isArray(digest.watchItems) && digest.watchItems.length
      ? digest.watchItems.slice(0, 3)
      : fallbackWatchItems({ ...digest, news }),
    generatedAt: digest.generatedAt || digest.publishedAt || `${digest.digestDate}T07:15:00+05:30`
  };
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
    macro_positive: "Domestic Macro Support"
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
    "Educational note: This summary is for market research and content preparation only, not financial advice."
  ].join("\n\n");
}

function isVerifiedPublicDigest(digest) {
  return Boolean(isWeekdayDigest(digest) && digest.sourceVerification && !digest.sourceVerification.blockedReason && digest.sourceVerification.isVerifiedForPublicArchive !== false);
}

function isWeekdayDigest(digest) {
  const day = new Date(`${digest.digestDate}T12:00:00+05:30`).getDay();
  return day >= 1 && day <= 5;
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
    ? `${cleanArchiveSentence(driver.takeaway || driver.summary || driver.headline)} Use this legacy page as context only because the source audit was not available when it was created.`
    : "Use this legacy page as context only because the source audit was not available when it was created.";
}

function fallbackWatchItems(digest) {
  const items = (digest.news ?? [])
    .map((article) => cleanArchiveSentence(article.watchFor))
    .filter(Boolean);
  return [...new Set(items)].slice(0, 3);
}

function archivePage(digests, allDigests = digests) {
  const latest = digests[0];
  const pageTitle = "Market Narrative | Pre-Market Intelligence Archive";
  const pageDescription = "Source-led Indian pre-market intelligence archive for Nifty, Bank Nifty, global cues, sector impact, Asian market watch, source cards, technical risk levels, charts, and the public multibagger tracker.";
  const recentGrid = recentArchiveGridHtml(allDigests.slice(0, 7));
  const cards = digests
    .map((digest) => {
      const slug = slugForDigest(digest);
      const toneClass = archiveToneClass(digest);
      const chips = archiveChips(digest)
        .map((chip) => `<span>${escapeHtml(chip)}</span>`)
        .join("");
      return `
        <details class="digest-card ${toneClass}"${digest === latest ? " open" : ""}>
          <summary>
            <div class="card-summary-head">
              <div class="card-topline">
                <span>${escapeHtml(formatDigestDate(digest.digestDate))}</span>
                ${sentimentSparklineHtml(digest)}
              </div>
              <h2>${escapeHtml(digest.title)}</h2>
              <p class="card-summary">${escapeHtml(archiveCardSummary(digest))}</p>
              <div class="archive-chips">
                ${chips}
              </div>
            </div>
            <span class="card-disclosure" aria-hidden="true"></span>
          </summary>
          <div class="archive-card-details">
            <div class="source-quality-pill">${escapeHtml(archiveSourceQualityLine(digest))}</div>
            <div class="session-driver">
              <span>Previous session driver</span>
              <strong>${escapeHtml(previousSessionDriver(digest))}</strong>
            </div>
            ${archiveMarketSnapshotHtml(digest)}
            ${archiveSourcePreviewHtml(digest)}
            <a class="open-link" href="./${slug}/">Read market briefing</a>
          </div>
        </details>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${brandHeadLinks(siteOrigin)}
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${escapeHtml(siteOrigin)}/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Market Narrative">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta property="og:url" content="${escapeHtml(siteOrigin)}/">
  <meta property="og:image" content="${escapeHtml(siteOrigin)}/og-card.svg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(pageDescription)}">
  <meta name="twitter:image" content="${escapeHtml(siteOrigin)}/og-card.svg">
  <title>${escapeHtml(pageTitle)}</title>
  <style>
    :root {
      --paper: #050816;
      --ink: #f8fafc;
      --muted: #b8c4d8;
      --line: rgba(255, 255, 255, 0.14);
      --panel: rgba(15, 23, 42, 0.62);
    }

    * { box-sizing: border-box; }

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
      font-size: 11px;
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
      font-size: 11px;
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
      font-size: 11px;
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
      font-size: 11px;
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

    .recent-status.legacy {
      color: #fbbf24;
    }

    @media (max-width: 640px) {
      .nav-inner {
        align-items: start;
        flex-direction: column;
        padding: 14px 0;
      }

      .latest-link {
        width: 100%;
        text-align: center;
      }

      .nav-actions,
      .nav-link {
        width: 100%;
      }

      .nav-link {
        text-align: center;
      }
    }
  </style>
</head>
<body class="archive-dark">
  <nav class="topbar">
    <div class="shell">
      <div class="nav-inner">
        <div class="brand">${brandMarkHtml()}<span>Market Narrative</span></div>
        <div class="nav-actions">
          <a class="latest-link" href="./${slugForDigest(latest)}/">Latest briefing</a>
          <a class="nav-link" href="./multibagger/">Multibagger Portfolio</a>
        </div>
      </div>
    </div>
  </nav>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Pre-Market Intelligence Archive</p>
      <h1>Market Narrative</h1>
      <p>Published before 7:15 AM IST on trading days. Independent, source-led pre-market context for Nifty and Bank Nifty - no account required.</p>
      <p class="byline">By Abhey Deep / Market Narrative</p>
      ${archiveShareRowHtml()}
    </section>
    <section class="summary-row" aria-label="Archive summary">
      <div class="summary-chip"><span>Latest edition</span><strong>${escapeHtml(formatDigestDate(latest.digestDate))}</strong></div>
      <div class="summary-chip"><span>Coverage</span><strong>Nifty / Bank Nifty</strong></div>
      <div class="summary-chip"><span>Current focus</span><strong>${escapeHtml(archiveFocus(latest))}</strong></div>
      <div class="summary-chip"><span>Last verified update</span><strong>${escapeHtml(formatGeneratedTime(latest.generatedAt || latest.publishedAt || `${latest.digestDate}T07:15:00+05:30`))}</strong></div>
    </section>
    <h2 class="archive-title">Latest Market Briefings</h2>
    <section class="digest-grid">
      ${cards}
    </section>
    <section class="recent-archive-section" aria-label="Recent briefing navigation">
      <h2 class="archive-title">Recent Briefing Navigation</h2>
      ${recentGrid}
    </section>
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
  </script>
</body>
</html>`;
}

function archiveSourceQualityLine(digest) {
  const verification = digest.sourceVerification;
  if (!verification) {
    return "Legacy source audit unavailable";
  }
  const blocked = verification.blockedReason ? ` - blocked: ${verification.blockedReason}` : "";
  return `${verification.verifiedArticleCount} verified article links - ${verification.publisherCount} publishers - ${verification.categoryCount} categories - ${verification.mode} mode${blocked}`;
}

function archiveShareRowHtml() {
  const url = `${siteOrigin}/`;
  const text = "Market Narrative pre-market briefing archive";
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  return `
    <div class="share-row" aria-label="Share Market Narrative">
      <span>Share</span>
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
    const title = verified
      ? compactWords(digest.title || "Market briefing", 10)
      : "Legacy edition - source audit unavailable";
    const status = verified
      ? `${digest.sourceVerification.verifiedArticleCount} verified links`
      : "Direct URL retained; hidden from latest cards";
    return `
      <a class="recent-archive-link" href="./${slug}/">
        <span>${escapeHtml(formatDigestDate(digest.digestDate))}</span>
        <strong>${escapeHtml(title)}</strong>
        <small class="recent-status${verified ? "" : " legacy"}">${escapeHtml(status)}</small>
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
        <div class="archive-snapshot">
          <span>${escapeHtml(snapshot.symbol)}</span>
          <strong>${escapeHtml(formatSnapshotValue(snapshot))}</strong>
        </div>
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
        <div class="archive-source-row">
          <span>${escapeHtml(article.sourceName || "Source")}</span>
          <strong>${escapeHtml(compactWords(article.headline || article.title || "", 13))}</strong>
          ${sourceUrlLooksArticleLevel(article.sourceUrl)
            ? `<a href="${escapeHtml(article.sourceUrl)}" target="_blank" rel="noreferrer">Read source</a>`
            : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function weightedArchiveSources(digest) {
  return [...(digest.news ?? [])].sort((left, right) => impactScore(right) - impactScore(left));
}

function formatSnapshotValue(snapshot) {
  const value = Number.isFinite(Number(snapshot.closeValue)) ? Number(snapshot.closeValue).toFixed(2) : "n/a";
  const change = Number.isFinite(Number(snapshot.changePercent)) ? ` (${formatSnapshotChange(snapshot)})` : "";
  return `${snapshot.name || snapshot.symbol}: ${value}${change}`;
}

function archiveCardSummary(digest) {
  if (digest.archiveSummary) {
    return digest.archiveSummary;
  }
  const primary = cleanArchiveSentence(digest.themes?.[0]?.summary);
  const driver = highestImpactArticle(digest);
  const secondary = cleanArchiveSentence(driver?.indiaImpact || driver?.takeaway || driver?.summary);
  return compactWords([primary, secondary].filter(Boolean).join(" "), 38) || "A disciplined pre-market read for index levels, sector context, and the opening range.";
}

function previousSessionDriver(digest) {
  const driver = highestImpactArticle(digest);
  return (
    cleanArchiveSentence(driver?.takeaway || driver?.indiaImpact || driver?.summary) ||
    cleanArchiveSentence(digest.themes?.[0]?.summary) ||
    "Global cues and domestic breadth set the tone for the opening range."
  );
}

function archiveToneClass(digest) {
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
  const articles = weightedArchiveSources(digest).slice(0, 3);
  const chips = articles.map((article) =>
    compactWords(cleanArchiveSentence(article.entityName || article.category || article.sourceName || "Market"), 3)
  ).filter(Boolean);
  return [...new Set(chips)].slice(0, 3);
}

function archiveFocus(digest) {
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

function robotsTxt() {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    `Sitemap: ${siteOrigin}/sitemap.xml`,
    ""
  ].join("\n");
}

function sitemapXml(digests) {
  const urls = [
    { loc: `${siteOrigin}/`, lastmod: digests[0]?.digestDate },
    { loc: `${siteOrigin}/multibagger/`, lastmod: "2026-05-01" },
    ...digests.map((digest) => ({
      loc: `${siteOrigin}/${slugForDigest(digest)}/`,
      lastmod: digest.digestDate
    }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${escapeHtml(url.loc)}</loc>
    ${url.lastmod ? `<lastmod>${escapeHtml(url.lastmod)}</lastmod>` : ""}
  </url>`).join("\n")}
</urlset>
`;
}

function ogCardSvg() {
  return brandSocialCardSvg();
}

function slugForDigest(digest) {
  const date = digest.digestDate;
  const [year, month, day] = date.split("-");
  const monthName = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][Number(month) - 1];
  return `${Number(day)}${monthName}${year}`;
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
