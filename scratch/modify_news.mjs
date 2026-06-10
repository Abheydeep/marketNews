import fs from 'fs';

let content = fs.readFileSync('/Users/abheydeep/projects/marketNews/tools/news-sources.mjs', 'utf8');

// 1. fetchLiveNewsArticles
content = content.replace(
  /export async function fetchLiveNewsArticles\(date, options = \{\}\) \{[\s\S]*?return enrichArticlesWithEditorialLLM\(selectedArticles, options\);\n\}/,
`export async function fetchLiveNewsArticles(date, options = {}) {
  const fetcher = options.fetcher ?? fetch;
  const isPulseMode = process.env.PULSE_MODE === "true" || options.pulseMode === true;
  const activeFeeds = isPulseMode ? LIVE_FEEDS.filter(f => f.sourceId === "zerodha-pulse") : LIVE_FEEDS;
  const feedResults = [];
  for (const feed of activeFeeds) {
    try {
      if (feed.type === "rss") {
        const xml = await fetchText(feed.url, fetcher);
        feedResults.push(...parseRssItems(xml).map((item) => normalizeLiveArticle(date, feed, item)));
      } else if (feed.sourceId === "zerodha-pulse" && feed.type === "html-index") {
        const html = await fetchText(feed.url, fetcher);
        feedResults.push(...parsePulseHtmlItems(html, feed.url).map((item) => normalizeLiveArticle(date, feed, item)));
      } else if (feed.type === "html-index") {
        const html = await fetchText(feed.url, fetcher);
        feedResults.push(...parseHtmlIndexItems(html, feed.url).map((item) => normalizeLiveArticle(date, feed, item)));
      } else if (feed.type === "moneycontrol-source-page") {
        const html = await fetchText(feed.url, fetcher);
        const moneycontrolFeeds = moneycontrolFeedUrls(html).slice(0, 6);
        for (const rssUrl of moneycontrolFeeds) {
          const xml = await fetchText(rssUrl, fetcher);
          feedResults.push(...parseRssItems(xml).map((item) => normalizeLiveArticle(date, {
            ...feed,
            sourceName: moneycontrolSourceName(rssUrl),
            sourceId: \`moneycontrol-\${slugify(moneycontrolSourceName(rssUrl))}\`,
            url: rssUrl
          }, item)));
        }
      }
    } catch (error) {
      if (options.strictFetch) {
        throw error;
      }
      console.warn(\`[news-source] \${feed.sourceName} skipped: \${error.message}\`);
    }
  }
  
  let verifiedArticles = dedupeArticles(feedResults)
    .filter((article) => sourceUrlLooksArticleLevel(article.sourceUrl));
    
  if (!isPulseMode) {
    verifiedArticles = verifiedArticles.filter(articleLooksMarketRelevant);
  }
  
  verifiedArticles = verifiedArticles.filter((article) => articleIsFreshForDigest(article, date, isPulseMode));
  
  let selectedArticles;
  if (isPulseMode) {
    selectedArticles = await agentSelectPulseArticles(prioritizeDigestWindowArticles(verifiedArticles, date), options);
  } else {
    selectedArticles = selectDiverseArticles(prioritizeDigestWindowArticles(verifiedArticles, date), 60);
  }
  return enrichArticlesWithEditorialLLM(selectedArticles, options);
}`
);

// 2. resolveNewsArticles (pass isPulseMode)
content = content.replace(
  /const verification = verifySourceArticles\(articles, \{\n    mode,\n    previousDigest: options\.previousDigest\n  \}\);/,
  `const verification = verifySourceArticles(articles, {
    mode,
    previousDigest: options.previousDigest,
    isPulseMode: process.env.PULSE_MODE === "true" || options.pulseMode === true
  });`
);

