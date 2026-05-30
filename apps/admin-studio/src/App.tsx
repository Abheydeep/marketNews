import { useState, useEffect } from "react";
import { BrandMark, SentimentBadge } from "@market-narrative/ui";
import type { PublicDigest } from "@market-narrative/api-client";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

async function fetchDigest(date: string): Promise<PublicDigest> {
  const r = await fetch(`${API_BASE}/api/admin/digest/${date}`, { credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function triggerDigest(date: string): Promise<void> {
  const r = await fetch(`${API_BASE}/api/admin/digest/run?date=${date}`, {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

async function regenerateReel(scriptId: number): Promise<void> {
  const r = await fetch(`${API_BASE}/api/admin/scripts/${scriptId}/reel`, {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

export function App() {
  const [date, setDate] = useState(today());
  const [digest, setDigest] = useState<PublicDigest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      setDigest(await fetchDigest(d));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes("404") ? "No digest yet for this date." : msg);
      setDigest(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(date); }, [date]);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      await triggerDigest(date);
      await load(date);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleReelRegen = async () => {
    if (!digest?.scriptId) return;
    setLoading(true);
    setError(null);
    try {
      await regenerateReel(digest.scriptId as number);
      await load(date);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
      <header style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <BrandMark />
        <h1 style={{ margin: 0, fontSize: "1.4rem" }}>Studio Command Center</h1>
      </header>

      <section style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "2rem" }}>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ padding: "0.4rem 0.6rem", borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button
          onClick={handleRun}
          disabled={loading}
          style={{ padding: "0.4rem 1.2rem", borderRadius: 6, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer" }}
        >
          {loading ? "Running…" : "Run Digest"}
        </button>
        {digest?.sentimentLabel && <SentimentBadge label={digest.sentimentLabel} />}
      </section>

      {error && (
        <p style={{ color: "#dc2626", background: "#fef2f2", padding: "0.75rem 1rem", borderRadius: 6 }}>
          {error}
        </p>
      )}

      {digest && (
        <>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>{digest.title}</h2>
          <p style={{ color: "#6b7280", fontSize: "0.85rem", marginBottom: "2rem" }}>
            {digest.digestDate}
            {digest.publishedAt ? ` · Published ${new Date(digest.publishedAt).toLocaleString("en-IN")}` : " · Draft"}
          </p>

          {/* ── Reel Script ─────────────────────────────────────── */}
          <section style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
              <h3 style={{ margin: 0 }}>Reel Script (45–60 sec)</h3>
              <button
                onClick={handleReelRegen}
                disabled={loading}
                style={{ padding: "0.3rem 0.9rem", borderRadius: 6, background: "#7c3aed", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.82rem" }}
              >
                ↺ Regenerate with Claude
              </button>
            </div>
            {digest.reelScript ? (
              <pre style={{
                background: "#0f172a", color: "#e2e8f0", padding: "1.25rem",
                borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: "0.9rem"
              }}>
                {digest.reelScript}
              </pre>
            ) : (
              <p style={{ color: "#9ca3af", fontStyle: "italic" }}>
                No reel script yet. Run the digest or click Regenerate.
              </p>
            )}
          </section>

          {/* ── Teleprompter ─────────────────────────────────────── */}
          <section style={{ marginBottom: "2rem" }}>
            <h3>Teleprompter Script</h3>
            <pre style={{
              background: "#f8fafc", padding: "1rem", borderRadius: 8,
              whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: "0.88rem", border: "1px solid #e2e8f0"
            }}>
              {digest.teleprompterScript}
            </pre>
          </section>

          {/* ── One-Page Summary ─────────────────────────────────── */}
          <section>
            <h3>One-Page Summary</h3>
            <pre style={{
              background: "#f8fafc", padding: "1rem", borderRadius: 8,
              whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: "0.85rem", border: "1px solid #e2e8f0"
            }}>
              {digest.onePageSummary}
            </pre>
          </section>
        </>
      )}
    </main>
  );
}
