export const NVIDIA_IMAGE_MODEL = "black-forest-labs/flux.1-schnell";
const NVIDIA_IMAGE_BASE = "https://ai.api.nvidia.com/v1/genai";

export function nvidiaImageEndpoint(model = NVIDIA_IMAGE_MODEL) {
  return `${NVIDIA_IMAGE_BASE}/${model}`;
}

export function nvidiaImageRequest(apiKey, prompt, options = {}) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(options.timeoutMs ?? 45_000),
    body: JSON.stringify({
      prompt,
      width: Number(options.width ?? process.env.NVIDIA_IMAGE_WIDTH ?? 1200),
      height: Number(options.height ?? process.env.NVIDIA_IMAGE_HEIGHT ?? 672),
      steps: Number(options.steps ?? process.env.NVIDIA_IMAGE_STEPS ?? 4),
      seed: Number(options.seed ?? 0)
    })
  };
}

export function nvidiaImageBase64(payload) {
  return payload?.artifacts?.[0]?.base64 ?? payload?.artifacts?.[0]?.b64_json;
}
