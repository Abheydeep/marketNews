"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, LogIn, PlayCircle, Radio, RefreshCw, Save, UploadCloud } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { mockDigest } from "@/lib/mockDigest";
import type { PublicDigest } from "@/lib/types";
import { SentimentBadge } from "./SentimentBadge";
import { ThumbnailPreview } from "./ThumbnailPreview";
import { TradeSetupTable } from "./TradeSetupTable";

type LoginResponse = {
  token: string;
  email: string;
  displayName: string;
  role: string;
};

export function AdminStudio() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [email, setEmail] = useState("admin@marketnarrative.local");
  const [password, setPassword] = useState("market-open");
  const [token, setToken] = useState<string | null>(null);
  const [digest, setDigest] = useState<PublicDigest>(mockDigest);
  const [message, setMessage] = useState("Studio ready");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("marketNarrativeToken");
    if (stored) {
      setToken(stored);
    }
  }, []);

  async function login() {
    setBusy(true);
    setMessage("Signing in");
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        throw new Error("Login failed");
      }
      const payload = (await response.json()) as LoginResponse;
      setToken(payload.token);
      window.localStorage.setItem("marketNarrativeToken", payload.token);
      setMessage(`Signed in as ${payload.displayName}`);
      await loadDigest(payload.token);
    } catch {
      setMessage("Backend unavailable; showing seeded studio state");
      setDigest(mockDigest);
    } finally {
      setBusy(false);
    }
  }

  async function authedFetch(path: string, init: RequestInit = {}) {
    if (!token) {
      throw new Error("Missing token");
    }
    const extraHeaders = (init.headers ?? {}) as Record<string, string>;
    return fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...extraHeaders
      }
    });
  }

  async function loadDigest(authToken = token) {
    if (!authToken) {
      return;
    }
    const response = await fetch(`${API_BASE}/api/admin/digest/${date}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (response.ok) {
      setDigest(await response.json());
    }
  }

  async function runDigest() {
    setBusy(true);
    setMessage("Running digest");
    try {
      const response = await authedFetch(`/api/admin/digest/run?date=${date}`, { method: "POST" });
      if (!response.ok) {
        throw new Error("Run failed");
      }
      const result = await response.json();
      setMessage(`Digest completed in ${result.durationMillis} ms`);
      await loadDigest();
    } catch {
      setMessage("Run failed; backend and admin token are required");
    } finally {
      setBusy(false);
    }
  }

  async function saveScript() {
    setBusy(true);
    setMessage("Saving script");
    try {
      const response = await authedFetch(`/api/admin/scripts/${digest.scriptId}`, {
        method: "PUT",
        body: JSON.stringify({
          onePageSummary: digest.onePageSummary,
          teleprompterScript: digest.teleprompterScript,
          reelScript: digest.reelScript
        })
      });
      if (!response.ok) {
        throw new Error("Save failed");
      }
      setMessage("Script saved");
    } catch {
      setMessage("Save failed; run the backend and sign in first");
    } finally {
      setBusy(false);
    }
  }

  async function regenerateReel() {
    setBusy(true);
    setMessage("Regenerating reel script via Llama 4...");
    try {
      const response = await authedFetch(`/api/admin/scripts/${digest.scriptId}/reel`, { method: "POST" });
      if (!response.ok) {
        throw new Error("Reel regeneration failed");
      }
      const updated = await response.json() as { reelScript?: string };
      setDigest((prev) => ({ ...prev, reelScript: updated.reelScript ?? prev.reelScript }));
      setMessage("Reel script regenerated");
    } catch {
      setMessage("Reel regeneration failed; check NVIDIA_API_KEY on backend");
    } finally {
      setBusy(false);
    }
  }

  async function generateAsset() {
    setBusy(true);
    setMessage("Generating prompt package");
    try {
      const response = await authedFetch(`/api/admin/assets/generate?date=${date}`, { method: "POST" });
      if (!response.ok) {
        throw new Error("Asset generation failed");
      }
      await loadDigest();
      setMessage("Prompt package generated");
    } catch {
      setMessage("Asset generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function publishDigest() {
    setBusy(true);
    setMessage("Publishing digest");
    try {
      const response = await authedFetch(`/api/admin/digest/${date}/publish`, { method: "POST" });
      if (!response.ok) {
        throw new Error("Publish failed");
      }
      await loadDigest();
      setMessage("Digest published");
    } catch {
      setMessage("Publish failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <SentimentBadge label={digest.sentimentLabel} />
            <span className="rounded border border-line bg-white px-2.5 py-1 text-xs font-bold text-steel">
              {digest.status}
            </span>
            <span className="text-sm font-bold text-steel">{message}</span>
          </div>
          <h1 className="mt-4 text-4xl font-black text-ink">Studio Command Center</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="h-10 rounded border border-line bg-white px-3 text-sm font-bold text-ink"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <button
            className="inline-flex h-10 items-center gap-2 rounded border border-line bg-white px-3 text-sm font-bold text-ink"
            onClick={login}
            disabled={busy}
            title="Sign in"
          >
            <LogIn size={16} /> Login
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded bg-ink px-3 text-sm font-bold text-white"
            onClick={runDigest}
            disabled={busy}
            title="Run digest"
          >
            <PlayCircle size={16} /> Run
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded border border-line bg-white px-3 text-sm font-bold text-ink"
            onClick={generateAsset}
            disabled={busy}
            title="Generate asset prompt"
          >
            <ImagePlus size={16} /> Asset
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded bg-moss px-3 text-sm font-bold text-white"
            onClick={publishDigest}
            disabled={busy}
            title="Publish digest"
          >
            <UploadCloud size={16} /> Publish
          </button>
        </div>
      </header>

      <section className="rounded border border-line bg-ink p-4 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-white">Reel Script (45–60 sec)</h2>
          <div className="flex gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 rounded border border-white/20 bg-white/10 px-3 text-sm font-bold text-white hover:bg-white/20"
              onClick={regenerateReel}
              disabled={busy}
              title="Regenerate with Llama 4 Maverick"
            >
              <RefreshCw size={14} /> Regenerate
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded border border-white/20 bg-white/10 px-3 text-sm font-bold text-white hover:bg-white/20"
              onClick={saveScript}
              disabled={busy}
              title="Save reel script"
            >
              <Save size={14} /> Save
            </button>
          </div>
        </div>
        <textarea
          className="mt-4 h-64 w-full resize-y rounded border border-white/10 bg-white/5 p-3 text-sm leading-7 text-white/90 font-mono placeholder:text-white/30"
          value={digest.reelScript ?? ""}
          placeholder="Run the digest or click Regenerate to generate a reel script."
          onChange={(event) => setDigest({ ...digest, reelScript: event.target.value })}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-4">
          <div className="rounded border border-line bg-white p-4 shadow-panel">
            <h2 className="text-lg font-black text-ink">Admin Login</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                className="h-11 rounded border border-line px-3 text-sm"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <input
                className="h-11 rounded border border-line px-3 text-sm"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </div>

          <div className="rounded border border-line bg-white p-4 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-ink">Teleprompter</h2>
              <button
                className="inline-flex h-9 items-center gap-2 rounded border border-line bg-paper px-3 text-sm font-bold text-ink"
                onClick={saveScript}
                disabled={busy}
                title="Save script"
              >
                <Save size={15} /> Save
              </button>
            </div>
            <textarea
              className="mt-4 h-80 w-full resize-y rounded border border-line bg-paper p-3 text-sm leading-6 text-ink"
              value={digest.teleprompterScript}
              onChange={(event) => setDigest({ ...digest, teleprompterScript: event.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-4">
          <ThumbnailPreview asset={digest.asset} />
          <div className="rounded border border-line bg-white p-4 shadow-panel">
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-moss" />
              <h2 className="text-lg font-black text-ink">One-Page Summary</h2>
            </div>
            <textarea
              className="mt-4 h-48 w-full resize-y rounded border border-line bg-paper p-3 text-sm leading-6 text-ink"
              value={digest.onePageSummary}
              onChange={(event) => setDigest({ ...digest, onePageSummary: event.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded border border-line bg-white p-4 shadow-panel">
          <h2 className="text-lg font-black text-ink">Themes</h2>
          <div className="mt-4 grid gap-3">
            {digest.themes.map((theme) => (
              <article key={theme.themeType} className="border-b border-line pb-3 last:border-0">
                <h3 className="text-sm font-black text-ink">{theme.title}</h3>
                <p className="mt-1 text-sm leading-6 text-steel">{theme.summary}</p>
              </article>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-lg font-black text-ink">Scanner Output</h2>
          <TradeSetupTable setups={digest.tradeSetups} />
        </div>
      </section>
    </main>
  );
}
