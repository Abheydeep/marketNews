import type { OrderProposal, OrderResult, TradingIndex, TradingMarketEnvelope } from "@market-narrative/api-client";

export const tradingApiBase = process.env.NEXT_PUBLIC_TRADING_API_BASE_URL ?? "http://localhost:8090";

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
  return tradingApiBase.replace(/^http/, "ws") + `/ws/market?token=${encodeURIComponent(token)}`;
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
