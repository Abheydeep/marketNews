import { log } from "./logger.mjs";

const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Perform a fetch with built-in retries, timeout, and custom user-agent.
 * @param {string} url
 * @param {object} options
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}) {
  const timeoutMs = options.timeoutMs || 8000;
  const retries = options.retries ?? 2;
  const signal = options.signal || AbortSignal.timeout(timeoutMs);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  
  const headers = {
    "User-Agent": DEFAULT_UA,
    ...options.headers
  };

  const finalOptions = {
    ...options,
    headers,
    signal
  };
  delete finalOptions.timeoutMs;
  delete finalOptions.retries;
  delete finalOptions.fetchImpl;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const res = await fetchImpl(url, finalOptions);
      const retryable = res.status === 429 || res.status >= 500;
      if (res.ok || !retryable || attempt === retries + 1) {
        return res;
      }
      log.warn(`HTTP request attempt ${attempt} failed with status ${res.status}`, { url });
    } catch (err) {
      if (attempt === retries + 1) {
        log.error(`HTTP request failed after ${attempt} attempts`, { url, error: err.message });
        throw err;
      }
      log.warn(`HTTP request attempt ${attempt} failed with error ${err.message}`, { url });
    }
    // Simple backoff delay before retry (100ms)
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Fetch and parse JSON payload.
 * @param {string} url
 * @param {object} options
 * @returns {Promise<any>}
 */
export async function fetchJson(url, options = {}) {
  const res = await fetchWithRetry(url, options);
  if (!res.ok) {
    throw new Error(`HTTP error status ${res.status} for ${url}`);
  }
  return res.json();
}

/**
 * Query Yahoo Finance Chart API.
 * @param {string} yahooSymbol
 * @param {string} range
 * @param {string} interval
 * @param {number} timeoutMs
 * @returns {Promise<any>}
 */
export async function fetchYahooChart(yahooSymbol, range = "5d", interval = "15m", timeoutMs = 8000) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}`;
  return fetchJson(url, {
    timeoutMs,
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 MarketNarrativeStoryboardEngine/0.1"
    }
  });
}

/**
 * Scrape or request NSE India JSON endpoint (cookie/pre-flight seeded).
 * @param {string} url
 * @param {object} options
 * @returns {Promise<any>}
 */
export async function fetchNseJson(url, options = {}) {
  const timeoutMs = options.timeoutMs || 8000;
  
  // 1. Initial cookie seed request to landing page
  const cookieRes = await fetchWithRetry("https://www.nseindia.com/reports/fii-dii", {
    timeoutMs,
    headers: {
      Accept: "text/html"
    }
  });
  
  const rawCookie = (cookieRes.headers.get("set-cookie") || "").split(";")[0];
  
  // 2. Fetch target URL with seeded cookie
  return fetchJson(url, {
    timeoutMs,
    ...options,
    headers: {
      Accept: "application/json",
      Referer: "https://www.nseindia.com/reports/fii-dii",
      ...(rawCookie ? { Cookie: rawCookie } : {}),
      ...options.headers
    }
  });
}
