import "dotenv/config";
import fs from "fs";
import path from "path";
import { evaluateExperience } from "../servers/experience-filter.js";

const ROOT_DIR = "C:/mcp/job-search-mcp-engine";
const TODAY = process.argv[2] || new Date().toISOString().split("T")[0];
const SHIFT = parseInt(process.argv[3] || "1", 10);

const file1HistPath = path.join(ROOT_DIR, "total_historical_except_today.json");
const file3TodayShiftPath = path.join(ROOT_DIR, `total_todays_${TODAY}_shift${SHIFT}.json`);
const file3TodayPath = path.join(ROOT_DIR, `total_todays_${TODAY}.json`);
const pendingYesterdayPath = path.join(ROOT_DIR, "pending_queue_2026-10-15.json");
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

if (fs.existsSync(file3TodayPath)) { try { const raw = JSON.parse(fs.readFileSync(file3TodayPath, 'utf8')); if (Array.isArray(raw.jobs)) todayPool.jobs = raw.jobs; } catch (e) {} } if (false && fs.existsSync(file3TodayShiftPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(file3TodayShiftPath, "utf8"));
    if (Array.isArray(raw.jobs)) todayPool.jobs = raw.jobs;
  } catch (e) {}
}

const seenToday = new Set(
  todayPool.jobs.map(j => normalize(j.url || j.recipient || j.applyUrl || j.link)).filter(Boolean)
);

const scorecard = {
  date: TODAY,
  shift: SHIFT,
  updated_at: new Date().toISOString(),
  metrics: {},
  total_pipeline_today: 0
};

let totalDiscovered = 0;
let totalHistoricalDuplicates = 0;
let totalOutOfRange = 0;
let totalCleanIngested = 0;

function ingestJob(job, sourceName) {
  totalDiscovered++;
  const url = (job.url || job.applyUrl || job.link || "").trim();
  const title = (job.title || job.role || job.position || "").trim();
  const company = (job.company || job.company_name || job.companyName || "Unknown").trim();
  const location = (job.location || job.jobGeo || "India / Remote").trim();
  const description = job.description || job.jobDescription || "";
  const datePosted = job.date_posted || job.date || job.pubDate || new Date().toISOString();

  if (!url || !title) return;

  const normUrl = normalize(url);
  if (seenToday.has(normUrl)) return;

  if (historicalSet.has(normUrl)) {
    totalHistoricalDuplicates++;
    if (!scorecard.metrics[sourceName]) scorecard.metrics[sourceName] = { ran: true, scraped: 0, verified: 0, skipped_dup: 0, skipped_filter: 0 };
    scorecard.metrics[sourceName].skipped_dup++;
    return;
  }

  // Filter 0-2 YOE & Stack Check
  const ev = evaluateExperience({ title, description }, 2, true);
  if (ev.exclude || !ev.passes_whitelist || ev.is_non_stack) {
    totalOutOfRange++;
    if (!scorecard.metrics[sourceName]) scorecard.metrics[sourceName] = { ran: true, scraped: 0, verified: 0, skipped_dup: 0, skipped_filter: 0 };
    scorecard.metrics[sourceName].skipped_filter++;
    return;
  }

  seenToday.add(normUrl);

  // Resume mapping strictly to authorized 3 files
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
  totalCleanIngested++;

  if (!scorecard.metrics[sourceName]) scorecard.metrics[sourceName] = { ran: true, scraped: 0, verified: 0, skipped_dup: 0, skipped_filter: 0 };
  scorecard.metrics[sourceName].scraped++;
  scorecard.metrics[sourceName].verified++;

  console.log(`[Job ${todayPool.jobs.length}] + [${company}] ${title} | ${location} (${sourceName})`);
}

async function harvestPendingQueue() {
  console.log("\n📦 --- Ingesting Verified Pending Queue from Yesterday ---");
  if (!fs.existsSync(pendingYesterdayPath)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(pendingYesterdayPath, "utf8"));
    const jobs = Array.isArray(raw) ? raw : (raw.jobs || []);
    console.log(`Found ${jobs.length} candidate jobs in pending queue.`);
    for (const j of jobs) {
      ingestJob(j, j.source || "Pending Queue");
    }
  } catch (e) {
    console.error("Error reading pending queue:", e.message);
  }
}

async function harvestAshby() {
  console.log("\n--- [1/7] Harvesting Ashby ATS Boards ---");
  const source = "Ashby ATS";
  scorecard.metrics[source] = { ran: true, scraped: 0, verified: 0, skipped_dup: 0, skipped_filter: 0 };
  const boards = ["ramp", "langchain", "tavily", "resend", "posthog", "vapi", "cursor", "incident-io", "linear", "retool", "supabase", "pylon", "dust", "elevenlabs"];
  for (const b of boards) {
    try {
      const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${b}`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of (data.jobs || [])) {
        ingestJob({
          title: j.title,
          url: j.jobUrl,
          company: b.charAt(0).toUpperCase() + b.slice(1),
          location: j.location || "Remote / Hybrid",
          description: j.descriptionPlain || "",
          date_posted: j.publishedAt
        }, source);
      }
    } catch (e) {}
  }
}

async function harvestLever() {
  console.log("\n--- [2/7] Harvesting Lever ATS Boards ---");
  const source = "Lever ATS";
  scorecard.metrics[source] = { ran: true, scraped: 0, verified: 0, skipped_dup: 0, skipped_filter: 0 };
  const boards = ["postman", "meesho", "browserstack", "clevertap", "groww", "slice", "urbancompany", "zepto", "deliveroo"];
  for (const b of boards) {
    try {
      const res = await fetch(`https://api.lever.co/v0/postings/${b}?mode=json`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const jobs = await res.json();
      if (Array.isArray(jobs)) {
        for (const j of jobs) {
          ingestJob({
            title: j.text,
            url: j.hostedUrl || j.applyUrl,
            company: b.charAt(0).toUpperCase() + b.slice(1),
            location: (typeof j.categories?.location === "string" ? j.categories.location : "India"),
            description: j.descriptionPlain || "",
            date_posted: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString()
          }, source);
        }
      }
    } catch (e) {}
  }
}

