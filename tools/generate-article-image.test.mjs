import assert from "node:assert/strict";
import {
  buildBriefingImagePrompt,
  buildMoveImagePrompt,
  generateArticleImage
} from "./generate-article-image.mjs";

const FORBIDDEN = ["arrow", "chart", "logo", "flag", "weapon", "price", "percentage", "profit", "return", "gain", "loss"];

export async function runGenerateArticleImageTests(test = localTest, assertion = assert) {
  await test("article image briefing prompt maps crude driver", () => {
    const prompt = buildBriefingImagePrompt({ dailyLead: { driverType: "crude" } });
    assertion.match(prompt, /oil platform/i);
    assertion.match(prompt, /dark navy/i);
    assertion.doesNotMatch(prompt, /chart|arrow/i);
  });

  await test("article image briefing prompt falls back for unknown driver", () => {
    const prompt = buildBriefingImagePrompt({ dailyLead: { driverType: "unknown" } });
    assertion.match(prompt, /pre-dawn Indian financial district skyline/i);
  });

  await test("article image move prompt varies positive and negative tone", () => {
    assertion.match(buildMoveImagePrompt({ entityName: "Nifty IT", change: 1.2 }), /golden|amber/i);
    assertion.match(buildMoveImagePrompt({ entityName: "Nifty IT", change: -1.2 }), /cool blue|shadow/i);
  });

  await test("article image generation skips missing api key", async () => {
    let called = false;
    const result = await generateArticleImage("test", { apiKey: "", fetcher: async () => { called = true; } });
    assertion.equal(result, null);
    assertion.equal(called, false);
  });

  await test("article image generation returns null on provider error", async () => {
    const result = await generateArticleImage("test", {
      apiKey: "test-key",
      fetcher: async () => ({ ok: false, status: 500 })
    });
    assertion.equal(result, null);
  });

  await test("gemini image provider defaults to available image model", async () => {
    let requestedUrl = "";
    const result = await generateArticleImage("test", {
      provider: "gemini",
      apiKey: "test-key",
      fetcher: async (url) => {
        requestedUrl = url;
        return {
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ inlineData: { data: Buffer.from("jpg").toString("base64") } }] } }]
          })
        };
      }
    });
    assertion.ok(Buffer.isBuffer(result));
    assertion.match(requestedUrl, /gemini-3\.1-flash-image:generateContent$/);
  });

  await test("openai image provider returns base64 image bytes", async () => {
    let requestBody = null;
    const result = await generateArticleImage("test", {
      provider: "openai",
      apiKey: "test-key",
      fetcher: async (_url, request) => {
        requestBody = JSON.parse(request.body);
        return {
          ok: true,
          json: async () => ({ data: [{ b64_json: Buffer.from("jpg").toString("base64") }] })
        };
      }
    });
    assertion.ok(Buffer.isBuffer(result));
    assertion.equal(requestBody.model, "gpt-image-1");
    assertion.equal(requestBody.output_format, "jpeg");
  });

  await test("nvidia image provider uses hosted Flux contract", async () => {
    let requestedUrl = "";
    let requestBody = null;
    const result = await generateArticleImage("test", {
      provider: "nvidia",
      apiKey: "test-key",
      fetcher: async (url, request) => {
        requestedUrl = url;
        requestBody = JSON.parse(request.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ artifacts: [{ base64: Buffer.from("jpg").toString("base64") }] })
        };
      }
    });
    assertion.ok(Buffer.isBuffer(result));
    assertion.match(requestedUrl, /black-forest-labs\/flux\.1-schnell$/);
    assertion.equal(requestBody.steps, 4);
    assertion.equal("model" in requestBody, false);
  });

  await test("article image prompts avoid forbidden compliance words", () => {
    const prompts = [
      buildBriefingImagePrompt({ dailyLead: { driverType: "crude" } }),
      buildBriefingImagePrompt({ dailyLead: { driverType: "geopolitical_risk" } }),
      buildBriefingImagePrompt({ dailyLead: { driverType: "rbi_policy" } }),
      buildBriefingImagePrompt({ dailyLead: { driverType: "unknown" } }),
      buildMoveImagePrompt({ entityName: "Nifty 50", change: 1 }),
      buildMoveImagePrompt({ entityName: "Bank Nifty", change: -1 })
    ];
    for (const prompt of prompts) {
      for (const phrase of FORBIDDEN) {
        assertion.doesNotMatch(prompt, new RegExp(`\\b${phrase}\\b`, "i"), `prompt should not include ${phrase}`);
      }
    }
  });
}

async function localTest(_name, fn) {
  await fn();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runGenerateArticleImageTests();
  process.stdout.write("PASS generate-article-image tests\n");
}
