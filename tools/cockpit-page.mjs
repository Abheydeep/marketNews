import { newsArticleJsonLd } from "./core.mjs";

export function cockpitPage(digest, initialTab = "public-view") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

    .run-meta {
      display: inline-flex;
      margin-bottom: 14px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      padding: 7px 10px;
      color: #57534e;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 13px;
      font-weight: 700;
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

    .scanner-height {
      height: 260px;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }

    .live-board-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin: 18px 0 12px;
    }

    .live-board-header h3 {
      margin: 0;
      color: #334155;
      font-size: 15px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .live-clock {
      color: #78716c;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      font-weight: 800;
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
      overflow: hidden;
    }

    .tradingview-widget-container,
    .tradingview-widget-container__widget {
      width: 100%;
      height: 100%;
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

    .chart-fallback a,
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
      min-height: 210px;
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
      transform: translateY(100%);
      animation: scrollText 20s linear infinite;
      animation-play-state: paused;
    }

    .teleprompter-view.playing .teleprompter-text {
      animation-play-state: running;
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
      .setup-grid,
      .setup-levels,
      .summary-strip,
      .briefing-grid,
      .arch-grid {
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

      .live-board-header {
        align-items: start;
        flex-direction: column;
        gap: 6px;
      }

      .live-board-header h3 {
        letter-spacing: 0.03em;
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
              <div class="run-meta">Scheduled run: ${escapeHtml(formatScheduledRun(digest))}</div>
            </div>
            <div class="briefing-date">
              <span>Daily Briefing</span>
              <strong>${escapeHtml(formatDigestDate(digest.digestDate))}</strong>
            </div>
          </div>
          <h1>${escapeHtml(digest.title)}</h1>
          <p>${escapeHtml(publicSummaryLead(digest))}</p>
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
          <div class="live-board-header">
            <h3>Real Quote Board</h3>
            <span id="liveClock" class="live-clock">Preparing quotes...</span>
          </div>
          <div class="regional-breadth">
            ${regionalBreadthHtml(digest)}
          </div>
          <div id="indexBoard" aria-label="Clickable live index quotes"></div>
        </section>

        ${algorithmicSetupHtml(digest)}

        <section class="panel market-chart-panel">
          <h2>Latest Market Dashboard</h2>
          <div class="chart-container">
            <canvas id="overnightChart" aria-label="Overnight global indices chart"></canvas>
          </div>
        </section>

        <section class="sources-section">
          <div class="section-kicker">
            <h2>Macro Incremental Sources</h2>
          </div>
          <div class="news-card-list">
            ${digest.news.slice(0, 4).map((item) => `
              <article class="info-card source-card">
                <div class="source-card-header">
                  <span class="news-badge ${newsToneClass(item.sentimentScore)}">${escapeHtml(newsBadgeLabel(item))}</span>
                  <span class="source-name">Source: ${escapeHtml(item.sourceName)}</span>
                </div>
                <h3>${escapeHtml(item.headline)}</h3>
                <p>${escapeHtml(item.summary)}</p>
                <a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">Read source &#8599;</a>
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
          <a id="openFullChart" class="chart-link-btn" href="https://www.tradingview.com/markets/indices/" target="_blank" rel="noreferrer">Open Full Chart</a>
          <button id="closeIndexChart" class="icon-btn" type="button" aria-label="Close index chart">&times;</button>
        </div>
        <div class="modal-chart-container">
          <div id="tradingViewChart" class="tradingview-widget-container" aria-label="Selected real market chart"></div>
          <div id="chartFallback" class="chart-fallback" aria-hidden="true">
            <div>
              <h3>Chart Preview Is Loading</h3>
              <p>If the embedded widget is blocked by the browser, use the full chart link for the live TradingView view.</p>
              <a id="fallbackChartLink" href="https://www.tradingview.com/markets/indices/" target="_blank" rel="noreferrer">Open Full Chart</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section id="studio-view" class="tab-content hidden">
      <header class="studio-header">
        <div>
          <h1>Studio Command Center</h1>
          <p>Admin restricted view. Automates research, scripting, and visual asset generation for daily videos based on algorithmic 1:2 Risk-Reward filtering.</p>
        </div>
        <div class="status-pill">Status: <strong>&#9679; APIs Connected</strong></div>
      </header>

      <div class="grid-two">
        <section class="panel">
          <div class="panel-title-row">
            <h2>&#128187; Technical Setup Scanner</h2>
            <span class="valid-badge">1:2 R:R Validated</span>
          </div>
          <p class="muted-copy">Scanning historical Nifty 50 data. Algorithms have flagged a valid swing setup meeting strict risk parameters.</p>
          <div class="chart-container scanner-height">
            <canvas id="scannerChart" aria-label="Technical scanner setup chart"></canvas>
          </div>
          ${scannerCells(digest)}
        </section>

        <section class="panel asset-panel">
          <h2>&#127912; AI Asset Pipeline</h2>
          <p class="muted-copy">Identity-locked image generation based on overnight sentiment score (${escapeHtml(digest.sentimentLabel)} = sentiment-aware palette).</p>
          <div class="prompt-box">Prompt: ${escapeHtml(digest.asset.positivePrompt)}</div>
          <button id="generateAssetBtn" class="primary-btn">Generate Daily Thumbnail</button>
          <div class="loader-track">
            <div id="assetLoader" class="loader-bar"></div>
          </div>
          <div id="assetOutput" class="asset-output">
            <span id="assetPlaceholderText">Awaiting Generation...</span>
            <canvas id="aiCanvas" aria-label="Generated thumbnail preview"></canvas>
          </div>
        </section>
      </div>

      <section class="panel teleprompter-shell">
        <div class="teleprompter-header">
          <h2>&#128249; Teleprompter UI (Studio Mode)</h2>
          <button id="togglePrompterBtn" class="dark-btn">&#9654; Play Script</button>
        </div>
        <p class="muted-copy">Clean formatting, pacing-optimized, derived from scanner and digest data.</p>
        <div id="teleprompterContainer" class="teleprompter-view">
          <div class="read-line"><span>Read Here</span></div>
          <div class="teleprompter-text">${teleprompterHtml(digest)}</div>
        </div>
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
      bindAssetGeneration();
      initLiveIndexBoard();
    });

    function drawOvernightChart() {
      const digest = window.__DIGEST__;
      const canvas = document.getElementById('overnightChart');
      if (!canvas) return;
      const source = window.__PUBLISHED_QUOTES__ ?? digest.marketSnapshots;
      const data = source
        .map((item) => ({ label: compactMarketLabel(item), value: Number(item.changePercent) }));
      drawBarChart(canvas, data);
    }

    function initLiveIndexBoard() {
      window.__PUBLISHED_QUOTES__ = window.__DIGEST__.marketSnapshots;
      renderIndexBoard();
      updateLiveClock();
      bindIndexModal();
      setInterval(refreshPublishedDigest, 60_000);
    }

    function renderIndexBoard() {
      const board = document.getElementById('indexBoard');
      if (!board || !window.__PUBLISHED_QUOTES__) return;
      const grouped = groupQuotesByRegion(window.__PUBLISHED_QUOTES__);
      board.innerHTML = regionOrder().filter((region) => grouped.has(region)).map((region) => {
        const quotes = grouped.get(region);
        return '<section class="quote-region">' +
          '<div class="quote-region-head"><h3>' + escapeClientHtml(region) + '</h3><span>' + regionSummary(quotes) + '</span></div>' +
          '<div class="index-grid">' + quotes.map((quote) => quoteTileHtml(quote)).join('') + '</div>' +
        '</section>';
      }).join('');
      board.querySelectorAll('.index-tile').forEach((tile) => {
        tile.addEventListener('click', () => openIndexChart(tile.dataset.symbol));
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
        '<div class="name">' + escapeClientHtml(quote.name) + '</div>' +
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

    function regionSummary(quotes) {
      const positives = quotes.filter((quote) => Number(quote.changePercent) >= 0).length;
      const average = quotes.reduce((sum, quote) => sum + Number(quote.changePercent || 0), 0) / Math.max(1, quotes.length);
      return positives + '/' + quotes.length + ' higher - avg ' + formatClientChange(average);
    }

    async function refreshPublishedDigest() {
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
        updateLiveClock();
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
      title.textContent = quote.name + ' (' + quote.symbol + ')';
      meta.textContent = status.open
        ? 'Real TradingView chart. The quote board updates when the scheduled publisher refreshes digest.json.'
        : 'Market closed. Opening the latest real TradingView chart for review.';
      setChartLinks(quote);
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      loadTradingViewChart(quote);
    }

    function closeIndexChart() {
      const modal = document.getElementById('indexChartModal');
      if (!modal) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      window.__ACTIVE_INDEX_SYMBOL__ = null;
      const container = document.getElementById('tradingViewChart');
      if (container) {
        container.innerHTML = '';
      }
      const fallback = document.getElementById('chartFallback');
      if (fallback) {
        fallback.classList.remove('visible');
        fallback.setAttribute('aria-hidden', 'true');
      }
    }

    function loadTradingViewChart(quote) {
      const container = document.getElementById('tradingViewChart');
      if (!container) return;
      const fallback = document.getElementById('chartFallback');
      if (fallback) {
        fallback.classList.remove('visible');
        fallback.setAttribute('aria-hidden', 'true');
      }
      container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: quote.tradingViewSymbol || fallbackTradingViewSymbol(quote.symbol),
        interval: '5',
        timezone: 'exchange',
        theme: 'light',
        style: '1',
        locale: 'en',
        allow_symbol_change: true,
        withdateranges: true,
        details: true,
        hide_side_toolbar: false,
        calendar: false,
        support_host: 'https://www.tradingview.com'
      });
      script.onerror = () => showChartFallback();
      container.appendChild(script);
      setTimeout(() => {
        if (!container.querySelector('iframe')) {
          showChartFallback();
        }
      }, 3500);
    }

    function setChartLinks(quote) {
      const url = tradingViewUrl(quote);
      const open = document.getElementById('openFullChart');
      const fallback = document.getElementById('fallbackChartLink');
      if (open) open.href = url;
      if (fallback) fallback.href = url;
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
      drawLineChart(canvas, setup);
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
      button.addEventListener('click', () => {
        playing = !playing;
        container.classList.toggle('playing', playing);
        button.classList.toggle('playing', playing);
        button.innerHTML = playing ? '&#10074;&#10074; Pause Script' : '&#9654; Play Script';
      });
    }

    function bindAssetGeneration() {
      const button = document.getElementById('generateAssetBtn');
      const loader = document.getElementById('assetLoader');
      const canvas = document.getElementById('aiCanvas');
      const placeholder = document.getElementById('assetPlaceholderText');
      if (!button || !loader || !canvas || !placeholder) return;

      button.addEventListener('click', () => {
        button.disabled = true;
        button.textContent = 'Processing via Pipeline...';
        loader.style.width = '100%';

        setTimeout(() => {
          const { ctx, width, height } = scaleCanvas(canvas);
          const gradient = ctx.createLinearGradient(0, 0, width, height);
          gradient.addColorStop(0, window.__DIGEST__.sentimentLabel === 'BULLISH' ? '#064e3b' : '#7f1d1d');
          gradient.addColorStop(1, '#020617');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);

          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(0, height * 0.85);
          ctx.lineTo(width * 0.3, height * 0.55);
          ctx.lineTo(width * 0.6, height * 0.72);
          ctx.lineTo(width, height * 0.25);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 24px Arial';
          ctx.fillText('MARKET OPEN', 22, 42);
          ctx.fillStyle = '#fbbf24';
          ctx.font = '16px Arial';
          ctx.fillText('1:2 RR SETUP READY', 22, 68);

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

    window.addEventListener('resize', () => {
      drawOvernightChart();
      drawScannerChart();
    });
  </script>
</body>
</html>`;
}

function executiveSummaryHtml(digest) {
  const usLine = formatSnapshotLine(snapshotsForRegion(digest, "US Overnight"));
  const asiaLine = formatSnapshotLine(snapshotsForRegion(digest, "Asia Watch"));
  const indiaLine = formatSnapshotLine(snapshotsForRegion(digest, "India Open"));
  const macroLine = formatSnapshotLine(snapshotsForRegion(digest, "Macro Hedges"));
  const primaryTheme = digest.themes[0];
  const secondaryTheme = digest.themes[1];
  const setup = niftySetup(digest);
  const setupText = setup
    ? `The Nifty scanner is tracking ${setup.direction.toLowerCase()} acceptance near ${formatNumber(setup.entry)}, with invalidation at ${formatNumber(setup.stopLoss)} and target at ${formatNumber(setup.target)}. The setup only remains valid while the ${setup.riskReward}R structure is intact.`
    : "The scanner has not accepted a 1:2 risk-reward setup yet, so the first hour should define the actionable levels.";

  const paragraphs = [
    {
      label: "Global Markets & Overnight Pulse",
      text: `The ${formatScheduledRun(digest)} digest is ${digest.sentimentLabel.toLowerCase()}. US overnight cues: ${usLine || "awaiting quote refresh"}. Asia watch: ${asiaLine || "awaiting quote refresh"}. Macro hedges: ${macroLine || "awaiting quote refresh"}.`
    },
    {
      label: "India Read-Through",
      text: `${indiaLine ? `Domestic dashboard: ${indiaLine}. ` : ""}${primaryTheme?.summary ?? "The market narrative is still forming from overnight cues."}${secondaryTheme ? ` ${secondaryTheme.summary}` : ""}`
    },
    {
      label: "Domestic Setup & Risk Discipline",
      text: `${setupText} This is educational market research for content planning, not investment advice.`
    }
  ];

  return paragraphs
    .map((paragraph) => `<p><strong>${escapeHtml(paragraph.label)}:</strong> ${escapeHtml(paragraph.text)}</p>`)
    .join("");
}

function regionalBreadthHtml(digest) {
  return ["US Overnight", "Asia Watch", "India Open", "Macro Hedges"]
    .map((region) => {
      const snapshots = snapshotsForRegion(digest, region);
      if (!snapshots.length) {
        return "";
      }
      const positives = snapshots.filter((snapshot) => Number(snapshot.changePercent) >= 0).length;
      const average = snapshots.reduce((sum, snapshot) => sum + Number(snapshot.changePercent || 0), 0) / snapshots.length;
      const strongest = snapshots
        .slice()
        .sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent))[0];
      return `
        <div class="breadth-card">
          <span>${escapeHtml(region)}</span>
          <strong>${positives}/${snapshots.length} higher - ${formatChange(average)} avg</strong>
          <small>Largest move: ${escapeHtml(strongest.name)} ${formatChange(strongest.changePercent)}</small>
        </div>
      `;
    })
    .join("");
}

function snapshotsForRegion(digest, region) {
  return digest.marketSnapshots.filter((snapshot) => (snapshot.marketRegion || regionForSnapshot(snapshot)) === region);
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

function algorithmicSetupHtml(digest) {
  const setup = niftySetup(digest);
  if (!setup) {
    return `
      <section class="info-card setup-card">
        <div class="setup-card-header">
          <h2>Nifty 50 Algorithmic Setup</h2>
          <span class="setup-badge">No setup yet</span>
        </div>
        <p class="strategy-note">No 1:2 risk-reward setup has passed the scanner. Let the opening range define the next valid level.</p>
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

function publicSummaryLead(digest) {
  const worstTheme = digest.themes[0]?.title ?? "mixed global cues";
  const setupSymbols = digest.tradeSetups.map((setup) => setup.symbol).join(" and ");
  const asia = snapshotsForRegion(digest, "Asia Watch");
  const asiaHigher = asia.filter((snapshot) => Number(snapshot.changePercent) >= 0).length;
  const asiaRead = asia.length ? ` Asian markets show ${asiaHigher} of ${asia.length} tracked indices higher.` : "";
  return `The 8:30 AM IST digest is ${digest.sentimentLabel.toLowerCase()} after ${worstTheme.toLowerCase()}.${asiaRead} The scanner found ${digest.tradeSetups.length} validated setup${digest.tradeSetups.length === 1 ? "" : "s"}${setupSymbols ? ` across ${setupSymbols}` : ""}.`;
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
