import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const calendar = JSON.parse(readFileSync(join(rootDir, "data", "market-calendar", "nse-holidays.json"), "utf8"));
const closedDates = [...(calendar.holidays || []), ...(calendar.weekendHolidays || [])].map((item) => item.date);

export function marketSessionClientScript({ clockId, statusId }) {
  return `<script>
  (() => {
    const closedDates = new Set(${JSON.stringify(closedDates)});
    const pad = (n) => String(n).padStart(2, "0");
    const istParts = () => Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date()).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    function updateSession() {
      const clock = document.getElementById(${JSON.stringify(clockId)});
      const status = document.getElementById(${JSON.stringify(statusId)});
      if (!clock || !status) return;
      const p = istParts();
      const iso = pad(p.year) + "-" + pad(p.month) + "-" + pad(p.day);
      const weekday = new Date(iso + "T12:00:00+05:30").getDay();
      if (weekday === 0 || weekday === 6 || closedDates.has(iso)) {
        status.textContent = "NSE cash market closed";
        clock.textContent = closedDates.has(iso) ? "Exchange holiday" : "Weekend";
        return;
      }
      const seconds = p.hour * 3600 + p.minute * 60 + p.second;
      const open = 9 * 3600 + 15 * 60;
      const close = 15 * 3600 + 30 * 60;
      if (seconds >= close) { status.textContent = "NSE cash market closed"; clock.textContent = "15:30 IST close"; return; }
      if (seconds >= open) { status.textContent = "NSE cash market open"; clock.textContent = "Open now"; return; }
      const remaining = open - seconds;
      clock.textContent = pad(Math.floor(remaining / 3600)) + ":" + pad(Math.floor((remaining % 3600) / 60)) + ":" + pad(remaining % 60);
      status.textContent = seconds >= 9 * 3600 ? "NSE pre-open in progress" : "NSE cash market opens at 09:15 IST";
    }
    updateSession();
    window.setInterval(updateSession, 1000);
  })();
  </script>`;
}
