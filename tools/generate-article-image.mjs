import { Buffer } from "node:buffer";
import { log } from "./logger.mjs";

const IMAGE_ENDPOINT = "https://integrate.api.nvidia.com/v1/images/generations";
const IMAGE_MODEL = "qwen-image";
const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";
const OPENAI_IMAGE_ENDPOINT = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGE_MODEL = "gpt-image-1";
const BRAND_SUFFIX = [
  "Photorealistic, cinematic editorial photography style.",
  "Dark navy and deep blue dominant.",
  "Gold accent highlights only.",
  "Pre-dawn atmospheric lighting.",
  "16:9 wide landscape composition.",
  "Exclude written characters, brand marks, market diagrams, directional symbols, numeric overlays, political emblems, national banners and military objects.",
  "Professional Indian financial publication aesthetic.",
  "High quality, dramatic depth of field.",
  "1200x675 pixels."
].join(" ");

const DRIVER_VISUAL_THEMES = {
  crude: "offshore oil platform at pre-dawn twilight, dramatic stormy sky, amber reflections on dark water, industrial silhouette, cinematic editorial",
  energy: "offshore oil platform at pre-dawn twilight, dramatic stormy sky, amber reflections on dark water, industrial silhouette, cinematic editorial",
  geopolitical: "abstract city at night seen from altitude, fog at street level, single warm light on dark horizon, no symbols, cinematic",
  rates: "glass and steel financial towers before sunrise, morning fog drifting at street level, steel blue palette, architectural depth",
  banks: "glass and steel financial towers before sunrise, morning fog drifting at street level, steel blue palette, architectural depth",
  tech: "abstract circuit board geometry dissolving into light points, electric blue on deep navy, clean and precise, no screens",
  it: "abstract circuit board geometry dissolving into light points, electric blue on deep navy, clean and precise, no screens",
  currency: "abstract flowing forms in blue and gold, water surface at night catching light, teal and amber on deep navy",
  fii: "abstract flowing forms in blue and gold, water surface at night catching light, teal and amber on deep navy",
  fii_flows: "abstract flowing forms in blue and gold, water surface at night catching light, teal and amber on deep navy",
  trade: "vast ocean before dawn, distant container ship silhouettes on horizon, muted grey-blue, enormous scale",
  market_breadth: "aerial view of city lights at night, thousands of light points distributed across dark canvas, some bright some dim",
  pharma: "clean laboratory forms at dusk, light refracting through glass vessels, clinical white and deep blue",
  auto: "abstract industrial forms, molten metal suggestion, furnace amber glow on dark navy, heavy industry",
  metals: "abstract industrial forms, molten metal suggestion, furnace amber glow on dark navy, heavy industry",
  monsoon: "dramatic monsoon clouds at dawn over flat landscape, silver-grey and deep blue, vast sky",
  rbi_policy: "abstract stone and glass institutional architecture, pre-dawn light, still and deliberate, deep navy",
  geopolitical_risk: "abstract aerial view before first light, fog, a single amber light source far on the horizon",
  default: "pre-dawn Indian financial district skyline, city lights beginning to dim as dawn approaches, dark navy and gold"
};

const MOVE_VISUAL_THEMES = new Map([
  ["nifty 50", "abstract Indian cityscape at market open, Bombay architecture reference, dawn light"],
  ["bank nifty", "banking district glass towers, morning light on water, financial district scale"],
  ["nifty metal", "molten metal industrial forms, furnace amber glow, heavy manufacturing silhouette"],
  ["nifty it", "circuit geometry dissolving into data light points, precise and clean"],
  ["nifty auto", "pre-dawn highway, motion of light trails, scale and speed"],
  ["omcs", "refinery at dusk, industrial silhouette, amber and navy"]
]);

export function buildBriefingImagePrompt(digest) {
  const driverType = String(digest?.dailyLead?.driverType || "default").toLowerCase();
  return `${DRIVER_VISUAL_THEMES[driverType] || DRIVER_VISUAL_THEMES.default}. ${BRAND_SUFFIX}`;
}

