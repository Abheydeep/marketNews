import { pathToFileURL } from "node:url";
import { log } from "./logger.mjs";

export async function updateLatestRedirect(options = {}) {
  const date = options.date || readArg("--date") || todayInIst();
  return slugForDate(date);
}

function slugForDate(date) {
  const value = String(date);
  if (String(process.env.PUBLIC_SLUG_FORMAT ?? "compact").toLowerCase() === "iso" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const [year, month, day] = value.split("-");
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
    .then((slug) => log.info(`[latest-redirect] /latest/ -> /${slug}/`))
    .catch((error) => {
      log.error("Failed to update latest redirect", { error: error.message });
      process.exitCode = 1;
    });
}