async function harvestRemoteOK() {
  console.log("\n--- [3/7] Harvesting RemoteOK (Frontend) ---");
  const source = "RemoteOK";
  scorecard.metrics[source] = { ran: true, scraped: 0, verified: 0, skipped_dup: 0, skipped_filter: 0 };
  try {
    const res = await fetch("https://remoteok.com/api?tag=frontend", {
      headers: { "User-Agent": "JobSearchEngine/2.0" },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return;
    const data = await res.json();
    for (const j of (Array.isArray(data) ? data.slice(1) : [])) {
      ingestJob({
        url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
        title: j.position,
        company: j.company,
        location: j.location || "Remote",
        description: j.description || "",
        date_posted: j.date
      }, source);
    }
  } catch (e) {}
}

async function harvestRemotive() {
  console.log("\n--- [4/7] Harvesting Remotive (Frontend / Web) ---");
  const source = "Remotive";
  scorecard.metrics[source] = { ran: true, scraped: 0, verified: 0, skipped_dup: 0, skipped_filter: 0 };
  try {
    const res = await fetch("https://remotive.com/api/remote-jobs?category=software-dev&search=frontend", {
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return;
    const data = await res.json();
    for (const j of (data.jobs || [])) {
      ingestJob({
        url: j.url,
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || "Remote",
        description: j.description || "",
        date_posted: j.publication_date
      }, source);
    }
  } catch (e) {}
}

async function harvestJobicy() {
  console.log("\n--- [5/7] Harvesting Jobicy (Frontend) ---");
  const source = "Jobicy";
  scorecard.metrics[source] = { ran: true, scraped: 0, verified: 0, skipped_dup: 0, skipped_filter: 0 };
  try {
    const res = await fetch("https://jobicy.com/api/v2/remote-jobs?tag=frontend&count=50", {
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return;
    const data = await res.json();
    for (const j of (data.jobs || [])) {
      ingestJob({
        url: j.url,
        title: j.jobTitle,
        company: j.companyName,
        location: j.jobGeo || "Remote",
        description: j.jobDescription || "",
        date_posted: j.pubDate
      }, source);
    }
  } catch (e) {}
}

async function harvestHimalayas() {
  console.log("\n--- [6/7] Harvesting Himalayas (Frontend) ---");
  const source = "Himalayas";
  scorecard.metrics[source] = { ran: true, scraped: 0, verified: 0, skipped_dup: 0, skipped_filter: 0 };
  try {
    const res = await fetch("https://himalayas.app/jobs/api?q=frontend&limit=50", {
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return;
    const data = await res.json();
    for (const j of (data.jobs || [])) {
      ingestJob({
        url: j.applicationLink || `https://himalayas.app/companies/${j.companySlug}/jobs/${j.slug}`,
        title: j.title,
        company: j.companyName,
        location: (j.locationRestrictions || []).join(", ") || "Remote",
        description: j.description || "",
        date_posted: j.pubDate
      }, source);
    }
  } catch (e) {}
}

async function harvestAdzuna() {
  console.log("\n--- [7/7] Harvesting Adzuna India (Active Fresh <= 7 Days) ---");
  const source = "Adzuna India";
  scorecard.metrics[source] = { ran: true, scraped: 0, verified: 0, skipped_dup: 0, skipped_filter: 0 };
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.log("Adzuna credentials not found in env. Skipping.");
    return;
  }
  const queries = ["React developer", "Frontend developer", "Next.js developer", "MERN developer"];
  for (const q of queries) {
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(q)}&max_days_old=7&results_per_page=30`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      for (const r of (data.results || [])) {
        ingestJob({
          title: r.title,
          company: r.company?.display_name,
          url: r.redirect_url,
          location: r.location?.display_name || "India",
          description: r.description || "",
          date_posted: r.created
        }, source);
      }
    } catch (e) {}
  }
}

async function run() {
  console.log(`=======================================================`);
  console.log(`🚀 STARTING SLOT 2 MCP HARVEST (Shift ${SHIFT} | ${TODAY})`);
  console.log(`=======================================================`);

  await harvestPendingQueue();
  await harvestAshby();
  await harvestLever();
  await harvestRemoteOK();
  await harvestRemotive();
  await harvestJobicy();
  await harvestHimalayas();
  await harvestAdzuna();

  todayPool.total = todayPool.jobs.length;
  fs.writeFileSync(file3TodayShiftPath, JSON.stringify(todayPool, null, 2), "utf8");
  fs.writeFileSync(file3TodayPath, JSON.stringify(todayPool, null, 2), "utf8");

  scorecard.total_pipeline_today = todayPool.total;
  fs.writeFileSync(scorecardPath, JSON.stringify(scorecard, null, 2), "utf8");

  console.log(`\n=======================================================`);
  console.log(`🎯 SLOT 2 HARVEST SUMMARY MATRIX`);
  console.log(`- Total Leads Discovered: ${totalDiscovered}`);
  console.log(`- Dropped Historical Duplicates: ${totalHistoricalDuplicates}`);
  console.log(`- Dropped Out-of-Range / Senior / Non-Stack: ${totalOutOfRange}`);
  console.log(`- Net Clean Staged in File 3 (total_todays_${TODAY}_shift${SHIFT}.json): ${todayPool.total}`);
  console.log(`=======================================================`);
}

run();
