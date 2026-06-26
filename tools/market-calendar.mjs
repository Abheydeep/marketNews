import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const holidayPath = join(rootDir, "data", "market-calendar", "nse-holidays.json");
const overridePath = join(rootDir, "data", "market-calendar", "overrides.json");
const EXPECTED_2026_WEEKDAY_HOLIDAYS = 15;

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

  const weekendHoliday = loadWeekendHolidays(options.holidayFile).find((item) => item.date === value);
  if (weekendHoliday) {
    return {
      date: value,
      state: PUBLICATION_STATES.WEEKEND_CLOSED,
      isTradingSession: false,
      reason: weekendHoliday.name || "Weekend NSE holiday",
      source: "nse_weekend_holidays"
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

// A date we publish a public edition for: any trading day, plus weekday exchange holidays
// and Sundays (a plain "Market Update" piece). Saturdays and weekend NSE holidays stay closed.
export function isGeneralEditionDate(date, options = {}) {
  const cal = marketCalendarState(date, options);
  if (cal.isTradingSession) return true;
  if (cal.state === PUBLICATION_STATES.EXCHANGE_HOLIDAY) return true;
  return new Date(`${normalizeDate(date)}T12:00:00+05:30`).getDay() === 0;
}

// A publishable date that is NOT a trading session — render it as a general market update
// (no pre-market / opening-bell framing, no trade setups).
export function isMarketUpdateDate(date, options = {}) {
  return isGeneralEditionDate(date, options) && !marketCalendarState(date, options).isTradingSession;
}

export function todayInIst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function verifyCalendarData(options = {}) {
  const payload = loadHolidayPayload(options.holidayFile);
  const holidays = Array.isArray(payload.holidays) ? payload.holidays : [];
  const weekendHolidays = Array.isArray(payload.weekendHolidays) ? payload.weekendHolidays : [];
  const failures = [];
  if (payload.exchange !== "NSE") failures.push("exchange must be NSE");
  if (payload.segment !== "capital_market") failures.push("segment must be capital_market");
  if (payload.timezone !== "Asia/Kolkata") failures.push("timezone must be Asia/Kolkata");
  if (payload.sourceCircular !== "NSE/CMTR/71775") failures.push("sourceCircular must be NSE/CMTR/71775");
  if (Number(payload.year) !== 2026) failures.push("year must be 2026");
  if (holidays.length < EXPECTED_2026_WEEKDAY_HOLIDAYS) {
    failures.push(`expected at least ${EXPECTED_2026_WEEKDAY_HOLIDAYS} weekday holidays; found ${holidays.length}`);
  }
  for (const item of holidays) {
    if (!item.date || !item.name) {
      failures.push("weekday holiday entries need date and name");
      continue;
    }
    const day = dayOfWeek(item.date);
    if (day === 0 || day === 6) {
      failures.push(`${item.date} ${item.name} belongs in weekendHolidays, not holidays`);
    }
  }
  for (const item of weekendHolidays) {
    if (!item.date || !item.name) {
      failures.push("weekend holiday entries need date and name");
      continue;
    }
    const day = dayOfWeek(item.date);
    if (day !== 0 && day !== 6) {
      failures.push(`${item.date} ${item.name} belongs in holidays, not weekendHolidays`);
    }
  }
  if (failures.length) {
    throw new Error(`Market calendar verification failed:\n- ${failures.join("\n- ")}`);
  }
  return {
    exchange: payload.exchange,
    segment: payload.segment,
    year: payload.year,
    sourceCircular: payload.sourceCircular,
    weekdayHolidayCount: holidays.length,
    weekendHolidayCount: weekendHolidays.length
  };
}

function loadHolidayPayload(path = holidayPath) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadHolidays(path = holidayPath) {
  const payload = loadHolidayPayload(path);
  return Array.isArray(payload.holidays) ? payload.holidays : [];
}

function loadWeekendHolidays(path = holidayPath) {
  const payload = loadHolidayPayload(path);
  return Array.isArray(payload.weekendHolidays) ? payload.weekendHolidays : [];
}

function loadOverrides(path = overridePath) {
  const payload = JSON.parse(readFileSync(path, "utf8"));
  return Array.isArray(payload.overrides) ? payload.overrides : [];
}

function dayOfWeek(value) {
  return new Date(`${normalizeDate(value)}T12:00:00+05:30`).getDay();
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
    console.error("Live NSE calendar refresh is not implemented yet; use --verify to validate the pinned official calendar.");
    process.exit(1);
  }
  if (process.argv.includes("--verify")) {
    const verified = verifyCalendarData();
    process.stdout.write(
      `Market calendar verified for ${verified.exchange} ${verified.segment} ${verified.year}: ` +
      `${verified.weekdayHolidayCount} weekday holidays, ${verified.weekendHolidayCount} weekend holidays. ` +
      `${state.date} is ${state.state} (${state.reason}).\n`
    );
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
