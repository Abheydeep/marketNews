import { log } from "./logger.mjs";
import { fetchWithRetry } from "./http.mjs";

const NIM_URL = String(process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1").replace(/\/$/, "") + "/chat/completions";
const NIM_MODEL = process.env.NVIDIA_MODEL ?? "nvidia/nemotron-3-ultra-550b-a55b";
const TRIAGE_CALLS = 5;
const MIN_VALID_CALLS = 3;
const INCLUDE_THRESHOLD = 2.0;
const TRIAGE_TIMEOUT_MS = 180_000;
const TRIAGE_MAX_TOKENS = 8192;

const SYSTEM = "You are an editorial filter for Market Narrative, a pre-market briefing for Indian equity traders who trade Nifty, Bank Nifty, large-cap stocks, and macro instruments. Be strict.";

function buildTriagePrompt(articles) {
  const lines = articles.map((a, i) =>
    `#${i + 1} | "${a.headline ?? a.title ?? ""}" | ${String(a.summary ?? a.takeaway ?? "").slice(0, 110)}`
  ).join("\n");
  return `Rate each article's relevance for Indian equity pre-market readers. Score 0–5.

5 = Must-include: directly moves Indian markets — RBI/MPC action, GIFT Nifty, major FII/DII flows, large-cap earnings, oil/gold macro driver, Nifty/Sensex catalyst
4 = High: strong macro or sector read-through (Fed, US yields, global PMI, major commodity move, India policy)
3 = Moderate: useful background context for Indian traders
2 = Low: generic business news, weak India relevance
1 = Very low: barely connected
0 = Irrelevant: SME/small-cap IPO allotment/GMP/subscription, US lifestyle, retirement, sports, medical, crypto, US single-stock without India link, "how to invest" pieces, celebrity/royals, gadget reviews

Respond ONLY with a valid JSON array — no explanation, no markdown:
[{"id":1,"score":4},{"id":2,"score":0},...]

Articles:
${lines}`;
}

function parseTriageScores(text, count) {
  const jsonMatch = text?.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const map = new Map();
      for (const e of parsed) {
        if (typeof e.id === "number" && typeof e.score === "number") {
          map.set(e.id, Math.max(0, Math.min(5, e.score)));
        }
      }
      if (map.size >= count * 0.8) return map;
    } catch { /* fall through to regex */ }
  }
  const map = new Map();
  for (const m of (text ?? "").matchAll(/"id"\s*:\s*(\d+)[^}]*"score"\s*:\s*(\d)/g)) {
    map.set(Number(m[1]), Number(m[2]));
  }
  return map.size >= count * 0.8 ? map : null;
}

async function collectNimStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let content = "";
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data: ")) continue;
        const payload = t.slice(6);
        if (payload === "[DONE]") return content || null;
        try { const delta = JSON.parse(payload).choices?.[0]?.delta?.content; if (delta) content += delta; } catch { /* skip */ }
      }
    }
  } finally { reader.releaseLock(); }
  return content || null;
}

async function runOneTriageCall(callIndex, prompt, apiKey, signal) {
  const started = Date.now();
  log.info("triage call start", { call: callIndex });
  try {
    const res = await fetchWithRetry(NIM_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: NIM_MODEL, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }], max_tokens: TRIAGE_MAX_TOKENS, temperature: 0.2, stream: true }),
      signal,
    });
    if (!res.ok) { log.warn("triage call http error", { call: callIndex, status: res.status }); return null; }
    const text = await collectNimStream(res);
    log.info("triage call complete", { call: callIndex, durationMs: Date.now() - started, chars: text?.length ?? 0 });
    return text;
  } catch (err) {
    if (err.name === "AbortError") { log.info("triage call aborted", { call: callIndex }); }
    else { log.warn("triage call error", { call: callIndex, error: err.message, durationMs: Date.now() - started }); }
    return null;
  }
}

export async function triageArticlesWithLLM(articles, options = {}) {
  const apiKey = options.nvidiaApiKey ?? process.env.NVIDIA_API_KEY;
  if (!apiKey || articles.length === 0) {
    log.warn("triage skipped", { reason: !apiKey ? "no NVIDIA_API_KEY" : "empty article list", returning: articles.length });
    return articles;
  }

  const prompt = buildTriagePrompt(articles);
  log.info("triage start", { articles: articles.length, calls: TRIAGE_CALLS, minValid: MIN_VALID_CALLS, promptChars: prompt.length });

  const controllers = Array.from({ length: TRIAGE_CALLS }, () => new AbortController());
  const callPromises = controllers.map((ctrl, i) =>
    AbortSignal.timeout(TRIAGE_TIMEOUT_MS).addEventListener
      ? runOneTriageCall(i + 1, prompt, apiKey, AbortSignal.any([ctrl.signal, AbortSignal.timeout(TRIAGE_TIMEOUT_MS)]))
      : runOneTriageCall(i + 1, prompt, apiKey, ctrl.signal)
  );

  const scoreMaps = await new Promise((resolve) => {
    const maps = [];
    let settled = 0;
    let done = false;
    const finish = () => { if (!done) { done = true; resolve([...maps]); } };
    callPromises.forEach((p, i) => {
      Promise.resolve(p).then((text) => {
        if (done) return;
        const scores = parseTriageScores(text, articles.length);
        if (scores) {
          maps.push(scores);
          log.info("triage valid score", { call: i + 1, articles: scores.size, valid: maps.length });
          if (maps.length >= MIN_VALID_CALLS) {
            controllers.forEach((c, j) => { if (j !== i) c.abort(); });
            finish();
          }
        } else {
          log.warn("triage parse fail", { call: i + 1 });
        }
        if (++settled === TRIAGE_CALLS) finish();
      }).catch(() => { if (++settled === TRIAGE_CALLS) finish(); });
    });
  });

  log.info("triage scoring done", { validCalls: scoreMaps.length, of: TRIAGE_CALLS });

  if (scoreMaps.length === 0) {
    log.error("triage: all calls failed — returning all articles (fail-open)", { articles: articles.length });
    return articles;
  }

  const included = [];
  const excluded = [];
  for (let i = 0; i < articles.length; i++) {
    const id = i + 1;
    const scores = scoreMaps.map((m) => m.get(id) ?? null).filter((s) => s !== null);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : INCLUDE_THRESHOLD;
    if (avg >= INCLUDE_THRESHOLD) {
      included.push(articles[i]);
      log.info("triage include", { id, avg: avg.toFixed(2), scores: scores.join(","), headline: String(articles[i].headline ?? "").slice(0, 70) });
    } else {
      excluded.push(articles[i]);
      log.info("triage exclude", { id, avg: avg.toFixed(2), scores: scores.join(","), headline: String(articles[i].headline ?? "").slice(0, 70) });
    }
  }

  log.info("triage complete", { total: articles.length, included: included.length, excluded: excluded.length, validCalls: scoreMaps.length });
  return included;
}
