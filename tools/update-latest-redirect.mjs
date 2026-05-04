import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

export async function updateLatestRedirect(options = {}) {
  const date = options.date || readArg("--date") || todayInIst();
  const slug = slugForDate(date);
  const vercelPath = join(rootDir, "vercel.json");
  const config = JSON.parse(await readFile(vercelPath, "utf8"));
  const preserved = (config.redirects ?? []).filter((redirect) => !String(redirect.source ?? "").startsWith("/latest"));
  config.redirects = [
    { source: "/latest/", destination: `/${slug}/`, permanent: false },
    { source: "/latest", destination: `/${slug}/`, permanent: false },
    { source: "/latest/trading-guide/", destination: `/${slug}/trading-guide/`, permanent: false },
    { source: "/latest/trading-guide", destination: `/${slug}/trading-guide/`, permanent: false },
    ...preserved
  ];
  await writeFile(vercelPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return slug;
}

function slugForDate(date) {
  const [year, month, day] = String(date).split("-");
  const monthName = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][Number(month) - 1];
  if (!year || !monthName || !day) {
    throw new Error(`Cannot build latest redirect slug from date: ${date}`);
  }
  return `${Number(day)}${monthName}${year}`;
}

function todayInIst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  updateLatestRedirect()
    .then((slug) => process.stdout.write(`[latest-redirect] /latest/ -> /${slug}/\n`))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
