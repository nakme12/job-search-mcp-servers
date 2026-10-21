import fs from "fs";
import path from "path";
import { evaluateExperience } from "../servers/experience-filter.js";

const ROOT_DIR = "C:/mcp/job-search-mcp-engine";
const TODAY = "2026-10-21";
const SHIFT = 1;

// Parse .env manually
const envLines = fs.readFileSync(path.join(ROOT_DIR, ".env"), "utf8").split("\n");
const env = {};
for (const l of envLines) {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let val = (m[2] || "").trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[m[1]] = val;
  }
}

console.log("Keys loaded:");
console.log("- SERPAPI_API_KEY:", !!env.SERPAPI_API_KEY);
console.log("- JOBSPIPE_API_KEY:", !!env.JOBSPIPE_API_KEY);
console.log("- THEIRSTACK_API_KEY:", !!env.THEIRSTACK_API_KEY);
console.log("- HIREBASE_API_KEY:", !!env.HIREBASE_API_KEY);
console.log("- APIFY_API_TOKEN:", !!env.APIFY_API_TOKEN);

const file1HistPath = path.join(ROOT_DIR, "total_historical_except_today.json");
const file3TodayShiftPath = path.join(ROOT_DIR, `total_todays_${TODAY}_shift${SHIFT}.json`);
const file3TodayPath = path.join(ROOT_DIR, `total_todays_${TODAY}.json`);
const scorecardPath = path.join(ROOT_DIR, "mcp_execution_scorecard_today.json");

let historicalJobs = [];
try {
  const hRaw = JSON.parse(fs.readFileSync(file1HistPath, "utf8"));
  historicalJobs = Array.isArray(hRaw) ? hRaw : (hRaw.jobs || []);
} catch (e) {}

function normalize(str) {
  if (!str) return "";
  return str.trim().toLowerCase().replace(/\/+$/, "");
}

const historicalSet = new Set(
  historicalJobs.map(j => normalize(j.recipient_or_url || j.url || j.applyUrl || j.link || j.recipient)).filter(Boolean)
);

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
async function testGoogleJobs() {
  const source = "Google Jobs (SerpApi)";
  console.log(`\n--- Querying ${source} ---`);
  if (!env.SERPAPI_API_KEY) return;
  try {
    const url = new URL("https://serpapi.com/search");
    url.searchParams.set("engine", "google_jobs");
    url.searchParams.set("api_key", env.SERPAPI_API_KEY);
    url.searchParams.set("q", "React developer India");
    url.searchParams.set("location", "India");
    url.searchParams.set("gl", "in");
    url.searchParams.set("hl", "en");

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    console.log("Google Jobs HTTP Status:", res.status);
    const data = await res.json();
    if (data.error) {
      console.log("Google Jobs SerpApi error:", data.error);
    } else {
      console.log(`Found ${(data.jobs_results || []).length} results from Google Jobs.`);
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
    }
  } catch (e) {
    console.error("Google Jobs error:", e.message);
  }
}

// 2. JobsPipe
async function testJobsPipe() {
  const source = "JobsPipe";
  console.log(`\n--- Querying ${source} ---`);
  if (!env.JOBSPIPE_API_KEY) return;
  try {
    const res = await fetch("https://api.jobspipe.dev/v1/jobs/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.JOBSPIPE_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        job_title_or: ["Frontend", "React"],
        limit: 25
      }),
      signal: AbortSignal.timeout(10000)
    });
    console.log("JobsPipe HTTP Status:", res.status);
    const data = await res.json();
    const list = data.jobs || data.data || [];
    console.log(`JobsPipe returned ${list.length} jobs.`);
    for (const j of list) {
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

// 3. TheirStack
async function testTheirStack() {
  const source = "TheirStack";
  console.log(`\n--- Querying ${source} ---`);
  if (!env.THEIRSTACK_API_KEY) return;
  try {
    const res = await fetch("https://api.theirstack.com/v1/jobs/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.THEIRSTACK_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        job_title_or: ["React Developer", "Frontend Developer"],
        limit: 25
      }),
      signal: AbortSignal.timeout(10000)
    });
    console.log("TheirStack HTTP Status:", res.status);
    const data = await res.json();
    const list = data.data || data.jobs || [];
    console.log(`TheirStack returned ${list.length} jobs.`);
    for (const j of list) {
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

// 4. HireBase
async function testHireBase() {
  const source = "HireBase";
  console.log(`\n--- Querying ${source} ---`);
  if (!env.HIREBASE_API_KEY) return;
  try {
    const res = await fetch("https://api.hirebase.org/v2/jobs/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.HIREBASE_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        job_titles: ["React Developer", "Frontend Developer"],
        limit: 20
      }),
      signal: AbortSignal.timeout(10000)
    });
    console.log("HireBase HTTP Status:", res.status);
    const data = await res.json();
    const list = data.jobs || data.data || data.results || [];
    console.log(`HireBase returned ${list.length} jobs.`);
    for (const j of list) {
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

// 5. Instahyre Fix
async function testInstahyre() {
  const source = "Instahyre";
  console.log(`\n--- Querying ${source} ---`);
  try {
    const url = "https://www.instahyre.com/api/v1/job_search/?job_functions=3&experience_level=entry_level&offset=0";
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      },
      signal: AbortSignal.timeout(10000)
    });
    console.log("Instahyre HTTP Status:", res.status);
    const data = await res.json();
    const list = data.objects || data.jobs || [];
    console.log(`Instahyre returned ${list.length} jobs.`);
    for (const j of list) {
      let loc = "India";
      if (Array.isArray(j.locations)) {
        loc = j.locations.map(l => (typeof l === 'string' ? l : l.city || l.name || '')).filter(Boolean).join(", ");
      } else if (typeof j.location === 'string') {
        loc = j.location;
      }
      ingestJob({
        title: j.title,
        company: j.employer?.name || "Instahyre Employer",
        location: loc || "India",
        description: Array.isArray(j.keywords) ? j.keywords.join(", ") : (j.description || ""),
        url: `https://www.instahyre.com/job-${j.id}-${(j.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}/`,
        date_posted: new Date().toISOString()
      }, source);
    }
  } catch (e) {
    console.error("Instahyre error:", e.message);
  }
}

async function run() {
  await testGoogleJobs();
  await testJobsPipe();
  await testTheirStack();
  await testHireBase();
  await testInstahyre();

  todayPool.total = todayPool.jobs.length;
  fs.writeFileSync(file3TodayShiftPath, JSON.stringify(todayPool, null, 2), "utf8");
  fs.writeFileSync(file3TodayPath, JSON.stringify(todayPool, null, 2), "utf8");

  console.log("\n=======================================================");
  console.log("🎯 REFINED BATCH HARVEST BREAKDOWN");
  console.log("=======================================================");
  console.table(summaryBreakdown);
  console.log(`\nTotal verified leads now staged in File 3: ${todayPool.total}`);
}

run();
