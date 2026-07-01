import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const calendar = JSON.parse(readFileSync(join(rootDir, "data", "market-calendar", "nse-holidays.json"), "utf8"));
const closedDates = [...(calendar.holidays || []), ...(calendar.weekendHolidays || [])].map((item) => item.date);

const SESSION_WINDOWS = {
  NIFTY: [555, 930], BANKNIFTY: [555, 930], INDIAVIX: [555, 930], USDINR: [555, 1020],
  GIFTNIFTY: [390, 1410], NIKKEI: [330, 690], HSI: [390, 960], SHCOMP: [390, 900],
  KOSPI: [330, 690], TAIEX: [390, 810], STI: [390, 900], ASX200: [330, 720],
  SPX: [1140, 1590], NDX: [1140, 1590], DJI: [1140, 1590],
  BRENT: [330, 1410], DXY: [330, 1410], GOLD: [330, 1410]
};

function istDateParts(now) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

export function instrumentMarketState(symbol, now = new Date()) {
  const p = istDateParts(now);
  const iso = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  const weekday = new Date(`${iso}T12:00:00+05:30`).getDay();
  if (weekday === 0 || weekday === 6 || closedDates.includes(iso)) return "closed";
  const [open, close] = SESSION_WINDOWS[symbol] || [555, 930];
  const minute = p.hour * 60 + p.minute;
  const active = close > 1440 ? minute >= open || minute < close - 1440 : minute >= open && minute < close;
  return active ? "open" : "closed";
}

export function instrumentSessionClientHelpers() {
  return `const marketClosedDates = new Set(${JSON.stringify(closedDates)});
      const marketSessionWindows = ${JSON.stringify(SESSION_WINDOWS)};
      function marketStateForSymbol(symbol) {
        const now = new Date();
        const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now).filter(part => part.type !== "literal").map(part => [part.type, Number(part.value)]));
        const iso = parts.year + "-" + String(parts.month).padStart(2, "0") + "-" + String(parts.day).padStart(2, "0");
        const weekday = new Date(iso + "T12:00:00+05:30").getDay();
        if (weekday === 0 || weekday === 6 || marketClosedDates.has(iso)) return "closed";
        const window = marketSessionWindows[symbol] || [555, 930];
        const minute = parts.hour * 60 + parts.minute;
        const active = window[1] > 1440 ? minute >= window[0] || minute < window[1] - 1440 : minute >= window[0] && minute < window[1];
        return active ? "open" : "closed";
      }`;
}

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
