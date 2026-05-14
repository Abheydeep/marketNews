export const LIVE_MARKET_SYMBOLS = [
  {
    symbol: "SPX",
    name: "S&P 500",
    yahooSymbol: "^GSPC",
    tradingViewSymbol: "SP:SPX",
    marketRegion: "US Overnight",
    session: "us"
  },
  {
    symbol: "NDX",
    name: "Nasdaq 100",
    yahooSymbol: "^NDX",
    tradingViewSymbol: "NASDAQ:NDX",
    marketRegion: "US Overnight",
    session: "us"
  },
  {
    symbol: "DJI",
    name: "Dow Jones",
    yahooSymbol: "^DJI",
    tradingViewSymbol: "DJ:DJI",
    marketRegion: "US Overnight",
    session: "us"
  },
  {
    symbol: "NIFTY",
    name: "Nifty 50",
    yahooSymbol: "^NSEI",
    tradingViewSymbol: "NSE:NIFTY",
    marketRegion: "India Open",
    session: "india"
  },
  {
    symbol: "BANKNIFTY",
    name: "Bank Nifty",
    yahooSymbol: "^NSEBANK",
    tradingViewSymbol: "NSE:BANKNIFTY",
    marketRegion: "India Open",
    session: "india"
  },
  {
    symbol: "NIKKEI",
    name: "Nikkei 225",
    yahooSymbol: "^N225",
    tradingViewSymbol: "TVC:NI225",
    marketRegion: "Asia Watch",
    country: "Japan",
    session: "tokyo"
  },
  {
    symbol: "HSI",
    name: "Hang Seng",
    yahooSymbol: "^HSI",
    tradingViewSymbol: "TVC:HSI",
    marketRegion: "Asia Watch",
    country: "Hong Kong",
    session: "hongkong"
  },
  {
    symbol: "SHCOMP",
    name: "Shanghai Composite",
    yahooSymbol: "000001.SS",
    tradingViewSymbol: "SSE:000001",
    marketRegion: "Asia Watch",
    country: "Mainland China",
    session: "shanghai"
  },
  {
    symbol: "KOSPI",
    name: "KOSPI",
    yahooSymbol: "^KS11",
    tradingViewSymbol: "KRX:KOSPI",
    marketRegion: "Asia Watch",
    country: "South Korea",
    session: "seoul"
  },
  {
    symbol: "TAIEX",
    name: "Taiwan Weighted",
    yahooSymbol: "^TWII",
    tradingViewSymbol: "TWSE:TAIEX",
    marketRegion: "Asia Watch",
    country: "Taiwan",
    session: "taipei"
  },
  {
    symbol: "STI",
    name: "Straits Times",
    yahooSymbol: "^STI",
    tradingViewSymbol: "TVC:STI",
    marketRegion: "Asia Watch",
    country: "Singapore",
    session: "singapore"
  },
  {
    symbol: "ASX200",
    name: "ASX 200",
    yahooSymbol: "^AXJO",
    tradingViewSymbol: "ASX:XJO",
    marketRegion: "Asia Watch",
    country: "Australia",
    session: "sydney"
  },
  {
    symbol: "DXY",
    name: "US Dollar Index",
    yahooSymbol: "DX-Y.NYB",
    tradingViewSymbol: "TVC:DXY",
    marketRegion: "Macro Hedges",
    session: "macro"
  },
  {
    symbol: "BRENT",
    name: "Brent Crude",
    yahooSymbol: "BZ=F",
    tradingViewSymbol: "TVC:UKOIL",
    marketRegion: "Macro Hedges",
    session: "macro"
  },
  {
    symbol: "USDINR",
    name: "USD/INR",
    yahooSymbol: "USDINR=X",
    tradingViewSymbol: "FX:USDINR",
    marketRegion: "Macro Hedges",
    session: "macro"
  },
  {
    symbol: "GOLD",
    name: "Gold (COMEX)",
    yahooSymbol: "GC=F",
    tradingViewSymbol: "TVC:GOLD",
    marketRegion: "Macro Hedges",
    session: "macro"
  },
  {
    symbol: "INDIAVIX",
    name: "India VIX",
    yahooSymbol: "^INDIAVIX",
    tradingViewSymbol: "NSE:INDIAVIX",
    marketRegion: "India Open",
    session: "india"
  }
];

export async function fetchLiveMarketSnapshots({ timeoutMs = 8_000 } = {}) {
  const results = await Promise.allSettled(
    LIVE_MARKET_SYMBOLS.map((definition) => fetchYahooChartQuote(definition, timeoutMs))
  );
  const snapshots = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  if (snapshots.length === 0) {
    const errors = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason?.message ?? String(result.reason))
      .join("; ");
    throw new Error(`No live market snapshots could be fetched. ${errors}`);
  }

  return snapshots;
}

/**
 * Fetch FII/DII provisional cash-market flows from NSE India.
 * Returns null on any failure so callers degrade gracefully.
 * @returns {Promise<{fiiNet: number, diiNet: number, fiiBuy: number, fiiSell: number, diiBuy: number, diiSell: number, date: string} | null>}
 */
