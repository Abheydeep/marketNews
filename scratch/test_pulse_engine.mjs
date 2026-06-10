import { fetchLiveNewsArticles } from '../tools/news-sources.mjs';

process.env.PULSE_MODE = "true";
// Also need to set GEMINI_API_KEY so agent runs. We can just test without agent first or with mock key.
// But actually the system has access to environment variables, wait. We don't have GEMINI_API_KEY here unless set.

fetchLiveNewsArticles('2026-06-10', { 
  strictFetch: false, 
  llmArticleEnrichment: false,
  agentArticleEnrichment: false
}).then(articles => {
  console.log(`Found ${articles.length} Pulse articles inside 20hr window.`);
  if (articles.length > 0) {
    console.log("First article:", articles[0].headline, "Published:", articles[0].publishedAt);
  }
}).catch(console.error);
