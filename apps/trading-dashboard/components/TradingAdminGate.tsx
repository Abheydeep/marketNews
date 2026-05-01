"use client";

import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { authApiBase, loginTradingAdmin, tokenStorageKey, tradingAdminEmail } from "../lib/auth";
import { useMarketStore } from "../store/marketStore";

export function TradingAdminGate() {
  const setAuthToken = useMarketStore((state) => state.setAuthToken);
  const [email, setEmail] = useState(tradingAdminEmail);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Abhey trading admin required");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(tokenStorageKey);
    if (stored) {
      setAuthToken(stored);
    }
  }, [setAuthToken]);

  async function login() {
    setBusy(true);
    setMessage("Signing in");
    try {
      const payload = await loginTradingAdmin(email, password);
      setAuthToken(payload.token);
      setMessage(`Signed in as ${payload.displayName}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="widget w-full max-w-md p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center">
            <BrandMark className="h-11 w-11" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">Trading Cockpit</h1>
            <p className="text-xs font-bold uppercase text-slate-400">{message}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          <input
            className="h-11 rounded-md border border-line bg-ink px-3 text-sm font-bold text-white"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
          />
          <input
            className="h-11 rounded-md border border-line bg-ink px-3 text-sm font-bold text-white"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
          <button
            disabled={busy}
            onClick={() => void login()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan px-3 text-sm font-black text-ink"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Login as Abhey Admin
          </button>
          <p className="text-[11px] font-semibold text-slate-500">Auth API: {authApiBase}</p>
        </div>
      </section>
    </main>
  );
}
