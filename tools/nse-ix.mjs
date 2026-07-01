import { log } from "./logger.mjs";
import { fetchWithRetry } from "./http.mjs";

const MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

function parseExpiryDate(expiryStr) {
  if (!expiryStr) return 0;
  const parts = expiryStr.split("-");
  if (parts.length !== 3) return 0;
  const day = Number(parts[0]);
  const month = MONTHS[parts[1]];
  const year = Number(parts[2]);
  if (Number.isNaN(day) || month === undefined || Number.isNaN(year)) return 0;
  return new Date(Date.UTC(year, month, day, 23, 59, 59)).getTime();
}

function parseTimestamp(timestampStr) {
  if (!timestampStr) return Date.now();
  const parts = timestampStr.split(" ");
  if (parts.length < 2) return Date.now();
  const dateParts = parts[0].split("-");
  const timeParts = parts[1].split(":");
  if (dateParts.length !== 3 || timeParts.length < 2) return Date.now();
  const day = Number(dateParts[0]);
  const month = MONTHS[dateParts[1]];
  const year = Number(dateParts[2]);
  const hours = Number(timeParts[0]);
  const minutes = Number(timeParts[1]);
  const seconds = timeParts[2] ? Number(timeParts[2]) : 0;
  if (Number.isNaN(day) || month === undefined || Number.isNaN(year)) return Date.now();
  
  // Parse as IST (UTC +5:30)
  const dateObj = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  return dateObj.getTime() - (330 * 60 * 1000);
}

/**
 * Fetch live GIFT Nifty derivatives quote data from NSE IX (formerly NSE IFSC).
 * Returns a normalized Yahoo-compatible MarketSnapshot or null on failure.
 * @returns {Promise<object | null>}
 */
export async function fetchGiftNiftySnapshot({ timeoutMs = 6000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const url = "https://www.nseix.com/api/derivatives-watch?inst_type1=IDX&inst_type2=STK&type=live";
    const headers = {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Referer": "https://www.nseix.com/",
      "Origin": "https://www.nseix.com"
    };

    const res = await fetchWithRetry(url, { signal: controller.signal, headers });
    clearTimeout(timer);
    
    if (!res.ok) {
      log.warn("fetchGiftNiftySnapshot: request failed", { status: res.status, statusText: res.statusText });
      return null;
    }

    const payload = await res.json();
    if (!payload || !Array.isArray(payload.data) || payload.data.length === 0) {
      log.warn("fetchGiftNiftySnapshot: empty or malformed data payload");
      return null;
    }

    // Filter Nifty Index Futures
    const contracts = payload.data.filter(
      (item) => item.SYMBOL === "NIFTY" && item.INSTRUMENTTYPE === "FUTIDX"
    );

    if (contracts.length === 0) {
      log.warn("fetchGiftNiftySnapshot: no active Nifty Index Futures contracts found");
      return null;
    }

    // Sort by Expiry Date ascending to find the near-month (most active) contract
    contracts.sort((a, b) => {
      const expA = parseExpiryDate(a.EXPIRYDATE);
      const expB = parseExpiryDate(b.EXPIRYDATE);
      return expA - expB;
    });

    const activeContract = contracts[0];
    const lastPrice = Number(activeContract.LASTPRICE);
    const change = Number(activeContract.CHANGE);
    const pctChange = Number(activeContract.PERCHANGE);
    const timestampMs = parseTimestamp(activeContract.TIMESTMP);
    
    if (Number.isNaN(lastPrice)) {
      log.warn("fetchGiftNiftySnapshot: invalid LASTPRICE in active contract");
      return null;
    }

    // Official close in derivatives is stored under CLOSE.
    // If CLOSE is missing or 0, fallback to LASTPRICE - CHANGE.
    const close = Number(activeContract.CLOSE);
    const prevClose = (Number.isFinite(close) && close > 0) ? close : (lastPrice - change);
    
    const startOfDayMs = timestampMs - (8 * 60 * 60 * 1000); // approximate start of session (8 hours prior)

    return {
      symbol: "GIFTNIFTY",
      name: "GIFT Nifty",
      closeValue: lastPrice,
      previousClose: prevClose,
      changePercent: Number.isFinite(pctChange) ? pctChange : (change / prevClose) * 100,
      dataTimestamp: new Date(timestampMs).toISOString(),
      chartPoints: [
        { time: new Date(startOfDayMs).toISOString(), close: prevClose },
        { time: new Date(timestampMs).toISOString(), close: lastPrice }
      ],
      source: "NSE IFSC", // matching existing 'NSE IFSC (seed reference)' identifier format
      marketRegion: "India Open",
      session: "india",
      dataQuality: "live"
    };

  } catch (err) {
    clearTimeout(timer);
    log.error("fetchGiftNiftySnapshot: error during data fetch", { error: err.message });
    return null;
  }
}
