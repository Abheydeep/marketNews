import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cockpitPage } from "./cockpit-page.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const date = readArg("--date") ?? todayInIst();
const scheduledTime = readArg("--scheduled-time") ?? "08:30";
const label = scheduledTime.replace(":", "");
const dailyDir = join(rootDir, "out", "daily");
const archiveDir = join(rootDir, "archive", "daily");
const siteDir = join(rootDir, "out", "site");
const sourceJson = join(dailyDir, `${date}-${label}-digest.json`);
const archivedJson = join(archiveDir, `${date}-${label}-digest.json`);

await mkdir(archiveDir, { recursive: true });
const sourceDigest = JSON.parse(await readFile(sourceJson, "utf8"));
await writeFile(archivedJson, `${JSON.stringify(publicDigestPayload(sourceDigest), null, 2)}\n`, "utf8");

const digests = await loadArchivedDigests();
if (!digests.length) {
  throw new Error("No archived digests are available to publish");
}

await rm(siteDir, { recursive: true, force: true });
await mkdir(siteDir, { recursive: true });
await writeFile(join(siteDir, ".nojekyll"), "", "utf8");

for (const digest of digests) {
  const slug = slugForDigest(digest);
  const digestDir = join(siteDir, slug);
  const pageDigest = {
    ...digest,
    canonicalPath: `/${slug}/`
  };
  await mkdir(digestDir, { recursive: true });
  await writeFile(join(digestDir, "index.html"), cockpitPage(pageDigest, "public-view", { includeStudio: false }), "utf8");
  await writeFile(join(digestDir, "digest.json"), `${JSON.stringify(publicDigestPayload(pageDigest), null, 2)}\n`, "utf8");
}

const latest = digests[0];
await writeFile(join(siteDir, "index.html"), archivePage(digests), "utf8");
await writeFile(join(siteDir, "digest.json"), `${JSON.stringify(publicDigestPayload(latest), null, 2)}\n`, "utf8");
await writeFile(join(siteDir, "archive.json"), `${JSON.stringify({ digests: digests.map(publicDigestPayload) }, null, 2)}\n`, "utf8");
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

function archivePage(digests) {
  const latest = digests[0];
  const cards = digests
    .map((digest) => {
      const slug = slugForDigest(digest);
      const topAsia = digest.marketSnapshots
        .filter((snapshot) => (snapshot.marketRegion ?? "") === "Asia Watch")
        .filter((snapshot) => topAsiaSymbols().includes(snapshot.symbol))
        .slice()
        .sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent))[0];
      const sourceCount = new Set(digest.news.map((item) => item.sourceName)).size;
      return `
        <article class="digest-card">
          <div class="card-topline">
            <span>${escapeHtml(formatDigestDate(digest.digestDate))}</span>
            <strong style="color: ${sentimentColor(digest.sentimentLabel)}">${escapeHtml(digest.sentimentLabel)}</strong>
          </div>
          <h2><a href="./${slug}/">${escapeHtml(digest.title)}</a></h2>
          <div class="metrics">
            <span>${digest.marketSnapshots.length} markets tracked</span>
            <span>${digest.tradeSetups.length} setups</span>
            <span>${sourceCount} sources</span>
          </div>
          ${topAsia ? `<div class="asia-note">Asia watch: ${escapeHtml(marketDisplayNameForSnapshot(topAsia))} ${formatChange(topAsia.changePercent)}</div>` : ""}
          <a class="open-link" href="./${slug}/">Open daily briefing</a>
        </article>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Market Narrative | Daily Pre-Market Archive</title>
  <style>
    :root {
      --paper: #f4f5f7;
      --ink: #111827;
      --muted: #6b7280;
      --line: #e5e7eb;
      --panel: #fff;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      background: rgba(255, 255, 255, 0.94);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(14px);
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
      background: #030712;
      color: #fff;
      font-size: 15px;
      font-weight: 900;
    }

    .latest-link {
      border-radius: 8px;
      background: #111827;
      color: #fff;
      padding: 10px 13px;
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
      color: #6b7280;
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
      color: #4b5563;
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
      border: 1px solid rgba(229, 231, 235, 0.76);
      border-radius: 16px;
      background: var(--panel);
      box-shadow: 0 4px 20px rgba(17, 24, 39, 0.035);
    }

    .summary-chip {
      padding: 16px;
    }

    .summary-chip span {
      display: block;
      color: #6b7280;
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
      color: #111827;
      font-size: 22px;
    }

    .digest-grid {
      display: grid;
      gap: 16px;
    }

    .digest-card {
      padding: 22px;
      transition: transform 160ms ease, box-shadow 160ms ease;
    }

    .digest-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(17, 24, 39, 0.075);
    }

    .card-topline {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      color: #6b7280;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .digest-card h2 {
      margin: 12px 0 10px;
      color: #111827;
      font-size: 26px;
      line-height: 1.2;
    }

    .digest-card p {
      margin: 0;
      color: #4b5563;
      font-size: 15px;
      line-height: 1.6;
    }

    .metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }

    .metrics span,
    .asia-note {
      border-radius: 999px;
      background: #f3f4f6;
      padding: 7px 10px;
      color: #374151;
      font-size: 12px;
      font-weight: 850;
    }

    .asia-note {
      display: inline-flex;
      margin-top: 12px;
      background: #eef2ff;
      color: #3730a3;
    }

    .open-link {
      display: inline-flex;
      margin-top: 18px;
      color: #2563eb;
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
    }
  </style>
</head>
<body>
  <nav class="topbar">
    <div class="shell">
      <div class="nav-inner">
        <div class="brand"><span class="brand-mark">M</span><span>Market Narrative</span></div>
        <a class="latest-link" href="./${slugForDigest(latest)}/">Latest briefing</a>
      </div>
    </div>
  </nav>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Daily Pre-Market Archive</p>
      <h1>All Market Narrative briefings</h1>
      <p>The root page now works like a news archive. Open a dated briefing for the full quote board, Asian market watch, source cards, technical setup, and chart links.</p>
    </section>
    <section class="summary-row" aria-label="Archive summary">
      <div class="summary-chip"><span>Total briefings</span><strong>${digests.length}</strong></div>
      <div class="summary-chip"><span>Latest date</span><strong>${escapeHtml(formatDigestDate(latest.digestDate))}</strong></div>
      <div class="summary-chip"><span>Latest sentiment</span><strong>${escapeHtml(latest.sentimentLabel)}</strong></div>
    </section>
    <h2 class="archive-title">Briefings</h2>
    <section class="digest-grid">
      ${cards}
    </section>
  </main>
</body>
</html>`;
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

function publicDigestPayload(digest) {
  const {
    teleprompterScript,
    reelScript,
    asset,
    ...publicFields
  } = digest;

  return {
    ...publicFields,
    asset: asset
      ? {
        sentimentLabel: asset.sentimentLabel,
        assetUrl: asset.assetUrl
      }
      : null
  };
}

function sentimentColor(label) {
  return {
    BULLISH: "#047857",
    BEARISH: "#b91c1c",
    VOLATILE: "#b45309",
    NEUTRAL: "#374151"
  }[label] ?? "#374151";
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
