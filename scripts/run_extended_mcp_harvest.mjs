import "dotenv/config";
import fs from "fs";
import path from "path";
import { evaluateExperience } from "../servers/experience-filter.js";
import { evaluateFreshness } from "../servers/freshness-filter.js";

const ROOT_DIR = "C:/mcp/job-search-mcp-engine";
const TODAY = "2026-10-21";
const SHIFT = 1;

const file1HistPath = path.join(ROOT_DIR, "total_historical_except_today.json");
const file3TodayShiftPath = path.join(ROOT_DIR, `total_todays_${TODAY}_shift${SHIFT}.json`);
const file3TodayPath = path.join(ROOT_DIR, `total_todays_${TODAY}.json`);
const scorecardPath = path.join(ROOT_DIR, "mcp_execution_scorecard_today.json");

// Read Historical Blacklist
let historicalJobs = [];
try {
  const hRaw = JSON.parse(fs.readFileSync(file1HistPath, "utf8"));
  historicalJobs = Array.isArray(hRaw) ? hRaw : (hRaw.jobs || []);
} catch (e) {
  console.error("Error reading historical jobs:", e.message);
}

function normalize(str) {
  if (!str) return "";
  return str.trim().toLowerCase().replace(/\/+$/, "");
}

const historicalSet = new Set(
  historicalJobs.map(j => normalize(j.recipient_or_url || j.url || j.applyUrl || j.link || j.recipient)).filter(Boolean)
);

// Read Today's Existing File 3
let todayPool = {
  date: TODAY,
  shift: SHIFT,
  cycle: 1,
  description: `Raw and candidate jobs discovered on ${TODAY} Shift ${SHIFT}`,
  total: 0,
  jobs: []
};

if (fs.existsSync(file3TodayPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(file3TodayPath, "utf8"));
    if (Array.isArray(raw.jobs)) todayPool.jobs = raw.jobs;
  } catch (e) {}
}

const seenToday = new Set(
  todayPool.jobs.map(j => normalize(j.url || j.recipient || j.applyUrl || j.link)).filter(Boolean)
);

let scorecard = {
  date: TODAY,
  shift: SHIFT,
  updated_at: new Date().toISOString(),
  metrics: {},
  total_pipeline_today: todayPool.jobs.length
};

if (fs.existsSync(scorecardPath)) {
  try {
    scorecard = JSON.parse(fs.readFileSync(scorecardPath, "utf8"));
  } catch (e) {}
}

const summaryBreakdown = {};

function ingestJob(job, sourceName) {
  if (!summaryBreakdown[sourceName]) {
    summaryBreakdown[sourceName] = { discovered: 0, out_of_range: 0, dup: 0, ingested: 0 };
  }
  summaryBreakdown[sourceName].discovered++;

  const url = (job.url || job.applyUrl || job.link || "").trim();
  const title = (job.title || job.role || job.position || "").trim();
  const company = (job.company || job.company_name || job.companyName || "Unknown").trim();
  const location = (job.location || job.jobGeo || job.job_location || "India / Remote").trim();
  const description = job.description || job.jobDescription || job.snippet || "";
  const datePosted = job.date_posted || job.date || job.pubDate || job.created_at || new Date().toISOString();

  if (!url || !title) return;

  const normUrl = normalize(url);
  if (seenToday.has(normUrl)) {
    summaryBreakdown[sourceName].dup++;
    return;
  }

  if (historicalSet.has(normUrl)) {
    summaryBreakdown[sourceName].dup++;
    return;
  }

  // Filter 0-2 YOE & Stack Check (Mandatory Frontend / React / Next / Web)
  const ev = evaluateExperience({ title, description, structuredMinYears: job.min_experience }, 2, true);
  if (ev.exclude || !ev.passes_whitelist || ev.is_non_stack) {
    summaryBreakdown[sourceName].out_of_range++;
    return;
  }

  seenToday.add(normUrl);

  let resume = "Pratik Patidar Resume - Frontend Engineer.pdf";
  const tLower = title.toLowerCase();
  if (tLower.includes("react") || tLower.includes("ui") || tLower.includes("next")) {
    resume = "Pratik Patidar Resume - React Developer.pdf";
  } else if (tLower.includes("mern") || tLower.includes("full stack") || tLower.includes("node")) {
    resume = "Pratik Patidar Resume - MERN Full Stack.pdf";
  }

  const entry = {
    id: todayPool.jobs.length + 1,
    company,
    role: title,
    location,
    url,
    source: sourceName,
    resume_mapped: resume,
    date_posted: datePosted,
    status: "DISCOVERED_PENDING_AUDIT",
    discovered_at: new Date().toISOString()
  };

  todayPool.jobs.push(entry);
  summaryBreakdown[sourceName].ingested++;
  console.log(`[+] [${sourceName}] ${company} - ${title} (${location})`);
}

