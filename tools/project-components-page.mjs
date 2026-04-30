export function projectComponentsPage({ digests = [], publicBaseHref = "../" } = {}) {
  const latest = digests[0];
  const latestSlug = latest ? slugForDigest(latest) : "";
  const latestDate = latest ? formatDigestDate(latest.digestDate) : "No briefing generated yet";
  const sourceCount = latest
    ? latest.sourceStats?.publisherCount ?? new Set((latest.news ?? []).map((item) => item.publisherName ?? item.sourceName)).size
    : 0;
  const trackedMarkets = latest?.marketSnapshots?.length ?? 0;
  const dailyPages = digests.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Market Narrative | Project Components Map</title>
  <style>
    :root {
      --paper: #050816;
      --ink: #f8fafc;
      --muted: #b8c4d8;
      --line: rgba(255, 255, 255, 0.14);
      --panel: rgba(15, 23, 42, 0.62);
      --blue: #60a5fa;
      --green: #34d399;
      --red: #fb7185;
      --gold: #fbbf24;
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
      border-bottom: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(14px);
    }

    .shell {
      width: min(1180px, calc(100% - 36px));
      margin: 0 auto;
    }

    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 64px;
      gap: 18px;
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

    .nav-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
    }

    .nav-link {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 10px 13px;
      color: #374151;
      font-size: 13px;
      font-weight: 900;
    }

    .nav-link.dark {
      border-color: #111827;
      background: #111827;
      color: #fff;
    }

    main {
      padding: 42px 0 80px;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
      gap: 28px;
      align-items: stretch;
      margin-bottom: 26px;
    }

    .eyebrow {
      margin: 0 0 10px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 860px;
      margin: 0;
      font-size: clamp(38px, 6vw, 68px);
      line-height: 0.98;
      letter-spacing: 0;
    }

    .hero-copy {
      margin: 18px 0 0;
      max-width: 820px;
      color: #4b5563;
      font-size: 18px;
      line-height: 1.65;
    }

    .hero-card,
    .panel,
    details.component {
      border: 1px solid rgba(229, 231, 235, 0.8);
      border-radius: 16px;
      background: var(--panel);
      box-shadow: 0 4px 20px rgba(17, 24, 39, 0.035);
    }

    .hero-card {
      display: grid;
      gap: 14px;
      padding: 20px;
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .stat {
      border: 1px solid #eef2f7;
      border-radius: 12px;
      background: #f8fafc;
      padding: 14px;
    }

    .stat span {
      display: block;
      color: #6b7280;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .stat strong {
      display: block;
      margin-top: 6px;
      color: #111827;
      font-size: 24px;
      line-height: 1.05;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 18px;
    }

    .legend span,
    .chip {
      border-radius: 999px;
      background: #f3f4f6;
      padding: 7px 10px;
      color: #374151;
      font-size: 12px;
      font-weight: 850;
    }

    .legend .public { background: #dcfce7; color: #166534; }
    .legend .private { background: #fee2e2; color: #991b1b; }
    .legend .automation { background: #dbeafe; color: #1d4ed8; }

    .section-title {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 18px;
      margin: 34px 0 14px;
    }

    .section-title h2 {
      margin: 0;
      color: #111827;
      font-size: 26px;
      line-height: 1.1;
    }

    .section-title p {
      max-width: 620px;
      margin: 0;
      color: #6b7280;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.5;
      text-align: right;
    }

    .map {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      align-items: stretch;
    }

    .map-column {
      display: grid;
      gap: 12px;
    }

    .map-node {
      position: relative;
      min-height: 132px;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      background: #fff;
      padding: 15px;
    }

    .map-node::before {
      content: "";
      display: block;
      width: 10px;
      height: 10px;
      margin-bottom: 12px;
      border-radius: 999px;
      background: var(--blue);
      box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.12);
    }

    .map-node.public::before { background: var(--green); box-shadow: 0 0 0 5px rgba(5, 150, 105, 0.13); }
    .map-node.private::before { background: var(--red); box-shadow: 0 0 0 5px rgba(220, 38, 38, 0.12); }
    .map-node.automation::before { background: var(--gold); box-shadow: 0 0 0 5px rgba(245, 158, 11, 0.14); }

    .map-node span {
      display: block;
      color: #6b7280;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .map-node strong {
      display: block;
      margin-top: 6px;
      color: #111827;
      font-size: 17px;
      line-height: 1.18;
    }

    .map-node small {
      display: block;
      margin-top: 8px;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.45;
    }

    .arrow-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin: 12px 0;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .arrow-row span {
      border-top: 1px dashed #cbd5e1;
      padding-top: 8px;
    }

    .panel {
      padding: 20px;
    }

    .repo-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .repo-card {
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      background: #fff;
      padding: 16px;
      min-height: 160px;
    }

    .repo-card code {
      display: inline-block;
      margin-bottom: 10px;
    }

    .repo-card strong {
      display: block;
      color: #111827;
      font-size: 15px;
      line-height: 1.25;
    }

    .repo-card p {
      margin: 8px 0 0;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.5;
    }

    .flow-list {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
      counter-reset: flow;
    }

    .flow-list li {
      counter-increment: flow;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #fff;
      padding: 14px;
      min-height: 154px;
    }

    .flow-list li::before {
      content: counter(flow, decimal-leading-zero);
      display: inline-flex;
      margin-bottom: 10px;
      border-radius: 999px;
      background: #111827;
      padding: 5px 8px;
      color: #fff;
      font-size: 11px;
      font-weight: 900;
    }

    .flow-list strong {
      display: block;
      color: #111827;
      font-size: 14px;
      line-height: 1.25;
    }

    .flow-list span {
      display: block;
      margin-top: 7px;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.45;
    }

    .component-grid {
      display: grid;
      gap: 12px;
    }

    details.component {
      overflow: hidden;
    }

    details.component summary {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: center;
      padding: 18px 20px;
      cursor: pointer;
      list-style: none;
    }

    details.component summary::-webkit-details-marker {
      display: none;
    }

    details.component summary h3 {
      margin: 0;
      color: #111827;
      font-size: 19px;
      line-height: 1.2;
    }

    details.component summary p {
      margin: 6px 0 0;
      color: #6b7280;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.45;
    }

    .chev {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 999px;
      background: #f3f4f6;
      color: #111827;
      font-weight: 900;
      transition: transform 160ms ease;
    }

    details[open] .chev {
      transform: rotate(180deg);
    }

    .component-body {
      border-top: 1px solid #eef2f7;
      padding: 18px 20px 20px;
    }

    .body-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .body-card {
      border: 1px solid #eef2f7;
      border-radius: 12px;
      background: #f8fafc;
      padding: 14px;
    }

    .body-card strong {
      display: block;
      color: #111827;
      font-size: 13px;
      line-height: 1.3;
    }

    .body-card p,
    .body-card li {
      color: #4b5563;
      font-size: 13px;
      font-weight: 650;
      line-height: 1.55;
    }

    .body-card p {
      margin: 7px 0 0;
    }

    .body-card ul {
      margin: 8px 0 0;
      padding-left: 18px;
    }

    .file-list {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .file-list li {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      padding: 10px 12px;
      color: #374151;
      font-size: 13px;
      font-weight: 760;
      line-height: 1.45;
    }

    code {
      border-radius: 6px;
      background: #eef2ff;
      padding: 2px 5px;
      color: #3730a3;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      font-weight: 850;
    }

    .boundary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .boundary-card {
      border-radius: 16px;
      padding: 20px;
    }

    .boundary-card.public {
      border: 1px solid #bbf7d0;
      background: #f0fdf4;
    }

    .boundary-card.private {
      border: 1px solid #fecaca;
      background: #fff1f2;
    }

    .boundary-card h3 {
      margin: 0 0 10px;
      color: #111827;
      font-size: 20px;
    }

    .boundary-card ul {
      display: grid;
      gap: 8px;
      margin: 0;
      padding-left: 18px;
    }

    .boundary-card li {
      color: #374151;
      font-size: 14px;
      font-weight: 750;
      line-height: 1.45;
    }

    .topbar {
      background: rgba(3, 7, 18, 0.66);
      backdrop-filter: blur(18px);
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.25);
    }

    .brand-mark {
      background: linear-gradient(135deg, #22d3ee, #6366f1 54%, #f43f5e);
      box-shadow: 0 0 34px rgba(34, 211, 238, 0.28);
    }

    .nav-link,
    .nav-link.dark {
      border-color: rgba(255, 255, 255, 0.14);
      background: rgba(15, 23, 42, 0.52);
      color: #f8fafc;
    }

    .nav-link.dark {
      background: linear-gradient(135deg, #06b6d4, #6366f1);
      box-shadow: 0 12px 30px rgba(37, 99, 235, 0.28);
    }

    .hero-card,
    .panel,
    details.component,
    .stat,
    .map-node,
    .repo-card,
    .flow-list li,
    .body-card,
    .file-list li,
    .boundary-card {
      border-color: rgba(255, 255, 255, 0.14);
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.46));
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(14px);
    }

    h1,
    .section-title h2,
    .stat strong,
    .map-node strong,
    .repo-card strong,
    .flow-list strong,
    details.component summary h3,
    .body-card strong,
    .boundary-card h3,
    .chev {
      color: #f8fafc;
    }

    .hero-copy,
    .section-title p,
    .map-node small,
    .repo-card p,
    .flow-list span,
    details.component summary p,
    .body-card p,
    .body-card li,
    .file-list li,
    .boundary-card li {
      color: #cbd5e1;
    }

    .eyebrow,
    .stat span,
    .map-node span,
    .arrow-row,
    .legend span,
    .chip {
      color: #9fb0c8;
    }

    .legend span,
    .chip,
    code,
    .chev {
      background: rgba(255, 255, 255, 0.10);
    }

    code {
      color: #bfdbfe;
    }

    .legend .public,
    .boundary-card.public {
      border-color: rgba(52, 211, 153, 0.28);
      background: rgba(52, 211, 153, 0.12);
      color: #bbf7d0;
    }

    .legend .private,
    .boundary-card.private {
      border-color: rgba(251, 113, 133, 0.28);
      background: rgba(251, 113, 133, 0.12);
      color: #fecdd3;
    }

    .legend .automation {
      background: rgba(96, 165, 250, 0.16);
      color: #bfdbfe;
    }

    .component-body,
    .arrow-row span {
      border-color: rgba(255, 255, 255, 0.12);
    }

    @media (max-width: 960px) {
      .hero,
      .map,
      .repo-grid,
      .flow-list,
      .body-grid,
      .boundary {
        grid-template-columns: 1fr;
      }

      .arrow-row {
        display: none;
      }

      .section-title {
        align-items: start;
        flex-direction: column;
      }

      .section-title p {
        text-align: left;
      }
    }

    @media (max-width: 640px) {
      .nav-inner {
        align-items: start;
        flex-direction: column;
        padding: 14px 0;
      }

      .nav-actions,
      .nav-link {
        width: 100%;
      }

      .nav-link {
        text-align: center;
      }

      details.component summary {
        grid-template-columns: 1fr;
      }

      .stat-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body class="components-dark">
  <nav class="topbar">
    <div class="shell">
      <div class="nav-inner">
        <a class="brand" href="${escapeHtml(publicBaseHref)}"><span class="brand-mark">M</span><span>Market Narrative</span></a>
        <div class="nav-actions">
          ${latestSlug ? `<a class="nav-link dark" href="${escapeHtml(`${publicBaseHref}${latestSlug}/`)}">Latest briefing</a>` : ""}
          <a class="nav-link" href="${escapeHtml(publicBaseHref)}">Briefing archive</a>
        </div>
      </div>
    </div>
  </nav>

  <main class="shell">
    <section class="hero">
      <div>
        <p class="eyebrow">Project Components Map</p>
        <h1>How the Market Narrative Engine fits together</h1>
        <p class="hero-copy">This admin-only page explains the system we built in plain engineering terms: what is public, what is private, how daily market data moves through the generator, where the reel script comes from, and what the tests protect.</p>
        <div class="legend" aria-label="Component legend">
          <span class="automation">Automation and data flow</span>
          <span class="public">Public GitHub Pages output</span>
          <span class="private">Private local Studio output</span>
        </div>
      </div>
      <aside class="hero-card">
        <p class="eyebrow">Current Published State</p>
        <div class="stat-grid">
          <div class="stat"><span>Latest date</span><strong>${escapeHtml(latestDate)}</strong></div>
          <div class="stat"><span>Daily pages</span><strong>${dailyPages}</strong></div>
          <div class="stat"><span>Markets tracked</span><strong>${trackedMarkets}</strong></div>
          <div class="stat"><span>Source publishers</span><strong>${sourceCount}</strong></div>
        </div>
      </aside>
    </section>

    <section class="section-title">
      <h2>End-to-End System View</h2>
      <p>The MVP is a static-site publishing pipeline with live quote capture, public-safe digest publishing, and a local private Studio artifact for your daily creator workflow.</p>
    </section>

    <section class="map" aria-label="Visual map of project components">
      <div class="map-column">
        <article class="map-node automation">
          <span>Trigger</span>
          <strong>Schedule or Manual Run</strong>
          <small>GitHub Actions runs every 15 minutes on weekdays. Local runs use <code>npm run daily:generate</code>.</small>
        </article>
        <article class="map-node automation">
          <span>Inputs</span>
          <strong>Market Quotes and News Seeds</strong>
          <small>Yahoo Finance chart data updates indices; source-backed seed articles drive narrative themes.</small>
        </article>
      </div>
      <div class="map-column">
        <article class="map-node automation">
          <span>Core Engine</span>
          <strong>Digest Builder</strong>
          <small><code>tools/core.mjs</code> creates sentiment, source clusters, scanner output, summaries, and scripts.</small>
        </article>
        <article class="map-node automation">
          <span>Validation</span>
          <strong>Scanner and Public Redaction</strong>
          <small>Stale 1:2 levels are hidden when live quotes invalidate them. Private script fields are removed from public JSON.</small>
        </article>
      </div>
      <div class="map-column">
        <article class="map-node public">
          <span>Public Output</span>
          <strong>Briefing Website</strong>
          <small>GitHub Pages serves archive pages, dated briefings, source cards, quote board, and charts.</small>
        </article>
        <article class="map-node private">
          <span>Private Output</span>
          <strong>Studio and Reel Script</strong>
          <small>Local files include Studio Command, teleprompter, prompt package, and daily reel script.</small>
        </article>
      </div>
      <div class="map-column">
        <article class="map-node public">
          <span>Reader Experience</span>
          <strong>Public Briefing and Components Doc</strong>
          <small>Readers only see public market research, source attribution, and this system explanation.</small>
        </article>
        <article class="map-node automation">
          <span>Quality Gate</span>
          <strong>Tests and Browser QA</strong>
          <small>Unit checks plus multi-cycle browser QA verify charts, links, quote board, redaction, and page navigation.</small>
        </article>
      </div>
    </section>

    <div class="arrow-row" aria-hidden="true">
      <span>Run starts</span>
      <span>Normalize and analyze</span>
      <span>Split public/private</span>
      <span>Deploy and verify</span>
    </div>

    <section class="section-title">
      <h2>Repository Component Map</h2>
      <p>This shows where the major parts live, including the resume-grade backend/frontend scaffolding and the static publishing engine currently powering the public site.</p>
    </section>

    <section class="repo-grid" aria-label="Repository component map">
      <article class="repo-card">
        <code>backend/</code>
        <strong>Spring Boot modular monolith</strong>
        <p>Contains the planned identity, market data, news, analysis, narrative, assets, and publishing modules with API contracts and persistence schema.</p>
      </article>
      <article class="repo-card">
        <code>apps/public-portal/</code>
        <strong>Future public Next.js app</strong>
        <p>Reserved for the SEO public portal once the static MVP graduates into a full app deployment.</p>
      </article>
      <article class="repo-card">
        <code>apps/admin-studio/</code>
        <strong>Private admin workspace</strong>
        <p>Holds the split admin deployment path for authenticated Studio controls, script review, and asset generation.</p>
      </article>
      <article class="repo-card">
        <code>packages/</code>
        <strong>Shared UI and API contracts</strong>
        <p>Shared design tokens, component primitives, API client types, and permission names for public/admin consistency.</p>
      </article>
      <article class="repo-card">
        <code>tools/</code>
        <strong>Working generator and publisher</strong>
        <p>The active no-install engine: live quote adapter, digest builder, page renderer, static publisher, tests, and browser QA.</p>
      </article>
      <article class="repo-card">
        <code>archive/</code>
        <strong>Public-safe digest history</strong>
        <p>Stores redacted daily digest JSON so GitHub Pages can keep old days available without exposing private Studio content.</p>
      </article>
      <article class="repo-card">
        <code>out/daily/</code>
        <strong>Generated local artifacts</strong>
        <p>Daily public HTML, private Studio HTML, private reel-script markdown, and full local digest JSON.</p>
      </article>
      <article class="repo-card">
        <code>infra/</code>
        <strong>Production database/cache path</strong>
        <p>Docker Compose foundation for PostgreSQL and Redis when the project moves from static publishing into a service deployment.</p>
      </article>
    </section>

    <section class="section-title">
      <h2>Daily Publishing Flow</h2>
      <p>These are the six steps that happen when the site refreshes for a market day.</p>
    </section>

    <section class="panel">
      <ol class="flow-list">
        <li><strong>Generate digest</strong><span>Load mock-first news, fetch live quote snapshots when enabled, and stamp the run for 8:30 IST.</span></li>
        <li><strong>Analyze markets</strong><span>Calculate regional breadth, sentiment, Nifty/Bank Nifty setup validity, and source themes.</span></li>
        <li><strong>Create scripts</strong><span>Build a public summary, a teleprompter draft, and a 45-60 second daily reel script.</span></li>
        <li><strong>Write local files</strong><span>Save public HTML, private Studio HTML, private reel-script markdown, and full local digest JSON.</span></li>
        <li><strong>Publish public site</strong><span>Create GitHub Pages files while redacting private script and AI prompt fields.</span></li>
        <li><strong>Test the website</strong><span>Run browser QA across archive, daily pages, quote-board cards, chart modals, and source links.</span></li>
      </ol>
    </section>

    <section class="section-title">
      <h2>Public vs Private Boundary</h2>
      <p>This is the most important architecture change: public readers get the briefing, while your creator workflow stays local/private.</p>
    </section>

    <section class="boundary">
      <article class="boundary-card public">
        <h3>Public GitHub Pages</h3>
        <ul>
          <li>Archive root at <code>/marketNews/</code></li>
          <li>Dated pages such as <code>/marketNews/30apr2026/</code></li>
          <li>Public-safe <code>digest.json</code> with market quotes, source cards, themes, and setup status</li>
          <li>Live Quote Board, chart modal, source filters, and public-safe source attribution</li>
        </ul>
      </article>
      <article class="boundary-card private">
        <h3>Private Local Studio</h3>
        <ul>
          <li><code>out/daily/YYYY-MM-DD-0830-studio.html</code></li>
          <li><code>out/daily/YYYY-MM-DD-0830-reel-script.md</code></li>
          <li>Teleprompter script, daily reel script, AI prompt package, Studio activity buttons</li>
          <li>Not linked, exported, or stored in public digest archives</li>
        </ul>
      </article>
    </section>

    <section class="section-title">
      <h2>Expandable Component Notes</h2>
      <p>Open each section to understand the pieces without reading the whole codebase first.</p>
    </section>

    <section class="component-grid">
      ${componentDetailsHtml()}
    </section>
  </main>
</body>
</html>`;
}

function componentDetailsHtml() {
  const components = [
    {
      title: "1. Data and Seed Layer",
      summary: "The project starts with stable seed data, then overlays live quotes when the generator runs in live mode.",
      leftTitle: "What it does",
      left: [
        "Stores source-backed article examples, market snapshots, Nifty/Bank Nifty bars, and creator profile data.",
        "Keeps the MVP usable even if an external API fails.",
        "Lets the generator create a complete briefing without requiring paid API keys."
      ],
      rightTitle: "Important files",
      right: [
        "<code>backend/src/main/resources/seed/news.json</code>",
        "<code>backend/src/main/resources/seed/market-snapshots.json</code>",
        "<code>backend/src/main/resources/seed/price-bars.json</code>"
      ]
    },
    {
      title: "2. Live Market Adapter",
      summary: "Yahoo Finance chart data powers refreshed index values and first-party canvas charts.",
      leftTitle: "What it does",
      left: [
        "Fetches S&P 500, Nasdaq 100, Dow Jones, top Asian markets, Nifty, Bank Nifty, DXY, and Brent.",
        "Calculates percent change from previous close instead of faking chart movement.",
        "Stores chart points so clicking an index opens a real captured chart preview."
      ],
      rightTitle: "Important files",
      right: [
        "<code>tools/market-data.mjs</code>",
        "<code>tools/core.mjs</code>",
        "<code>tools/cockpit-page.mjs</code>"
      ]
    },
    {
      title: "3. Digest and Narrative Engine",
      summary: "This is the main transformation layer: raw inputs become source clusters, sentiment, summaries, and scripts.",
      leftTitle: "What it does",
      left: [
        "Clusters articles into macro pressure, global risk, sector support, domestic macro, and volatility groups.",
        "Calculates weighted sentiment using sentiment score and entity match score.",
        "Generates the compact public summary plus the longer source-backed expandable briefing."
      ],
      rightTitle: "Important files",
      right: [
        "<code>tools/core.mjs</code>",
        "<code>tools/generate-daily-summary.mjs</code>",
        "<code>archive/daily/*.json</code>"
      ]
    },
    {
      title: "4. Technical Setup Scanner",
      summary: "The scanner protects the public page from stale or low-quality trade levels.",
      leftTitle: "What it does",
      left: [
        "Calculates EMA, RSI, volume average, and 1:2+ risk-reward validation.",
        "Filters out setups when live quotes have already crossed target, hit stop, or broken reward math.",
        "Keeps all trade language educational and avoids order execution."
      ],
      rightTitle: "Important checks",
      right: [
        "<code>bullishRiskReward()</code> enforces risk math",
        "<code>reconcileTradeSetupsWithMarketSnapshots()</code> removes stale setups",
        "<code>npm test</code> covers scanner acceptance and rejection"
      ]
    },
    {
      title: "5. Public Briefing Template",
      summary: "The shareable page your audience sees: market pulse, source notes, quote board, charts, and setup status.",
      leftTitle: "What it does",
      left: [
        "Builds the archive and dated daily briefing pages for GitHub Pages.",
        "Shows the Live Quote Board only after the reader expands it.",
        "Uses source categories, thumbnails, filters, and chart modals to make the briefing readable."
      ],
      rightTitle: "Public surface",
      right: [
        "<code>/marketNews/</code> archive",
        "<code>/marketNews/30apr2026/</code> daily briefing",
        "<code>/admin/components</code> private project documentation"
      ]
    },
    {
      title: "6. Private Studio and Reel Script",
      summary: "The creator-facing workflow is generated locally but not exposed on the public website.",
      leftTitle: "What it does",
      left: [
        "Creates a private Studio Command page with source QA, scanner, teleprompter, and AI asset prompt preview.",
        "Generates a daily 45-60 second reel script with hook, global cues, India open, trade plan, watch next, and close.",
        "Keeps private scripts out of public HTML, public JSON, and public archive files."
      ],
      rightTitle: "Private local outputs",
      right: [
        "<code>out/daily/YYYY-MM-DD-0830-studio.html</code>",
        "<code>out/daily/YYYY-MM-DD-0830-reel-script.md</code>",
        "<code>out/daily/YYYY-MM-DD-0830-digest.json</code>"
      ]
    },
    {
      title: "7. Static Publisher and GitHub Pages",
      summary: "The deploy step converts generated digests into a public-safe static website.",
      leftTitle: "What it does",
      left: [
        "Creates the root archive, each dated page, and public-safe digest JSON.",
        "Imports previous deployed archive entries so old dates remain available.",
        "Runs on push and on a weekday schedule through GitHub Actions."
      ],
      rightTitle: "Important files",
      right: [
        "<code>tools/publish-site.mjs</code>",
        "<code>tools/import-archive.mjs</code>",
        "<code>.github/workflows/pages.yml</code>"
      ]
    },
    {
      title: "8. Testing and QA",
      summary: "Tests cover core math and the actual deployed browser experience.",
      leftTitle: "What it checks",
      left: [
        "Unit-level contracts: seed data, scanner math, sentiment, market normalization, schema, and redaction.",
        "Browser QA: archive navigation, daily pages, quote-board expansion, chart modals, source links, and no public Studio tab.",
        "Repeated QA cycles reduce the chance that a chart or interactive control silently breaks after deploy."
      ],
      rightTitle: "Commands",
      right: [
        "<code>npm test</code>",
        "<code>npm run site:qa</code>",
        "<code>npm run daily:generate -- --market-data live</code>"
      ]
    }
  ];

  return components.map((component) => `
    <details class="component">
      <summary>
        <div>
          <h3>${escapeHtml(component.title)}</h3>
          <p>${escapeHtml(component.summary)}</p>
        </div>
        <span class="chev">v</span>
      </summary>
      <div class="component-body">
        <div class="body-grid">
          <article class="body-card">
            <strong>${escapeHtml(component.leftTitle)}</strong>
            <ul>
              ${component.left.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </article>
          <article class="body-card">
            <strong>${escapeHtml(component.rightTitle)}</strong>
            <ul class="file-list">
              ${component.right.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </article>
        </div>
      </div>
    </details>
  `).join("");
}

function slugForDigest(digest) {
  const date = digest.digestDate;
  const [year, month, day] = date.split("-");
  const monthName = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][Number(month) - 1];
  return `${Number(day)}${monthName}${year}`;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
