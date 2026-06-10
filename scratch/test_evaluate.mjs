import { fetchLiveNewsArticles } from '../tools/news-sources.mjs';

process.env.PULSE_MODE = "true";

async function run() {
  console.log("Fetching live news articles using Pulse Engine...");
  try {
    const articles = await fetchLiveNewsArticles('2026-06-10', { 
      strictFetch: false, 
      llmArticleEnrichment: true,
      agentArticleEnrichment: true
    });
    
    console.log(`\nAgent selected ${articles.length} articles.\n`);
    articles.forEach((a, i) => {
      console.log(`[${i+1}] ${a.headline}`);
      console.log(`    Takeaway: ${a.takeaway || a.summary}`);
      console.log(`    Impact: ${a.indiaImpact}`);
      console.log(`    Category: ${a.category} | Sentiment: ${a.sentimentScore}`);
      console.log("");
    });
  } catch (err) {
    console.error("Error during evaluation:", err);
  }
}

run();