// 1. Google Jobs via SerpApi
async function harvestGoogleJobs() {
  const source = "Google Jobs (SerpApi)";
  console.log(`\n--- Querying ${source} ---`);
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    console.log("No SERPAPI_API_KEY. Skipping.");
    return;
  }

  const queries = [
    { q: "react developer", location: "India" },
    { q: "frontend developer junior 1 year experience", location: "India" }
  ];

  for (const item of queries) {
    try {
      const url = new URL("https://serpapi.com/search");
      url.searchParams.set("engine", "google_jobs");
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("q", item.q);
      url.searchParams.set("location", item.location);
      url.searchParams.set("gl", "in");
      url.searchParams.set("hl", "en");

      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of (data.jobs_results || [])) {
        const applyUrl = (j.apply_options && j.apply_options[0]?.link) || (j.related_links && j.related_links[0]?.link) || j.share_link || "";
        ingestJob({
          title: j.title,
          company: j.company_name,
          location: j.location,
          description: j.description || "",
          url: applyUrl,
          date_posted: j.detected_extensions?.posted_at
        }, source);
      }
    } catch (e) {
      console.error(`Error querying Google Jobs:`, e.message);
    }
  }
}

// 2. Greenhouse ATS Boards
async function harvestGreenhouse() {
  const source = "Greenhouse ATS";
  console.log(`\n--- Querying ${source} ---`);
  const boards = [
    "stripe", "figma", "razorpay", "cred", "swiggy", "cars24", "airmeet", "invideo", "browserstack", "hackerrank", "clever-tap", "postman"
  ];

  for (const b of boards) {
    try {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(b)}/jobs?content=true`, {
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of (data.jobs || [])) {
        ingestJob({
          title: j.title,
          company: b.charAt(0).toUpperCase() + b.slice(1),
          location: j.location?.name || "India / Remote",
          description: (j.content || "").replace(/<[^>]+>/g, " "),
          url: j.absolute_url,
          date_posted: j.updated_at
        }, source);
      }
    } catch (e) {}
  }
}

// 3. Workable ATS Boards
async function harvestWorkable() {
  const source = "Workable ATS";
  console.log(`\n--- Querying ${source} ---`);
  const boards = ["huggingface", "superops", "headout", "junglee-games", "browserstack", "clevertap"];
  for (const b of boards) {
    try {
      const res = await fetch(`https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(b)}?details=true`, {
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of (data.jobs || [])) {
        ingestJob({
          title: j.title,
          company: b.charAt(0).toUpperCase() + b.slice(1),
          location: [j.city, j.country].filter(Boolean).join(", ") || "Remote",
          description: (j.description || "") + " " + (j.requirements || ""),
          url: j.url || j.shortlink,
          date_posted: j.published_on
        }, source);
      }
    } catch (e) {}
  }
}

// 4. SmartRecruiters ATS Boards
async function harvestSmartRecruiters() {
  const source = "SmartRecruiters ATS";
  console.log(`\n--- Querying ${source} ---`);
  const companies = ["Nagarro1", "PublicisSapient", "Cisco", "BoschGroup"];
  for (const c of companies) {
    try {
      const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(c)}/postings?limit=50&q=frontend`, {
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of (data.content || [])) {
        ingestJob({
          title: j.name,
          company: j.company?.name || c,
          location: [j.location?.city, j.location?.region, j.location?.country].filter(Boolean).join(", ") || "India",
          description: j.name,
          url: `https://jobs.smartrecruiters.com/${encodeURIComponent(c)}/${j.id}`,
          date_posted: j.releasedDate
        }, source);
      }
    } catch (e) {}
  }
}

// 5. JobsPipe API
async function harvestJobsPipe() {
  const source = "JobsPipe";
  console.log(`\n--- Querying ${source} ---`);
  const apiKey = process.env.JOBSPIPE_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch("https://api.jobspipe.dev/v1/jobs/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        job_title_or: ["Frontend", "React", "Next.js"],
        job_country_code_or: ["IN"],
        posted_at_max_age_days: 14,
        limit: 25
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      console.log(`JobsPipe response status: ${res.status}`);
      return;
    }
    const data = await res.json();
    for (const j of (data.jobs || data.results || [])) {
      ingestJob({
        title: j.job_title || j.title,
        company: j.company_name || j.company,
        location: j.job_location || j.location,
        description: j.description || "",
        url: j.apply_url || j.url || j.job_url,
        date_posted: j.date_posted || j.posted_at
      }, source);
    }
  } catch (e) {
    console.error("JobsPipe error:", e.message);
  }
}