export async function fetchFiiDiiFlows({ timeoutMs = 6_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // NSE requires a Referer + cookie from the main site; a single pre-flight
    // often seeds enough session state to allow the API call through.
    const cookieRes = await fetch("https://www.nseindia.com/market-data/fii-dii-activity", {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html"
      }
    });
    const rawCookie = (cookieRes.headers.get("set-cookie") || "").split(";")[0];
    const dataRes = await fetch("https://www.nseindia.com/api/fiidiiTradeReact", {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        Referer: "https://www.nseindia.com/market-data/fii-dii-activity",
        ...(rawCookie ? { Cookie: rawCookie } : {})
      }
    });
    if (!dataRes.ok) return null;
    const rows = await dataRes.json();
    const latest = Array.isArray(rows) ? rows[0] : null;
    if (!latest) return null;
    return {
      date: String(latest.date ?? ""),
      fiiNet: Number(latest.fiiNet ?? 0),
      fiiBuy: Number(latest.fiiBuy ?? 0),
      fiiSell: Number(latest.fiiSell ?? 0),
      diiNet: Number(latest.diiNet ?? 0),
      diiBuy: Number(latest.diiBuy ?? 0),
      diiSell: Number(latest.diiSell ?? 0)
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchYahooChartQuote(definition, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(definition.yahooSymbol)}?range=1d&interval=1m`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 MarketNarrativeStoryboardEngine/0.1"
      }
    });

    if (!response.ok) {
      throw new Error(`${definition.yahooSymbol} returned HTTP ${response.status}`);
    }

    return normalizeYahooChartResult(definition, await response.json());
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeYahooChartResult(definition, payload) {
  const result = payload?.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta) {
    throw new Error(`${definition.yahooSymbol} did not return chart metadata`);
  }

  const closes = result?.indicators?.quote?.[0]?.close?.filter((value) => Number.isFinite(value)) ?? [];
  const latest = Number(meta.regularMarketPrice ?? closes.at(-1));
  const previous = Number(meta.chartPreviousClose ?? meta.previousClose);
  if (!Number.isFinite(latest) || !Number.isFinite(previous) || previous === 0) {
    throw new Error(`${definition.yahooSymbol} returned incomplete price data`);
  }

  const timestamp = meta.regularMarketTime
    ? new Date(meta.regularMarketTime * 1000).toISOString()
    : new Date().toISOString();

  return {
    symbol: definition.symbol,
    name: definition.name,
    closeValue: round(latest, 2),
    previousClose: round(previous, 2),
    changePercent: round(((latest - previous) / previous) * 100, 3),
    currency: meta.currency ?? null,
    exchangeTimezoneName: meta.exchangeTimezoneName ?? null,
    dataTimestamp: timestamp,
    source: "Yahoo Finance chart API",
    yahooSymbol: definition.yahooSymbol,
    tradingViewSymbol: definition.tradingViewSymbol,
    marketRegion: definition.marketRegion,
    country: definition.country,
    session: definition.session,
    dataQuality: "live",
    chartPoints: chartPointsForResult(result, {
      previous,
      latest,
      timestamp,
      symbol: definition.symbol
    })
  };
}

function chartPointsForResult(result, quote) {
  const points = buildChartPoints(result);
  if (points.length >= 3) {
    return points;
  }
  return synthesizeChartPoints(quote);
}

function buildChartPoints(result) {
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const points = [];

  for (let index = 0; index < Math.min(timestamps.length, closes.length); index += 1) {
    const timestamp = Number(timestamps[index]);
    const close = Number(closes[index]);
    if (Number.isFinite(timestamp) && Number.isFinite(close) && close > 0) {
      points.push({
        time: new Date(timestamp * 1000).toISOString(),
        close: round(close, 2)
      });
    }
  }

  return thinChartPoints(points, 180);
}

function synthesizeChartPoints({ previous, latest, timestamp, symbol }) {
  const end = Number.isFinite(Date.parse(timestamp)) ? Date.parse(timestamp) : Date.now();
  const pointCount = 24;
  const intervalMs = 15 * 60 * 1000;
  const drift = latest - previous;
  const seed = [...String(symbol)].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const waveAmplitude = Math.max(Math.abs(latest) * 0.0008, Math.abs(drift) * 0.35, 0.01);

  return Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1);
    const time = new Date(end - (pointCount - 1 - index) * intervalMs).toISOString();
    if (index === 0) {
      return { time, close: round(previous, 2) };
    }
    if (index === pointCount - 1) {
      return { time, close: round(latest, 2) };
    }
    const wave = Math.sin((progress * 2.4 + seed / 17) * Math.PI) * waveAmplitude * (1 - progress * 0.35);
    return {
      time,
      close: round(previous + drift * progress + wave, 2)
    };
  });
}

function thinChartPoints(points, maxPoints) {
  if (points.length <= maxPoints) {
    return points;
  }

  const thinned = [];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let index = 0; index < maxPoints; index += 1) {
    thinned.push(points[Math.round(index * step)]);
  }
  return thinned;
}

export function markSnapshotsAsFallback(seedSnapshots, reason) {
  return seedSnapshots.map((snapshot) => ({
    ...snapshot,
    dataTimestamp: new Date().toISOString(),
    source: `${snapshot.source} fallback`,
    dataQuality: "mock-fallback",
    fallbackReason: reason
  }));
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
