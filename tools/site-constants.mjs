/**
 * Unified site constants and symbol registry.
 * Respects ESM and the 200-line budget constraint.
 */

export const DISCLAIMER =
  "Educational market research only. This is not SEBI-registered investment advice, a research recommendation, or a solicitation to buy or sell securities or derivatives. No returns are assured; use your own risk plan.";

export const DISCLAIMER_COMPACT =
  "Educational market research only; not SEBI-registered investment advice.";
export const DISCLAIMER_MARKER = DISCLAIMER_COMPACT.split("; ")[1].replace(/\.$/, "");

export const NAV_ITEMS = [
  { href: "/latest/", label: "Latest briefing", key: "briefing" },
  { href: "/latest/trading-guide/", label: "Trading Guide", key: "guide" },
  { href: "/money-flow/fii-dii/", label: "FII/DII", key: "fiidii" },
  { href: "/multibagger/", label: "Portfolio", key: "portfolio" },
  { href: "/about/", label: "About", key: "about" }
];

export const FOOTER_LINKS = [
  { href: "/archive/", label: "Archive" },
  { href: "/money-flow/fii-dii/", label: "FII/DII" },
  { href: "/market-statistics/", label: "Market Stats" },
  { href: "/about/", label: "About" },
  { href: "/contact/", label: "Contact" },
  { href: "/privacy/", label: "Privacy" },
  { href: "/terms/", label: "Terms" }
];

export const SYMBOL_REGISTRY = [
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

export const SYMBOL_MAP = {
  NIFTY: "^NSEI",
  BANKNIFTY: "^NSEBANK",
  GIFTNIFTY: "^NSEI",
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