// 6. TheirStack API
async function harvestTheirStack() {
  const source = "TheirStack";
  console.log(`\n--- Querying ${source} ---`);
  const apiKey = process.env.THEIRSTACK_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch("https://api.theirstack.com/v1/jobs/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        job_title_or: ["Frontend Developer", "React Developer", "Next.js Developer"],
        job_country_code_or: ["IN"],
        posted_at_max_age_days: 14,
        limit: 25
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      console.log(`TheirStack response status: ${res.status}`);
      return;
    }
    const data = await res.json();
    for (const j of (data.data || data.jobs || [])) {
      ingestJob({
        title: j.job_title || j.title,
        company: j.company_object?.name || j.company_name || j.company,
        location: j.job_location || j.location || "India",
        description: j.description || "",
        url: j.final_url || j.url,
        date_posted: j.date_posted
      }, source);
    }
  } catch (e) {
    console.error("TheirStack error:", e.message);
  }
}

// 7. HireBase API
async function harvestHireBase() {
  const source = "HireBase";
  console.log(`\n--- Querying ${source} ---`);
  const apiKey = process.env.HIREBASE_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch("https://api.hirebase.org/v2/jobs/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        job_titles: ["React Developer", "Frontend Developer"],
        geo_locations: [{ country: "India" }],
        limit: 20
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      console.log(`HireBase response status: ${res.status}`);
      return;
    }
    const data = await res.json();
    for (const j of (data.jobs || data.results || [])) {
      ingestJob({
        title: j.job_title || j.title,
        company: j.company_name || j.company,
        location: j.location || "India",
        description: j.description || "",
        url: j.application_url || j.url,
        date_posted: j.date_posted
      }, source);
    }
  } catch (e) {
    console.error("HireBase error:", e.message);
  }
}

// 8. HuntYourTribe API
async function harvestHuntYourTribe() {
  const source = "HuntYourTribe";
  console.log(`\n--- Querying ${source} ---`);
  try {
    const res = await fetch("https://api.huntyourtribe.com/api/external-jobs?department=Engineering&skills=React&country=India&page=1&limit=20", {
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      console.log(`HuntYourTribe status: ${res.status}`);
      return;
    }
    const data = await res.json();
    const companies = data.data || data.results || [];
    for (const group of companies) {
      const companyName = group.company || group.company_name || "Startup";
      for (const j of (group.jobs || [])) {
        ingestJob({
          title: j.role_name || j.title,
          company: companyName,
          location: j.city || j.country || "India",
          description: j.description || "",
          url: j.apply_url || j.url || `https://huntyourtribe.com/jobs/${j.id}`,
          date_posted: j.posted_date || j.created_at
        }, source);
      }
    }
  } catch (e) {
    console.error("HuntYourTribe error:", e.message);
  }
}

// 9. Instahyre API
async function harvestInstahyre() {
  const source = "Instahyre";
  console.log(`\n--- Querying ${source} ---`);
  try {
    // Instahyre public job search endpoint
    const url = "https://www.instahyre.com/api/v1/job_search/?job_functions=3&experience_level=entry_level&offset=0";
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      console.log(`Instahyre status: ${res.status}`);
      return;
    }
    const data = await res.json();
    for (const j of (data.objects || data.jobs || [])) {
      ingestJob({
        title: j.title,
        company: j.employer?.name || "Instahyre Employer",
        location: (j.locations || []).join(", ") || "India",
        description: (j.keywords || []).join(", "),
        url: `https://www.instahyre.com/job-${j.id}-${(j.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}/`,
        date_posted: new Date().toISOString()
      }, source);
    }
  } catch (e) {
    console.error("Instahyre error:", e.message);
  }
}

