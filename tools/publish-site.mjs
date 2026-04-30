import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cockpitPage } from "./cockpit-page.mjs";
import { assertPublicBriefingCopy } from "./editorial-guardrails.mjs";
import { projectComponentsPage } from "./project-components-page.mjs";
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

await mkdir(archiveDir, { recursive: true });
const sourceDigest = JSON.parse(await readFile(sourceJson, "utf8"));
const archivedDigest = redactedDigestPayload(sourceDigest);
await writeGuardedFile(archivedJson, `${JSON.stringify(archivedDigest, null, 2)}\n`);

const digests = await loadArchivedDigests();
if (!digests.length) {
  throw new Error("No archived digests are available to publish");
}

await rm(siteDir, { recursive: true, force: true });
await mkdir(siteDir, { recursive: true });
await writeFile(join(siteDir, ".nojekyll"), "", "utf8");
await writeFile(join(siteDir, "favicon.ico"), "", "utf8");

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
const adminDigest = {
  ...sourceDigest,
  canonicalPath: "/admin/"
};
const darkPreviewDir = join(siteDir, "dark-preview");
const adminDir = join(siteDir, "admin");
await mkdir(darkPreviewDir, { recursive: true });
await writeGuardedFile(
  join(darkPreviewDir, "index.html"),
  cockpitPage({ ...latest, canonicalPath: "/dark-preview/" }, "public-view", { includeStudio: false, theme: "glass-v2" })
);
await writeGuardedFile(join(darkPreviewDir, "digest.json"), `${JSON.stringify(publicDigestPayload(latest), null, 2)}\n`);
await mkdir(join(adminDir, "components"), { recursive: true });
await writeFile(
  join(adminDir, "index.html"),
  cockpitPage(adminDigest, "studio-view", {
    includeStudio: true,
    theme: "glass-v2",
    requireAuth: true,
    componentsHref: "./components/"
  }),
  "utf8"
);
await writeFile(join(adminDir, "favicon.ico"), "", "utf8");
await writeFile(join(adminDir, "digest.json"), `${JSON.stringify(publicDigestPayload(latest), null, 2)}\n`, "utf8");
await writeFile(
  join(adminDir, "components", "index.html"),
  projectComponentsPage({ digests, publicBaseHref: "../../", requireAuth: true }),
  "utf8"
);
await writeGuardedFile(join(siteDir, "index.html"), archivePage(digests));
await writeGuardedFile(join(siteDir, "digest.json"), `${JSON.stringify(publicDigestPayload(latest), null, 2)}\n`);
await writeGuardedFile(join(siteDir, "archive.json"), `${JSON.stringify({ digests: digests.map(redactedDigestPayload) }, null, 2)}\n`);
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
      const sourceCount = digest.sourceStats?.publisherCount ?? new Set((digest.news ?? []).map((item) => item.publisherName ?? item.sourceName)).size;
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
      transition: transform 160ms ease, box-shadow 160ms ease;
    }

    .digest-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.28);
      box-shadow: 0 22px 70px rgba(0, 0, 0, 0.30), 0 0 0 1px rgba(103, 232, 249, 0.11), inset 0 1px 0 rgba(255, 255, 255, 0.11);
    }

    .card-topline {
      display: flex;
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

    .digest-card p {
      margin: 0;
      color: #cbd5e1;
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
      background: rgba(255, 255, 255, 0.10);
      padding: 7px 10px;
      color: #dbeafe;
      font-size: 12px;
      font-weight: 850;
    }

    .asia-note {
      display: inline-flex;
      margin-top: 12px;
      background: rgba(96, 165, 250, 0.16);
      color: #bfdbfe;
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
        <div class="brand"><span class="brand-mark">M</span><span>Market Narrative</span></div>
        <div class="nav-actions">
          <a class="latest-link" href="./${slugForDigest(latest)}/">Latest briefing</a>
          <a class="nav-link" href="./admin/">Admin login</a>
        </div>
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
