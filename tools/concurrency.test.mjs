import assert from "node:assert/strict";
import test from "node:test";
import { mapWithConcurrency } from "./limited-concurrency.mjs";
import { fetchLiveNewsArticles } from "./news-sources.mjs";

test("concurrency: mapper preserves order and enforces its limit", async () => {
  let active = 0;
  let maxActive = 0;
  const values = await mapWithConcurrency([0, 1, 2, 3, 4, 5, 6], 3, async (value) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 8 + ((value % 3) * 4)));
    active -= 1;
    return value * 2;
  });

  assert.deepEqual(values, [0, 2, 4, 6, 8, 10, 12]);
  assert.equal(maxActive, 3);
});

test("concurrency: live source ingestion uses the configured bound", async () => {
  let calls = 0;
  let active = 0;
  let maxActive = 0;
  const fetcher = async (url) => {
    calls += 1;
    const id = calls;
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 12));
    active -= 1;
    const body = String(url).includes("/features/rss/") ? "" : rssItem(id);
    return { ok: true, text: async () => body };
  };

  const articles = await fetchLiveNewsArticles("2026-07-01", {
    fetcher,
    newsFetchConcurrency: 4,
    nvidiaApiKey: "",
    llmArticleEnrichment: false
  });

  assert.ok(calls >= 20);
  assert.equal(maxActive, 4);
  assert.ok(articles.length >= 10);
});

test("concurrency: source failures remain fail-soft unless strict", async () => {
  const failure = async () => { throw new Error("source unavailable"); };
  const articles = await fetchLiveNewsArticles("2026-07-01", {
    fetcher: failure,
    newsFetchConcurrency: 4,
    nvidiaApiKey: "",
    llmArticleEnrichment: false
  });
  assert.deepEqual(articles, []);
  await assert.rejects(
    fetchLiveNewsArticles("2026-07-01", { fetcher: failure, strictFetch: true, newsFetchConcurrency: 4 }),
    /source unavailable/
  );
});

function rssItem(id) {
  return `<rss><channel><item>
    <title>RBI liquidity and Indian market update ${id}</title>
    <link>https://www.moneycontrol.com/news/business/markets/update-${100000 + id}.html</link>
    <description>RBI liquidity and bond yields changed the Indian equity market checklist.</description>
    <pubDate>Wed, 01 Jul 2026 01:00:00 GMT</pubDate>
  </item></channel></rss>`;
}