// 3. verifySourceArticles (accept isPulseMode)
content = content.replace(
  /export function verifySourceArticles\(articles, options = \{\}\) \{[\s\S]*?const blockedReason = firstBlockedReason\(\{/,
  `export function verifySourceArticles(articles, options = {}) {
  const mode = normalizeNewsMode(options.mode ?? "fixture");
  const isPulseMode = options.isPulseMode === true;
  const verified = (articles ?? []).filter((article) =>
    sourceUrlLooksArticleLevel(article.sourceUrl) && (isPulseMode || articleLooksMarketRelevant(article))
  );
  const publisherCount = new Set(verified.map((article) => article.sourceName).filter(Boolean)).size;
  const categoryCount = new Set(verified.map((article) => article.category).filter(Boolean)).size;
  const sourceCategoryBucketCount = new Set(
    verified.map((article) => \`\${article.sourceName || "source"}::\${article.category || "market"}\`)
  ).size;
  const duplicateWithPreviousPercent = overlapWithPreviousPercent(verified, options.previousDigest);
  const duplicateWithinCurrentPercent = duplicateWithinCurrentPercentForArticles(verified);

  const blockedReason = firstBlockedReason({
    isPulseMode,`
);

// 4. firstBlockedReason (bypass MIN_SOURCE_CATEGORY_BUCKETS)
content = content.replace(
  /function firstBlockedReason\(\{ verifiedArticleCount, sourceCategoryBucketCount, duplicateWithPreviousPercent, duplicateWithinCurrentPercent \}\) \{[\s\S]*?if \(sourceCategoryBucketCount < MIN_SOURCE_CATEGORY_BUCKETS\) \{/,
  `function firstBlockedReason({ isPulseMode, verifiedArticleCount, sourceCategoryBucketCount, duplicateWithPreviousPercent, duplicateWithinCurrentPercent }) {
  if (verifiedArticleCount < MIN_VERIFIED_ARTICLES) {
    return \`only \${verifiedArticleCount} verified article links; need at least \${MIN_VERIFIED_ARTICLES}\`;
  }
  if (!isPulseMode && sourceCategoryBucketCount < MIN_SOURCE_CATEGORY_BUCKETS) {`
);

// 5. articleIsFreshForDigest
content = content.replace(
  /function articleIsFreshForDigest\(article, digestDate\) \{[\s\S]*?return ageHours <= 120 && ageHours >= -48;\n\}/,
  `function articleIsFreshForDigest(article, digestDate, isPulseMode = false) {
  const published = Date.parse(article.publishedAt);
  const digestTime = Date.parse(\`\${digestDate}T07:15:00+05:30\`);
  if (!Number.isFinite(published) || !Number.isFinite(digestTime)) {
    return true;
  }
  const ageHours = (digestTime - published) / (60 * 60 * 1000);
  if (isPulseMode) {
    return ageHours <= 20 && ageHours >= -48;
  }
  return ageHours <= 120 && ageHours >= -48;
}`
);

// 6. append parsePulseHtmlItems and agentSelectPulseArticles
content += `\n
function parsePulseHtmlItems(html, baseUrl) {
  const seen = new Set();
  const items = [];
  const listItems = [...String(html).matchAll(/<li\\b[^>]*class=["'][^"']*box item[^"']*["'][^>]*>([\\s\\S]*?)<\\/li>/gi)];
  
  for (const liMatch of listItems) {
    const liHtml = liMatch[1];
    const linkMatch = liHtml.match(/<a\\b[^>]*href=["']([^"']+)["'][^>]*>([\\s\\S]*?)<\\/a>/i);
    const dateMatch = liHtml.match(/<span\\b[^>]*class=["'][^"']*date[^"']*["'][^>]*title=["']([^"']+)["'][^>]*>/i);
    
    if (!linkMatch) continue;
    
    const title = cleanText(linkMatch[2]);
    if (!title || title.length < 18 || title.length > 180) continue;
    
    const link = absoluteUrl(linkMatch[1], baseUrl);
    if (!link || seen.has(link) || !sourceUrlLooksArticleLevel(link)) continue;
    
    seen.add(link);
    
    let publishedAt = "";
    if (dateMatch) {
      const rawDate = cleanText(dateMatch[1]);
      const parts = rawDate.split(", ");
      if (parts.length === 2) {
        const [time, dateStr] = parts;
        const parsed = new Date(\`\${dateStr} \${time} UTC+05:30\`);
        if (!isNaN(parsed.getTime())) {
          publishedAt = parsed.toISOString();
        }
      }
    }
    
    items.push({ title, link, publishedAt, summary: title });
  }
  return items;
}

export async function agentSelectPulseArticles(articles, options = {}) {
  const agentMode = shouldUseAgentArticleEnrichment(options);
  if (!agentMode) {
    return articles;
  }
  const fetcher = options.llmFetcher ?? fetch;
  const geminiApiKey = options.geminiApiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!geminiApiKey) {
     return articles;
  }
  
  if (articles.length === 0) return [];

  const prompt = "You are a pre-market desk editor.\\nSelect the most important market-moving articles from the following list.\\nExclude noise, generic opinion pieces, and non-market news.\\nReturn a JSON array of the IDs (indices) of the selected articles.\\nExample output: [0, 3, 5]";

  const inputList = articles.map((a, i) => \`[\${i}] \${a.headline} - \${a.sourceName}\`).join("\\n");

  try {
    const response = await fetcher(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent\`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": geminiApiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt }] },
          contents: [{ role: "user", parts: [{ text: inputList }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: { type: "INTEGER" }
            }
          }
        })
    });
    if (!response?.ok) {
      console.warn("Agent selection failed, falling back to all articles");
      return articles;
    }
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const indices = JSON.parse(text);
    if (Array.isArray(indices) && indices.length > 0) {
      return indices.map(i => articles[i]).filter(Boolean);
    }
  } catch (e) {
    console.warn("Agent selection parsing failed", e.message);
  }
  return articles;
}
`;

fs.writeFileSync('/Users/abheydeep/projects/marketNews/tools/news-sources.mjs', content);
