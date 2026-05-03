import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brandFaviconSvg, brandHeadLinks, brandMarkCss, brandMarkHtml, brandSocialCardSvg } from "./brand-assets.mjs";
import { cockpitPage } from "./cockpit-page.mjs";
import { assertPublicBriefingCopy } from "./editorial-guardrails.mjs";
import { multibaggerStateWithMarketQuotes } from "./multibagger-data.mjs";
import { multibaggerPage } from "./multibagger-page.mjs";
import { assertSourceVerification, sourceUrlLooksArticleLevel, verifySourceArticles } from "./news-sources.mjs";
import { publicDigestPayload, redactedDigestPayload } from "./public-payload.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const date = readArg("--date") ?? todayInIst();
const scheduledTime = readArg("--scheduled-time") ?? "08:30";
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

const digests = await loadArchivedDigests();
if (!digests.length) {
  throw new Error("No archived digests are available to publish");
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
  const pageDigest = {
    ...digest,
    canonicalPath: `/${slug}/`
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

const latest = digests[0];
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
await writeGuardedFile(join(multibaggerDir, "index.html"), multibaggerPage(publicMultibaggerState));
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
await writeGuardedFile(join(siteDir, "index.html"), archivePage(digests));
await writeGuardedFile(join(siteDir, "digest.json"), `${JSON.stringify(publicDigestPayload(latest), null, 2)}\n`);
await writeGuardedFile(join(siteDir, "archive.json"), `${JSON.stringify({ digests: digests.map(redactedDigestPayload) }, null, 2)}\n`);
await writeFile(join(siteDir, "robots.txt"), robotsTxt(), "utf8");
await writeFile(join(siteDir, "sitemap.xml"), sitemapXml(digests), "utf8");
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
    const leftTime = Date.parse(left.scheduledFor ?? `${left.digestDate}T08:30:00+05:30`);
    const rightTime = Date.parse(right.scheduledFor ?? `${right.digestDate}T08:30:00+05:30`);
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
  return verification;
}

function previousDigestFor(digest, digests) {
  const currentTime = Date.parse(digest.scheduledFor ?? `${digest.digestDate}T08:30:00+05:30`);
  return [...digests]
    .filter((item) => Date.parse(item.scheduledFor ?? `${item.digestDate}T08:30:00+05:30`) < currentTime)
    .sort((left, right) =>
      Date.parse(right.scheduledFor ?? `${right.digestDate}T08:30:00+05:30`) -
      Date.parse(left.scheduledFor ?? `${left.digestDate}T08:30:00+05:30`)
    )[0] ?? null;
}

function archivePage(digests) {
  const latest = digests[0];
  const pageTitle = "Market Narrative | Pre-Market Intelligence Archive";
  const pageDescription = "Source-led Indian pre-market intelligence archive for Nifty, Bank Nifty, global cues, sector impact, Asian market watch, source cards, technical risk levels, charts, and the public multibagger tracker.";
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
          <a class="nav-link" href="${escapeHtml(adminSiteOrigin)}/">Admin login</a>
        </div>
      </div>
    </div>
  </nav>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Pre-Market Intelligence Archive</p>
      <h1>Market Narrative</h1>
      <p>Independent Indian pre-market intelligence for the cash open: global cues, Nifty and Bank Nifty context, sector impact, source cards, technical risk levels, and links into the public multibagger research tracker.</p>
    </section>
    <section class="summary-row" aria-label="Archive summary">
      <div class="summary-chip"><span>Latest edition</span><strong>${escapeHtml(formatDigestDate(latest.digestDate))}</strong></div>
      <div class="summary-chip"><span>Coverage</span><strong>Nifty / Bank Nifty</strong></div>
      <div class="summary-chip"><span>Current focus</span><strong>${escapeHtml(archiveFocus(latest))}</strong></div>
    </section>
    <h2 class="archive-title">Latest Market Briefings</h2>
    <section class="digest-grid">
      ${cards}
    </section>
  </main>
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
  const change = Number.isFinite(Number(snapshot.changePercent)) ? ` (${formatChange(Number(snapshot.changePercent))})` : "";
  return `${snapshot.name || snapshot.symbol}: ${value}${change}`;
}

function archiveCardSummary(digest) {
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
  const themeType = String(digest.themes?.[0]?.themeType ?? "").toLowerCase();
  const macroChip = themeType.includes("macro") ? "Macro pressure" : "Global cues";
  return [macroChip, "India impact", "Opening bias"];
}

function archiveFocus(digest) {
  const title = cleanArchiveSentence(digest.themes?.[0]?.title);
  return title ? compactWords(title, 4) : "Opening range";
}

function highestImpactArticle(digest) {
  return [...(digest.news ?? [])].sort((left, right) => impactScore(right) - impactScore(left))[0] ?? null;
}

function impactScore(article) {
  return Math.abs(Number(article?.sentimentScore ?? 0)) * Math.max(0.5, Number(article?.entityMatchScore ?? 1));
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
  return "08:30";
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

function formatChange(changePercent) {
  return `${changePercent >= 0 ? "+" : ""}${Number(changePercent).toFixed(2)}%`;
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
