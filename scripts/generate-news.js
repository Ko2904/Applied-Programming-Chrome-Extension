import { writeFileSync } from "node:fs";

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
if (!NEWSAPI_KEY) {
  throw new Error("Missing NEWSAPI_KEY environment variable");
}

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString().slice(0, 10);
}

// First two sentences of the article body, capped in length
function makeSummary(body) {
  const clean = (body ?? "").replace(/\s+/g, " ").trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  return sentences.length > 300 ? sentences.slice(0, 297) + "..." : sentences;
}

async function fetchArticles() {
  const res = await fetch("https://eventregistry.org/api/v1/article/getArticles", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "getArticles",
      resultType: "articles",
      keyword: ["stock market", "central bank", "inflation", "earnings", "interest rates", "S&P 500"],
      keywordOper: "or",
      keywordLoc: "title",
      sourceGroupUri: "business/top100",
      lang: "eng",
      dateStart: isoDaysAgo(1),
      isDuplicateFilter: "skipDuplicates",
      articlesSortBy: "socialScore",
      articlesCount: 40,
      articlesPage: 1,
      articleBodyLen: 600,
      apiKey: NEWSAPI_KEY
    })
  });
  if (!res.ok) throw new Error(`NewsAPI.ai error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const results = data?.articles?.results;
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("No articles returned. Raw response: " + JSON.stringify(data).slice(0, 500));
  }
  return results;
}

function pickTop3(articles) {
  const picked = [];
  const usedSources = new Set();

  // Results are already sorted by social score. Take one article per publisher.
  for (const a of articles) {
    const source = a.source?.title ?? "Unknown";
    if (!a.title || !a.url || (a.body ?? "").length < 80) continue;
    if (usedSources.has(source)) continue;
    usedSources.add(source);
    picked.push({
      headline: a.title,
      summary: makeSummary(a.body),
      source,
      url: a.url
    });
    if (picked.length === 3) break;
  }
  return picked;
}

async function main() {
  const articles = await fetchArticles();
  console.log(`Fetched ${articles.length} articles`);

  const items = pickTop3(articles);
  if (items.length === 0) throw new Error("No usable articles found");

  const output = {
    date: new Date().toISOString().slice(0, 10),
    items
  };
  writeFileSync("news.json", JSON.stringify(output, null, 2));
  console.log("news.json written:", items.map((i) => i.headline));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});