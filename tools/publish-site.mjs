import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const date = readArg("--date") ?? todayInIst();
const label = (readArg("--scheduled-time") ?? "08:30").replace(":", "");
const dailyDir = join(rootDir, "out", "daily");
const siteDir = join(rootDir, "out", "site");
const sourceHtml = join(dailyDir, `${date}-${label}-summary.html`);
const sourceJson = join(dailyDir, `${date}-${label}-digest.json`);

await mkdir(siteDir, { recursive: true });
await copyFile(sourceHtml, join(siteDir, "index.html"));
await copyFile(sourceJson, join(siteDir, "digest.json"));
await writeFile(join(siteDir, ".nojekyll"), "", "utf8");
await writeFile(
  join(siteDir, "README.txt"),
  [
    "Market Narrative static site export",
    `Source date: ${date}`,
    `Source run label: ${label}`,
    "Upload this folder to Netlify, Vercel, GitHub Pages, S3, or any static host.",
    ""
  ].join("\n"),
  "utf8"
);

process.stdout.write(`Static site ready: ${siteDir}\n`);
process.stdout.write(`Entry point: ${join(siteDir, "index.html")}\n`);

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
