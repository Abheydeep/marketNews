// Serverless endpoint acting as a Yahoo Finance proxy for historical indices charts.
export const config = { runtime: "nodejs", regions: ["bom1"] };

const SYMBOL_MAP = {
  NIFTY: "^NSEI",
  BANKNIFTY: "^NSEBANK",
  GIFTNIFTY: "^NSEI", // Proxy history to Nifty 50
  SPX: "^GSPC",
  NDX: "^NDX",
  DJI: "^DJI",
  NIKKEI: "^N225",
  HSI: "^HSI",
  SHCOMP: "000001.SS",
  KOSPI: "^KS11",
  TAIEX: "^TWII",
  STI: "^STI",
  ASX200: "^AXJO",
  BRENT: "BZ=F",
  DXY: "DX-Y.NYB",
  USDINR: "USDINR=X",
  GOLD: "GC=F",
  INDIAVIX: "^INDIAVIX"
};

const INTERVAL_MAP = {
  "1d": "1m",
  "5d": "15m",
  "1mo": "1d",
  "3mo": "1d",
  "6mo": "1d",
  "1y": "1d",
  "3y": "1wk",
  "5y": "1wk",
  "max": "1mo"
};

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const { symbol, range } = request.query || {};
  if (!symbol || !range) {
    return response.status(400).json({ ok: false, error: "missing_required_params" });
  }

  const yahooSymbol = SYMBOL_MAP[symbol.toUpperCase()];
  const interval = INTERVAL_MAP[range.toLowerCase()];

  if (!yahooSymbol) {
    return response.status(400).json({ ok: false, error: "invalid_symbol" });
  }
  if (!interval) {
    return response.status(400).json({ ok: false, error: "invalid_range" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 MarketNarrativeStoryboardEngine/0.1"
      }
    });
    clearTimeout(timer);

    if (!res.ok) {
      return response.status(502).json({ ok: false, error: `yahoo_error_status_${res.status}` });
    }

    const payload = await res.json();
    const result = payload?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) {
      return response.status(502).json({ ok: false, error: "missing_yahoo_meta" });
    }

    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const points = [];

    for (let i = 0; i < Math.min(timestamps.length, closes.length); i++) {
      const t = Number(timestamps[i]);
      const c = Number(closes[i]);
      if (Number.isFinite(t) && Number.isFinite(c) && c > 0) {
        points.push({ t: t * 1000, c: Number(c.toFixed(2)) });
      }
    }

    if (points.length === 0) {
      return response.status(502).json({ ok: false, error: "no_valid_points" });
    }

    const first = points[0].c;
    const last = points[points.length - 1].c;
    const closesOnly = points.map(p => p.c);
    const min = Math.min(...closesOnly);
    const max = Math.max(...closesOnly);
    const changePct = first !== 0 ? Number((((last - first) / first) * 100).toFixed(3)) : 0;

    const cacheDuration = (range === "1d" || range === "5d") ? 60 : 3600;
    const swrDuration = (range === "1d" || range === "5d") ? 60 : 86400;

    response.setHeader("Cache-Control", `public, s-maxage=${cacheDuration}, stale-while-revalidate=${swrDuration}`);
    return response.status(200).json({
      ok: true,
      symbol: symbol.toUpperCase(),
      range: range.toLowerCase(),
      proxied: symbol.toUpperCase() === "GIFTNIFTY",
      points,
      meta: { min, max, first, last, changePct }
    });
  } catch (error) {
    clearTimeout(timer);
    return response.status(500).json({ ok: false, error: error.message });
  }
}
