import type { MarketDataStatus, OrderProposal, OrderResult, TradingIndex, TradingMarketEnvelope } from "@market-narrative/api-client";

const productionTradingApiBase = "https://trade-api.marketnarrative.in";

export const tradingApiBase = normalizeApiBase(resolveTradingApiBase(process.env.NEXT_PUBLIC_TRADING_API_BASE_URL));

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchMarketEnvelope(token: string): Promise<TradingMarketEnvelope> {
  const response = await fetch(`${tradingApiBase}/api/market/envelope`, {
    cache: "no-store",
    headers: authHeaders(token)
  });
  if (!response.ok) {
    throw new Error(`Unable to load market envelope: HTTP ${response.status}`);
  }
  return response.json() as Promise<TradingMarketEnvelope>;
}

export function marketSocketUrl(token: string): string {
  return toWebSocketBase(tradingApiBase) + `/ws/market?token=${encodeURIComponent(token)}`;
}

export async function createOrderProposal(index: TradingIndex, token: string): Promise<OrderProposal> {
  const response = await fetch(`${tradingApiBase}/api/orders/proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ index })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<OrderProposal>;
}

export async function confirmOrder(proposalId: string, token: string): Promise<OrderResult> {
  const response = await fetch(`${tradingApiBase}/api/orders/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ proposal_id: proposalId, manual_confirm: true })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<OrderResult>;
}

export async function setKillSwitch(enabled: boolean, token: string) {
  const response = await fetch(`${tradingApiBase}/api/orders/kill-switch`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ enabled })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function fetchKiteLoginUrl(token: string): Promise<string> {
  const response = await fetch(`${tradingApiBase}/api/kite/login-url`, {
    cache: "no-store",
    headers: authHeaders(token)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const payload = (await response.json()) as { login_url: string };
  return payload.login_url;
}

export async function refreshMarketData(token: string): Promise<MarketDataStatus> {
  const response = await fetch(`${tradingApiBase}/api/market/refresh`, {
    method: "POST",
    headers: authHeaders(token)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<MarketDataStatus>;
}

function resolveTradingApiBase(configuredBase: string | undefined): string {
  if (typeof window === "undefined") {
    return configuredBase ?? productionTradingApiBase;
  }
  const host = window.location.hostname;
  if (host === "trade.marketnarrative.in") {
    return productionTradingApiBase;
  }
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return configuredBase ?? "http://localhost:8090";
  }
  return configuredBase ?? productionTradingApiBase;
}

function normalizeApiBase(value: string): string {
  return value.replace(/\/+$/, "");
}

function toWebSocketBase(value: string): string {
  const base = normalizeApiBase(value);
  if (base.startsWith("https://")) {
    return base.replace(/^https:\/\//, "wss://");
  }
  if (base.startsWith("http://")) {
    return base.replace(/^http:\/\//, "ws://");
  }
  if (typeof window !== "undefined") {
    const absolute = new URL(base, window.location.origin);
    absolute.protocol = absolute.protocol === "https:" ? "wss:" : "ws:";
    return absolute.toString().replace(/\/+$/, "");
  }
  return base;
}
