import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const holidayPath = join(rootDir, "data", "market-calendar", "nse-holidays.json");
const overridePath = join(rootDir, "data", "market-calendar", "overrides.json");

export const PUBLICATION_STATES = Object.freeze({
  TRADING_DAY: "trading_day",
  WEEKEND_CLOSED: "weekend_closed",
  EXCHANGE_HOLIDAY: "exchange_holiday",
  SPECIAL_SESSION: "special_session",
  SOURCE_HOLD: "source_hold",
  QA_HOLD: "qa_hold"
});

export function marketCalendarState(date, options = {}) {
  const value = normalizeDate(date);
  const override = loadOverrides(options.overrideFile).find((item) => item.date === value);
  if (override) {
    return {
      date: value,
      state: override.state,
      isTradingSession: ["trading_day", "special_session"].includes(override.state),
      reason: override.name || override.note || "Manual calendar override",
      source: "manual_override"
    };
  }

  const holiday = loadHolidays(options.holidayFile).find((item) => item.date === value);
  if (holiday) {
    return {
      date: value,
      state: PUBLICATION_STATES.EXCHANGE_HOLIDAY,
      isTradingSession: false,
      reason: holiday.name || "NSE holiday",
      source: "nse_holidays"
    };
  }

  const day = new Date(`${value}T12:00:00+05:30`).getDay();
  if (day === 0 || day === 6) {
    return {
      date: value,
      state: PUBLICATION_STATES.WEEKEND_CLOSED,
      isTradingSession: false,
      reason: day === 6 ? "Saturday" : "Sunday",
      source: "weekend"
    };
  }

  return {
    date: value,
    state: PUBLICATION_STATES.TRADING_DAY,
    isTradingSession: true,
    reason: "Regular NSE trading day",
    source: "calendar"
  };
}

export function publicationStateForDate(date, options = {}) {
  const calendar = marketCalendarState(date, options);
  if (!calendar.isTradingSession) {
    return calendar;
  }
  if (options.qaHold) {
    return { ...calendar, state: PUBLICATION_STATES.QA_HOLD, isTradingSession: true, reason: options.qaReason || "QA hold" };
  }
  if (options.sourceHold) {
    return { ...calendar, state: PUBLICATION_STATES.SOURCE_HOLD, isTradingSession: true, reason: options.sourceReason || "Source verification hold" };
  }
  return calendar;
}

export function isTradingSessionDate(date, options = {}) {
  return marketCalendarState(date, options).isTradingSession;
}

export function todayInIst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function loadHolidays(path = holidayPath) {
  const payload = JSON.parse(readFileSync(path, "utf8"));
  return Array.isArray(payload.holidays) ? payload.holidays : [];
}

function loadOverrides(path = overridePath) {
  const payload = JSON.parse(readFileSync(path, "utf8"));
  return Array.isArray(payload.overrides) ? payload.overrides : [];
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`Invalid market calendar date: ${text || "(empty)"}`);
  }
  return text;
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : process.argv[index + 1];
}

async function main() {
  const date = readArg("--date") || todayInIst();
  const state = marketCalendarState(date);
  if (process.argv.includes("--refresh")) {
    process.stdout.write(`Market calendar files present for ${state.date}: ${state.state}\n`);
    return;
  }
  if (process.argv.includes("--assert-trading-day") || process.argv.includes("--assert-next-ist-trading-day")) {
    if (!state.isTradingSession) {
      console.error(`${state.date} is ${state.state}: ${state.reason}`);
      process.exit(1);
    }
    process.stdout.write(`${state.date} is a trading session: ${state.state}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
