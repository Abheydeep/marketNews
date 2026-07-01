import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SECTION_CARDS = {
  home: ["Market Narrative", "Indian markets before the open"],
  archive: ["Briefing Archive", "Past market narratives and source-backed context"],
  indices: ["Global Indices Watch", "India, Asia, US and macro context"],
  "fii-dii": ["FII/DII Money Flow", "Institutional cash and futures positioning"],
  statistics: ["Market Statistics", "Participation, volatility and trend health"],
  moves: ["Market Moves", "What moved and why it matters for India"],
  portfolio: ["Multibagger Model Tracker", "Public research portfolio and review discipline"],
  about: ["About Market Narrative", "Source-backed pre-market intelligence"],
  subscribe: ["The Daily Briefing", "Delivered before the Indian cash open"],
  briefing: ["Daily Pre-Market Briefing", "The overnight story and India read-through"],
  guide: ["Trading Guide", "Conditional levels and confirmation checks"]
};

export async function generateSocialCards(outputDir, editions = []) {
  await mkdir(outputDir, { recursive: true });
  const cards = Object.entries(SECTION_CARDS).map(([file, [title, subtitle]]) => ({ file, title, subtitle }));
  for (const edition of editions) {
    cards.push(
      { file: `briefing-${edition.slug}`, title: edition.title, subtitle: `${edition.date} · Daily pre-market briefing` },
      { file: `guide-${edition.slug}`, title: `Trading Guide: ${edition.title}`, subtitle: `${edition.date} · Conditional market plan` }
    );
  }
  await Promise.all(cards.map(async ({ file, title, subtitle }) => {
    const png = await sharp(Buffer.from(cardSvg(title, subtitle))).png().toBuffer();
    await writeFile(join(outputDir, `${file}.png`), png);
  }));
  return cards.map(({ file }) => `${file}.png`);
}

function cardSvg(title, subtitle) {
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#050816"/><stop offset="1" stop-color="#101b31"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#22d3ee" stop-opacity=".3"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1040" cy="80" r="360" fill="url(#glow)"/>
  <rect x="62" y="62" width="1076" height="506" rx="28" fill="#ffffff" fill-opacity=".035" stroke="#ffffff" stroke-opacity=".12"/>
  <g font-family="Inter,Arial,sans-serif">
    <text x="104" y="137" fill="#67e8f9" font-size="24" font-weight="800" letter-spacing="3">MARKET NARRATIVE</text>
    ${titleLines(title).map((line, index) => `<text x="104" y="${258 + index * 76}" fill="#f8fafc" font-size="62" font-weight="850">${escapeXml(line)}</text>`).join("")}
    <text x="104" y="468" fill="#b8c4d8" font-size="28">${escapeXml(trim(subtitle, 68))}</text>
    <text x="104" y="526" fill="#94a3b8" font-size="20">marketnarrative.in · Educational market research</text>
  </g>
  </svg>`;
}

function titleLines(value) {
  const words = String(value || "Market Narrative").split(/\s+/);
  const lines = [""];
  for (const word of words) {
    const next = `${lines.at(-1)} ${word}`.trim();
    if (next.length > 31 && lines.length < 2) lines.push(word);
    else lines[lines.length - 1] = next;
  }
  return lines.map((line) => trim(line, 38));
}

function trim(value, length) {
  const text = String(value || "");
  return text.length <= length ? text : `${text.slice(0, length - 1).trim()}…`;
}

function escapeXml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
}
