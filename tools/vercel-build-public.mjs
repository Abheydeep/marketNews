import { spawnSync } from "node:child_process";

const parts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).formatToParts(new Date());
const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
const date = `${byType.year}-${byType.month}-${byType.day}`;

run("npm", ["run", "daily:generate", "--", "--date", date, "--scheduled-time", "08:30", "--market-data", process.env.MARKET_DATA_MODE ?? "live"]);
run("npm", ["run", "site:publish", "--", "--date", date, "--scheduled-time", "08:30"]);

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
