import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const archiveDir = join(rootDir, "archive", "daily");
const siteDir = join(rootDir, "out", "site");
const siteOrigin = process.env.SITE_ORIGIN ?? "https://www.marketnarrative.in";

function esc(v) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function slugForDigest(d) {
  if (!d.digestDate) return "";
  const [y, m, day] = d.digestDate.split("-");
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  return `${parseInt(day, 10)}${months[parseInt(m, 10) - 1]}${y}`;
}

function sentimentClass(score) {
  if (score > 0.12) return "bull";
  if (score < -0.12) return "bear";
  return "neut";
}

function loadDigests() {
  const files = readdirSync(archiveDir)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}-\d{4}-digest\.json$/))
    .sort().reverse();
  return files.map(f => {
    try { return JSON.parse(readFileSync(join(archiveDir, f), "utf8")); }
    catch { return null; }
  }).filter(Boolean).filter(d => d.status === "PUBLISHED" && d.digestDate);
}

function cardHtml(d) {
  const slug = slugForDigest(d);
  const sc = sentimentClass(d.overallSentiment ?? 0);
  const driver = d.dailyLead?.label ?? "";
  const title = d.title ?? d.archiveSummary?.split(".")[0] ?? "";
  const summary = d.archiveSummary ?? "";
  const tags = [driver, d.sentimentLabel, d.dailyLead?.driverType].filter(Boolean).join("|").toLowerCase();
  const searchText = [title, summary, driver, d.digestDate].join(" ").toLowerCase();
  return `<article class="ac ${sc}" data-s="${esc(searchText)}" data-t="${esc(tags)}">
  <div class="ac-top">
    <span class="ac-date">${esc(fmtDate(d.digestDate))}</span>
    ${driver ? `<span class="ac-driver">${esc(driver)}</span>` : ""}
  </div>
  <h2 class="ac-title">${esc(title)}</h2>
  <p class="ac-summary">${esc(summary.substring(0, 160))}${summary.length > 160 ? "…" : ""}</p>
  <a class="ac-link" href="/${esc(slug)}/">Open briefing &rarr;</a>
</article>`;
}

function page(digests) {
  const cards = digests.map(cardHtml).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>All Past Briefings — Market Narrative</title>
<meta name="description" content="Full archive of Market Narrative daily pre-market briefings for Nifty, Bank Nifty, and India equity traders.">
<link rel="canonical" href="${esc(siteOrigin)}/archive/">
<link rel="icon" href="/favicon.ico">
<style>
:root{color-scheme:dark}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#020617;color:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;min-height:100vh;padding:0 0 48px}
.top-bar{background:rgba(15,23,42,.9);border-bottom:1px solid rgba(255,255,255,.08);padding:14px 20px;display:flex;align-items:center;gap:16px}
.top-bar a{color:#7cb4f5;text-decoration:none;font-size:14px}
.top-bar a:hover{text-decoration:underline}
.top-bar .brand{font-weight:700;color:#f8fafc;font-size:16px}
h1{padding:28px 20px 8px;font-size:26px;color:#f8fafc}
.meta{padding:0 20px 20px;color:#9fb0c8;font-size:13px}
.filters{display:flex;gap:10px;padding:0 20px 20px;flex-wrap:wrap}
.filters input,.filters select{background:rgba(15,23,42,.7);border:1px solid rgba(255,255,255,.13);border-radius:8px;color:#f1f5f9;font:inherit;font-size:14px;padding:8px 12px;min-height:40px}
.filters input{flex:1;min-width:200px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;padding:0 20px}
.ac{background:rgba(15,23,42,.6);border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px}
.ac.bull{border-left:3px solid #34d399}.ac.bear{border-left:3px solid #f87171}.ac.neut{border-left:3px solid #60a5fa}
.ac-top{display:flex;align-items:center;gap:8px}
.ac-date{color:#9fb0c8;font-size:12px}
.ac-driver{background:rgba(99,102,241,.18);color:#a5b4fc;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700}
.ac-title{font-size:15px;font-weight:700;color:#f8fafc;line-height:1.3}
.ac-summary{font-size:13px;color:#94a3b8;line-height:1.5;flex:1}
.ac-link{color:#7cb4f5;font-size:13px;text-decoration:none;margin-top:4px}
.ac-link:hover{text-decoration:underline}
.ac[hidden]{display:none}
#count{padding:0 20px 12px;color:#9fb0c8;font-size:13px}
</style>
</head>
<body>
<div class="top-bar">
  <span class="brand">Market Narrative</span>
  <a href="/">← Home</a>
  <a href="/latest/">Latest briefing</a>
</div>
<h1>All past briefings</h1>
<p class="meta">${esc(String(digests.length))} briefings · search or filter below</p>
<div class="filters">
  <input id="q" type="search" placeholder="Search by keyword, date, or sector…" autocomplete="off">
  <select id="tag">
    <option value="">All drivers</option>
    <option value="crude">Crude / Energy</option>
    <option value="banks">Banks</option>
    <option value="rates">Rates</option>
    <option value="tech">Tech</option>
    <option value="currency">Currency</option>
    <option value="geo">Geopolitical</option>
  </select>
</div>
<p id="count"></p>
<div class="grid" id="grid">${cards}</div>
<script>
const q=document.getElementById('q'),tag=document.getElementById('tag'),cnt=document.getElementById('count');
const cards=[...document.querySelectorAll('.ac')];
function filter(){
  const qv=q.value.trim().toLowerCase(),tv=tag.value;
  let n=0;
  cards.forEach(c=>{
    const ok=(!qv||c.dataset.s.includes(qv))&&(!tv||c.dataset.t.includes(tv));
    c.hidden=!ok; if(ok)n++;
  });
  cnt.textContent=n+' briefing'+(n===1?'':'s')+' shown';
}
q.addEventListener('input',filter);tag.addEventListener('change',filter);filter();
</script>
</body>
</html>`;
}

const digests = loadDigests();
mkdirSync(join(siteDir, "archive"), { recursive: true });
writeFileSync(join(siteDir, "archive", "index.html"), page(digests), "utf8");
console.log(`archive page written — ${digests.length} briefings`);
