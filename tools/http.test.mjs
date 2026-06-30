import { test } from "node:test";
import assert from "node:assert";
import { fetchWithRetry } from "./http.mjs";

test("http: fetchWithRetry handles success on first try", async () => {
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls++;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  try {
    const res = await fetchWithRetry("https://example.com/test", { retries: 2 });
    assert.strictEqual(calls, 1);
    assert.ok(res.ok);
    const body = await res.json();
    assert.deepStrictEqual(body, { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("http: fetchWithRetry retries on transient failure and then succeeds", async () => {
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls++;
    if (calls === 1) {
      return new Response("Internal Server Error", { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  try {
    const res = await fetchWithRetry("https://example.com/test", { retries: 2 });
    assert.strictEqual(calls, 2);
    assert.ok(res.ok);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("http: fetchWithRetry throws after all retries fail", async () => {
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls++;
    return new Response("Internal Server Error", { status: 500 });
  };

  try {
    const res = await fetchWithRetry("https://example.com/test", { retries: 1 });
    assert.strictEqual(calls, 2);
    assert.strictEqual(res.ok, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
