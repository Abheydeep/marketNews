import type { Permission } from "@market-narrative/api-client";

export const authApiBase = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL ?? "http://localhost:8080";
export const tradingAdminEmail = process.env.NEXT_PUBLIC_TRADING_ADMIN_EMAIL ?? "abhey@marketnarrative.in";
export const tokenStorageKey = "marketNarrativeTradingToken";

export type TradingClaims = {
  sub: string;
  name: string;
  role: "ADMIN" | string;
  permissions: Permission[];
  exp: number;
};

export type LoginResponse = {
  token: string;
  email: string;
  displayName: string;
  role: string;
};

export function decodeToken(token: string): TradingClaims | null {
  try {
    const payload = token.split(".")[1];
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(window.atob(padded.replace(/-/g, "+").replace(/_/g, "/"))) as TradingClaims;
  } catch {
    return null;
  }
}

export function isTradingAdmin(token: string): boolean {
  const claims = decodeToken(token);
  if (!claims) {
    return false;
  }
  const isFresh = claims.exp * 1000 > Date.now();
  return (
    isFresh &&
    claims.role === "ADMIN" &&
    claims.sub.toLowerCase() === tradingAdminEmail.toLowerCase() &&
    claims.permissions.includes("trade:execute")
  );
}

export async function loginTradingAdmin(email: string, password: string): Promise<LoginResponse> {
  const loginUrl = `${authApiBase}/api/auth/login`;
  let response: Response;
  try {
    response = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
  } catch {
    throw new Error(`Auth API unreachable at ${authApiBase}. Check api.marketnarrative.in DNS, HTTPS, and VPS status.`);
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid Abhey admin credentials");
    }
    throw new Error(`Login API returned HTTP ${response.status}`);
  }
  const payload = (await response.json()) as LoginResponse;
  if (!isTradingAdmin(payload.token)) {
    throw new Error("This account is not the Abhey trading admin");
  }
  return payload;
}
