import { buildDigest, todayIso } from "./core.mjs";
import { cockpitPage } from "./cockpit-page.mjs";

export async function createDemoApp(date = todayIso()) {
  let currentDigest = await buildDigest(date);

  return {
    get digest() {
      return currentDigest;
    },
    async request(method, path, body = {}) {
      const url = new URL(path, "http://localhost");

      if (method === "GET" && url.pathname === "/") {
        return htmlResponse(cockpitPage(currentDigest, "public-view"));
      }

      if (method === "GET" && url.pathname === "/admin") {
        return htmlResponse(cockpitPage(currentDigest, "studio-view"));
      }

      if (method === "GET" && url.pathname === "/api/public/digest/today") {
        return jsonResponse(200, currentDigest);
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