// 10. The Muse API
async function harvestTheMuse() {
  const source = "The Muse";
  console.log(`\n--- Querying ${source} ---`);
  try {
    const res = await fetch("https://www.themuse.com/api/public/jobs?category=Software%20Engineering&level=Entry%20Level&page=0", {
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      console.log(`The Muse status: ${res.status}`);
      return;
    }
    const data = await res.json();
    for (const j of (data.results || [])) {
      ingestJob({
        title: j.name,
        company: j.company?.name || "Company",
        location: (j.locations || []).map(l => l.name).join(", ") || "Remote",
        description: (j.contents || "").replace(/<[^>]+>/g, " "),
        url: j.refs?.landing_page,
        date_posted: j.publication_date
      }, source);
    }
  } catch (e) {
    console.error("The Muse error:", e.message);
  }
}

// 11. We Work Remotely (WWR) RSS
async function harvestWWR() {
  const source = "WeWorkRemotely";
  console.log(`\n--- Querying ${source} ---`);
  try {
    const res = await fetch("https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss", {
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return;
    const xml = await res.text();
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const chunk = m[1];
      const titleMatch = chunk.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || chunk.match(/<title>(.*?)<\/title>/);
      const linkMatch = chunk.match(/<link>(.*?)<\/link>/) || chunk.match(/<guid>(.*?)<\/guid>/);
      const descMatch = chunk.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || chunk.match(/<description>(.*?)<\/description>/);
      const pubDateMatch = chunk.match(/<pubDate>(.*?)<\/pubDate>/);

      const rawTitle = titleMatch ? titleMatch[1].trim() : "";
      const rawUrl = linkMatch ? linkMatch[1].trim() : "";
      const rawDesc = descMatch ? descMatch[1].replace(/<[^>]+>/g, " ").trim() : "";
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();

      let company = "Startup";
      let role = rawTitle;
      if (rawTitle.includes(":")) {
        const parts = rawTitle.split(":");
        company = parts[0].trim();
        role = parts.slice(1).join(":").trim();
      }

      ingestJob({
        title: role,
        company,
        location: "Remote",
        description: rawDesc,
        url: rawUrl,
        date_posted: pubDate
      }, source);
    }
  } catch (e) {
    console.error("WWR error:", e.message);
  }
}

// 12. Working Nomads
async function harvestWorkingNomads() {
  const source = "WorkingNomads";
  console.log(`\n--- Querying ${source} ---`);
  try {
    const res = await fetch("https://www.workingnomads.com/api/exposed_jobs/", {
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return;
    const data = await res.json();
    const jobs = Array.isArray(data) ? data : [];
    for (const j of jobs) {
      if ((j.category_name || "").toLowerCase().includes("development")) {
        ingestJob({
          title: j.title,
          company: j.company_name,
          location: j.location || "Remote",
          description: (j.description || "") + " " + (j.tags || ""),
          url: j.url,
          date_posted: j.pub_date
        }, source);
      }
    }
  } catch (e) {
    console.error("WorkingNomads error:", e.message);
  }
}

// 13. Hacker News & Y Combinator
async function harvestHNAndYC() {
  const source = "Hacker News & YC";
  console.log(`\n--- Querying ${source} ---`);
  try {
    // Latest Ask HN Who is hiring thread
    const threadRes = await fetch("https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=2", {
      signal: AbortSignal.timeout(6000)
    });
    if (!threadRes.ok) return;
    const threadData = await threadRes.json();
    const hiringStory = (threadData.hits || []).find(h => h.title && h.title.includes("Who is hiring"));
    if (!hiringStory) return;

    for (const kw of ["React", "Frontend"]) {
      const commentsRes = await fetch(
        `https://hn.algolia.com/api/v1/search?tags=comment,story_${hiringStory.objectID}&query=${encodeURIComponent(kw)}&hitsPerPage=30`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!commentsRes.ok) continue;
      const commentsData = await commentsRes.json();
      for (const c of (commentsData.hits || [])) {
        const text = (c.comment_text || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&");
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        const headline = lines[0] || "";
        const parts = headline.split("|").map(p => p.trim());
        const company = parts[0] || "YC / HN Company";
        const role = parts[1] || `${kw} Developer`;
        const linkMatch = text.match(/https?:\/\/[^\s"<]+/);
        const url = linkMatch ? linkMatch[0] : `https://news.ycombinator.com/item?id=${c.objectID}`;

        ingestJob({
          title: role,
          company,
          location: "Remote / Global",
          description: text,
          url,
          date_posted: c.created_at
        }, source);
      }
    }
  } catch (e) {
    console.error("HN error:", e.message);
  }
}

async function run() {
  console.log("=======================================================");
  console.log("🚀 STARTING EXTENDED MCP HARVEST FOR REMAINING SERVERS");
  console.log("=======================================================");

  await harvestGoogleJobs();
  await harvestGreenhouse();
  await harvestWorkable();
  await harvestSmartRecruiters();
  await harvestJobsPipe();
  await harvestTheirStack();
  await harvestHireBase();
  await harvestHuntYourTribe();
  await harvestInstahyre();
  await harvestTheMuse();
  await harvestWWR();
  await harvestWorkingNomads();
  await harvestHNAndYC();

  todayPool.total = todayPool.jobs.length;
  fs.writeFileSync(file3TodayShiftPath, JSON.stringify(todayPool, null, 2), "utf8");
  fs.writeFileSync(file3TodayPath, JSON.stringify(todayPool, null, 2), "utf8");

  scorecard.total_pipeline_today = todayPool.total;
  fs.writeFileSync(scorecardPath, JSON.stringify(scorecard, null, 2), "utf8");

  console.log("\n=======================================================");
  console.log("🎯 EXTENDED MCP HARVEST BREAKDOWN");
  console.log("=======================================================");
  console.table(summaryBreakdown);
  console.log(`\nTotal verified leads now staged in File 3: ${todayPool.total}`);
}

run();
