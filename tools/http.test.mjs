import { test } from "node:test";
import assert from "node:assert";
import { fetchWithRetry } from "./http.mjs";

test("http: fetchWithRetry handles success on first try", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  const res = await fetchWithRetry("https://example.com/test", { retries: 2, fetchImpl });
  assert.strictEqual(calls, 1);
  assert.ok(res.ok);
  const body = await res.json();
  assert.deepStrictEqual(body, { ok: true });
});

test("http: fetchWithRetry retries on transient failure and then succeeds", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    if (calls === 1) {
      return new Response("Internal Server Error", { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  const res = await fetchWithRetry("https://example.com/test", { retries: 2, fetchImpl });
  assert.strictEqual(calls, 2);
  assert.ok(res.ok);
});

test("http: fetchWithRetry throws after all retries fail", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return new Response("Internal Server Error", { status: 500 });
  };

  const res = await fetchWithRetry("https://example.com/test", { retries: 1, fetchImpl });
  assert.strictEqual(calls, 2);
  assert.strictEqual(res.ok, false);
});
