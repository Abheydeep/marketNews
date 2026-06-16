export async function generateMoveArticle(move, options = {}) {
  const raw = options.rawArticle ?? await callPulseArticleModel(move, options);
  const article = parseArticleJson(raw);
  if (!article) {
    throw new Error(`Pulse LLM did not return valid article JSON for ${move.symbol}`);
  }
  return { ...article, llmProvider: "nvidia", llmModel: raw.model || pulseModel() };
}

async function callPulseArticleModel(move, options = {}) {
  const apiKey = options.apiKey ?? process.env.NVIDIA_PULSE_API_KEY ?? process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("missing_nvidia_pulse_api_key");
  const model = options.model ?? pulseModel();
  const baseUrl = String(options.baseUrl ?? process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");
  const response = await (options.fetcher ?? fetch)(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: pulseArticleSystemPrompt() },
        { role: "user", content: pulseArticleUserPrompt(move) }
      ],
      response_format: { type: "json_object" },
      temperature: Number(options.temperature ?? process.env.NVIDIA_PULSE_TEMPERATURE ?? 0.35),
      top_p: Number(options.topP ?? process.env.NVIDIA_PULSE_TOP_P ?? 0.9),
      max_tokens: Number(options.maxTokens ?? process.env.NVIDIA_PULSE_MAX_TOKENS ?? 900),
      chat_template_kwargs: { thinking: false },
      stream: false
    }),
    signal: AbortSignal.timeout(Number(options.timeoutMs ?? process.env.NVIDIA_PULSE_TIMEOUT_MS ?? 15000))
  });
  if (!response.ok) throw new Error(`NVIDIA Pulse article call failed with HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return { content: (data?.choices ?? []).map((choice) => choice?.message?.content ?? "").filter(Boolean).join("\n"), model };
}

function pulseModel() {
  return process.env.NVIDIA_PULSE_MODEL || "meta/llama-4-maverick-17b-128e-instruct";
}

function pulseArticleSystemPrompt() {
  return [
    "You are Market Narrative's Pulse editor for Indian markets.",
    "Write only verified, plain-English market context for traders.",
    "Do not give buy/sell advice, price targets, or assured direction.",
    "Return strict JSON only. No markdown."
  ].join(" ");
}

function pulseArticleUserPrompt(move) {
  const direction = move.priceChangePct >= 0 ? "up" : "down";
  return JSON.stringify({
    task: "Write a concise Pulse article from this live market move.",
    requiredJsonShape: { headline: "string", summary: "string" },
    rules: [
      "headline <= 90 characters",
      "summary <= 120 words",
      "explain the likely India-market transmission path",
      "mention Nifty, Bank Nifty, sector, crude, USD/INR, or breadth only when relevant",
      "no trading calls, no guaranteed language, no invented causes"
    ],
    move: {
      symbol: move.symbol,
      name: move.name,
      direction,
      changePercent: Number(move.priceChangePct.toFixed(2)),
      marketRegion: move.marketRegion,
      closeValue: move.closeValue,
      previousClose: move.previousClose,
      timestamp: move.timestamp,
      source: move.source
    }
  }, null, 2);
}

function parseArticleJson(raw) {
  const text = typeof raw === "string" ? raw : raw?.content;
  if (!text) return null;
  const cleaned = String(text).trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  const headline = cleanArticleField(parsed.headline, 110);
  const summary = cleanArticleField(parsed.summary, 900);
  if (!headline || headline.length < 18 || !summary || summary.length < 40) return null;
  return { headline, summary };
}

function cleanArticleField(value, maxLength) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength).trim();
}
