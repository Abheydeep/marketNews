import { brandHeadLinks, brandMarkCss, brandMarkHtml } from "./brand-assets.mjs";
import { multibaggerState } from "./multibagger-data.mjs";

const siteOrigin = process.env.PUBLIC_SITE_ORIGIN ?? "https://marketnarrative.in";
const adminSiteOrigin = process.env.ADMIN_SITE_ORIGIN ?? "https://admin.marketnarrative.in";
const apiOrigin = process.env.MARKET_NARRATIVE_API_BASE ?? "https://api.marketnarrative.in";

export function multibaggerPage(state = multibaggerState()) {
  const serializedState = JSON.stringify(state).replaceAll("<", "\\u003c");
  const pageTitle = "Market Narrative | Multibagger Model Tracker";
  const pageDescription = "A public Market Narrative research model tracking six high-conviction Indian equities, methodology, allocation discipline, review history, and public-safe performance updates.";
  const canonicalUrl = `${siteOrigin}/multibagger/`;
  const previewImageUrl = `${siteOrigin}/og-card.svg`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${brandHeadLinks(siteOrigin)}
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Market Narrative">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:image" content="${escapeHtml(previewImageUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(pageDescription)}">
  <meta name="twitter:image" content="${escapeHtml(previewImageUrl)}">
  <title>${escapeHtml(pageTitle)}</title>
  <style>
    :root {
      --paper: #050816;
      --ink: #f8fafc;
      --muted: #b8c4d8;
      --line: rgba(255, 255, 255, 0.14);
      --panel: rgba(15, 23, 42, 0.70);
      --panel-strong: rgba(15, 23, 42, 0.90);
      --cyan: #22d3ee;
      --blue: #60a5fa;
      --green: #34d399;
      --amber: #fbbf24;
      --red: #fb7185;
    }

    * { box-sizing: border-box; }

    html, body { overflow-x: hidden; }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 12% 0%, rgba(34, 211, 238, 0.28), transparent 30vw),
        radial-gradient(circle at 86% 4%, rgba(96, 165, 250, 0.26), transparent 34vw),
        linear-gradient(135deg, #030712 0%, #07111f 46%, #111827 100%);
      color: var(--ink);
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    a { color: inherit; text-decoration: none; }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      background: rgba(3, 7, 18, 0.72);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(18px);
    }

    .shell {
      width: min(1120px, calc(100% - 36px));
      margin: 0 auto;
    }

    .nav-inner {
      min-height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .brand {
      display: flex;
      align-items: center;
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
      background: linear-gradient(135deg, var(--cyan), #6366f1 54%, #f43f5e);
      color: #fff;
      font-size: 15px;
      font-weight: 900;
    }

    ${brandMarkCss()}

    .nav-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .nav-link {
      border: 1px solid var(--line);
      border-radius: 8px;
      color: var(--muted);
      padding: 9px 12px;
      font-size: 13px;
      font-weight: 850;
    }

    .nav-link.active {
      color: var(--ink);
      border-color: rgba(34, 211, 238, 0.45);
      background: rgba(34, 211, 238, 0.10);
    }

    .hero {
      padding: 56px 0 26px;
      display: grid;
      gap: 24px;
      grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
      align-items: end;
    }

    .eyebrow {
      color: var(--cyan);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin: 0 0 12px;
    }

    h1 {
      margin: 0;
      font-size: clamp(40px, 7vw, 76px);
      line-height: 0.98;
      letter-spacing: 0;
    }

    .hero p {
      color: var(--muted);
      font-size: 17px;
      line-height: 1.7;
      margin: 16px 0 0;
      max-width: 780px;
    }

    .hero-stat {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--panel);
      padding: 18px;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22);
    }

    .hero-stat span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .hero-stat strong {
      display: block;
      margin-top: 8px;
      font-size: 42px;
      line-height: 1;
    }

    .hero-stat p {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.55;
      margin: 12px 0 0;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin: 18px 0 24px;
    }

    .return-strip {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
      margin: 18px 0 12px;
    }

    .metric {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.58);
      padding: 15px;
    }

    .metric span {
      color: var(--muted);
      display: block;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .metric strong {
      display: block;
      margin-top: 8px;
      font-size: 24px;
    }

    .positive { color: var(--green) !important; }
    .negative { color: var(--red) !important; }
    .neutral { color: #dbeafe !important; }
    .stale { color: var(--amber) !important; }

    .price-status {
      border: 1px solid rgba(251, 191, 36, 0.24);
      border-radius: 8px;
      background: rgba(251, 191, 36, 0.08);
      color: #fde68a;
      display: flex;
      justify-content: space-between;
      gap: 14px;
      margin: 0 0 16px;
      padding: 12px 14px;
      font-size: 13px;
      line-height: 1.55;
    }

    .price-status.fresh {
      border-color: rgba(52, 211, 153, 0.28);
      background: rgba(52, 211, 153, 0.08);
      color: #bbf7d0;
    }

    .performance-note {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
      margin: 0 0 24px;
    }

    details.panel {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--panel);
      margin: 14px 0;
      overflow: hidden;
      box-shadow: 0 20px 70px rgba(0, 0, 0, 0.20);
    }

    details.panel summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      cursor: pointer;
      padding: 18px 20px;
      list-style: none;
    }

    details.panel summary::-webkit-details-marker { display: none; }

    .summary-title {
      display: grid;
      gap: 4px;
    }

    .summary-title strong {
      font-size: 18px;
    }

    .summary-title span {
      color: var(--muted);
      font-size: 13px;
    }

    .chev {
      color: var(--cyan);
      font-size: 22px;
      font-weight: 900;
    }

    details[open] .chev { transform: rotate(45deg); }

    .panel-body {
      border-top: 1px solid var(--line);
      padding: 18px 20px 20px;
    }

    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
    }

    table {
      width: 100%;
      min-width: 860px;
      border-collapse: collapse;
    }

    th, td {
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid rgba(255, 255, 255, 0.10);
      padding: 12px 13px;
      font-size: 14px;
      line-height: 1.55;
    }

    th {
      color: #dbeafe;
      background: rgba(30, 41, 59, 0.76);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    td { color: #d7e0ee; }

    tr:last-child td { border-bottom: 0; }

    .price-cell {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .ticker {
      color: #fff;
      display: block;
      font-weight: 950;
      white-space: nowrap;
    }

    .subtext {
      color: var(--muted);
      display: block;
      font-size: 12px;
      margin-top: 2px;
    }

    .allocation-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .allocation-tile {
      position: relative;
      min-height: 178px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.46);
      padding: 16px;
      display: grid;
      align-content: space-between;
      gap: 14px;
      isolation: isolate;
    }

    .allocation-tile::before {
      content: "";
      position: absolute;
      inset: auto 0 0;
      height: var(--tile-fill);
      background: linear-gradient(135deg, rgba(34, 211, 238, 0.28), rgba(52, 211, 153, 0.20));
      z-index: -1;
    }

    .allocation-tile:nth-child(2)::before,
    .allocation-tile:nth-child(5)::before {
      background: linear-gradient(135deg, rgba(96, 165, 250, 0.28), rgba(251, 191, 36, 0.16));
    }

    .allocation-tile:nth-child(3)::before,
    .allocation-tile:nth-child(6)::before {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(34, 211, 238, 0.18));
    }

    .allocation-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }

    .allocation-ticker {
      color: #fff;
      font-size: 24px;
      font-weight: 950;
      line-height: 1;
    }

    .allocation-weight {
      color: var(--green);
      font-size: 28px;
      font-weight: 950;
      line-height: 1;
      white-space: nowrap;
    }

    .allocation-role {
      color: #d7e0ee;
      font-size: 14px;
      line-height: 1.45;
      margin: 0;
    }

    .allocation-status {
      color: var(--muted);
      display: block;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .method-snapshot,
    .regime-snapshot {
      border: 1px solid rgba(34, 211, 238, 0.26);
      border-radius: 10px;
      background: rgba(2, 6, 23, 0.42);
      margin: 0 0 18px;
      padding: 17px;
    }

    .regime-snapshot {
      border-color: rgba(52, 211, 153, 0.24);
    }

    .method-snapshot-head,
    .regime-snapshot-head {
      align-items: end;
      display: flex;
      gap: 14px;
      justify-content: space-between;
      margin: 0 0 12px;
    }

    .method-snapshot-head span,
    .method-pill span,
    .regime-snapshot-head span,
    .regime-pill span,
    .evidence-card span {
      color: var(--cyan);
      display: block;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .regime-snapshot-head span,
    .regime-pill span {
      color: var(--green);
    }

    .method-snapshot-head strong,
    .regime-snapshot-head strong {
      color: #fff;
      font-size: 17px;
      line-height: 1.35;
      text-align: right;
    }

    .method-snapshot-grid,
    .regime-snapshot-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .method-snapshot-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .method-pill,
    .regime-pill {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.56);
      padding: 13px;
    }

    .method-pill p,
    .regime-pill p,
    .evidence-card p,
    .evidence-card li {
      color: #d7e0ee;
      font-size: 14px;
      line-height: 1.55;
      margin: 7px 0 0;
    }

    .regime-pill a,
    .evidence-card a {
      color: #a7f3d0;
      display: inline-block;
      font-size: 12px;
      font-weight: 900;
      margin-top: 10px;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .evidence-card ul {
      margin: 8px 0 0;
      padding-left: 18px;
    }

    .mini-card {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.38);
      padding: 15px;
    }

    .mini-card h3 {
      margin: 0 0 8px;
      font-size: 17px;
    }

    .mini-card p {
      color: var(--muted);
      margin: 0;
      font-size: 14px;
      line-height: 1.62;
    }

    .decision {
      display: inline-flex;
      border: 1px solid rgba(52, 211, 153, 0.45);
      border-radius: 999px;
      background: rgba(52, 211, 153, 0.12);
      color: #a7f3d0;
      padding: 4px 9px;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .note {
      border-left: 4px solid var(--amber);
      background: rgba(251, 191, 36, 0.10);
      border-radius: 8px;
      color: #fde68a;
      padding: 14px 16px;
      line-height: 1.65;
    }

    footer {
      color: var(--muted);
      padding: 28px 0 48px;
      font-size: 13px;
      line-height: 1.65;
    }

    @media (max-width: 900px) {
      .hero,
      .summary-grid,
      .return-strip,
      .allocation-grid,
      .method-snapshot-grid,
      .regime-snapshot-grid,
      .cards {
        grid-template-columns: 1fr;
      }

      .method-snapshot-head,
      .regime-snapshot-head {
        align-items: flex-start;
        flex-direction: column;
      }

      .method-snapshot-head strong,
      .regime-snapshot-head strong {
        text-align: left;
      }
    }

    @media (max-width: 620px) {
      .nav-inner {
        align-items: flex-start;
        flex-direction: column;
        padding: 13px 0;
      }

      .nav-actions {
        width: 100%;
      }

      .nav-link {
        flex: 1;
        text-align: center;
      }

      details.panel summary {
        padding: 16px;
      }

      .panel-body {
        padding: 16px;
      }
    }
  </style>
</head>
<body>
  <nav class="topbar">
    <div class="shell">
      <div class="nav-inner">
        <a class="brand" href="${escapeHtml(siteOrigin)}/">${brandMarkHtml()}<span>Market Narrative</span></a>
        <div class="nav-actions">
          <a class="nav-link" href="${escapeHtml(siteOrigin)}/">Briefing archive</a>
          <span class="nav-link active" aria-current="page">Model tracker</span>
        </div>
      </div>
    </div>
  </nav>

  <main class="shell">
    <section class="hero">
      <div>
        <p class="eyebrow">Market Narrative Research</p>
        <h1>Market Narrative Multibagger Portfolio</h1>
        <p>A public research model within Market Narrative, tracking six high-conviction Indian equities with source-led methodology, allocation discipline, monthly keep-or-replace reviews, and transparent public-safe performance notes.</p>
      </div>
      <aside class="hero-stat">
        <span>Since Apr 27, 2026</span>
        <strong id="portfolioReturn" class="${toneClass(state.performance.sinceLaunchPercent)}">${formatSignedPercent(state.performance.sinceLaunchPercent)}</strong>
        <p>${escapeHtml(state.disclaimer)}</p>
      </aside>
    </section>

    <section class="return-strip" aria-label="Public model performance">
      <div class="metric"><span>Model capital</span><strong id="modelCapitalMetric">${formatInr(state.modelCapitalInr)}</strong></div>
      <div class="metric"><span>Current value</span><strong id="currentValueMetric">${formatInr(state.performance.currentModelValueInr)}</strong></div>
      <div class="metric"><span>Model P&L</span><strong id="modelPnlMetric" class="${toneClass(state.performance.totalPnlInr)}">${formatSignedInr(state.performance.totalPnlInr)}</strong></div>
      <div class="metric"><span>Return</span><strong id="portfolioReturnMetric" class="${toneClass(state.performance.sinceLaunchPercent)}">${formatSignedPercent(state.performance.sinceLaunchPercent)}</strong></div>
      <div class="metric"><span>${escapeHtml(state.performance.benchmark)}</span><strong id="benchmarkReturnMetric" class="${toneClass(state.performance.benchmarkSinceLaunchPercent)}">${formatSignedPercent(state.performance.benchmarkSinceLaunchPercent)}</strong></div>
    </section>
    <p id="priceStatus" class="price-status ${state.pricing?.isStale ? "stale" : "fresh"}"><span>${escapeHtml(priceStatusText(state))}</span><span id="lastPriceAtMetric">${escapeHtml(formatDateTime(state.updatedAt))}</span></p>
    <p class="performance-note">${escapeHtml(state.performance.note)}</p>

    <details class="panel research-framework-panel" open>
      <summary>
        <span class="summary-title"><strong>Research Framework</strong><span>Method snapshot and dated market-regime evidence in one collapsible section.</span></span>
        <span class="chev">+</span>
      </summary>
      <div class="panel-body">
        <section class="method-snapshot" aria-labelledby="researchMethodSnapshotTitle">
          <div class="method-snapshot-head">
            <span>Research Method Snapshot</span>
            <strong id="researchMethodSnapshotTitle">How the six-stock model earns its slots.</strong>
          </div>
          <div class="method-snapshot-grid">
            <article class="method-pill">
              <span>Definition</span>
              <p>${escapeHtml(state.methodology?.definition ?? "A multibagger candidate should have the business evidence to compound capital over a full cycle.")}</p>
            </article>
            <article class="method-pill">
              <span>Evaluation</span>
              <p>${escapeHtml(methodologyEvaluationSummary(state.methodology))}</p>
            </article>
            <article class="method-pill">
              <span>Replacement</span>
              <p>${escapeHtml(state.methodology?.replacementLogic ?? "A holding must keep earning its slot against cleaner challengers.")}</p>
            </article>
          </div>
        </section>

        <section class="regime-snapshot" aria-labelledby="marketRegimeEvidenceTitle">
          <div class="regime-snapshot-head">
            <span>Market Regime Evidence</span>
            <strong id="marketRegimeEvidenceTitle">Dated source context as of ${escapeHtml(state.researchEvidence?.asOf ?? "2026-05-02")}.</strong>
          </div>
          <div class="regime-snapshot-grid">
            ${(state.researchEvidence?.marketRegime ?? []).map((item) => `
            <article class="regime-pill">
              <span>${escapeHtml(item.label)}</span>
              <p>${escapeHtml(item.summary)}</p>
              <a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.sourceLabel)}</a>
            </article>`).join("")}
          </div>
        </section>

        <div class="table-wrap" style="margin-top:12px;">
          <table>
            <thead><tr><th>Evaluation Category</th></tr></thead>
            <tbody>
              ${(state.methodology?.evaluationCategories ?? []).map((item) => `<tr><td>${escapeHtml(item)}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
        <p class="note" style="margin-top:12px;">What this is: a public educational research tracker with transparent rules. What this is not: stock advice, guaranteed return guidance, or a demat statement mirror.</p>
      </div>
    </details>

    <details class="panel" open>
      <summary>
        <span class="summary-title"><strong>Portfolio At A Glance</strong><span>Target weights, model capital, and current portfolio job.</span></span>
        <span class="chev">+</span>
      </summary>
      <div class="panel-body">
        <div class="allocation-grid">
          ${state.holdings.map((holding) => `
          <article class="allocation-tile" style="--tile-fill:${Math.min(88, 22 + holding.targetWeight * 2.2)}%;">
            <div class="allocation-top">
              <span class="allocation-ticker">${escapeHtml(holding.ticker)}</span>
              <strong class="allocation-weight">${formatPercent(holding.targetWeight)}</strong>
            </div>
            <p class="allocation-role">${escapeHtml(holding.role)}</p>
            <span class="allocation-status">${escapeHtml(holding.status)}</span>
          </article>`).join("")}
        </div>
      </div>
    </details>

    <details class="panel evidence-panel">
      <summary>
        <span class="summary-title"><strong>Verified Evidence Ledger</strong><span>Dated facts supporting each model slot, plus the proof still needed.</span></span>
        <span class="chev">+</span>
      </summary>
      <div class="panel-body">
        <div class="cards">
          ${(state.researchEvidence?.holdingEvidence ?? []).map((item) => `
          <article class="mini-card evidence-card">
            <h3>${escapeHtml(item.ticker)}</h3>
            <span>Verified Evidence</span>
            <ul>
              ${(item.evidence ?? []).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
            </ul>
            <p><strong>Needs proof:</strong> ${escapeHtml(item.needsProof)}</p>
            <a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.sourceLabel)}</a>
          </article>`).join("")}
        </div>
        <p class="note" style="margin-top:12px;">${escapeHtml((state.researchEvidence?.researchBoundaries ?? [])[0] ?? "This evidence layer is dated context, not a trading signal or return promise.")}</p>
      </div>
    </details>

    <details class="panel">
      <summary>
        <span class="summary-title"><strong>Model Holdings</strong><span>Public model allocations with entry, latest price, and return math; no personal account data is published.</span></span>
        <span class="chev">+</span>
      </summary>
      <div class="panel-body">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ticker</th><th>Weight</th><th>Entry</th><th>Current</th><th>Return</th><th>P&L</th><th>Day</th><th>Role</th></tr></thead>
            <tbody id="modelHoldingsRows">
              ${holdingsRowsHtml(state.holdings)}
            </tbody>
          </table>
        </div>
      </div>
    </details>

    <details class="panel">
      <summary>
        <span class="summary-title"><strong>Thesis And Break Rules</strong><span>Why each stock belongs, and what would force a change.</span></span>
        <span class="chev">+</span>
      </summary>
      <div class="panel-body">
        <div class="cards">
          ${state.holdings.map((holding) => `
          <article class="mini-card">
            <h3>${escapeHtml(holding.ticker)}</h3>
            <p><strong>Thesis:</strong> ${escapeHtml(holding.thesis)}</p>
            <p><strong>Buy rule:</strong> ${escapeHtml(holding.buyRule)}</p>
            <p><strong>Break rule:</strong> ${escapeHtml(holding.breakRule)}</p>
            <p><strong>Profitability:</strong> ${escapeHtml(holding.profitabilityLens ?? "")}</p>
            <p><strong>Valuation:</strong> ${escapeHtml(holding.valuationLens ?? "")}</p>
            <p><strong>Growth catalyst:</strong> ${escapeHtml(holding.growthCatalyst ?? "")}</p>
            <p><strong>Conversion risk:</strong> ${escapeHtml(holding.conversionRisk ?? "")}</p>
            <p><strong>Capital structure:</strong> ${escapeHtml(holding.capitalStructureRisk ?? "")}</p>
          </article>`).join("")}
        </div>
      </div>
    </details>

    <details class="panel">
      <summary>
        <span class="summary-title"><strong>Buy And Sell Record</strong><span>Public model actions and allocation changes.</span></span>
        <span class="chev">+</span>
      </summary>
      <div class="panel-body">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Ticker</th><th>Action</th><th>Weight Change</th><th>Reference</th><th>Public Note</th></tr></thead>
            <tbody>
              ${state.transactions.map((item) => `
              <tr>
                <td>${escapeHtml(item.date)}</td>
                <td><span class="ticker">${escapeHtml(item.ticker)}</span></td>
                <td>${escapeHtml(item.action)}</td>
                <td>${formatPercent(item.weightChange)}</td>
                <td class="price-cell">${formatPrice(item.referencePrice)}</td>
                <td>${escapeHtml(item.publicNote)}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </details>

    <details class="panel">
      <summary>
        <span class="summary-title"><strong>Monthly Reviews</strong><span>Published keep/replace history from the admin review process.</span></span>
        <span class="chev">+</span>
      </summary>
      <div class="panel-body">
        ${state.monthlyReviews.map((review) => `
        <article class="mini-card" style="margin-bottom:12px;">
          <h3>${escapeHtml(review.month)} - ${escapeHtml(review.headline)}</h3>
          <p>Published ${escapeHtml(review.publishedDate)}.</p>
        </article>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ticker</th><th>Decision</th><th>Public Rationale</th></tr></thead>
            <tbody>
              ${review.decisions.map((decision) => `
              <tr>
                <td><span class="ticker">${escapeHtml(decision.ticker)}</span></td>
                <td><span class="decision">${escapeHtml(decision.decision)}</span></td>
                <td>${escapeHtml(decision.publicRationale)}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>`).join("")}
      </div>
    </details>

    <details class="panel">
      <summary>
        <span class="summary-title"><strong>Watchlist And Replacements</strong><span>Names that can challenge the six-stock model.</span></span>
        <span class="chev">+</span>
      </summary>
      <div class="panel-body">
        <div class="cards">
          ${state.watchlist.map((item) => `
          <article class="mini-card">
            <h3>${escapeHtml(item.ticker)}</h3>
            <p><strong>${escapeHtml(item.status)}:</strong> ${escapeHtml(item.reason)}</p>
          </article>`).join("")}
        </div>
      </div>
    </details>

    <details class="panel">
      <summary>
        <span class="summary-title"><strong>Risk Controls</strong><span>Rules that keep the 5x attempt from becoming blind conviction.</span></span>
        <span class="chev">+</span>
      </summary>
      <div class="panel-body">
        <p class="note">Tembo is capped at 10%. PIGL and JNK must prove margin and receivable quality. KPEL and Dhabriya carry the cleanest alpha weight, but both still need monthly working-capital review. CPCL is outside this model because refinery-cycle value is not treated as permanent compounding.</p>
      </div>
    </details>

    <details class="panel">
      <summary>
        <span class="summary-title"><strong>Sources</strong><span>Primary filings and reference summaries used for the public model.</span></span>
        <span class="chev">+</span>
      </summary>
      <div class="panel-body">
        <div class="cards">
          ${state.sources.map((source) => `
          <a class="mini-card" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">
            <h3>${escapeHtml(source.label)}</h3>
            <p>Open source</p>
          </a>`).join("")}
        </div>
      </div>
    </details>
  </main>

  <footer class="shell">
    <p>${escapeHtml(state.disclaimer)} Last static update: ${escapeHtml(formatDateTime(state.updatedAt))}.</p>
  </footer>

  <script>
    window.MARKET_NARRATIVE_API_BASE = ${JSON.stringify(apiOrigin)};
    window.__MULTIBAGGER_STATE__ = ${serializedState};
    renderMultibaggerState(window.__MULTIBAGGER_STATE__);
    (async function refreshMultibaggerState() {
      const configuredBase = window.MARKET_NARRATIVE_API_BASE || "";
      const urls = configuredBase
        ? [configuredBase.replace(/\\/$/, "") + "/api/public/multibagger/state", "./state.json"]
        : ["./state.json"];
      for (const url of urls) {
        try {
          const response = await fetch(url, { cache: "no-store" });
          if (response.ok) {
            window.__MULTIBAGGER_STATE__ = await response.json();
            renderMultibaggerState(window.__MULTIBAGGER_STATE__);
            document.documentElement.dataset.multibaggerSource = url;
            return;
          }
        } catch {
          // Static HTML remains usable when the live endpoint is unavailable.
        }
      }
    })();

    function renderMultibaggerState(state) {
      if (!state || !Array.isArray(state.holdings)) return;
      setText("portfolioReturn", formatSignedPercent(state.performance?.sinceLaunchPercent));
      setTone("portfolioReturn", state.performance?.sinceLaunchPercent);
      setText("modelCapitalMetric", formatInr(state.modelCapitalInr));
      setText("currentValueMetric", formatInr(state.performance?.currentModelValueInr));
      setText("modelPnlMetric", formatSignedInr(state.performance?.totalPnlInr));
      setTone("modelPnlMetric", state.performance?.totalPnlInr);
      setText("portfolioReturnMetric", formatSignedPercent(state.performance?.sinceLaunchPercent));
      setTone("portfolioReturnMetric", state.performance?.sinceLaunchPercent);
      setText("benchmarkReturnMetric", formatSignedPercent(state.performance?.benchmarkSinceLaunchPercent));
      setTone("benchmarkReturnMetric", state.performance?.benchmarkSinceLaunchPercent);
      setText("lastPriceAtMetric", formatDateTime(state.updatedAt || state.pricing?.refreshedAt));
      const rows = document.getElementById("modelHoldingsRows");
      if (rows) rows.innerHTML = state.holdings.map(holdingRowHtml).join("");
      const status = document.getElementById("priceStatus");
      if (status) {
        const stale = Boolean(state.pricing?.isStale || state.holdings.some((holding) => holding.isStale));
        status.className = "price-status " + (stale ? "stale" : "fresh");
        const first = status.querySelector("span");
        if (first) first.textContent = stale
          ? "Verified live quotes are not available yet. Current prices, returns, P&L, and day moves are hidden."
          : "Prices are refreshed server-side during Indian market hours.";
      }
    }

    function holdingRowHtml(holding) {
      const returnTone = toneClass(holding.returnPercent);
      const dayTone = toneClass(holding.dayChangePercent);
      const currentTone = holding.isStale ? "stale" : "neutral";
      return "<tr data-return-tone=\\"" + returnTone + "\\">"
        + "<td><span class=\\"ticker\\">" + escapeHtml(holding.ticker) + "</span><span class=\\"subtext\\">" + escapeHtml(holding.name) + "</span></td>"
        + "<td class=\\"price-cell\\">" + formatPercent(holding.targetWeight) + "</td>"
        + "<td class=\\"price-cell\\">" + formatPrice(holding.entryPrice) + "</td>"
        + "<td class=\\"price-cell " + currentTone + "\\">" + formatPrice(holding.lastPrice) + "<span class=\\"subtext\\">" + escapeHtml(holding.priceSource || "Price snapshot") + "</span></td>"
        + "<td class=\\"price-cell " + returnTone + "\\">" + formatSignedPercent(holding.returnPercent) + "</td>"
        + "<td class=\\"price-cell " + toneClass(holding.modelPnlInr) + "\\">" + formatSignedInr(holding.modelPnlInr) + "</td>"
        + "<td class=\\"price-cell " + dayTone + "\\">" + formatSignedPercent(holding.dayChangePercent) + "</td>"
        + "<td>" + escapeHtml(holding.role) + "<span class=\\"subtext\\">" + escapeHtml(holding.status) + "</span></td>"
        + "</tr>";
    }

    function setText(id, value) {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    }

    function setTone(id, value) {
      const node = document.getElementById(id);
      if (!node) return;
      node.classList.remove("positive", "negative", "neutral", "stale");
      node.classList.add(toneClass(value));
    }

    function toneClass(value) {
      const number = Number(value);
      if (number > 0) return "positive";
      if (number < 0) return "negative";
      return "neutral";
    }

    function formatInr(value) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "Awaiting quote";
      return "INR " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value));
    }

    function formatSignedInr(value) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "--";
      const number = Number(value);
      const prefix = number > 0 ? "+" : number < 0 ? "-" : "";
      return prefix + "INR " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.abs(number));
    }

    function formatPrice(value) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "Awaiting quote";
      return "INR " + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
    }

    function formatPercent(value) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "--";
      return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 1 }) + "%";
    }

    function formatSignedPercent(value) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "--";
      const number = Number(value);
      const prefix = number > 0 ? "+" : "";
      return prefix + number.toLocaleString("en-IN", { maximumFractionDigits: 2 }) + "%";
    }

    function formatDateTime(value) {
      const date = value ? new Date(value) : new Date();
      return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
    }
  </script>
</body>
</html>`;
}

export function multibaggerAdminPage(state = multibaggerState()) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${brandHeadLinks(adminSiteOrigin)}
  <meta name="robots" content="noindex,nofollow">
  <title>Market Narrative | Multibagger Admin Review</title>
  <style>${adminCss()}</style>
</head>
<body class="admin-auth-required auth-pending">
  ${adminAuthGateHtml()}
  <nav class="topbar">
    <div class="shell nav-inner">
      <a class="brand" href="${escapeHtml(adminSiteOrigin)}/">${brandMarkHtml()}<span>Market Narrative</span></a>
      <div class="nav-actions">
        <a class="nav-link" href="${escapeHtml(adminSiteOrigin)}/">Admin studio</a>
        <button id="adminLogoutBtn" class="nav-link" type="button">Logout</button>
      </div>
    </div>
  </nav>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Private monthly review</p>
      <h1>Multibagger Review Desk</h1>
      <p>Upload the current portfolio image, run the monthly keep-or-replace review, correct extracted positions, and publish only the public-safe decision summary.</p>
    </section>

    <section class="admin-grid">
      <article class="panel">
        <h2>1. Portfolio Image</h2>
        <input id="portfolioFile" type="file" accept="image/png,image/jpeg,image/webp">
        <button id="uploadSnapshotBtn" type="button">Upload Snapshot</button>
        <p id="snapshotState" class="state-line">No upload yet.</p>
      </article>
      <article class="panel">
        <h2>2. Monthly Review</h2>
        <label>Review month <input id="reviewMonth" type="month" value="2026-05"></label>
        <button id="runReviewBtn" type="button">Run Monthly Review</button>
        <p id="reviewState" class="state-line">Waiting for a snapshot or manual review run.</p>
      </article>
      <article class="panel">
        <h2>3. Publish</h2>
        <button id="publishReviewBtn" type="button" disabled>Publish Sanitized Review</button>
        <p id="publishState" class="state-line">Nothing published in this session.</p>
      </article>
    </section>

    <details class="panel" open>
      <summary><strong>Current Public Model</strong><span>+</span></summary>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ticker</th><th>Weight</th><th>Review Rule</th></tr></thead>
          <tbody>${state.holdings.map((holding) => `
            <tr><td>${escapeHtml(holding.ticker)}</td><td>${formatPercent(holding.targetWeight)}</td><td>${escapeHtml(holding.breakRule)}</td></tr>
          `).join("")}</tbody>
        </table>
      </div>
    </details>

    <details class="panel" open>
      <summary><strong>Agent Output</strong><span>+</span></summary>
      <pre id="reviewOutput">${escapeHtml(JSON.stringify({ status: "idle", expectedDecisions: ["KEEP", "ADD", "TRIM", "SELL", "REPLACE"] }, null, 2))}</pre>
    </details>
  </main>
  <script>
    window.MARKET_NARRATIVE_API_BASE = ${JSON.stringify(apiOrigin)};
    window.__ADMIN_AUTH_HASH__ = "80b6c184bff356be9b060287583d6c10afe1d425a98410dcd5bfd72e251c40f6";
    window.__MULTIBAGGER_STATE__ = ${JSON.stringify(state)};
    ${adminScript()}
  </script>
</body>
</html>`;
}

function adminCss() {
  return `
    :root { --paper:#050816; --ink:#f8fafc; --muted:#b8c4d8; --line:rgba(255,255,255,.14); --panel:rgba(15,23,42,.76); --cyan:#22d3ee; }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; background:linear-gradient(135deg,#030712,#0f172a); color:var(--ink); font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
    a { color:inherit; text-decoration:none; }
    .shell { width:min(1120px,calc(100% - 36px)); margin:0 auto; }
    .topbar { position:sticky; top:0; z-index:20; background:rgba(3,7,18,.72); border-bottom:1px solid var(--line); backdrop-filter:blur(18px); }
    .nav-inner { min-height:64px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
    .brand { display:flex; align-items:center; gap:12px; font-size:20px; font-weight:850; }
    .brand-mark { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:9px; background:linear-gradient(135deg,var(--cyan),#6366f1 54%,#f43f5e); font-weight:900; }
    ${brandMarkCss()}
    .nav-actions { display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
    .nav-link, button { border:1px solid var(--line); border-radius:8px; background:rgba(15,23,42,.7); color:var(--ink); padding:10px 12px; font-size:13px; font-weight:850; cursor:pointer; }
    main { padding:34px 0 64px; }
    .hero { margin-bottom:20px; }
    .eyebrow { color:var(--cyan); font-size:12px; font-weight:900; letter-spacing:.12em; text-transform:uppercase; margin:0 0 10px; }
    h1 { margin:0; font-size:clamp(36px,6vw,64px); line-height:1; }
    h2 { margin:0 0 14px; font-size:19px; }
    p { color:var(--muted); line-height:1.65; }
    .admin-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
    .panel { border:1px solid var(--line); border-radius:10px; background:var(--panel); padding:18px; margin:14px 0; }
    details.panel summary { display:flex; justify-content:space-between; cursor:pointer; list-style:none; }
    details.panel summary::-webkit-details-marker { display:none; }
    input { width:100%; border:1px solid var(--line); border-radius:8px; background:#020617; color:var(--ink); padding:10px; margin:8px 0 12px; }
    .state-line { min-height:24px; margin:10px 0 0; }
    .table-wrap { overflow-x:auto; border:1px solid var(--line); border-radius:8px; margin-top:14px; }
    table { width:100%; min-width:680px; border-collapse:collapse; }
    th,td { text-align:left; border-bottom:1px solid rgba(255,255,255,.1); padding:11px 12px; font-size:14px; }
    th { color:#dbeafe; background:rgba(30,41,59,.76); }
    pre { overflow:auto; border:1px solid var(--line); border-radius:8px; background:#020617; color:#dbeafe; padding:14px; }
    .auth-gate { min-height:100vh; display:grid; place-items:center; padding:28px; }
    .auth-card { width:min(460px,100%); border:1px solid var(--line); border-radius:16px; background:var(--panel); padding:28px; }
    .auth-card h1 { font-size:32px; }
    .auth-field { display:grid; gap:7px; margin-bottom:12px; }
    .auth-submit { width:100%; background:linear-gradient(135deg,#67e8f9,#60a5fa 48%,#818cf8); color:#020617; }
    .auth-error { color:#fecaca; }
    .auth-error[hidden] { display:none; }
    body.admin-auth-required.auth-pending .topbar, body.admin-auth-required.auth-pending main.shell { display:none; }
    body.admin-auth-required.auth-ready #adminAuthGate { display:none; }
    @media (max-width:900px) { .admin-grid { grid-template-columns:1fr; } .nav-inner { align-items:flex-start; flex-direction:column; padding:13px 0; } }
  `;
}

function adminAuthGateHtml() {
  return `
  <section id="adminAuthGate" class="auth-gate" aria-label="Admin login">
    <form id="adminLoginForm" class="auth-card" autocomplete="on">
      <p class="eyebrow">Private Studio</p>
      <h1>Admin Login</h1>
      <p>Sign in to open the private multibagger monthly review workflow.</p>
      <label class="auth-field"><span>Email</span><input id="adminEmail" name="email" type="email" autocomplete="username" required></label>
      <label class="auth-field"><span>Password</span><input id="adminPassword" name="password" type="password" autocomplete="current-password" required></label>
      <button class="auth-submit" type="submit">Open Review Desk</button>
      <p id="adminAuthError" class="auth-error" role="alert" hidden>Could not sign in with those credentials.</p>
    </form>
  </section>`;
}

function adminScript() {
  return `
    const apiBase = window.MARKET_NARRATIVE_API_BASE || "";
    let snapshotId = null;
    let reviewId = null;
    bindAdminAuth();
    bindReviewActions();
    if (hasAdminSession()) unlockAdminGate(); else showAdminGate();

    function bindReviewActions() {
      document.getElementById('uploadSnapshotBtn')?.addEventListener('click', uploadSnapshot);
      document.getElementById('runReviewBtn')?.addEventListener('click', runReview);
      document.getElementById('publishReviewBtn')?.addEventListener('click', publishReview);
    }

    async function uploadSnapshot() {
      const file = document.getElementById('portfolioFile')?.files?.[0];
      if (!file) return setText('snapshotState', 'Choose an image first.');
      const form = new FormData();
      form.append('file', file);
      setText('snapshotState', 'Uploading...');
      try {
        const response = await fetch(apiBase + '/api/admin/multibagger/snapshots', { method: 'POST', headers: authHeaders(), body: form });
        const payload = await response.json();
        snapshotId = payload.snapshotId;
        setText('snapshotState', 'Snapshot stored for review: ' + snapshotId);
      } catch {
        snapshotId = 'local-static-snapshot';
        setText('snapshotState', 'Backend unavailable. Static preview mode is active.');
      }
    }

    async function runReview() {
      const month = document.getElementById('reviewMonth')?.value || new Date().toISOString().slice(0, 7);
      setText('reviewState', 'Running review...');
      const body = JSON.stringify({ snapshotId, month, corrections: [] });
      try {
        const response = await fetch(apiBase + '/api/admin/multibagger/reviews/run', { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body });
        const payload = await response.json();
        reviewId = payload.reviewId;
        document.getElementById('reviewOutput').textContent = JSON.stringify(payload, null, 2);
        document.getElementById('publishReviewBtn').disabled = false;
        setText('reviewState', 'Review ready.');
      } catch {
        const fallback = localReview(month);
        reviewId = fallback.reviewId;
        document.getElementById('reviewOutput').textContent = JSON.stringify(fallback, null, 2);
        document.getElementById('publishReviewBtn').disabled = false;
        setText('reviewState', 'Static preview review ready.');
      }
    }

    async function publishReview() {
      if (!reviewId) return setText('publishState', 'Run a review first.');
      try {
        const response = await fetch(apiBase + '/api/admin/multibagger/reviews/' + encodeURIComponent(reviewId) + '/publish', { method: 'POST', headers: authHeaders() });
        const payload = await response.json();
        setText('publishState', 'Published sanitized review for ' + (payload.month || 'current month') + '.');
      } catch {
        setText('publishState', 'Backend unavailable. Nothing was published from this static preview.');
      }
    }

    function localReview(month) {
      return {
        reviewId: 'static-' + month,
        month,
        decisions: window.__MULTIBAGGER_STATE__.holdings.map((holding) => ({
          ticker: holding.ticker,
          action: holding.ticker === 'TEMBO' ? 'KEEP_CAPPED' : 'KEEP',
          confidence: holding.ticker === 'TEMBO' ? 0.62 : 0.74,
          evidence: holding.breakRule,
          publicSummary: holding.status
        })),
        note: 'Preview only. Publish requires the Spring backend.'
      };
    }

    function setText(id, value) {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    }

    function bindAdminAuth() {
      const form = document.getElementById('adminLoginForm');
      const logout = document.getElementById('adminLogoutBtn');
      if (form) {
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const email = document.getElementById('adminEmail')?.value ?? '';
          const password = document.getElementById('adminPassword')?.value ?? '';
          const error = document.getElementById('adminAuthError');
          const hash = await adminCredentialHash(email, password);
          const token = await requestBackendToken(email, password);
          if (hash === window.__ADMIN_AUTH_HASH__) {
            sessionStorage.setItem('marketNarrativeAdminSession', hash);
            if (token) sessionStorage.setItem('marketNarrativeAdminToken', token);
            if (error) error.hidden = true;
            unlockAdminGate();
            return;
          }
          if (error) error.hidden = false;
        });
      }
      if (logout) {
        logout.addEventListener('click', () => {
          sessionStorage.removeItem('marketNarrativeAdminSession');
          sessionStorage.removeItem('marketNarrativeAdminToken');
          window.location.reload();
        });
      }
    }

    function hasAdminSession() {
      try { return sessionStorage.getItem('marketNarrativeAdminSession') === window.__ADMIN_AUTH_HASH__; } catch { return false; }
    }

    function showAdminGate() {
      document.body.classList.add('auth-pending');
      document.body.classList.remove('auth-ready');
      document.getElementById('adminEmail')?.focus();
    }

    function unlockAdminGate() {
      document.body.classList.remove('auth-pending');
      document.body.classList.add('auth-ready');
    }

    async function adminCredentialHash(email, password) {
      const identity = String(email || '').trim().toLowerCase() + ':' + String(password || '');
      const bytes = new TextEncoder().encode(identity);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    }

    async function requestBackendToken(email, password) {
      try {
        const response = await fetch(apiBase + '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (!response.ok) return null;
        const payload = await response.json();
        return payload.token || null;
      } catch {
        return null;
      }
    }

    function authHeaders(extra = {}) {
      const token = sessionStorage.getItem('marketNarrativeAdminToken');
      return token ? { ...extra, Authorization: 'Bearer ' + token } : extra;
    }
  `;
}

function holdingsRowsHtml(holdings) {
  return holdings.map((holding) => `
              <tr data-return-tone="${toneClass(holding.returnPercent)}">
                <td><span class="ticker">${escapeHtml(holding.ticker)}</span><span class="subtext">${escapeHtml(holding.name)}</span></td>
                <td class="price-cell">${formatPercent(holding.targetWeight)}</td>
                <td class="price-cell">${formatPrice(holding.entryPrice)}</td>
                <td class="price-cell ${holding.isStale ? "stale" : "neutral"}">${formatPrice(holding.lastPrice)}<span class="subtext">${escapeHtml(holding.priceSource ?? "Price snapshot")}</span></td>
                <td class="price-cell ${toneClass(holding.returnPercent)}">${formatSignedPercent(holding.returnPercent)}</td>
                <td class="price-cell ${toneClass(holding.modelPnlInr)}">${formatSignedInr(holding.modelPnlInr)}</td>
                <td class="price-cell ${toneClass(holding.dayChangePercent)}">${formatSignedPercent(holding.dayChangePercent)}</td>
                <td>${escapeHtml(holding.role)}<span class="subtext">${escapeHtml(holding.status)}</span></td>
              </tr>`).join("");
}

function priceStatusText(state) {
  if (state.pricing?.isStale || state.holdings?.some((holding) => holding.isStale)) {
    return "Verified live quotes are not available yet. Current prices, returns, P&L, and day moves are hidden.";
  }
  return "Prices are refreshed server-side during Indian market hours.";
}

function toneClass(value) {
  const number = Number(value);
  if (number > 0) return "positive";
  if (number < 0) return "negative";
  return "neutral";
}

function formatInr(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "Awaiting quote";
  }
  return `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value))}`;
}

function formatSignedInr(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "--";
  }
  const number = Number(value);
  const prefix = number > 0 ? "+" : number < 0 ? "-" : "";
  return `${prefix}INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.abs(number))}`;
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "Awaiting quote";
  }
  return `INR ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}`;
}

function formatPercent(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "--";
  }
  return `${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
}

function formatSignedPercent(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "--";
  }
  const number = Number(value);
  const prefix = number > 0 ? "+" : "";
  return `${prefix}${number.toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function methodologyEvaluationSummary(methodology) {
  const categories = methodology?.evaluationCategories ?? [];
  const labels = categories
    .slice(0, 5)
    .map((item) => String(item).split(":")[0].trim())
    .filter(Boolean);
  return labels.length > 0
    ? labels.join(", ")
    : "Profitability, valuation, growth catalysts, cash conversion, and capital structure.";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
