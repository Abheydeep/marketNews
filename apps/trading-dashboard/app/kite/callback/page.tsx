"use client";

import { useEffect, useMemo, useState } from "react";
import { tokenStorageKey } from "../../../lib/auth";

const apiBase = process.env.NEXT_PUBLIC_TRADING_API_BASE_URL ?? "http://localhost:8090";

export default function KiteCallbackPage() {
  const [status, setStatus] = useState("Waiting for request token");
  const requestToken = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return new URLSearchParams(window.location.search).get("request_token") ?? "";
  }, []);

  useEffect(() => {
    if (!requestToken) {
      return;
    }
    const adminToken = window.localStorage.getItem(tokenStorageKey);
    if (!adminToken) {
      setStatus("Trading admin token missing. Log in to the cockpit first.");
      return;
    }
    setStatus("Exchanging request token");
    fetch(`${apiBase}/api/kite/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ request_token: requestToken })
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await response.text());
        }
        return response.json();
      })
      .then((payload) => setStatus(`Kite session ready until ${payload.expires_at}`))
      .catch((error: Error) => setStatus(error.message));
  }, [requestToken]);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="widget w-full max-w-xl p-5">
        <h1 className="text-lg font-black">Kite Session</h1>
        <p className="mt-3 text-sm text-slate-300">{status}</p>
      </section>
    </main>
  );
}
