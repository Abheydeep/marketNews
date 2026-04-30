import { newsArticleJsonLd } from "./core.mjs";

export function cockpitPage(digest, initialTab = "public-view") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <title>Market Narrative | Pre-Market Intelligence & Studio Engine</title>
  <script type="application/ld+json">${JSON.stringify(newsArticleJsonLd(digest))}</script>
  <style>
    :root {
      --paper: #f4f5f7;
      --ink: #111827;
      --slate: #0f172a;
      --stone: #6b7280;
      --line: #e5e7eb;
      --panel: #ffffff;
      --blue: #2563eb;
      --green: #059669;
      --red: #dc2626;
      --gold: #f59e0b;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background-color: var(--paper);
      color: var(--ink);
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    button, textarea, input {
      font: inherit;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--line);
    }

    .shell {
      max-width: 1160px;
      margin: 0 auto;
      padding: 0 18px;
    }

    .nav-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 64px;
      gap: 18px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0;
      color: var(--slate);
      white-space: nowrap;
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
      box-shadow: 0 8px 20px rgba(17, 24, 39, 0.12);
    }

    .tabs {
      display: flex;
      gap: 28px;
      align-items: stretch;
      min-height: 64px;
    }

    .tab-btn {
      border: 0;
      border-bottom: 2px solid transparent;
      background: transparent;
      color: var(--stone);
      padding: 0 1px;
      font-size: 14px;
      font-weight: 650;
      cursor: pointer;
    }

    .tab-btn.active {
      border-bottom-color: var(--slate);
      color: var(--slate);
      font-weight: 800;
    }

    main.shell {
      padding-top: 32px;
      padding-bottom: 64px;
    }

    .hidden {
      display: none !important;
    }

    .page-header {
      margin-bottom: 38px;
    }

    .eyebrow {
      margin: 0 0 10px;
      color: var(--stone);
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .page-header h1 {
      margin: 0 0 16px;
      color: var(--slate);
      font-size: 38px;
      line-height: 1.15;
      letter-spacing: 0;
    }

    .page-header p {
      max-width: 930px;
      margin: 0;
      color: #57534e;
      font-size: 18px;
      line-height: 1.65;
    }

    .summary-strip {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 20px;
    }

    .summary-chip {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      padding: 14px;
    }

    .summary-chip span {
      display: block;
      color: var(--stone);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .summary-chip strong {
      display: block;
      margin-top: 6px;
      color: var(--slate);
      font-size: 18px;
      line-height: 1.25;
    }

    .briefing-shell {
      max-width: 980px;
      margin: 0 auto;
    }

    .briefing-topline {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 18px;
      margin-bottom: 24px;
    }

    .briefing-date {
      text-align: right;
      color: #111827;
    }

    .briefing-date span {
      display: block;
      color: #6b7280;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .briefing-date strong {
      display: block;
      margin-top: 3px;
      font-size: 14px;
    }

    .info-card {
      border: 1px solid rgba(229, 231, 235, 0.72);
      border-radius: 16px;
      background: #fff;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(17, 24, 39, 0.035);
      transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
    }

    .info-card:hover {
      transform: translateY(-2px);
      border-color: rgba(209, 213, 219, 0.9);
      box-shadow: 0 8px 30px rgba(17, 24, 39, 0.065);
    }

    .executive-card {
      margin-bottom: 30px;
      border-left: 4px solid #111827;
    }

    .executive-card h2 {
      margin: 0 0 18px;
      color: #111827;
      font-size: 28px;
      line-height: 1.25;
      letter-spacing: 0;
    }

    .executive-card p {
      margin: 0;
      color: #374151;
      font-size: 16px;
      line-height: 1.72;
    }

    .executive-card p + p {
      margin-top: 16px;
    }

    .executive-card strong {
      color: #111827;
      font-weight: 850;
    }

    .brief-lead {
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 18px;
    }

    .brief-section {
      margin-top: 24px;
    }

    .brief-section h3 {
      margin: 0 0 12px;
      color: #111827;
      font-size: 18px;
      line-height: 1.25;
    }

    .source-extract-list {
      border-top: 1px solid #e5e7eb;
    }

    .source-extract-row {
      display: grid;
      grid-template-columns: minmax(150px, 0.35fr) minmax(0, 1fr);
      gap: 18px;
      border-bottom: 1px solid #e5e7eb;
      padding: 16px 0;
    }

    .source-extract-meta span {
      display: block;
      color: #111827;
      font-size: 13px;
      font-weight: 900;
      line-height: 1.25;
    }

    .source-extract-meta small {
      display: block;
      margin-top: 6px;
      color: #6b7280;
      font-size: 11px;
      font-weight: 800;
      line-height: 1.45;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .source-extract-copy h4 {
      margin: 0 0 7px;
      color: #111827;
      font-size: 16px;
      line-height: 1.35;
    }

    .source-extract-copy p {
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
    }

    .source-extract-copy p + p {
      margin-top: 8px;
    }

    .source-extract-copy .why-line {
      color: #64748b;
    }

    .brief-list {
      margin: 0;
      padding-left: 18px;
      color: #374151;
      font-size: 15px;
      line-height: 1.68;
    }

    .brief-list li + li {
      margin-top: 10px;
    }

    .watch-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 20px;
      margin: 0;
      padding-left: 18px;
      color: #374151;
      font-size: 14px;
      line-height: 1.55;
    }

    .section-kicker {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 20px;
      margin: 0 0 16px;
    }

    .section-kicker h2 {
      margin: 0;
      color: #111827;
      font-size: 22px;
      line-height: 1.2;
    }

    .sentiment-meter {
      width: min(220px, 44vw);
    }

    .sentiment-scale {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      color: #9ca3af;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .sentiment-bar {
      position: relative;
      width: 100%;
      height: 4px;
      border-radius: 999px;
      background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%);
    }

    .sentiment-pin {
      position: absolute;
      top: -4px;
      width: 12px;
      height: 12px;
      border: 2px solid #111827;
      border-radius: 50%;
      background: #fff;
      transform: translateX(-50%);
    }

    .pulse-section,
    .sources-section,
    .market-chart-panel {
      margin-top: 30px;
    }

    .setup-card {
      position: relative;
      margin-top: 30px;
      overflow: hidden;
      border: 0;
      background: #111827;
      color: #fff;
    }

    .setup-card::after {
      content: "";
      position: absolute;
      top: -48px;
      right: -42px;
      width: 140px;
      height: 140px;
      border-radius: 999px;
      background: rgba(239, 68, 68, 0.24);
      filter: blur(34px);
      pointer-events: none;
    }

    .setup-card-header {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .setup-card h2 {
      margin: 0;
      color: #fff;
      font-size: 22px;
    }

    .setup-badge {
      border: 1px solid #374151;
      border-radius: 999px;
      background: rgba(31, 41, 55, 0.82);
      padding: 6px 10px;
      color: #d1d5db;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .setup-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.55fr);
      gap: 24px;
      align-items: stretch;
    }

    .strategy-label {
      margin: 0 0 5px;
      color: #9ca3af;
      font-size: 14px;
      font-weight: 750;
    }

    .strategy-bias {
      margin: 0;
      color: #fca5a5;
      font-size: 20px;
      font-weight: 900;
    }

    .strategy-note {
      margin: 12px 0 0;
      color: #9ca3af;
      font-size: 13px;
      line-height: 1.55;
    }

    .setup-levels {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      border: 1px solid #374151;
      border-radius: 14px;
      background: rgba(31, 41, 55, 0.58);
      padding: 16px;
    }

    .setup-level {
      text-align: center;
      padding: 0 12px;
    }

    .setup-level + .setup-level {
      border-left: 1px solid #374151;
    }

    .setup-level span {
      display: block;
      margin-bottom: 6px;
      color: #9ca3af;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .setup-level strong {
      display: block;
      color: #fff;
      font-size: 20px;
      line-height: 1.15;
    }

    .setup-level.stop span,
    .setup-level.stop strong {
      color: #fca5a5;
    }

    .setup-level.target span,
    .setup-level.target strong {
      color: #86efac;
    }

    .setup-level small {
      display: block;
      margin-top: 5px;
      color: #6b7280;
      font-size: 11px;
      font-weight: 700;
    }

    .news-card-list {
      display: grid;
      gap: 14px;
    }

    .source-card {
      cursor: pointer;
      display: grid;
      grid-template-columns: 168px minmax(0, 1fr);
      gap: 16px;
      align-items: stretch;
    }

    .source-thumb {
      position: relative;
      min-height: 142px;
      border-radius: 8px;
      overflow: hidden;
      background:
        radial-gradient(circle at 22% 20%, color-mix(in srgb, var(--thumb-accent) 34%, white), transparent 28%),
        linear-gradient(135deg, color-mix(in srgb, var(--thumb-accent) 78%, #111827), #111827 72%);
      color: #fff;
      isolation: isolate;
    }

    .source-thumb::before {
      content: "";
      position: absolute;
      inset: 18px -20px auto 20px;
      height: 48px;
      border-bottom: 3px solid rgba(255, 255, 255, 0.72);
      border-left: 3px solid rgba(255, 255, 255, 0.32);
      transform: skewY(-14deg);
      opacity: 0.76;
    }

    .source-thumb::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.12) 1px, transparent 1px);
      background-size: 22px 22px;
      opacity: 0.18;
      z-index: -1;
    }

    .source-thumb span,
    .source-thumb strong {
      position: absolute;
      left: 16px;
      right: 16px;
    }

    .source-thumb span {
      bottom: 44px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.76;
    }

    .source-thumb strong {
      bottom: 15px;
      font-size: 19px;
      line-height: 1.05;
      text-transform: uppercase;
    }

    .source-card-copy {
      min-width: 0;
    }

    .source-card-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 12px;
      margin-bottom: 12px;
    }

    .news-badge {
      border-radius: 5px;
      padding: 5px 8px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .news-badge.negative {
      background: #fee2e2;
      color: #b91c1c;
    }

    .news-badge.positive {
      background: #dcfce7;
      color: #166534;
    }

    .news-badge.neutral {
      background: #f3f4f6;
      color: #374151;
    }

    .source-name {
      color: #9ca3af;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      text-align: right;
    }

    .source-card h3 {
      margin: 0 0 8px;
      color: #111827;
      font-size: 19px;
      line-height: 1.35;
      transition: color 160ms ease;
    }

    .source-card:hover h3 {
      color: #2563eb;
    }

    .source-card p {
      margin: 0;
      color: #4b5563;
      font-size: 14px;
      line-height: 1.55;
    }

    .source-card a {
      display: inline-block;
      margin-top: 10px;
      color: #2563eb;
      font-size: 14px;
      font-weight: 750;
    }

    .public-footer {
      margin-top: 42px;
      padding-top: 24px;
      border-top: 1px solid var(--line);
      text-align: center;
    }

    .public-footer p {
      margin: 0;
      color: #9ca3af;
      font-size: 12px;
      font-weight: 650;
      line-height: 1.6;
    }

    .briefing-card {
      margin-bottom: 32px;
      border: 1px solid #f2f0ed;
      border-radius: 12px;
      background: #fff;
      padding: 22px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 20px 45px rgba(15, 23, 42, 0.04);
    }

    .briefing-card h2 {
      margin: 0 0 14px;
      color: #1e293b;
      font-size: 20px;
    }

    .briefing-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 18px;
    }

    .briefing-block {
      border-radius: 10px;
      background: #fafaf9;
      padding: 16px;
    }

    .briefing-block h3 {
      margin: 0 0 10px;
      color: #334155;
      font-size: 14px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .briefing-block ul {
      margin: 0;
      padding-left: 18px;
      color: #57534e;
      line-height: 1.55;
    }

    .briefing-block li + li {
      margin-top: 8px;
    }

    .grid-main {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
      gap: 32px;
    }

    .grid-two {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 32px;
    }

    .grid-three {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }

    .stack {
      display: grid;
      gap: 32px;
    }

    .panel {
      background: var(--panel);
      border: 1px solid #f2f0ed;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 20px 45px rgba(15, 23, 42, 0.04);
    }

    .panel h2 {
      margin: 0 0 18px;
      color: #1e293b;
      font-size: 20px;
      line-height: 1.3;
    }

    .panel p {
      color: #57534e;
      line-height: 1.65;
    }

    .chart-container {
      position: relative;
      width: 100%;
      height: 350px;
      max-height: 400px;
    }

    .chart-note {
      margin: 0 0 16px;
      color: #78716c;
      font-size: 14px;
      line-height: 1.55;
    }

    .scanner-height {
      height: 260px;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }

    .quote-board-card {
      overflow: hidden;
      margin: 18px 0 0;
      border: 1px solid rgba(229, 231, 235, 0.72);
      border-radius: 14px;
      background: #fff;
      box-shadow: 0 4px 20px rgba(17, 24, 39, 0.035);
    }

    .quote-board-toggle {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: center;
      gap: 16px;
      width: 100%;
      border: 0;
      background: #fff;
      padding: 18px;
      text-align: left;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .quote-board-toggle:hover {
      background: #f8fafc;
    }

    .quote-board-title strong {
      display: block;
      margin: 0;
      color: #334155;
      font-size: 15px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .quote-board-title small {
      display: block;
      margin-top: 5px;
      color: #78716c;
      font-size: 13px;
      font-weight: 750;
      line-height: 1.45;
    }

    .live-clock {
      color: #78716c;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      font-weight: 800;
      text-align: right;
    }

    .quote-board-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: 999px;
      background: #111827;
      color: #fff;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .quote-board-chev {
      display: inline-block;
      font-size: 10px;
      line-height: 1;
      transition: transform 150ms ease;
    }

    .quote-board-toggle.open .quote-board-chev {
      transform: rotate(180deg);
    }

    .quote-board-body {
      border-top: 1px solid #e5e7eb;
      padding: 0 18px 18px;
    }

    .quote-board-body[hidden] {
      display: none;
    }

    .regional-breadth {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
      margin: 18px 0;
    }

    .breadth-card {
      border: 1px solid rgba(229, 231, 235, 0.72);
      border-radius: 12px;
      background: #fff;
      padding: 14px;
      box-shadow: 0 4px 20px rgba(17, 24, 39, 0.03);
    }

    .breadth-card span {
      display: block;
      color: #6b7280;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .breadth-card strong {
      display: block;
      margin-top: 5px;
      color: #111827;
      font-size: 19px;
      line-height: 1.15;
    }

    .breadth-card small {
      display: block;
      margin-top: 6px;
      color: #9ca3af;
      font-size: 12px;
      font-weight: 750;
    }

    .quote-region {
      margin-top: 18px;
    }

    .quote-region:first-child {
      margin-top: 0;
    }

    .quote-region-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    .quote-region-head h3 {
      margin: 0;
      color: #111827;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .quote-region-head span {
      color: #9ca3af;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }

    .index-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 14px;
    }

    .index-tile {
      min-height: 128px;
      border: 1px solid rgba(229, 231, 235, 0.72);
      border-radius: 16px;
      background: #fff;
      padding: 16px;
      text-align: left;
      cursor: pointer;
      transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
      box-shadow: 0 4px 20px rgba(17, 24, 39, 0.035);
    }

    .index-tile:hover {
      transform: translateY(-1px);
      border-color: #94a3b8;
      box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
    }

    .index-tile .symbol-row {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 8px;
    }

    .index-tile .symbol {
      color: #334155;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .index-tile .status {
      border-radius: 999px;
      background: #f5f5f4;
      padding: 4px 7px;
      color: #57534e;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .index-tile .status.live {
      background: #dcfce7;
      color: #166534;
    }

    .index-tile .name {
      margin-top: 8px;
      color: #78716c;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.25;
    }

    .index-tile .price {
      margin-top: 10px;
      color: var(--slate);
      font-size: 22px;
      font-weight: 900;
      line-height: 1.1;
    }

    .index-tile .change {
      margin-top: 5px;
      font-size: 13px;
      font-weight: 900;
    }

    .index-tile .change.up {
      color: #047857;
    }

    .index-tile .change.down {
      color: #b91c1c;
    }

    .chart-modal {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(15, 23, 42, 0.52);
    }

    .chart-modal.open {
      display: flex;
    }

    .chart-modal-panel {
      width: min(920px, 100%);
      border-radius: 14px;
      background: #fff;
      padding: 22px;
      box-shadow: 0 30px 80px rgba(15, 23, 42, 0.26);
    }

    .chart-modal-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: start;
      gap: 20px;
      margin-bottom: 16px;
    }

    .chart-modal-header h2 {
      margin: 0;
      color: var(--slate);
      font-size: 24px;
    }

    .chart-modal-header p {
      margin: 6px 0 0;
      color: #57534e;
      font-size: 14px;
    }

    .icon-btn {
      width: 34px;
      height: 34px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--slate);
      font-size: 20px;
      font-weight: 900;
      cursor: pointer;
    }

    .modal-chart-container {
      position: relative;
      height: min(560px, 72vh);
      border-radius: 10px;
      background: #fafaf9;
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }

    .market-chart-preview {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      padding: 20px;
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    }

    .market-chart-canvas {
      width: 100%;
      min-height: 0;
      flex: 1;
    }

    .market-chart-caption {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      border-top: 1px solid #e5e7eb;
      padding-top: 14px;
      color: #64748b;
      font-size: 12px;
      font-weight: 750;
    }

    .market-chart-caption strong {
      color: #111827;
      font-size: 13px;
    }

    .chart-fallback {
      position: absolute;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 28px;
      text-align: center;
      background: linear-gradient(135deg, #f8fafc, #eef2ff);
      color: #334155;
      z-index: 2;
    }

    .chart-fallback.visible {
      display: flex;
    }

    .chart-fallback h3 {
      margin: 0 0 8px;
      color: #111827;
      font-size: 20px;
    }

    .chart-fallback p {
      margin: 0 0 16px;
      color: #64748b;
      font-size: 14px;
      line-height: 1.55;
    }

    .chart-link-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: #111827;
      color: #fff;
      padding: 10px 13px;
      font-size: 13px;
      font-weight: 900;
    }

    .metric {
      padding: 16px;
      border-radius: 10px;
      background: #fafaf9;
      text-align: center;
    }

    .metric.blue {
      background: #eff6ff;
    }

    .metric .label {
      display: block;
      color: #78716c;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .metric.blue .label {
      color: #2563eb;
    }

    .metric strong {
      display: block;
      margin-top: 6px;
      color: #1e293b;
      font-size: 25px;
      line-height: 1.1;
    }

    .metric.blue strong {
      color: #1e40af;
      font-size: 22px;
    }

    .news-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 18px;
    }

    .news-list li {
      padding-bottom: 18px;
      border-bottom: 1px solid #f2f0ed;
    }

    .news-list li:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .news-list p {
      margin: 0;
      color: #1e293b;
      font-weight: 700;
      line-height: 1.45;
    }

    .news-list small {
      display: inline-block;
      margin-top: 7px;
      border-radius: 999px;
      background: #f5f5f4;
      padding: 5px 8px;
      color: #57534e;
      font-size: 12px;
      font-weight: 800;
    }

    .news-list .news-summary {
      margin-top: 8px;
      color: #57534e;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.5;
    }

    .news-list a {
      display: inline-block;
      margin-top: 6px;
      color: var(--blue);
      font-size: 14px;
      font-weight: 650;
    }

    .studio-header {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 24px;
      margin-bottom: 38px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--line);
    }

    .studio-header h1 {
      margin: 0 0 8px;
      color: var(--slate);
      font-size: 32px;
      line-height: 1.15;
    }

    .studio-header p {
      margin: 0;
      max-width: 760px;
      color: #57534e;
      font-size: 18px;
      line-height: 1.6;
    }

    .status-pill {
      background: #f5f5f4;
      border-radius: 6px;
      padding: 8px 11px;
      color: #57534e;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 13px;
      white-space: nowrap;
    }

    .status-pill strong {
      color: var(--green);
    }

    .studio-hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
      gap: 28px;
      align-items: stretch;
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--line);
    }

    .studio-hero h1 {
      margin: 0 0 10px;
      color: var(--slate);
      font-size: 38px;
      line-height: 1.12;
      letter-spacing: 0;
    }

    .studio-hero p {
      max-width: 760px;
      margin: 0;
      color: #57534e;
      font-size: 17px;
      line-height: 1.65;
    }

    .studio-run-card {
      border: 1px solid rgba(229, 231, 235, 0.82);
      border-radius: 14px;
      background: #fff;
      padding: 18px;
      box-shadow: 0 4px 20px rgba(17, 24, 39, 0.04);
    }

    .studio-run-card span {
      display: block;
      color: #6b7280;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .studio-run-card strong {
      display: block;
      margin-top: 6px;
      color: #111827;
      font-size: 22px;
      line-height: 1.16;
    }

    .studio-run-meta {
      display: grid;
      gap: 8px;
      margin-top: 16px;
      color: #64748b;
      font-size: 12px;
      font-weight: 750;
      line-height: 1.45;
    }

    .studio-command-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }

    .studio-metric {
      border: 1px solid rgba(229, 231, 235, 0.82);
      border-radius: 12px;
      background: #fff;
      padding: 16px;
      box-shadow: 0 4px 18px rgba(17, 24, 39, 0.032);
    }

    .studio-metric span {
      display: block;
      color: #6b7280;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .studio-metric strong {
      display: block;
      margin-top: 7px;
      color: #111827;
      font-size: 22px;
      line-height: 1.1;
    }

    .studio-metric small {
      display: block;
      margin-top: 6px;
      color: #9ca3af;
      font-size: 12px;
      font-weight: 750;
      line-height: 1.35;
    }

    .studio-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }

    .studio-action-btn,
    .studio-ghost-btn {
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      font-weight: 900;
      cursor: pointer;
    }

    .studio-action-btn {
      border: 0;
      background: #111827;
      color: #fff;
    }

    .studio-ghost-btn {
      border: 1px solid #d1d5db;
      background: #fff;
      color: #111827;
    }

    .studio-workflow {
      margin-bottom: 24px;
    }

    .workflow-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 12px;
    }

    .workflow-step {
      position: relative;
      min-height: 150px;
      border: 1px solid rgba(229, 231, 235, 0.82);
      border-radius: 12px;
      background: #fff;
      padding: 15px;
      box-shadow: 0 4px 18px rgba(17, 24, 39, 0.032);
    }

    .workflow-step::before {
      content: "";
      display: block;
      width: 9px;
      height: 9px;
      margin-bottom: 12px;
      border-radius: 999px;
      background: var(--green);
      box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.12);
    }

    .workflow-step.warn::before {
      background: var(--gold);
      box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.16);
    }

    .workflow-step.blocked::before {
      background: var(--red);
      box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.12);
    }

    .workflow-step span {
      display: block;
      color: #6b7280;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .workflow-step strong {
      display: block;
      margin-top: 6px;
      color: #111827;
      font-size: 14px;
      line-height: 1.25;
    }

    .workflow-step small {
      display: block;
      margin-top: 8px;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.42;
    }

    .studio-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.18fr) minmax(320px, 0.82fr);
      gap: 24px;
      align-items: start;
      margin-bottom: 24px;
    }

    .studio-stack {
      display: grid;
      gap: 24px;
    }

    .studio-panel-head {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .studio-panel-head h2 {
      margin: 0;
    }

    .studio-panel-head p {
      margin: 5px 0 0;
      color: #64748b;
      font-size: 13px;
      line-height: 1.5;
    }

    .validation-list {
      display: grid;
      gap: 10px;
      margin-top: 16px;
    }

    .validation-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 10px;
      align-items: start;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      padding: 12px;
    }

    .validation-dot {
      width: 10px;
      height: 10px;
      margin-top: 5px;
      border-radius: 999px;
      background: var(--green);
    }

    .validation-row.warn .validation-dot {
      background: var(--gold);
    }

    .validation-row.blocked .validation-dot {
      background: var(--red);
    }

    .validation-row strong {
      display: block;
      color: #111827;
      font-size: 14px;
      line-height: 1.3;
    }

    .validation-row span {
      display: block;
      margin-top: 3px;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.45;
    }

    .theme-review-list,
    .source-qa-list,
    .script-section-list,
    .checklist-list,
    .activity-log {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .script-section-list {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin-bottom: 18px;
    }

    .theme-review-card {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      padding: 12px;
    }

    .theme-review-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
      margin-bottom: 10px;
    }

    .theme-review-top strong {
      color: #111827;
      font-size: 14px;
      line-height: 1.25;
    }

    .theme-review-top span {
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
    }

    .theme-bar {
      position: relative;
      height: 6px;
      border-radius: 999px;
      background: #f1f5f9;
      overflow: hidden;
    }

    .theme-bar i {
      display: block;
      width: var(--theme-width);
      height: 100%;
      border-radius: inherit;
      background: var(--theme-color);
    }

    .source-qa-item {
      display: grid;
      grid-template-columns: 54px minmax(0, 1fr);
      gap: 11px;
      align-items: start;
      border-bottom: 1px solid #eef2f7;
      padding-bottom: 10px;
    }

    .source-qa-item:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .source-mini-thumb {
      display: flex;
      align-items: end;
      justify-content: center;
      min-height: 54px;
      border-radius: 8px;
      background: linear-gradient(135deg, color-mix(in srgb, var(--thumb-accent) 82%, #111827), #111827);
      color: #fff;
      padding: 7px;
      font-size: 10px;
      font-weight: 900;
      line-height: 1;
      text-transform: uppercase;
      text-align: center;
    }

    .source-qa-item strong {
      display: block;
      color: #111827;
      font-size: 13px;
      line-height: 1.35;
    }

    .source-qa-item span {
      display: block;
      margin-top: 4px;
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
      line-height: 1.35;
    }

    .script-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 14px 0 16px;
    }

    .speed-btn {
      border: 1px solid #d1d5db;
      border-radius: 7px;
      background: #fff;
      color: #111827;
      padding: 7px 9px;
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
    }

    .speed-btn.active {
      border-color: #111827;
      background: #111827;
      color: #fff;
    }

    .script-section-card,
    .checklist-item,
    .activity-item {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      padding: 12px;
    }

    .script-section-card strong,
    .checklist-item strong,
    .activity-item strong {
      display: block;
      color: #111827;
      font-size: 13px;
      line-height: 1.3;
    }

    .script-section-card span,
    .checklist-item span,
    .activity-item span {
      display: block;
      margin-top: 4px;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.45;
    }

    .prompt-detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin: 12px 0 16px;
    }

    .prompt-detail {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      padding: 11px;
    }

    .prompt-detail span {
      display: block;
      color: #6b7280;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .prompt-detail strong {
      display: block;
      margin-top: 5px;
      color: #111827;
      font-size: 13px;
      line-height: 1.35;
    }

    .asset-output {
      min-height: 238px;
    }

    .asset-caption {
      margin-top: 12px;
      color: #64748b;
      font-size: 12px;
      font-weight: 750;
      line-height: 1.5;
    }

    .studio-note {
      margin-top: 12px;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
      color: #64748b;
      font-size: 12px;
      font-weight: 750;
      line-height: 1.5;
    }

    .panel-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      margin-bottom: 12px;
    }

    .panel-title-row h2 {
      margin: 0;
    }

    .valid-badge {
      background: #dcfce7;
      color: #166534;
      border-radius: 5px;
      padding: 5px 8px;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .valid-badge.idle {
      background: #f1f5f9;
      color: #475569;
    }

    .muted-copy {
      margin: 0 0 16px;
      color: #78716c;
      font-size: 14px;
      line-height: 1.5;
    }

    .rr-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 16px;
      text-align: center;
      font-size: 14px;
    }

    .rr-cell {
      border-radius: 8px;
      background: #fafaf9;
      padding: 10px;
    }

    .rr-cell span {
      display: block;
      color: #a8a29e;
      font-size: 12px;
      font-weight: 800;
    }

    .rr-cell strong {
      display: block;
      margin-top: 4px;
      color: #1e293b;
    }

    .rr-cell.stop {
      background: #fef2f2;
    }

    .rr-cell.stop span,
    .rr-cell.stop strong {
      color: #b91c1c;
    }

    .rr-cell.target {
      background: #ecfdf5;
    }

    .rr-cell.target span,
    .rr-cell.target strong {
      color: #047857;
    }

    .asset-panel {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }

    .prompt-box {
      margin-bottom: 16px;
      border-radius: 8px;
      background: #fafaf9;
      padding: 12px;
      color: #57534e;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 13px;
      line-height: 1.55;
    }

    .primary-btn {
      width: 100%;
      border: 0;
      border-radius: 8px;
      background: var(--blue);
      color: #fff;
      padding: 11px 14px;
      font-weight: 900;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .primary-btn:hover {
      background: #1d4ed8;
    }

    .primary-btn.done {
      background: var(--green);
    }

    .loader-track {
      height: 4px;
      margin: 16px 0;
      border-radius: 999px;
      background: #e7e5e4;
      overflow: hidden;
    }

    .loader-bar {
      width: 0%;
      height: 4px;
      background: var(--blue);
      transition: width 2s ease-in-out;
    }

    .asset-output {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 238px;
      flex: 1;
      overflow: hidden;
      border: 2px dashed #d6d3d1;
      border-radius: 10px;
      background: #f5f5f4;
      color: #a8a29e;
      font-weight: 700;
    }

    #aiCanvas {
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 900ms ease;
    }

    #aiCanvas.visible {
      opacity: 1;
    }

    .teleprompter-shell {
      margin-top: 32px;
    }

    .teleprompter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 14px;
    }

    .teleprompter-header h2 {
      margin: 0;
      color: #1e293b;
      font-size: 20px;
    }

    .dark-btn {
      border: 0;
      border-radius: 8px;
      background: #292524;
      color: #fff;
      padding: 10px 14px;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
    }

    .dark-btn.playing {
      background: var(--red);
    }

    .teleprompter-view {
      position: relative;
      height: 400px;
      overflow-y: auto;
      border-radius: 10px;
      background-color: #111827;
      color: #f3f4f6;
      padding: 32px;
      font-size: 24px;
      line-height: 1.8;
      font-weight: 700;
      scroll-behavior: smooth;
    }

    .read-line {
      position: absolute;
      top: 50%;
      left: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      width: 100%;
      height: 34px;
      border-top: 2px solid rgba(239, 68, 68, 0.3);
      border-bottom: 2px solid rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.1);
      pointer-events: none;
    }

    .read-line span {
      margin-left: 10px;
      color: rgba(239, 68, 68, 0.65);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .teleprompter-text {
      transform: translateY(0);
    }

    .teleprompter-view.playing .teleprompter-text {
      animation: scrollText 20s linear infinite;
    }

    @keyframes scrollText {
      0% { transform: translateY(100%); }
      100% { transform: translateY(-150%); }
    }

    .arch-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 48px;
    }

    .section-title {
      margin: 0 0 24px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--line);
      color: #1e293b;
      font-size: 25px;
    }

    .tech-block {
      margin-bottom: 24px;
    }

    .tech-block h3 {
      margin: 0 0 6px;
      color: #334155;
      font-size: 16px;
    }

    .tech-block p {
      margin: 0 0 10px;
      color: #57534e;
      font-size: 14px;
      line-height: 1.55;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip {
      border-radius: 999px;
      background: #f1f5f9;
      color: #334155;
      padding: 6px 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
    }

    .chip.blue {
      background: #eff6ff;
      color: #1d4ed8;
    }

    .chip.stone {
      background: #f5f5f4;
      color: #44403c;
    }

    .milestones {
      display: grid;
      gap: 16px;
    }

    .milestone {
      border-left: 4px solid var(--blue);
      border-radius: 0 8px 8px 0;
      background: #fff;
      padding: 16px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .milestone.indigo {
      border-left-color: #6366f1;
    }

    .milestone.todo {
      border-left-color: #d6d3d1;
      opacity: 0.76;
    }

    .milestone h3 {
      margin: 0;
      color: #1e293b;
      font-size: 18px;
    }

    .milestone p {
      margin: 6px 0 0;
      color: #57534e;
      font-size: 14px;
      line-height: 1.55;
    }

    @media (max-width: 900px) {
      .nav-inner {
        align-items: start;
        flex-direction: column;
        padding: 14px 0 0;
      }

      .tabs {
        width: 100%;
        min-height: 48px;
        gap: 16px;
        overflow-x: auto;
      }

      .tab-btn {
        white-space: nowrap;
      }

      .grid-main,
      .grid-two,
      .grid-three,
      .source-card,
      .setup-grid,
      .setup-levels,
      .summary-strip,
      .briefing-grid,
      .source-extract-row,
      .watch-grid,
      .arch-grid,
      .studio-hero,
      .studio-command-grid,
      .workflow-grid,
      .studio-layout,
      .prompt-detail-grid,
      .script-section-list {
        grid-template-columns: 1fr;
      }

      .briefing-topline,
      .section-kicker,
      .setup-card-header,
      .quote-region-head {
        align-items: start;
        flex-direction: column;
      }

      .chart-modal-header {
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
      }

      .chart-link-btn {
        grid-column: 1 / -1;
        grid-row: 2;
        width: max-content;
      }

      .icon-btn {
        grid-column: 2;
        grid-row: 1;
      }

      .briefing-date {
        text-align: left;
      }

      .quote-board-toggle {
        grid-template-columns: 1fr;
        align-items: start;
        gap: 10px;
      }

      .live-clock {
        text-align: left;
      }

      .quote-board-action {
        justify-self: start;
      }

      .setup-level + .setup-level {
        border-left: 0;
        border-top: 1px solid #374151;
        padding-top: 14px;
        margin-top: 14px;
      }

      .studio-header {
        align-items: start;
        flex-direction: column;
      }

      .studio-actions {
        flex-direction: column;
      }

      .studio-action-btn,
      .studio-ghost-btn {
        width: 100%;
      }

      .teleprompter-view {
        height: 360px;
        font-size: 20px;
      }
    }
  </style>
</head>
<body>
  <nav class="topbar">
    <div class="shell">
      <div class="nav-inner">
        <a class="brand" href="${digest.canonicalPath ? "../" : "./"}" aria-label="Market Narrative archive"><span class="brand-mark">M</span><span>Market Narrative</span></a>
        <div class="tabs">
          <button class="tab-btn" data-target="public-view">Public Briefing</button>
          <button class="tab-btn" data-target="studio-view">Studio Command (Admin)</button>
          <button class="tab-btn" data-target="architecture-view">Engine Architecture</button>
        </div>
      </div>
    </div>
  </nav>

  <main class="shell">
    <section id="public-view" class="tab-content">
      <div class="briefing-shell">
        <header class="page-header">
          <div class="briefing-topline">
            <div>
              <p class="eyebrow">Daily Pre-Market Summary</p>
            </div>
            <div class="briefing-date">
              <span>Daily Briefing</span>
              <strong>${escapeHtml(formatDigestDate(digest.digestDate))}</strong>
            </div>
          </div>
          <h1>${escapeHtml(digest.title)}</h1>
        </header>

        <section class="info-card executive-card">
          <h2>Executive Summary: The Morning Narrative</h2>
          ${executiveSummaryHtml(digest)}
        </section>

        <section class="pulse-section">
          <div class="section-kicker">
            <h2>The Overnight Pulse</h2>
            <div class="sentiment-meter" aria-label="Daily sentiment meter">
              <div class="sentiment-scale">
                <span>Bearish</span>
                <span>Bullish</span>
              </div>
              <div class="sentiment-bar">
                <div class="sentiment-pin" style="left: ${sentimentPinPosition(digest.overallSentiment)}%"></div>
              </div>
            </div>
          </div>
          <div class="quote-board-card">
            <button id="quoteBoardToggle" class="quote-board-toggle" type="button" aria-expanded="false" aria-controls="quoteBoardBody">
              <span class="quote-board-title">
                <strong>Real Quote Board</strong>
                <small>Click to view US Overnight, Asia Watch, India Open, and Macro Hedges.</small>
              </span>
              <span id="liveClock" class="live-clock">Preparing quotes...</span>
              <span class="quote-board-action"><span id="quoteBoardState">Expand</span><span class="quote-board-chev">&#9662;</span></span>
            </button>
            <div id="quoteBoardBody" class="quote-board-body" hidden>
              <div class="regional-breadth">
                ${regionalBreadthHtml(digest)}
              </div>
              <div id="indexBoard" aria-label="Clickable live index quotes"></div>
            </div>
          </div>
        </section>

        ${algorithmicSetupHtml(digest)}

        <section class="panel market-chart-panel">
          <h2>Latest Market Dashboard</h2>
          <p class="chart-note">Quick snapshot only: US risk appetite, Asia lead, Indian open, and the key macro hedge. Open the Real Quote Board for every tracked market.</p>
          <div class="chart-container">
            <canvas id="overnightChart" aria-label="Overnight global indices chart"></canvas>
          </div>
        </section>

        <section class="sources-section">
          <div class="section-kicker">
            <h2>Source Notes & Attribution</h2>
          </div>
          <div class="news-card-list">
            ${digest.news.map((item) => `
              <article class="info-card source-card">
                ${articleThumbnailHtml(item)}
                <div class="source-card-copy">
                  <div class="source-card-header">
                    <span class="news-badge ${newsToneClass(item.sentimentScore)}">${escapeHtml(newsBadgeLabel(item))}</span>
                    <span class="source-name">Source: ${escapeHtml(item.sourceName)}</span>
                  </div>
                  <h3>${escapeHtml(item.headline)}</h3>
                  <p>${escapeHtml(item.summary)}</p>
                  <a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">Read source &#8599;</a>
                </div>
              </article>
            `).join("")}
          </div>
        </section>

        <footer class="public-footer">
          <p>Data generated by the Agentic RAG pipeline. Sources are retained for attribution. Educational market research only, not investment advice.</p>
        </footer>
      </div>
    </section>

    <div id="indexChartModal" class="chart-modal" aria-hidden="true">
      <div class="chart-modal-panel" role="dialog" aria-modal="true" aria-labelledby="indexChartTitle">
        <div class="chart-modal-header">
          <div>
            <h2 id="indexChartTitle">Index Chart</h2>
            <p id="indexChartMeta">Real market chart with the latest published snapshot.</p>
          </div>
          <a id="openFullChart" class="chart-link-btn" href="https://finance.yahoo.com/markets/" target="_blank" rel="noreferrer">Open Yahoo Chart</a>
          <button id="closeIndexChart" class="icon-btn" type="button" aria-label="Close index chart">&times;</button>
        </div>
        <div class="modal-chart-container">
          <div id="marketChartPreview" class="market-chart-preview" aria-label="Selected market chart preview">
            <canvas id="marketChartCanvas" class="market-chart-canvas" aria-label="Yahoo Finance intraday price chart"></canvas>
            <div class="market-chart-caption">
              <strong id="marketChartSource">Yahoo Finance price series</strong>
              <span id="marketChartRange">Waiting for chart data</span>
            </div>
          </div>
          <div id="chartFallback" class="chart-fallback" aria-hidden="true">
            <div>
              <h3>Chart Data Is Not Available</h3>
              <p>This briefing has the latest quote, but the intraday series was not published for this symbol. Use the full chart link for the external view.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section id="studio-view" class="tab-content hidden">
      <header class="studio-hero">
        <div>
          <p class="eyebrow">Admin Studio</p>
          <h1>Studio Command Center</h1>
          <p>Operator workspace for turning the public briefing into a finished video package: source QA, scanner validation, teleprompter pacing, thumbnail prompts, and publish readiness.</p>
        </div>
        <aside class="studio-run-card">
          <span>Current Run</span>
          <strong>${escapeHtml(formatDigestDate(digest.digestDate))}</strong>
          <div class="studio-run-meta">
            <div>Mode: ${escapeHtml(digest.marketDataMode === "live" ? "Live market data" : "Mock adapter mode")}</div>
            <div>Generated: ${escapeHtml(formatGeneratedAt(digest.generatedAt))}</div>
            <div>Status: <span id="studioPublishState">${escapeHtml(digest.status || "DRAFT")}</span></div>
          </div>
          <div class="studio-actions">
            <button id="runDigestBtn" class="studio-action-btn" type="button">Run Digest Check</button>
            <button id="regenerateScriptBtn" class="studio-ghost-btn" type="button">Regenerate Script</button>
            <button id="publishDigestBtn" class="studio-ghost-btn" type="button">Publish Digest</button>
          </div>
        </aside>
      </header>

      <section class="studio-command-grid" aria-label="Studio run summary">
        ${studioMetricCards(digest)}
      </section>

      <section class="studio-workflow">
        <div class="section-kicker">
          <h2>Production Pipeline</h2>
        </div>
        <div class="workflow-grid">
          ${studioWorkflowHtml(digest)}
        </div>
      </section>

      <div class="studio-layout">
        <section class="panel scanner-workbench">
          <div class="studio-panel-head">
            <div>
              <h2>Technical Setup Scanner</h2>
              <p>${scannerPanelCopy(digest)}</p>
            </div>
            ${scannerBadgeHtml(digest)}
          </div>
          <div class="chart-container scanner-height">
            <canvas id="scannerChart" aria-label="Technical scanner setup chart"></canvas>
          </div>
          ${scannerCells(digest)}
          ${scannerValidationHtml(digest)}
        </section>

        <div class="studio-stack">
          <section class="panel">
            <div class="studio-panel-head">
              <div>
                <h2>Narrative QA</h2>
                <p>Theme clustering from the source extraction layer.</p>
              </div>
            </div>
            <div class="theme-review-list">
              ${themeReviewHtml(digest)}
            </div>
          </section>

          <section class="panel">
            <div class="studio-panel-head">
              <div>
                <h2>Publish Readiness</h2>
                <p>Checks before the daily briefing is safe to share.</p>
              </div>
            </div>
            <ul class="checklist-list">
              ${publishingChecklistHtml(digest)}
            </ul>
          </section>
        </div>
      </div>

      <div class="grid-two">
        <section class="panel">
          <div class="studio-panel-head">
            <div>
              <h2>Source QA Queue</h2>
              <p>Top weighted articles driving the video angle, with thumbnails carried from the public briefing.</p>
            </div>
          </div>
          <div class="source-qa-list">
            ${sourceQaHtml(digest)}
          </div>
          <p class="studio-note">The full public page keeps every source link for attribution; this queue shows the items most likely to shape the intro and risk framing.</p>
        </section>

        <section class="panel asset-panel">
          <div class="studio-panel-head">
            <div>
              <h2>AI Asset Pipeline</h2>
              <p>Prompt package for an identity-locked thumbnail using the day&apos;s sentiment palette.</p>
            </div>
            <span class="valid-badge ${digest.sentimentLabel === "BULLISH" ? "" : "idle"}">${escapeHtml(digest.sentimentLabel)}</span>
          </div>
          <div class="prompt-detail-grid">
            ${assetPromptDetailsHtml(digest.asset)}
          </div>
          <div class="prompt-box">Prompt: ${escapeHtml(digest.asset.positivePrompt)}</div>
          <button id="generateAssetBtn" class="primary-btn">Generate Daily Thumbnail</button>
          <div class="loader-track">
            <div id="assetLoader" class="loader-bar"></div>
          </div>
          <div id="assetOutput" class="asset-output">
            <span id="assetPlaceholderText">Prompt package ready</span>
            <canvas id="aiCanvas" aria-label="Generated thumbnail preview"></canvas>
          </div>
          <p class="asset-caption">Negative prompt: ${escapeHtml(digest.asset.negativePrompt)}</p>
        </section>
      </div>

      <section class="panel teleprompter-shell">
        <div class="teleprompter-header">
          <h2>Teleprompter Script Workbench</h2>
          <button id="togglePrompterBtn" class="dark-btn">&#9654; Play Script</button>
        </div>
        <p class="muted-copy">Clean formatting, pacing-optimized, derived from scanner and digest data. Use the speed controls to rehearse the open before recording.</p>
        <div class="script-toolbar" aria-label="Teleprompter speed controls">
          <button class="speed-btn" type="button" data-prompter-speed="28">Slow</button>
          <button class="speed-btn active" type="button" data-prompter-speed="20">Normal</button>
          <button class="speed-btn" type="button" data-prompter-speed="14">Fast</button>
          <button id="resetPrompterBtn" class="speed-btn" type="button">Reset</button>
        </div>
        <div class="script-section-list">
          ${scriptSectionCardsHtml(digest)}
        </div>
        <div id="teleprompterContainer" class="teleprompter-view">
          <div class="read-line"><span>Read Here</span></div>
          <div class="teleprompter-text">${teleprompterHtml(digest)}</div>
        </div>
      </section>

      <section class="panel teleprompter-shell">
        <div class="studio-panel-head">
          <div>
            <h2>Studio Activity Log</h2>
            <p>Local simulation of admin actions for the static GitHub Pages demo.</p>
          </div>
        </div>
        <ul id="studioActivityLog" class="activity-log">
          <li class="activity-item"><strong>Digest loaded</strong><span>${escapeHtml(digest.news.length)} articles, ${escapeHtml(digest.themes.length)} themes, ${escapeHtml(digest.marketSnapshots.length)} quote snapshots.</span></li>
          <li class="activity-item"><strong>Scanner state</strong><span>${escapeHtml(scannerActivityLine(digest))}</span></li>
        </ul>
      </section>
    </section>

    <section id="architecture-view" class="tab-content hidden">
      <header class="page-header">
        <h1>Engine Architecture & Roadmap</h1>
        <p>Technical breakdown of the backend infrastructure built to support the high-concurrency demands of the Morning Prep window.</p>
      </header>

      <div class="arch-grid">
        <section>
          <h2 class="section-title">Tech Stack Overview</h2>
          <div class="tech-block">
            <h3>&#9881; Backend Engine</h3>
            <p>Java with Spring Boot structured as a modular monolith that can split into microservices.</p>
            <div class="chips">
              <span class="chip">Java 17</span>
              <span class="chip">Spring Boot</span>
              <span class="chip">Maven</span>
              <span class="chip">PostgreSQL</span>
              <span class="chip">Redis</span>
            </div>
          </div>
          <div class="tech-block">
            <h3>&#128241; Frontend Command Center</h3>
            <p>High-contrast, responsive UI tailored for rapid market data consumption and creator workflow.</p>
            <div class="chips">
              <span class="chip blue">Next.js</span>
              <span class="chip blue">React</span>
              <span class="chip blue">Tailwind CSS</span>
              <span class="chip blue">Canvas Charts</span>
            </div>
          </div>
          <div class="tech-block">
            <h3>&#129302; Integrations</h3>
            <p>Multithreaded data fetching across financial APIs with adapter boundaries for later production services.</p>
            <div class="chips">
              <span class="chip stone">Alpha Vantage API</span>
              <span class="chip stone">MarketAux</span>
              <span class="chip stone">OpenAI / LLM</span>
              <span class="chip stone">Stable Diffusion</span>
              <span class="chip stone">ControlNet</span>
            </div>
          </div>
        </section>

        <section>
          <h2 class="section-title">Execution Milestones</h2>
          <div class="milestones">
            <article class="milestone">
              <h3>Phase 1: The Data Pipeline</h3>
              <p>Set up Spring Boot backend, Maven configuration, and multithreaded adapter calls to pull overnight market data quickly.</p>
            </article>
            <article class="milestone indigo">
              <h3>Phase 2: The Scanner</h3>
              <p>Implement algorithmic logic to calculate and validate strict 1:2 risk-reward swing setups on index data.</p>
            </article>
            <article class="milestone todo">
              <h3>Phase 3: The Teleprompter</h3>
              <p>Format aggregated data into a readable daily script with pacing and studio controls.</p>
            </article>
            <article class="milestone todo">
              <h3>Phase 4: The Visuals</h3>
              <p>Integrate identity-locked AI image generation for automated sentiment-based thumbnails.</p>
            </article>
          </div>
        </section>
      </div>
    </section>
  </main>

  <script>
    window.__DIGEST__ = ${JSON.stringify(digest)};
    window.__INITIAL_TAB__ = ${JSON.stringify(initialTab)};

    document.addEventListener('DOMContentLoaded', () => {
      const tabs = document.querySelectorAll('.tab-btn');
      const contents = document.querySelectorAll('.tab-content');

      function activate(target) {
        tabs.forEach((tab) => {
          const active = tab.dataset.target === target;
          tab.classList.toggle('active', active);
        });
        contents.forEach((content) => {
          content.classList.toggle('hidden', content.id !== target);
        });
        if (target === 'studio-view') {
          drawScannerChart();
        }
        if (target === 'public-view') {
          drawOvernightChart();
        }
      }

      tabs.forEach((tab) => {
        tab.addEventListener('click', () => activate(tab.dataset.target));
      });

      activate(window.__INITIAL_TAB__);
      drawOvernightChart();
      drawScannerChart();
      bindTeleprompter();
      bindTeleprompterControls();
      bindAssetGeneration();
      bindStudioActions();
      bindQuoteBoardToggle();
      initLiveIndexBoard();
    });

    function drawOvernightChart() {
      const digest = window.__DIGEST__;
      const canvas = document.getElementById('overnightChart');
      if (!canvas) return;
      const source = window.__PUBLISHED_QUOTES__ ?? digest.marketSnapshots;
      const data = dashboardQuotes(source)
        .map((item) => ({ label: compactMarketLabel(item), value: Number(item.changePercent), symbol: item.symbol }));
      window.__MARKET_DASHBOARD_SYMBOLS__ = data.map((item) => item.symbol);
      canvas.dataset.dashboardSymbols = window.__MARKET_DASHBOARD_SYMBOLS__.join(',');
      drawBarChart(canvas, data);
    }

    function dashboardQuotes(quotes) {
      const priority = ['SPX', 'NDX', 'HSI', 'NIFTY', 'BANKNIFTY', 'BRENT'];
      return priority
        .map((symbol) => quotes.find((quote) => quote.symbol === symbol))
        .filter(Boolean);
    }

    function initLiveIndexBoard() {
      window.__PUBLISHED_QUOTES__ = window.__DIGEST__.marketSnapshots;
      window.__QUOTE_BOARD_EXPANDED__ = false;
      renderIndexBoard();
      updateLiveClock('Refreshing prices after page load');
      bindIndexModal();
      refreshPublishedDigest('page-load');
      setInterval(() => refreshPublishedDigest('background'), 60_000);
    }

    function renderIndexBoard() {
      const board = document.getElementById('indexBoard');
      if (!board || !window.__PUBLISHED_QUOTES__) return;
      if (!window.__QUOTE_BOARD_EXPANDED__) {
        board.innerHTML = '';
        return;
      }
      const grouped = groupQuotesByRegion(window.__PUBLISHED_QUOTES__);
      board.innerHTML = regionOrder().filter((region) => grouped.has(region)).map((region) => {
        const quotes = displayQuotesForRegion(region, grouped.get(region));
        return '<section class="quote-region">' +
          '<div class="quote-region-head"><h3>' + escapeClientHtml(region) + '</h3><span>' + regionSummary(quotes) + '</span></div>' +
          '<div class="index-grid">' + quotes.map((quote) => quoteTileHtml(quote)).join('') + '</div>' +
        '</section>';
      }).join('');
      board.querySelectorAll('.index-tile').forEach((tile) => {
        tile.addEventListener('click', () => openIndexChart(tile.dataset.symbol));
      });
    }

    function bindQuoteBoardToggle() {
      const toggle = document.getElementById('quoteBoardToggle');
      const body = document.getElementById('quoteBoardBody');
      const state = document.getElementById('quoteBoardState');
      if (!toggle || !body) return;

      function setExpanded(expanded) {
        window.__QUOTE_BOARD_EXPANDED__ = expanded;
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        toggle.classList.toggle('open', expanded);
        body.hidden = !expanded;
        if (state) {
          state.textContent = expanded ? 'Collapse' : 'Expand';
        }
        renderIndexBoard();
      }

      setExpanded(false);
      toggle.addEventListener('click', () => {
        setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
      });
    }

    function quoteTileHtml(quote) {
      const status = marketStatusFor(quote);
      const direction = quote.changePercent >= 0 ? 'up' : 'down';
      const quality = quote.dataQuality === 'live' ? 'Real' : 'Fallback';
      const statusClass = status.open && quote.dataQuality === 'live' ? 'status live' : 'status';
      const quoteTime = formatQuoteTime(quote.dataTimestamp);
      return '<button class="index-tile" type="button" data-symbol="' + quote.symbol + '">' +
        '<div class="symbol-row"><span class="symbol">' + escapeClientHtml(quote.symbol) + '</span><span class="' + statusClass + '">' + quality + '</span></div>' +
        '<div class="name">' + escapeClientHtml(marketDisplayName(quote)) + '</div>' +
        '<div class="price">' + formatClientNumber(quote.closeValue) + '</div>' +
        '<div class="change ' + direction + '">' + formatClientChange(quote.changePercent) + '</div>' +
        '<div class="name">' + displayStatusLabel(quote, status) + (quoteTime ? ' - ' + quoteTime : '') + '</div>' +
      '</button>';
    }

    function displayStatusLabel(quote, status) {
      if (quote.dataQuality !== 'live' && status.open) {
        return 'Session open';
      }
      return status.label;
    }

    function groupQuotesByRegion(quotes) {
      const grouped = new Map();
      for (const quote of quotes) {
        const region = quote.marketRegion || regionForSymbol(quote.symbol);
        grouped.set(region, [...(grouped.get(region) || []), quote]);
      }
      return grouped;
    }

    function regionOrder() {
      return ['US Overnight', 'Asia Watch', 'India Open', 'Macro Hedges', 'Other Markets'];
    }

    function displayQuotesForRegion(region, quotes) {
      if (region !== 'Asia Watch') return quotes;
      return quotes
        .filter((quote) => asiaTopSymbols().includes(quote.symbol))
        .sort((left, right) => asiaTopSymbols().indexOf(left.symbol) - asiaTopSymbols().indexOf(right.symbol));
    }

    function asiaTopSymbols() {
      return ['NIKKEI', 'HSI', 'SHCOMP', 'KOSPI', 'TAIEX'];
    }

    function marketDisplayName(quote) {
      if (regionForSymbol(quote.symbol) !== 'Asia Watch') return quote.name;
      const country = countryForQuote(quote);
      return country ? country + ' - ' + quote.name : quote.name;
    }

    function countryForQuote(quote) {
      return quote.country || countryForSymbol(quote.symbol);
    }

    function countryForSymbol(symbol) {
      return {
        NIKKEI: 'Japan',
        HSI: 'Hong Kong',
        SHCOMP: 'Mainland China',
        KOSPI: 'South Korea',
        TAIEX: 'Taiwan',
        STI: 'Singapore',
        ASX200: 'Australia'
      }[symbol] || '';
    }

    function regionSummary(quotes) {
      const positives = quotes.filter((quote) => Number(quote.changePercent) >= 0).length;
      const average = quotes.reduce((sum, quote) => sum + Number(quote.changePercent || 0), 0) / Math.max(1, quotes.length);
      const unit = quotes.some((quote) => regionForSymbol(quote.symbol) === 'Asia Watch') ? 'country markets' : 'indices';
      return positives + ' of ' + quotes.length + ' ' + unit + ' are higher; average move is ' + formatClientChange(average);
    }

    async function refreshPublishedDigest(reason) {
      try {
        const response = await fetch('digest.json?ts=' + Date.now(), { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('digest.json returned HTTP ' + response.status);
        }
        const digest = await response.json();
        if (!Array.isArray(digest.marketSnapshots)) {
          throw new Error('digest.json did not include market snapshots');
        }
        window.__DIGEST__ = { ...window.__DIGEST__, ...digest };
        window.__PUBLISHED_QUOTES__ = digest.marketSnapshots;
        renderIndexBoard();
        drawOvernightChart();
        if (window.__ACTIVE_INDEX_SYMBOL__) {
          const activeQuote = window.__PUBLISHED_QUOTES__.find((item) => item.symbol === window.__ACTIVE_INDEX_SYMBOL__);
          if (activeQuote) {
            drawIndexChartPreview(activeQuote);
            setChartLinks(activeQuote);
          }
        }
        updateLiveClock(reason === 'page-load' ? 'Prices refreshed from latest published file' : undefined);
      } catch (error) {
        updateLiveClock('Waiting for next published quote file');
      }
    }

    function bindIndexModal() {
      const modal = document.getElementById('indexChartModal');
      const close = document.getElementById('closeIndexChart');
      if (!modal || !close) return;
      close.addEventListener('click', closeIndexChart);
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          closeIndexChart();
        }
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeIndexChart();
        }
      });
    }

    function openIndexChart(symbol) {
      const modal = document.getElementById('indexChartModal');
      const title = document.getElementById('indexChartTitle');
      const meta = document.getElementById('indexChartMeta');
      const quote = window.__PUBLISHED_QUOTES__.find((item) => item.symbol === symbol);
      if (!modal || !quote) return;
      const status = marketStatusFor(quote);
      window.__ACTIVE_INDEX_SYMBOL__ = symbol;
      title.textContent = marketDisplayName(quote) + ' (' + quote.symbol + ')';
      meta.textContent = status.open
        ? 'Real Yahoo Finance price series from the latest published digest. The board refreshes every scheduled publish.'
        : 'Market closed. Showing the latest published Yahoo Finance price series for review.';
      setChartLinks(quote);
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      drawIndexChartPreview(quote);
    }

    function closeIndexChart() {
      const modal = document.getElementById('indexChartModal');
      if (!modal) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      window.__ACTIVE_INDEX_SYMBOL__ = null;
      const canvas = document.getElementById('marketChartCanvas');
      if (canvas) {
        canvas.dataset.renderState = 'idle';
      }
      const fallback = document.getElementById('chartFallback');
      if (fallback) {
        fallback.classList.remove('visible');
        fallback.setAttribute('aria-hidden', 'true');
      }
    }

    function drawIndexChartPreview(quote) {
      const canvas = document.getElementById('marketChartCanvas');
      const source = document.getElementById('marketChartSource');
      const range = document.getElementById('marketChartRange');
      if (!canvas) return;
      const fallback = document.getElementById('chartFallback');
      if (fallback) {
        fallback.classList.remove('visible');
        fallback.setAttribute('aria-hidden', 'true');
      }
      const points = Array.isArray(quote.chartPoints)
        ? quote.chartPoints.filter((point) => Number.isFinite(Number(point.close)))
        : [];
      if (points.length < 2) {
        canvas.dataset.renderState = 'missing-data';
        showChartFallback();
        if (range) range.textContent = 'No intraday series in this digest';
        return;
      }
      if (source) {
        source.textContent = (quote.source || 'Yahoo Finance chart API') + ' - ' + (quote.dataQuality === 'live' ? 'live capture' : 'fallback capture');
      }
      if (range) {
        range.textContent = formatQuoteTime(points[0].time) + ' to ' + formatQuoteTime(points.at(-1).time) + ' IST';
      }
      drawMarketSeriesChart(canvas, quote, points);
      canvas.dataset.renderState = 'rendered';
    }

    function setChartLinks(quote) {
      const url = yahooFinanceChartUrl(quote);
      const open = document.getElementById('openFullChart');
      if (open) open.href = url;
    }

    function yahooFinanceChartUrl(quote) {
      if (quote.yahooSymbol) {
        return 'https://finance.yahoo.com/quote/' + encodeURIComponent(quote.yahooSymbol) + '/chart/';
      }
      return tradingViewUrl(quote);
    }

    function tradingViewUrl(quote) {
      const symbol = quote.tradingViewSymbol || fallbackTradingViewSymbol(quote.symbol);
      return 'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(symbol);
    }

    function showChartFallback() {
      const fallback = document.getElementById('chartFallback');
      if (!fallback) return;
      fallback.classList.add('visible');
      fallback.setAttribute('aria-hidden', 'false');
    }

    function updateLiveClock(note) {
      const clock = document.getElementById('liveClock');
      if (!clock) return;
      const quotes = window.__PUBLISHED_QUOTES__ ?? [];
      const openCount = quotes.filter((quote) => marketStatusFor(quote).open).length;
      const latest = latestQuoteTime(quotes);
      const time = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(new Date());
      const mode = quotes.some((quote) => quote.dataQuality === 'live') ? 'Yahoo Finance quotes' : 'Fallback quotes';
      clock.textContent = (note ? note + ' - ' : '') +
        'Active sessions ' + openCount + '/' + quotes.length +
        ' - ' + mode +
        (latest ? ' - latest ' + latest : '') +
        ' - checked IST ' + time;
    }

    function compactMarketLabel(item) {
      return String(item.name)
        .replace('US Dollar Index', 'DXY')
        .replace('Nasdaq 100', 'Nasdaq')
        .replace('Dow Jones', 'Dow');
    }

    function latestQuoteTime(quotes) {
      const timestamps = quotes
        .map((quote) => Date.parse(quote.dataTimestamp))
        .filter((value) => Number.isFinite(value));
      if (!timestamps.length) return '';
      return formatQuoteTime(new Date(Math.max(...timestamps)).toISOString());
    }

    function formatQuoteTime(value) {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }

    function fallbackTradingViewSymbol(symbol) {
      return {
        SPX: 'SP:SPX',
        NDX: 'NASDAQ:NDX',
        DJI: 'DJ:DJI',
        NIFTY: 'NSE:NIFTY',
        BANKNIFTY: 'NSE:BANKNIFTY',
        GIFTNIFTY: 'NSEIX:NIFTY1!',
        NIKKEI: 'TVC:NI225',
        HSI: 'TVC:HSI',
        SHCOMP: 'SSE:000001',
        KOSPI: 'KRX:KOSPI',
        TAIEX: 'TWSE:TAIEX',
        STI: 'TVC:STI',
        ASX200: 'ASX:XJO',
        DXY: 'TVC:DXY',
        BRENT: 'TVC:UKOIL'
      }[symbol] ?? 'SP:SPX';
    }

    function regionForSymbol(symbol) {
      if (symbol === 'SPX' || symbol === 'NDX' || symbol === 'DJI') return 'US Overnight';
      if (symbol === 'NIFTY' || symbol === 'BANKNIFTY' || symbol === 'GIFTNIFTY') return 'India Open';
      if (symbol === 'DXY' || symbol === 'BRENT') return 'Macro Hedges';
      if (['NIKKEI', 'HSI', 'SHCOMP', 'KOSPI', 'TAIEX', 'STI', 'ASX200'].includes(symbol)) return 'Asia Watch';
      return 'Other Markets';
    }

    function marketStatusFor(quoteOrSymbol) {
      const quote = typeof quoteOrSymbol === 'string' ? { symbol: quoteOrSymbol } : quoteOrSymbol;
      const symbol = quote.symbol;
      const session = quote.session || sessionForSymbol(symbol);
      const now = new Date();
      if (session === 'us') {
        return marketWindow(now, 'America/New_York', 9, 30, 16, 0, 'US close 4:00 PM ET');
      }
      if (session === 'india') {
        return marketWindow(now, 'Asia/Kolkata', 9, 15, 15, 30, 'India close 3:30 PM IST');
      }
      if (session === 'tokyo') {
        return marketWindow(now, 'Asia/Tokyo', 9, 0, 15, 30, 'Tokyo close 3:30 PM JST');
      }
      if (session === 'hongkong') {
        return marketWindow(now, 'Asia/Hong_Kong', 9, 30, 16, 0, 'Hong Kong close 4:00 PM HKT');
      }
      if (session === 'shanghai') {
        return marketWindow(now, 'Asia/Shanghai', 9, 30, 15, 0, 'Shanghai close 3:00 PM CST');
      }
      if (session === 'seoul') {
        return marketWindow(now, 'Asia/Seoul', 9, 0, 15, 30, 'Seoul close 3:30 PM KST');
      }
      if (session === 'taipei') {
        return marketWindow(now, 'Asia/Taipei', 9, 0, 13, 30, 'Taiwan close 1:30 PM CST');
      }
      if (session === 'singapore') {
        return marketWindow(now, 'Asia/Singapore', 9, 0, 17, 0, 'Singapore close 5:00 PM SGT');
      }
      if (session === 'sydney') {
        return marketWindow(now, 'Australia/Sydney', 10, 0, 16, 0, 'Sydney close 4:00 PM AEDT');
      }
      return marketWindow(now, 'UTC', 0, 0, 23, 30, 'global close window');
    }

    function sessionForSymbol(symbol) {
      return {
        SPX: 'us',
        NDX: 'us',
        DJI: 'us',
        NIFTY: 'india',
        BANKNIFTY: 'india',
        GIFTNIFTY: 'india',
        NIKKEI: 'tokyo',
        HSI: 'hongkong',
        SHCOMP: 'shanghai',
        KOSPI: 'seoul',
        TAIEX: 'taipei',
        STI: 'singapore',
        ASX200: 'sydney',
        DXY: 'macro',
        BRENT: 'macro'
      }[symbol] || 'macro';
    }

    function marketWindow(date, timeZone, openHour, openMinute, closeHour, closeMinute, closeLabel) {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(date).map((part) => [part.type, part.value]));
      const weekday = parts.weekday;
      const minutes = Number(parts.hour) * 60 + Number(parts.minute);
      const open = openHour * 60 + openMinute;
      const close = closeHour * 60 + closeMinute;
      const isWeekday = weekday !== 'Sat' && weekday !== 'Sun';
      const isOpen = isWeekday && minutes >= open && minutes <= close;
      return { open: isOpen, label: isOpen ? 'Live' : 'Closed', closeLabel };
    }

    function formatClientNumber(value) {
      return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    }

    function formatCompactNumber(value) {
      return Number(value).toLocaleString('en-IN', { maximumFractionDigits: Math.abs(Number(value)) >= 1000 ? 0 : 2 });
    }

    function formatClientChange(value) {
      return (value >= 0 ? '+' : '') + Number(value).toFixed(2) + '%';
    }

    function escapeClientHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
    }

    function drawScannerChart() {
      const canvas = document.getElementById('scannerChart');
      if (!canvas) return;
      const setup = window.__DIGEST__.tradeSetups.find((item) => item.symbol === 'NIFTY') ?? window.__DIGEST__.tradeSetups[0];
      if (!setup) {
        drawEmptyScannerChart(canvas);
        return;
      }
      drawLineChart(canvas, setup);
    }

    function drawEmptyScannerChart(canvas) {
      const { ctx, width, height } = scaleCanvas(canvas);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i += 1) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(24, y);
        ctx.lineTo(width - 24, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#111827';
      ctx.textAlign = 'center';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('No active scanner setup', width / 2, height / 2 - 8);
      ctx.fillStyle = '#64748b';
      ctx.font = '13px Arial';
      ctx.fillText('Live quote validation removed stale 1:2 levels.', width / 2, height / 2 + 18);
    }

    function scaleCanvas(canvas) {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      return { ctx, width: rect.width, height: rect.height };
    }

    function drawBarChart(canvas, data) {
      const { ctx, width, height } = scaleCanvas(canvas);
      ctx.clearRect(0, 0, width, height);
      const pad = { top: 24, right: 18, bottom: 54, left: 54 };
      const chartW = width - pad.left - pad.right;
      const chartH = height - pad.top - pad.bottom;
      const min = Math.min(-1.5, ...data.map((item) => item.value));
      const max = Math.max(1.8, ...data.map((item) => item.value));
      const zeroY = pad.top + (max / (max - min)) * chartH;

      ctx.strokeStyle = '#f5f5f4';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i += 1) {
        const y = pad.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
      }

      ctx.strokeStyle = '#d6d3d1';
      ctx.beginPath();
      ctx.moveTo(pad.left, zeroY);
      ctx.lineTo(width - pad.right, zeroY);
      ctx.stroke();

      const slot = chartW / data.length;
      data.forEach((item, index) => {
        const barW = Math.max(12, Math.min(70, slot * 0.56));
        const x = pad.left + slot * index + (slot - barW) / 2;
        const y = pad.top + ((max - item.value) / (max - min)) * chartH;
        const barTop = Math.min(y, zeroY);
        const barH = Math.max(4, Math.abs(zeroY - y));
        ctx.fillStyle = item.value >= 0 ? 'rgba(16, 185, 129, 0.86)' : 'rgba(239, 68, 68, 0.86)';
        roundRect(ctx, x, barTop, barW, barH, 5);
        ctx.fill();

        ctx.fillStyle = '#57534e';
        ctx.font = data.length > 9 ? '10px Arial' : '12px Arial';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x + barW / 2, height - 20);
        if (data.length > 9) {
          ctx.rotate(-Math.PI / 5);
        }
        ctx.fillText(item.label, 0, 0);
        ctx.restore();
        ctx.fillStyle = item.value >= 0 ? '#047857' : '#b91c1c';
        ctx.font = data.length > 9 ? 'bold 10px Arial' : 'bold 12px Arial';
        ctx.fillText((item.value >= 0 ? '+' : '') + item.value.toFixed(2) + '%', x + barW / 2, barTop - 8);
      });
    }

    function drawMarketSeriesChart(canvas, quote, points) {
      const { ctx, width, height } = scaleCanvas(canvas);
      ctx.clearRect(0, 0, width, height);

      const pad = { top: 28, right: 28, bottom: 46, left: 70 };
      const chartW = Math.max(1, width - pad.left - pad.right);
      const chartH = Math.max(1, height - pad.top - pad.bottom);
      const values = points.map((point) => Number(point.close));
      const previous = Number(quote.previousClose);
      const allValues = Number.isFinite(previous) ? [...values, previous] : values;
      let min = Math.min(...allValues);
      let max = Math.max(...allValues);
      const spread = Math.max(max - min, Math.abs(max) * 0.002, 1);
      min -= spread * 0.18;
      max += spread * 0.18;
      const xFor = (index) => pad.left + (chartW / Math.max(1, points.length - 1)) * index;
      const yFor = (value) => pad.top + ((max - value) / (max - min)) * chartH;
      const lineColor = Number(quote.changePercent) >= 0 ? '#059669' : '#dc2626';

      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.font = '11px Arial';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i += 1) {
        const value = min + ((max - min) / 4) * i;
        const y = yFor(value);
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
        ctx.fillText(formatCompactNumber(value), pad.left - 10, y + 4);
      }

      if (Number.isFinite(previous)) {
        const y = yFor(previous);
        ctx.strokeStyle = '#94a3b8';
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'left';
        ctx.fillText('Prev close ' + formatCompactNumber(previous), pad.left + 8, y - 7);
      }

      const gradient = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
      gradient.addColorStop(0, Number(quote.changePercent) >= 0 ? 'rgba(5, 150, 105, 0.22)' : 'rgba(220, 38, 38, 0.20)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.beginPath();
      points.forEach((point, index) => {
        const x = xFor(index);
        const y = yFor(Number(point.close));
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(xFor(points.length - 1), height - pad.bottom);
      ctx.lineTo(xFor(0), height - pad.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      points.forEach((point, index) => {
        const x = xFor(index);
        const y = yFor(Number(point.close));
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      const first = points[0];
      const last = points.at(-1);
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'left';
      ctx.font = '12px Arial';
      ctx.fillText(formatQuoteTime(first.time) || 'Start', pad.left, height - 16);
      ctx.textAlign = 'right';
      ctx.fillText(formatQuoteTime(last.time) || 'Latest', width - pad.right, height - 16);

      ctx.fillStyle = '#111827';
      ctx.textAlign = 'left';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(formatClientNumber(quote.closeValue) + ' (' + formatClientChange(quote.changePercent) + ')', pad.left, 20);
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.font = '12px Arial';
      ctx.fillText(points.length + ' captured points', width - pad.right, 20);
    }

    function drawLineChart(canvas, setup) {
      const { ctx, width, height } = scaleCanvas(canvas);
      ctx.clearRect(0, 0, width, height);
      const pad = { top: 20, right: 18, bottom: 42, left: 54 };
      const labels = ['9:15', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '15:30'];
      const price = [
        setup.stopLoss + 20,
        setup.entry - 42,
        setup.entry - 75,
        setup.entry + 10,
        setup.entry - 24,
        setup.entry + 70,
        setup.entry + 38,
        setup.entry
      ];
      const allValues = [...price, setup.target, setup.stopLoss];
      const min = Math.min(...allValues) - 45;
      const max = Math.max(...allValues) + 45;
      const chartW = width - pad.left - pad.right;
      const chartH = height - pad.top - pad.bottom;
      const xFor = (index) => pad.left + (chartW / (labels.length - 1)) * index;
      const yFor = (value) => pad.top + ((max - value) / (max - min)) * chartH;

      ctx.strokeStyle = '#f5f5f4';
      for (let i = 0; i <= 4; i += 1) {
        const y = pad.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
      }

      drawDashedLine(ctx, pad.left, yFor(setup.target), width - pad.right, yFor(setup.target), '#10b981');
      drawDashedLine(ctx, pad.left, yFor(setup.stopLoss), width - pad.right, yFor(setup.stopLoss), '#ef4444');

      ctx.beginPath();
      price.forEach((value, index) => {
        const x = xFor(index);
        const y = yFor(value);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#57534e';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      labels.forEach((label, index) => ctx.fillText(label, xFor(index), height - 16));

      ctx.textAlign = 'right';
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('Target ' + setup.target, width - pad.right, yFor(setup.target) - 8);
      ctx.fillStyle = '#ef4444';
      ctx.fillText('Stop ' + setup.stopLoss, width - pad.right, yFor(setup.stopLoss) - 8);
    }

    function drawDashedLine(ctx, x1, y1, x2, y2, color) {
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }

    function roundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + width, y, x + width, y + height, radius);
      ctx.arcTo(x + width, y + height, x, y + height, radius);
      ctx.arcTo(x, y + height, x, y, radius);
      ctx.arcTo(x, y, x + width, y, radius);
      ctx.closePath();
    }

    function bindTeleprompter() {
      const button = document.getElementById('togglePrompterBtn');
      const container = document.getElementById('teleprompterContainer');
      if (!button || !container) return;
      let playing = false;
      window.__SET_PROMPTER_PLAYING__ = (next) => {
        playing = next;
        container.classList.toggle('playing', playing);
        button.classList.toggle('playing', playing);
        button.innerHTML = playing ? '&#10074;&#10074; Pause Script' : '&#9654; Play Script';
      };
      button.addEventListener('click', () => {
        window.__SET_PROMPTER_PLAYING__(!playing);
      });
    }

    function bindTeleprompterControls() {
      const container = document.getElementById('teleprompterContainer');
      const text = container ? container.querySelector('.teleprompter-text') : null;
      if (!container || !text) return;
      document.querySelectorAll('[data-prompter-speed]').forEach((button) => {
        button.addEventListener('click', () => {
          const seconds = Number(button.dataset.prompterSpeed || 20);
          text.style.animationDuration = seconds + 's';
          document.querySelectorAll('[data-prompter-speed]').forEach((item) => item.classList.remove('active'));
          button.classList.add('active');
        });
      });
      const reset = document.getElementById('resetPrompterBtn');
      if (reset) {
        reset.addEventListener('click', () => {
          if (typeof window.__SET_PROMPTER_PLAYING__ === 'function') {
            window.__SET_PROMPTER_PLAYING__(false);
          } else {
            container.classList.remove('playing');
          }
          text.style.animation = 'none';
          text.offsetHeight;
          text.style.animation = '';
          text.style.animationDuration = document.querySelector('.speed-btn.active')?.dataset.prompterSpeed + 's' || '20s';
        });
      }
    }

    function bindAssetGeneration() {
      const button = document.getElementById('generateAssetBtn');
      const loader = document.getElementById('assetLoader');
      const canvas = document.getElementById('aiCanvas');
      const placeholder = document.getElementById('assetPlaceholderText');
      if (!button || !loader || !canvas || !placeholder) return;
      drawAssetCanvas(canvas, false);
      canvas.dataset.generated = 'false';
      canvas.classList.add('visible');

      button.addEventListener('click', () => {
        button.disabled = true;
        button.textContent = 'Processing via Pipeline...';
        loader.style.width = '100%';

        setTimeout(() => {
          drawAssetCanvas(canvas, true);
          canvas.dataset.generated = 'true';
          canvas.classList.add('visible');
          placeholder.classList.add('hidden');
          button.textContent = 'Asset Generated';
          button.classList.add('done');
          setTimeout(() => {
            loader.style.transition = 'none';
            loader.style.width = '0%';
          }, 500);
        }, 850);
      });
    }

    function drawAssetCanvas(canvas, generated) {
      const { ctx, width, height } = scaleCanvas(canvas);
      const bearish = window.__DIGEST__.sentimentLabel !== 'BULLISH';
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, bearish ? '#7f1d1d' : '#064e3b');
      gradient.addColorStop(0.58, '#111827');
      gradient.addColorStop(1, '#020617');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 26) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 26) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const points = bearish
        ? [[0.05, 0.28], [0.28, 0.36], [0.48, 0.30], [0.7, 0.55], [0.94, 0.68]]
        : [[0.05, 0.76], [0.28, 0.58], [0.48, 0.64], [0.7, 0.38], [0.94, 0.24]];
      ctx.strokeStyle = bearish ? '#fca5a5' : '#86efac';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      points.forEach(([x, y], index) => {
        const px = width * x;
        const py = height * y;
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('PRE-MARKET BRIEF', 22, 40);
      ctx.fillStyle = bearish ? '#fecaca' : '#bbf7d0';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(window.__DIGEST__.sentimentLabel + ' SETUP', 22, 66);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(window.__DIGEST__.news.length + ' SOURCES VERIFIED', 22, height - 24);
      if (generated) {
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        roundRect(ctx, width - 158, 18, 136, 36, 8);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CONTROLNET LOCKED', width - 90, 41);
        ctx.textAlign = 'left';
      }
    }

    function bindStudioActions() {
      const log = document.getElementById('studioActivityLog');
      const publishState = document.getElementById('studioPublishState');
      function addLog(title, detail) {
        if (!log) return;
        const item = document.createElement('li');
        item.className = 'activity-item';
        item.innerHTML = '<strong>' + escapeClientHtml(title) + '</strong><span>' + escapeClientHtml(detail) + '</span>';
        log.prepend(item);
      }
      const run = document.getElementById('runDigestBtn');
      if (run) {
        run.addEventListener('click', () => addLog('Digest check completed', window.__DIGEST__.news.length + ' source articles and ' + window.__DIGEST__.marketSnapshots.length + ' market snapshots are loaded.'));
      }
      const regenerate = document.getElementById('regenerateScriptBtn');
      if (regenerate) {
        regenerate.addEventListener('click', () => addLog('Script regeneration simulated', 'The deterministic template remains grounded to the current source and scanner state.'));
      }
      const publish = document.getElementById('publishDigestBtn');
      if (publish) {
        publish.addEventListener('click', () => {
          if (publishState) publishState.textContent = 'PUBLISH QUEUED';
          addLog('Publish queued', 'Static demo state updated locally; GitHub Actions handles the scheduled public publish.');
        });
      }
    }

    window.addEventListener('resize', () => {
      drawOvernightChart();
      drawScannerChart();
      const assetCanvas = document.getElementById('aiCanvas');
      if (assetCanvas) {
        drawAssetCanvas(assetCanvas, assetCanvas.dataset.generated === 'true');
      }
    });
  </script>
</body>
</html>`;
}

function executiveSummaryHtml(digest) {
  const usLine = formatSnapshotLine(snapshotsForRegion(digest, "US Overnight"));
  const asiaLine = formatAsiaSnapshotLine(snapshotsForRegion(digest, "Asia Watch"));
  const indiaLine = formatSnapshotLine(snapshotsForRegion(digest, "India Open"));
  const macroLine = formatSnapshotLine(snapshotsForRegion(digest, "Macro Hedges"));
  const pressureStory = strongestStory(digest.news, "negative");
  const supportStory = strongestStory(digest.news, "positive");
  const primaryTheme = digest.themes[0];
  const setup = niftySetup(digest);
  const setupText = setup
    ? `Nifty has a scanner-approved ${setup.direction.toLowerCase()} plan only near ${formatNumber(setup.entry)}, with invalidation at ${formatNumber(setup.stopLoss)} and target at ${formatNumber(setup.target)}. The setup only remains valid while the ${setup.riskReward}R structure is intact.`
    : "The scanner has not accepted a 1:2 risk-reward setup yet, so the first hour should define the actionable levels.";
  const bottomLine = [
    `Overnight financial news points to a ${digest.sentimentLabel.toLowerCase()} but selective Indian open.`,
    pressureStory ? `The main pressure point is ${pressureStory.takeaway || pressureStory.summary}` : primaryTheme?.summary,
    supportStory ? `The offset is ${supportStory.takeaway || supportStory.summary}` : "",
    "This is a source-led brief, not just an index-move recap."
  ].filter(Boolean).join(" ");

  return `
    <p class="brief-lead"><strong>Bottom line:</strong> ${escapeHtml(bottomLine)}</p>

    <div class="brief-section">
      <h3>1. What Changed Overnight</h3>
      <ul class="brief-list">
        <li><strong>US risk appetite:</strong> ${escapeHtml(usLine || "US index data is awaiting refresh")}. The news stack links US technology softness and firmer yields to a lower-quality risk backdrop.</li>
        <li><strong>Asia read:</strong> ${escapeHtml(asiaLine || "Asian market data is awaiting refresh")}. Mixed regional breadth means the Indian open should be treated as level-driven rather than purely directional.</li>
        <li><strong>Macro hedges:</strong> ${escapeHtml(macroLine || "Macro hedge data is awaiting refresh")}. Crude and the dollar remain the two variables most likely to shape inflation, rupee, and foreign-flow expectations.</li>
        <li><strong>Domestic context:</strong> ${escapeHtml(indiaLine || "Indian index data is awaiting refresh")}. Banks are the key stabilizer; broad-market conviction still needs breadth confirmation.</li>
      </ul>
    </div>

    <div class="brief-section">
      <h3>2. Source Extraction</h3>
      <div class="source-extract-list">
        ${sourceExtractionRows(digest.news)}
      </div>
    </div>

    <div class="brief-section">
      <h3>3. India Read-Through</h3>
      <ul class="brief-list">
        ${indiaReadThroughItems(digest, setupText)}
      </ul>
    </div>

    <div class="brief-section">
      <h3>4. What To Watch Next</h3>
      <ul class="watch-grid">
        ${watchItemsHtml(digest.news, setup)}
      </ul>
    </div>
  `;
}

function sourceExtractionRows(articles) {
  return articles
    .map((article) => `
      <div class="source-extract-row">
        <div class="source-extract-meta">
          <span>${escapeHtml(article.sourceName)}</span>
          <small>${escapeHtml(categoryLabel(article.category))} - ${escapeHtml(article.entityName)} - ${escapeHtml(formatArticleTime(article.publishedAt))}</small>
        </div>
        <div class="source-extract-copy">
          <h4>${escapeHtml(article.headline)}</h4>
          <p>${escapeHtml(article.takeaway || article.summary)}</p>
          <p class="why-line"><strong>Why it matters:</strong> ${escapeHtml(article.whyItMatters || article.summary)}</p>
          <p class="why-line"><strong>India impact:</strong> ${escapeHtml(article.indiaImpact || "Watch for confirmation in sector breadth and opening-range acceptance.")}</p>
        </div>
      </div>
    `)
    .join("");
}

function indiaReadThroughItems(digest, setupText) {
  const macro = firstByCategory(digest.news, "macro_negative");
  const globalRisk = firstByCategory(digest.news, "global_risk");
  const sectorSupport = firstByCategory(digest.news, "sector_positive");
  const neutral = firstByCategory(digest.news, "neutral_volatile");
  return [
    `<li><strong>Macro pressure:</strong> ${escapeHtml(macro?.indiaImpact || "Crude, dollar, and yields remain the first pressure points for the index.")}</li>`,
    `<li><strong>Risk appetite:</strong> ${escapeHtml(globalRisk?.indiaImpact || "US risk appetite needs confirmation before chasing a gap move.")}</li>`,
    `<li><strong>Domestic cushion:</strong> ${escapeHtml(sectorSupport?.indiaImpact || "Banks and defensives are the first areas to check for institutional support.")}</li>`,
    `<li><strong>Opening behavior:</strong> ${escapeHtml(neutral?.indiaImpact || "Mixed Asia argues for waiting on the first-hour range.")}</li>`,
    `<li><strong>Trading discipline:</strong> ${escapeHtml(setupText)} This is educational market research for content planning, not investment advice.</li>`
  ].join("");
}

function watchItemsHtml(articles, setup) {
  const items = articles
    .map((article) => article.watchFor)
    .filter(Boolean)
    .slice(0, 7);
  if (setup) {
    items.push(`Nifty acceptance near ${formatNumber(setup.entry)} and invalidation near ${formatNumber(setup.stopLoss)}.`);
  }
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function strongestStory(articles, direction) {
  const sorted = articles
    .slice()
    .filter((article) => direction === "positive" ? Number(article.sentimentScore) > 0 : Number(article.sentimentScore) < 0)
    .sort((left, right) =>
      Math.abs(Number(right.sentimentScore) * Number(right.entityMatchScore)) -
      Math.abs(Number(left.sentimentScore) * Number(left.entityMatchScore))
    );
  return sorted[0];
}

function firstByCategory(articles, category) {
  return articles
    .filter((article) => article.category === category)
    .sort((left, right) =>
      Math.abs(Number(right.sentimentScore) * Number(right.entityMatchScore)) -
      Math.abs(Number(left.sentimentScore) * Number(left.entityMatchScore))
    )[0];
}

function categoryLabel(category) {
  return String(category || "market")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatArticleTime(value) {
  if (!value) return "Source time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Source time";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function regionalBreadthHtml(digest) {
  return ["US Overnight", "Asia Watch", "India Open", "Macro Hedges"]
    .map((region) => {
      const snapshots = displaySnapshotsForRegion(region, snapshotsForRegion(digest, region));
      if (!snapshots.length) {
        return "";
      }
      const positives = snapshots.filter((snapshot) => Number(snapshot.changePercent) >= 0).length;
      const average = snapshots.reduce((sum, snapshot) => sum + Number(snapshot.changePercent || 0), 0) / snapshots.length;
      const strongest = snapshots
        .slice()
        .sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent))[0];
      const label = region === "Asia Watch" ? "Asia Watch (top 5 country markets)" : region;
      const unit = region === "Asia Watch" ? "country markets" : "indices";
      return `
        <div class="breadth-card">
          <span>${escapeHtml(label)}</span>
          <strong>${positives} of ${snapshots.length} ${unit} are higher; average move is ${formatChange(average)}</strong>
          <small>Largest move: ${escapeHtml(marketDisplayNameForSnapshot(strongest))} ${formatChange(strongest.changePercent)}</small>
        </div>
      `;
    })
    .join("");
}

function snapshotsForRegion(digest, region) {
  return digest.marketSnapshots.filter((snapshot) => (snapshot.marketRegion || regionForSnapshot(snapshot)) === region);
}

function displaySnapshotsForRegion(region, snapshots) {
  if (region !== "Asia Watch") {
    return snapshots;
  }

  const topSymbols = topAsiaSymbols();
  return snapshots
    .filter((snapshot) => topSymbols.includes(snapshot.symbol))
    .sort((left, right) => topSymbols.indexOf(left.symbol) - topSymbols.indexOf(right.symbol));
}

function topAsiaSymbols() {
  return ["NIKKEI", "HSI", "SHCOMP", "KOSPI", "TAIEX"];
}

function regionForSnapshot(snapshot) {
  if (["SPX", "NDX", "DJI"].includes(snapshot.symbol)) return "US Overnight";
  if (["NIFTY", "BANKNIFTY", "GIFTNIFTY"].includes(snapshot.symbol)) return "India Open";
  if (["DXY", "BRENT"].includes(snapshot.symbol)) return "Macro Hedges";
  if (["NIKKEI", "HSI", "SHCOMP", "KOSPI", "TAIEX", "STI", "ASX200"].includes(snapshot.symbol)) return "Asia Watch";
  return "Other Markets";
}

function formatSnapshotLine(snapshots) {
  return snapshots
    .slice(0, 7)
    .map((snapshot) => `${snapshot.name} ${formatChange(snapshot.changePercent)}`)
    .join(", ");
}

function formatAsiaSnapshotLine(snapshots) {
  return displaySnapshotsForRegion("Asia Watch", snapshots)
    .map((snapshot) => `${marketDisplayNameForSnapshot(snapshot)} ${formatChange(snapshot.changePercent)}`)
    .join(", ");
}

function marketDisplayNameForSnapshot(snapshot) {
  const region = snapshot.marketRegion || regionForSnapshot(snapshot);
  if (region !== "Asia Watch") {
    return snapshot.name;
  }
  const country = countryForSnapshot(snapshot);
  return country ? `${country} - ${snapshot.name}` : snapshot.name;
}

function countryForSnapshot(snapshot) {
  return snapshot.country || {
    NIKKEI: "Japan",
    HSI: "Hong Kong",
    SHCOMP: "Mainland China",
    KOSPI: "South Korea",
    TAIEX: "Taiwan",
    STI: "Singapore",
    ASX200: "Australia"
  }[snapshot.symbol] || "";
}

function algorithmicSetupHtml(digest) {
  const setup = niftySetup(digest);
  if (!setup) {
    return `
      <section class="info-card setup-card">
        <div class="setup-card-header">
          <h2>Nifty 50 Algorithmic Setup</h2>
          <span class="setup-badge">No setup yet</span>
        </div>
        <p class="strategy-note">No active 1:2 risk-reward setup has passed live quote validation. Let the opening range define the next valid level.</p>
      </section>
    `;
  }

  const bullish = setup.direction === "BULLISH";
  const risk = bullish ? setup.entry - setup.stopLoss : setup.stopLoss - setup.entry;
  const reward = bullish ? setup.target - setup.entry : setup.entry - setup.target;
  const bias = bullish ? "Buy on Pullback (Bullish)" : "Sell on Rally (Bearish)";
  const biasColor = bullish ? "#86efac" : "#fca5a5";

  return `
    <section class="info-card setup-card">
      <div class="setup-card-header">
        <h2>Nifty 50 Algorithmic Setup</h2>
        <span class="setup-badge">1:2 R:R Validated</span>
      </div>
      <div class="setup-grid">
        <div>
          <p class="strategy-label">Strategy Bias</p>
          <p class="strategy-bias" style="color: ${biasColor}">${escapeHtml(bias)}</p>
          <p class="strategy-note">${escapeHtml(setup.confidenceReason)}</p>
        </div>
        <div class="setup-levels">
          <div class="setup-level">
            <span>Entry Zone</span>
            <strong>${formatNumber(setup.entry)}</strong>
          </div>
          <div class="setup-level stop">
            <span>Stop Loss</span>
            <strong>${formatNumber(setup.stopLoss)}</strong>
            <small>Risk: ${formatNumber(Math.abs(risk))} pts</small>
          </div>
          <div class="setup-level target">
            <span>Target</span>
            <strong>${formatNumber(setup.target)}</strong>
            <small>Reward: ${formatNumber(Math.abs(reward))} pts</small>
          </div>
        </div>
      </div>
    </section>
  `;
}

function scannerBadgeHtml(digest) {
  const setup = niftySetup(digest) ?? digest.tradeSetups[0];
  if (!setup) {
    return '<span class="valid-badge idle">No active setup</span>';
  }
  return '<span class="valid-badge">1:2 R:R Validated</span>';
}

function scannerPanelCopy(digest) {
  const setup = niftySetup(digest) ?? digest.tradeSetups[0];
  if (!setup) {
    return "No active 1:2 risk-reward setup is available after live quote validation. The scanner is waiting for fresh levels.";
  }
  return "Scanning historical Nifty 50 data. Algorithms have flagged a valid swing setup meeting strict risk parameters.";
}

function studioMetricCards(digest) {
  const setup = niftySetup(digest);
  const sourceCount = new Set(digest.news.map((article) => article.sourceName)).size;
  const thumbnailCount = digest.news.filter((article) => article.thumbnail?.alt).length;
  const sections = parseScriptSections(digest.teleprompterScript);
  const setupLabel = setup ? `${setup.symbol} ${setup.riskReward}R` : "Setup blocked";
  const setupHint = setup ? "Scanner-approved trade plan is available." : "Live validation removed stale levels.";
  return [
    ["Market Tone", headlineSentiment(digest.sentimentLabel), `Weighted sentiment ${formatSignedScore(digest.overallSentiment)}`],
    ["Sources", `${digest.news.length} articles`, `${sourceCount} publishers; ${thumbnailCount} thumbnails`],
    ["Scanner", setupLabel, setupHint],
    ["Script", `${sections.length} sections`, "Teleprompter package ready"]
  ].map(([label, value, hint]) => `
    <article class="studio-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(hint)}</small>
    </article>
  `).join("");
}

function studioWorkflowHtml(digest) {
  const setup = niftySetup(digest);
  const stages = [
    ["01", "Ingestion", `${digest.marketSnapshots.length} market snapshots and ${digest.news.length} source articles normalized.`, "ok"],
    ["02", "Clustering", `${digest.themes.length} narrative themes ranked by sentiment and entity weight.`, "ok"],
    ["03", "Scanner", setup ? `${setup.symbol} passed the 1:2 risk-reward gate.` : "No active setup after live quote validation.", setup ? "ok" : "blocked"],
    ["04", "Script", `${parseScriptSections(digest.teleprompterScript).length} teleprompter sections generated from source-backed facts.`, "ok"],
    ["05", "Asset", `${digest.asset.palette} prompt package with ${digest.asset.controlNetMode}.`, "ok"],
    ["06", "Publish", `${digest.status || "DRAFT"} briefing with NewsArticle schema and source links.`, digest.status === "PUBLISHED" ? "ok" : "warn"]
  ];
  return stages.map(([step, title, detail, state]) => `
    <article class="workflow-step ${escapeHtml(state)}">
      <span>${escapeHtml(step)}</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `).join("");
}

function scannerValidationHtml(digest) {
  const setup = niftySetup(digest) ?? digest.tradeSetups[0];
  if (!setup) {
    return `
      <div class="validation-list">
        ${validationRow("blocked", "Live validation blocked the trade setup", "The page no longer shows stale Nifty levels when live quotes have crossed target, stop, or invalidated the reward math.")}
        ${validationRow("warn", "Opening range required", "The next valid plan should be rebuilt only after price accepts a fresh level with clean risk placement.")}
        ${validationRow("ok", "Trade execution disabled", "Studio output remains educational research for video planning; no order placement is connected.")}
      </div>
    `;
  }
  return `
    <div class="validation-list">
      ${validationRow("ok", "Trend filter accepted", `${setup.symbol} price is aligned with the moving-average bias used by the scanner.`)}
      ${validationRow("ok", "Momentum filter accepted", "RSI-14 and volume conditions are strong enough for the setup candidate.")}
      ${validationRow("ok", "Risk-reward gate accepted", `Entry ${formatNumber(setup.entry)}, stop ${formatNumber(setup.stopLoss)}, target ${formatNumber(setup.target)} gives ${setup.riskReward}R.`)}
      ${validationRow("warn", "Manual confirmation still required", "Use the first-hour range and source context before recording a firm view.")}
    </div>
  `;
}

function validationRow(state, title, detail) {
  return `
    <div class="validation-row ${escapeHtml(state)}">
      <span class="validation-dot"></span>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
    </div>
  `;
}

function themeReviewHtml(digest) {
  return digest.themes.map((theme) => {
    const score = Number(theme.sentimentScore || 0);
    const width = Math.max(10, Math.min(100, Math.abs(score) * 100)).toFixed(1);
    return `
      <article class="theme-review-card">
        <div class="theme-review-top">
          <strong>${escapeHtml(theme.title)}</strong>
          <span>${escapeHtml(formatSignedScore(score))} / ${escapeHtml(theme.evidenceCount)} sources</span>
        </div>
        <div class="theme-bar" aria-label="${escapeHtml(theme.title)} sentiment strength">
          <i style="--theme-width: ${width}%; --theme-color: ${scoreColor(score)}"></i>
        </div>
      </article>
    `;
  }).join("");
}

function sourceQaHtml(digest) {
  return weightedSourceArticles(digest.news)
    .slice(0, 6)
    .map((article) => {
      const thumbnail = article.thumbnail || {};
      const accent = safeAccent(thumbnail.accent, Number(article.sentimentScore) >= 0 ? "#059669" : "#dc2626");
      return `
        <article class="source-qa-item">
          <div class="source-mini-thumb" style="--thumb-accent: ${accent}">${escapeHtml(thumbnail.label || article.entityName || "Macro")}</div>
          <div>
            <strong>${escapeHtml(article.headline)}</strong>
            <span>${escapeHtml(article.sourceName)} - ${escapeHtml(categoryLabel(article.category))} - weight ${escapeHtml(Math.abs(Number(article.sentimentScore) * Number(article.entityMatchScore)).toFixed(2))}</span>
          </div>
        </article>
      `;
    }).join("");
}

function weightedSourceArticles(articles) {
  return articles
    .slice()
    .sort((left, right) =>
      Math.abs(Number(right.sentimentScore) * Number(right.entityMatchScore)) -
      Math.abs(Number(left.sentimentScore) * Number(left.entityMatchScore))
    );
}

function publishingChecklistHtml(digest) {
  const hasSources = digest.news.every((article) => article.sourceUrl);
  const hasThumbnails = digest.news.every((article) => article.thumbnail?.alt);
  const hasDisclaimer = digest.teleprompterScript.includes("not investment advice");
  const setup = niftySetup(digest);
  const items = [
    ["Source attribution", hasSources, `${digest.news.length} articles retain publisher names and outbound links.`],
    ["Article thumbnails", hasThumbnails, `${digest.news.filter((article) => article.thumbnail?.alt).length} thumbnails render across public and studio views.`],
    ["Risk disclaimer", hasDisclaimer, "Teleprompter script includes the educational-use disclaimer."],
    ["Scanner discipline", true, setup ? `${setup.symbol} setup passed risk math.` : "No setup is published when live validation rejects the levels."],
    ["SEO metadata", true, "Daily page includes NewsArticle JSON-LD for the public archive."]
  ];
  return items.map(([label, ok, detail]) => `
    <li class="checklist-item">
      <strong>${ok ? "Ready" : "Needs Review"}: ${escapeHtml(label)}</strong>
      <span>${escapeHtml(detail)}</span>
    </li>
  `).join("");
}

function assetPromptDetailsHtml(asset) {
  const details = [
    ["Palette", asset.palette],
    ["Identity Ref", asset.referenceImageId],
    ["ControlNet", asset.controlNetMode],
    ["Output", asset.assetUrl]
  ];
  return details.map(([label, value]) => `
    <div class="prompt-detail">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");
}

function scriptSectionCardsHtml(digest) {
  return parseScriptSections(digest.teleprompterScript)
    .map((section) => `
      <article class="script-section-card">
        <strong>${escapeHtml(section.title)}</strong>
        <span>${escapeHtml(section.lines.length)} line${section.lines.length === 1 ? "" : "s"} ready for pacing</span>
      </article>
    `)
    .join("");
}

function parseScriptSections(script) {
  const sections = [];
  let current = null;
  for (const rawLine of String(script || "").split(/\n+/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const match = line.match(/^\[(.+)\]$/);
    if (match) {
      current = { title: match[1].replaceAll("_", " "), lines: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { title: "SCRIPT", lines: [] };
      sections.push(current);
    }
    current.lines.push(line);
  }
  return sections;
}

function scannerActivityLine(digest) {
  const setup = niftySetup(digest);
  if (!setup) {
    return "No active setup after live quote validation; stale levels are hidden from the studio.";
  }
  return `${setup.symbol} ${setup.direction.toLowerCase()} setup remains active at ${setup.riskReward}R.`;
}

function scoreColor(score) {
  if (score <= -0.2) {
    return "#dc2626";
  }
  if (score >= 0.2) {
    return "#059669";
  }
  return "#f59e0b";
}

function articleThumbnailHtml(article) {
  const thumbnail = article.thumbnail || {};
  const label = thumbnail.label || article.entityName || "Macro";
  const theme = thumbnail.theme || categoryLabel(article.category);
  const alt = thumbnail.alt || `${article.headline} thumbnail`;
  const accent = safeAccent(thumbnail.accent, Number(article.sentimentScore) >= 0 ? "#059669" : "#dc2626");
  return `
    <div class="source-thumb" role="img" aria-label="${escapeHtml(alt)}" style="--thumb-accent: ${accent}">
      <span>${escapeHtml(theme)}</span>
      <strong>${escapeHtml(label)}</strong>
    </div>
  `;
}

function safeAccent(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || "")) ? value : fallback;
}

function scannerCells(digest) {
  const setup = digest.tradeSetups.find((item) => item.symbol === "NIFTY") ?? digest.tradeSetups[0];
  if (!setup) {
    return `
      <div class="rr-grid">
        <div class="rr-cell"><span>Entry</span><strong>N/A</strong></div>
        <div class="rr-cell stop"><span>Stop Loss</span><strong>N/A</strong></div>
        <div class="rr-cell target"><span>Target</span><strong>N/A</strong></div>
      </div>
    `;
  }
  return `
    <div class="rr-grid">
      <div class="rr-cell"><span>Entry</span><strong>${formatNumber(setup.entry)}</strong></div>
      <div class="rr-cell stop"><span>Stop Loss</span><strong>${formatNumber(setup.stopLoss)}</strong></div>
      <div class="rr-cell target"><span>Target</span><strong>${formatNumber(setup.target)}</strong></div>
    </div>
  `;
}

function teleprompterHtml(digest) {
  const lines = digest.teleprompterScript
    .replaceAll("[OPENING]", "")
    .replaceAll("[GLOBAL CUES]", "")
    .replaceAll("[NARRATIVE THEMES]", "")
    .replaceAll("[NIFTY AND BANK NIFTY VIEW]", "")
    .replaceAll("[VALIDATED SETUPS]", "")
    .replaceAll("[RISK DISCLAIMER]", "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 14);
  return lines.map((line) => `${escapeHtml(line)}<br><br>`).join("");
}

function headlineSentiment(label) {
  return {
    BULLISH: "Cautious Bullish",
    BEARISH: "Risk-Off",
    VOLATILE: "Mixed",
    NEUTRAL: "Balanced"
  }[label] ?? label;
}

function marketSetupCopy(digest) {
  const setup = niftySetup(digest);
  if (!setup) {
    return "No 1:2 risk-reward setup has passed the scanner yet. Let the first hour define direction before taking a view.";
  }
  return `Today's global narrative is ${digest.sentimentLabel.toLowerCase()}, led by ${digest.themes[0]?.title?.toLowerCase() ?? "overnight cues"}. The Nifty setup is valid only if price accepts near ${formatNumber(setup.entry)}; invalidation sits at ${formatNumber(setup.stopLoss)}, target is ${formatNumber(setup.target)}, and the scanner confirms ${setup.riskReward}R.`;
}

function sentimentPinPosition(score) {
  return Math.max(5, Math.min(95, 50 + Number(score) * 45)).toFixed(1);
}

function newsToneClass(score) {
  if (score <= -0.2) {
    return "negative";
  }
  if (score >= 0.2) {
    return "positive";
  }
  return "neutral";
}

function newsBadgeLabel(item) {
  return (item.category ?? item.entityName ?? "Market")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function niftySetup(digest) {
  return digest.tradeSetups.find((item) => item.symbol === "NIFTY") ?? digest.tradeSetups[0] ?? null;
}

function formatChange(changePercent) {
  return `${changePercent >= 0 ? "+" : ""}${Number(changePercent).toFixed(2)}%`;
}

function formatSignedScore(score) {
  return `${score >= 0 ? "+" : ""}${Number(score).toFixed(2)}`;
}

function formatScheduledRun(digest) {
  if (!digest.scheduledFor) {
    return `${digest.digestDate} 08:30 IST`;
  }
  return digest.scheduledFor.replace("T", " ").replace(":00+05:30", " IST");
}

function formatGeneratedAt(value) {
  if (!value) {
    return "Awaiting generation";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Awaiting generation";
  }
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
