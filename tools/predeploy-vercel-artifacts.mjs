import {
  assertOutput,
  assertOutputAbsent,
  assertOutputNot,
  assertOutputTree,
  assertOutputTreeNot,
  buildTarget,
  runPublicCopyQa
} from "./predeploy-artifact-assertions.mjs";

export function verifyVercelArtifacts() {
  buildTarget("public");
  assertOutput("deployment-manifest.json", /"target": "public"/);
  assertPublicHome();
  assertMultibagger();
  assertAboutAndSubscribe();
  assertDailyPages();
  runPublicCopyQa("public");
  assertOutputNot("index.html", /Admin login|admin\.marketnarrative\.in/);
  assertOutputAbsent("components/index.html");
  assertOutput("robots.txt", /Disallow: \/dark-preview\//);
  assertOutput("sitemap.xml", /<changefreq>daily<\/changefreq>/);
  assertOutput("sitemap.xml", /<priority>1\.0<\/priority>/);
}

function assertPublicHome() {
  assertOutput("index.html", /application\/ld\+json/);
  assertOutput("index.html", /BreadcrumbList/);
  assertOutput("index.html", /WebSite/);
  assertOutput("index.html", /max-image-preview:large/);
  assertOutput("index.html", /Recent briefings/);
  assertOutput("index.html", /archive-see-all/);
  assertOutput("index.html", /Join daily email/);
  assertOutput("index.html", /div class="digest-card/);
  assertOutput("index.html", /Open briefing/);
  assertOutput("index.html", /sentiment-sparkline/);
  assertOutput("index.html", /7:15 AM IST[\s\S]{0,120}(?:Nifty 50|Nifty)[\s\S]{0,120}Bank Nifty[\s\S]{0,120}(?:pre-market briefing|opening bias|traders)/);
  assertOutput("index.html", /By Abhey Deep \/ Market Narrative/);
  assertOutput("index.html", /Last updated/);
  assertOutput("index.html", /Daily trader workflow/);
  assertOutput("index.html", /Trading Guide/);
  assertOutput("index.html", /Share this archive/);
  assertOutput("index.html", /Today's briefing is live|Today's market update is live|Market closed today|Latest under verification|Latest verified trading-day edition/);
  assertOutputNot("index.html", /Daily Pre-Market Archive|All Market Narrative briefings|root page|now works|news archive|Open a dated briefing|full quote board|chart links|Asia watch:|markets tracked|\b\d+\s+setups\b|\b\d+\s+sources\b|Open daily briefing/);
}

function assertMultibagger() {
  assertOutput("multibagger/index.html", /Model status/);
  assertOutput("multibagger/index.html", /₹5 lakh public baseline/);
  assertOutput("multibagger/index.html", /Current value/);
  assertOutput("multibagger/index.html", /Public tracking active|₹5 lakh public baseline/);
  assertOutputNot("multibagger/index.html", /Baseline live/);
  assertOutput("multibagger/index.html", /Since entry \(04 May 2026, 02:12 pm\)/);
  assertOutput("multibagger/index.html", /How to read this page/);
  assertOutput("multibagger/index.html", /Start with the live model/);
  assertOutput("multibagger/index.html", /application\/ld\+json/);
  assertOutput("multibagger/index.html", /Research model started 27 Apr 2026/);
  assertOutput("multibagger/index.html", /Entries captured 04 May, 02:12 pm/);
  assertOutput("multibagger/index.html", /Latest quote refresh/);
  assertOutput("multibagger/index.html", /Share this public tracker/);
  assertOutput("multibagger/index.html", /₹5 lakh deployed/);
  assertOutput("multibagger/index.html", /Current price/);
  assertOutput("multibagger/index.html", /Entry timestamp/);
  assertOutput("multibagger/index.html", /Entry: 04 May 2026, 02:12 pm/);
  assertOutput("multibagger/index.html", /Quote timestamp/);
  assertOutput("multibagger/index.html", /Closest challenger/);
  assertOutput("multibagger/index.html", /High replacement pressure/);
  assertOutput("multibagger/index.html", /Not tips/);
  assertOutput("multibagger/index.html", /Cash conversion matters/);
  assertOutput("multibagger/index.html", /holding-card-grid/);
  assertOutput("multibagger/index.html", /Detailed Ledger/);
  assertOutput("multibagger/index.html", /Renewable execution/);
  assertOutput("multibagger/index.html", /Plain-English role legend/);
  assertOutput("multibagger/index.html", /holding-name-line/);
  assertOutputNot("multibagger/index.html", /<th>Plain-English Role<\/th>/);
  assertOutputNot("multibagger/index.html", /Since baseline date|Since model date|Last static update|pre-fill/);
  assertOutput("multibagger/index.html", /allocation-donut/);
  assertOutput("multibagger/index.html", /Holdings/);
  assertOutput("multibagger/index.html", />Screener<\/a>/);
  assertOutput("multibagger/index.html", /Weights are normalized to Rs 5 lakh/);
  assertOutput("multibagger/state.json", /"modelEntryDate": "2026-04-27"/);
  assertOutput("multibagger/state.json", /"trackingBasis"/);
  assertOutput("multibagger/state.json", /"publicFillBaselineAt": "2026-05-04T14:12:00\+05:30"/);
  assertOutput("multibagger/state.json", /"displayLabel": "Renewable execution"/);
  assertOutput("multibagger/state.json", /"replacementPressure": "High"/);
  assertOutput("multibagger/state.json", /"entryAt": "2026-05-04T14:12:00\+05:30"/);
  assertOutput("multibagger/state.json", /"entryPrice"/);
  assertOutput("multibagger/state.json", /"returnPercent"/);
  assertOutput("multibagger/state.json", /"currentModelValueInr"/);
}

function assertAboutAndSubscribe() {
  assertOutput("about/index.html", /About Market Narrative/);
  assertOutput("about/index.html", /Who is Abhey Deep/);
  assertOutput("about/index.html", /Why not just headlines/);
  assertOutput("about/index.html", /AboutPage/);
  assertOutput("about/index.html", /Person/);
  assertOutput("about/index.html", /aria-current="page">About/);
  assertOutput("about/index.html", /verified briefings published since launch/);
  assertOutput("about/index.html", /Browse the archive/);
  assertOutput("subscribe/index.html", /Subscribe \| Market Narrative/);
  assertOutput("subscribe/index.html", /Join daily email/);
  assertOutput("subscribe/index.html", /RegisterAction/);
  assertOutput("subscribe/index.html", /name="_honey"/);
  assertOutput("subscribe/index.html", /If you do not receive a confirmation email within a few minutes/);
  assertOutputNot("subscribe/index.html", /Request received\. Check your inbox/);
  assertOutputNot("subscribe/index.html", /name="_captcha" value="false"/);
}

function assertDailyPages() {
  assertOutput("4may2026/index.html", /2 Minute Summary/);
  assertOutput("4may2026/index.html", /Top Stories/);
  assertOutput("4may2026/index.html", /Full India-source gate:/);
  assertOutputNot("4may2026/index.html", /Opening Nerve|Stand-down trigger/);
  assertOutput("4may2026/trading-guide/index.html", /Trading Guide/);
  assertOutput("4may2026/trading-guide/index.html", /Opening Nerve/);
  assertOutput("4may2026/trading-guide/index.html", /Stand-down trigger/);
}
