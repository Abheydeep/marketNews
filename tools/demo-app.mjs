import { buildDigest, todayIso } from "./core.mjs";
import { cockpitPage } from "./cockpit-page.mjs";
import { multibaggerState } from "./multibagger-data.mjs";
import { multibaggerPage } from "./multibagger-page.mjs";

export async function createDemoApp(date = todayIso()) {
  let currentDigest = await buildDigest(date);
  let currentMultibaggerState = multibaggerState();
  let latestReview = null;

  return {
    get digest() {
      return currentDigest;
    },
    async request(method, path, body = {}) {
      const url = new URL(path, "http://localhost");

      if (method === "GET" && url.pathname === "/") {
        return htmlResponse(cockpitPage(currentDigest, "public-view", { includeStudio: false, theme: "glass-v2" }));
      }

      if (method === "GET" && url.pathname === "/multibagger") {
        return htmlResponse(multibaggerPage(currentMultibaggerState));
      }

      if (method === "GET" && url.pathname === "/multibagger/") {
        return htmlResponse(multibaggerPage(currentMultibaggerState));
      }

      if (method === "GET" && url.pathname === "/admin") {
        return htmlResponse(cockpitPage(currentDigest, "studio-view", { includeStudio: true, theme: "glass-v2", requireAuth: true, multibaggerState: currentMultibaggerState }));
      }

      if (method === "GET" && url.pathname === "/admin/components") {
        return htmlResponse(cockpitPage(currentDigest, "components-view", { includeStudio: true, theme: "glass-v2", requireAuth: true, multibaggerState: currentMultibaggerState }));
      }

      if (method === "GET" && url.pathname === "/admin/multibagger") {
        return htmlResponse(cockpitPage(currentDigest, "multibagger-admin-view", { includeStudio: true, theme: "glass-v2", requireAuth: true, multibaggerState: currentMultibaggerState }));
      }

      if (method === "GET" && url.pathname === "/api/public/digest/today") {
        return jsonResponse(200, currentDigest);
      }

      if (method === "GET" && url.pathname === "/api/public/multibagger/state") {
        return jsonResponse(200, currentMultibaggerState);
      }

      if (method === "GET" && /^\/api\/public\/digest\/\d{4}-\d{2}-\d{2}$/.test(url.pathname)) {
        return jsonResponse(200, currentDigest);
      }

      if (method === "POST" && url.pathname === "/api/auth/login") {
        if (body.email !== "admin@marketnarrative.local" || body.password !== "market-open") {
          return jsonResponse(401, { error: "Invalid credentials" });
        }
        return jsonResponse(200, {
          token: "demo-admin-token",
          email: body.email,
          displayName: "Market Narrative Admin",
          role: "ADMIN"
        });
      }

      if (method === "POST" && url.pathname === "/api/admin/digest/run") {
        currentDigest = await buildDigest(url.searchParams.get("date") ?? todayIso());
        return jsonResponse(200, {
          digestDate: currentDigest.digestDate,
          marketSnapshots: currentDigest.marketSnapshots.length,
          articles: currentDigest.news.length,
          themes: currentDigest.themes.length,
          tradeSetups: currentDigest.tradeSetups.length,
          durationMillis: currentDigest.durationMillis,
          scriptId: currentDigest.scriptId,
          assetId: 1
        });
      }

      if (method === "GET" && /^\/api\/admin\/digest\/\d{4}-\d{2}-\d{2}$/.test(url.pathname)) {
        return jsonResponse(200, currentDigest);
      }

      if (method === "POST" && /^\/api\/admin\/digest\/\d{4}-\d{2}-\d{2}\/publish$/.test(url.pathname)) {
        currentDigest = {
          ...currentDigest,
          status: "PUBLISHED",
          publishedAt: new Date().toISOString()
        };
        return jsonResponse(200, currentDigest);
      }

      if (method === "POST" && url.pathname === "/api/admin/assets/generate") {
        return jsonResponse(200, currentDigest.asset);
      }

      if (method === "POST" && url.pathname === "/api/admin/multibagger/snapshots") {
        return jsonResponse(200, {
          snapshotId: `demo-snapshot-${Date.now()}`,
          status: "STORED",
          parsedPositions: currentMultibaggerState.holdings.map((holding) => ({
            ticker: holding.ticker,
            confidence: 0.72,
            note: "Demo extraction placeholder"
          }))
        });
      }

      if (method === "POST" && url.pathname === "/api/admin/multibagger/reviews/run") {
        latestReview = {
          reviewId: `demo-review-${body.month ?? currentMultibaggerState.monthlyReviews[0].month}`,
          month: body.month ?? currentMultibaggerState.monthlyReviews[0].month,
          decisions: currentMultibaggerState.holdings.map((holding) => ({
            ticker: holding.ticker,
            action: /capped/i.test(holding.status || "") ? "KEEP_CAPPED" : "KEEP",
            confidence: /capped/i.test(holding.status || "") ? 0.66 : 0.76,
            evidence: holding.breakRule,
            publicSummary: holding.status
          })),
          privateReasoning: "Demo-only review reasoning stays out of public state."
        };
        return jsonResponse(200, latestReview);
      }

      if (method === "POST" && /^\/api\/admin\/multibagger\/reviews\/[^/]+\/publish$/.test(url.pathname)) {
        const month = latestReview?.month ?? currentMultibaggerState.monthlyReviews[0].month;
        currentMultibaggerState = {
          ...currentMultibaggerState,
          monthlyReviews: currentMultibaggerState.monthlyReviews.map((review) =>
            review.month === month ? { ...review, publishedDate: currentMultibaggerState.updatedAt.slice(0, 10) } : review
          )
        };
        return jsonResponse(200, { month, status: "PUBLISHED", publicState: currentMultibaggerState });
      }

      return jsonResponse(404, { error: "Not found" });
    }
  };
}

function jsonResponse(status, payload) {
  return {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
    json: payload
  };
}

function htmlResponse(body) {
  return {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body
  };
}