export function buildMoveImagePrompt(move) {
  const entity = String(move?.entityName || move?.sector || "").toLowerCase();
  const scene = MOVE_VISUAL_THEMES.get(entity) || MOVE_VISUAL_THEMES.get(`nifty ${entity}`) || "abstract Indian financial market, pre-market stillness, dark navy and gold";
  const tone = Number(move?.change ?? move?.priceChangePct ?? 0) >= 0
    ? "warm golden tone, amber highlights"
    : "cool blue tone, shadow emphasis, measured and still";
  return `${scene}, ${tone}. ${BRAND_SUFFIX}`;
}

export async function generateArticleImage(prompt, options = {}) {
  const provider = String(options.provider || process.env.ARTICLE_IMAGE_PROVIDER || inferredProvider()).toLowerCase();
  const apiKey = options.apiKey || keyForProvider(provider);
  const model = options.model || modelForProvider(provider);
  const endpoint = options.endpoint || endpointForProvider(provider, model);
  if (!apiKey) {
    log.warn("article image skipped missing api key", { provider, model });
    return null;
  }
  try {
    const fetcher = options.fetcher || fetch;
    const response = await fetcher(endpoint, requestForProvider(provider, apiKey, model, prompt, options));
    return provider === "gemini"
      ? await imageBufferFromGeminiResponse(response, model)
      : await imageBufferFromDataImageResponse(response, provider, model);
  } catch (error) {
    log.warn("article image generation failed", { provider, model, error: error.message });
    return null;
  }
}

function requestForProvider(provider, apiKey, model, prompt, options) {
  if (provider === "gemini") {
    return {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? 45_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    };
  }
  if (provider === "openai") {
    return {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? 45_000),
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: process.env.OPENAI_IMAGE_SIZE || "1536x1024",
        quality: process.env.OPENAI_IMAGE_QUALITY || "high",
        output_format: process.env.OPENAI_IMAGE_FORMAT || "jpeg"
      })
    };
  }
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? 45_000),
    body: JSON.stringify({ model, prompt, n: 1, size: "1200x675", response_format: "b64_json" })
  };
}

async function imageBufferFromDataImageResponse(response, provider, model) {
  if (!response.ok) return failedResponse(provider, model, response);
  const payload = await response.json();
  const encoded = payload?.data?.[0]?.b64_json;
  if (!encoded) {
    log.warn("article image generation missing payload", { provider, model });
    return null;
  }
  return Buffer.from(encoded, "base64");
}

async function imageBufferFromGeminiResponse(response, model) {
  if (!response.ok) return failedResponse("gemini", model, response);
  const payload = await response.json();
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const encoded = parts.find((part) => part.inlineData?.data || part.inline_data?.data)?.inlineData?.data
    ?? parts.find((part) => part.inlineData?.data || part.inline_data?.data)?.inline_data?.data;
  if (!encoded) {
    log.warn("article image generation missing payload", { provider: "gemini", model });
    return null;
  }
  return Buffer.from(encoded, "base64");
}

async function failedResponse(provider, model, response) {
  const responseText = typeof response.text === "function" ? await response.text().catch(() => "") : "";
  log.warn("article image generation failed response", { provider, model, status: response.status, response: responseText.slice(0, 300) });
  return null;
}

function inferredProvider() {
  if (process.env.OPENAI_API_KEY) return "openai";
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? "gemini" : "nvidia";
}

function keyForProvider(provider) {
  if (provider === "openai") return process.env.OPENAI_API_KEY;
  return provider === "gemini" ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY : process.env.NVIDIA_API_KEY;
}

function modelForProvider(provider) {
  if (provider === "openai") return process.env.OPENAI_IMAGE_MODEL || OPENAI_IMAGE_MODEL;
  return provider === "gemini" ? process.env.GEMINI_IMAGE_MODEL || GEMINI_IMAGE_MODEL : process.env.NVIDIA_IMAGE_MODEL || IMAGE_MODEL;
}

function endpointForProvider(provider, model) {
  if (provider === "openai") {
    return process.env.OPENAI_IMAGE_ENDPOINT || OPENAI_IMAGE_ENDPOINT;
  }
  if (provider === "gemini") {
    return process.env.GEMINI_IMAGE_ENDPOINT || `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
  }
  return process.env.NVIDIA_IMAGE_ENDPOINT || IMAGE_ENDPOINT;
}
