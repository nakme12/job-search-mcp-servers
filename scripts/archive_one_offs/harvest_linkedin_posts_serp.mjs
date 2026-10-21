import 'dotenv/config';
import https from 'https';
import fs from 'fs';

const key = process.env.SERPAPI_API_KEY;
if (!key) {
  console.error("No SERPAPI_API_KEY found");
  process.exit(1);
}

const queries = [
  'site:linkedin.com/posts "hiring" ("frontend developer" OR "react developer") ("0-2 years" OR "1-2 years" OR "fresher") India email',
  'site:linkedin.com/posts "hiring" "mern stack" ("0-2 years" OR "1-2 years" OR "fresher") India email',
  'site:linkedin.com/posts "react" "frontend" "hiring" "share your resume" ("0-2" OR "1-2" OR "fresher") India'
];

async function runQuery(q) {
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&api_key=${key}&tbs=qdr:w`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.organic_results || []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

async function main() {
  console.log("Searching SerpApi for LinkedIn hiring posts (past week)...");
  const allResults = [];
  for (const q of queries) {
    const results = await runQuery(q);
    console.log(`Query: ${q.slice(0, 45)}... => ${results.length} posts found`);
    allResults.push(...results);
  }

  // Deduplicate by link
  const seen = new Set();
  const deduped = [];
  for (const item of allResults) {
    if (!seen.has(item.link)) {
      seen.add(item.link);
      deduped.push({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        source: 'LinkedIn Post (Google Index)'
      });
    }
  }

  console.log(`Total unique LinkedIn posts harvested: ${deduped.length}`);
  fs.writeFileSync('scripts/live_harvested_surfed_jobs.json', JSON.stringify(deduped, null, 2));
  console.log("Saved to scripts/live_harvested_surfed_jobs.json");
}

main();
