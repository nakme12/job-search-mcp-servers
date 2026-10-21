import "dotenv/config";
import fs from "fs";
import path from "path";

// Load tracker to avoid re-harvesting already applied or seen URLs
const trackerPath = path.resolve("applied_and_seen_tracker.json");
let tracker = { applied: [], seen: [] };
if (fs.existsSync(trackerPath)) {
  try {
    tracker = JSON.parse(fs.readFileSync(trackerPath, "utf8"));
  } catch (e) {
    console.error("Tracker parse error:", e.message);
  }
}

const seenUrls = new Set([
  ...(tracker.seen || []),
  ...(tracker.applied || []).map((a) => a.url).filter(Boolean),
]);

console.log(`[HARVEST] Tracker loaded: ${tracker.applied?.length || 0} applied, ${seenUrls.size} seen URLs.`);

const harvested = [];

async function harvestGoogleJobs() {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return;
  console.log("\n📡 Querying Google Jobs (SerpApi)...");
  const queries = [
    "React developer Indore",
    "Frontend developer Indore",
    "Frontend engineer Remote India 1 year experience",
    "React developer Remote India 0-2 years",
  ];

  for (const q of queries) {
    try {
      const url = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(q)}&api_key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const jobs = data.jobs_results || [];
      console.log(` -> Query "${q}": found ${jobs.length} raw jobs`);

      for (const j of jobs) {
        const title = j.title || "";
        const lowerTitle = title.toLowerCase();

        // Rule 32: Positive Frontend / React Whitelist & Non-Stack Ban
        if (
          lowerTitle.includes("senior") ||
          lowerTitle.includes("lead") ||
          lowerTitle.includes("principal") ||
          lowerTitle.includes("architect") ||
          lowerTitle.includes("manager") ||
          lowerTitle.includes("native") ||
          lowerTitle.includes("flutter") ||
          lowerTitle.includes("devops")
        ) {
          continue;
        }

        const applyOptions = j.apply_options || [];
        const targetUrl = applyOptions[0]?.link || j.share_link || "";
        if (!targetUrl || seenUrls.has(targetUrl)) continue;

        harvested.push({
          source: "google_jobs",
          title: j.title,
          company: j.company_name,
          location: j.location,
          url: targetUrl,
          posted_at: j.detected_extensions?.posted_at || "Recent",
          description_snippet: j.description?.slice(0, 300) || "",
        });
        seenUrls.add(targetUrl);
      }
    } catch (err) {
      console.error(`Google Jobs error for "${q}":`, err.message);
    }
  }
}

async function harvestRemoteOK() {
  console.log("\n📡 Querying RemoteOK API...");
  try {
    const res = await fetch("https://remoteok.com/api?tag=react", {
      headers: { "User-Agent": "JobSearchMCP/1.0" },
    });
    if (!res.ok) return;
    const data = await res.json();
    const jobs = Array.isArray(data) ? data.slice(1) : []; // first element is metadata
    console.log(` -> RemoteOK found ${jobs.length} raw jobs`);

    for (const j of jobs) {
      const title = j.position || "";
      const lowerTitle = title.toLowerCase();
      if (
        lowerTitle.includes("senior") ||
        lowerTitle.includes("lead") ||
        lowerTitle.includes("principal") ||
        lowerTitle.includes("architect") ||
        lowerTitle.includes("manager") ||
        lowerTitle.includes("native")
      ) {
        continue;
      }

      const targetUrl = j.url || `https://remoteok.com/l/${j.id}`;
      if (!targetUrl || seenUrls.has(targetUrl)) continue;

      harvested.push({
        source: "remoteok",
        title: j.position,
        company: j.company,
        location: j.location || "Remote",
        url: targetUrl,
        posted_at: j.date || "Recent",
        description_snippet: (j.description || "").slice(0, 300),
      });
      seenUrls.add(targetUrl);
    }
  } catch (err) {
    console.error("RemoteOK error:", err.message);
  }
}

async function harvestRemotive() {
  console.log("\n📡 Querying Remotive API...");
  try {
    const res = await fetch("https://remotive.com/api/remote-jobs?search=react");
    if (!res.ok) return;
    const data = await res.json();
    const jobs = data.jobs || [];
    console.log(` -> Remotive found ${jobs.length} raw jobs`);

    for (const j of jobs) {
      const title = j.title || "";
      const lowerTitle = title.toLowerCase();
      if (
        lowerTitle.includes("senior") ||
        lowerTitle.includes("lead") ||
        lowerTitle.includes("principal") ||
        lowerTitle.includes("architect") ||
        lowerTitle.includes("manager") ||
        lowerTitle.includes("native")
      ) {
        continue;
      }

      const targetUrl = j.url;
      if (!targetUrl || seenUrls.has(targetUrl)) continue;

      harvested.push({
        source: "remotive",
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || "Worldwide Remote",
        url: targetUrl,
        posted_at: j.publication_date || "Recent",
        description_snippet: (j.description || "").replace(/<[^>]+>/g, " ").slice(0, 300),
      });
      seenUrls.add(targetUrl);
    }
  } catch (err) {
    console.error("Remotive error:", err.message);
  }
}

async function harvestHackerNews() {
  console.log("\n📡 Querying Hacker News 'Who is Hiring' threads...");
  try {
    const threadRes = await fetch("https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=2");
    if (!threadRes.ok) return;
    const threadData = await threadRes.json();
    const hiringStory = (threadData.hits || []).find((h) => h.title && h.title.includes("Who is hiring"));
    if (!hiringStory) return;

    const commentsRes = await fetch(
      `https://hn.algolia.com/api/v1/search?tags=comment,story_${hiringStory.objectID}&query=React&hitsPerPage=20`
    );
    if (!commentsRes.ok) return;
    const commentsData = await commentsRes.json();
    const hits = commentsData.hits || [];
    console.log(` -> Hacker News found ${hits.length} raw developer hiring hits`);

    for (const c of hits) {
      const rawText = (c.comment_text || "").replace(/<[^>]+>/g, " ");
      const lower = rawText.toLowerCase();
      if (
        lower.includes("senior") ||
        lower.includes("staff") ||
        lower.includes("principal") ||
        lower.includes("architect") ||
        lower.includes("5+ years") ||
        lower.includes("3+ years")
      ) {
        continue;
      }

      const targetUrl = `https://news.ycombinator.com/item?id=${c.objectID}`;
      if (seenUrls.has(targetUrl)) continue;

      const firstLine = rawText.split("\n")[0] || "HN Developer Hiring";
      harvested.push({
        source: "hackernews",
        title: firstLine.slice(0, 80),
        company: c.author,
        location: "Remote / Global",
        url: targetUrl,
        posted_at: c.created_at,
        description_snippet: rawText.slice(0, 300),
      });
      seenUrls.add(targetUrl);
    }
  } catch (err) {
    console.error("Hacker News harvest error:", err.message);
  }
}

async function run() {
  await harvestGoogleJobs();
  await harvestRemoteOK();
  await harvestRemotive();
  await harvestHackerNews();

  console.log(`\n========================================`);
  console.log(`🎯 TOTAL FRESH UNSEEN QUALIFIED JOBS: ${harvested.length}`);
  console.log(`========================================`);

  const outputPath = path.resolve("scripts/fresh_harvest_pool.json");
  fs.writeFileSync(outputPath, JSON.stringify(harvested, null, 2));
  console.log(`Saved pool to: ${outputPath}`);
}

run();
