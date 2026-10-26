import "dotenv/config";
import fs from "fs";
import path from "path";
import { evaluateExperience } from "../servers/experience-filter.js";

const ROOT_DIR = "C:/mcp/job-search-mcp-engine";
const TODAY = "2026-10-26";
const SHIFT = 1;

const file1HistPath = path.join(ROOT_DIR, "total_historical_except_today.json");
const file3TodayPath = path.join(ROOT_DIR, `total_todays_${TODAY}.json`);
const scorecardPath = path.join(ROOT_DIR, "mcp_execution_scorecard_today.json");

// Read Historical Blacklist
let historicalJobs = [];
try {
  const hRaw = JSON.parse(fs.readFileSync(file1HistPath, "utf8"));
  historicalJobs = Array.isArray(hRaw) ? hRaw : (hRaw.jobs || []);
} catch (e) {
  console.error("Error reading historical file:", e.message);
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

// 1. Greenhouse Direct ATS Boards
async function harvestGreenhouse() {
  const source = "Greenhouse ATS";
  console.log(`\n--- [1/8] Harvesting ${source} ---`);
  scorecard.metrics[source] = { ran: true, scraped: 0, verified: 0, skipped_dup: 0, skipped_filter: 0 };
  const boards = [
    "figma", "stripe", "airtable", "datadog", "brex", "affirm", "gusto", "plaid", 
    "cloudflare", "instacart", "scaleai", "samsara", "rippling", "hashicorp",
    "elastic", "monzo", "robinhood", "hubspot", "benchling", "discord", "reddit",
    "enterpret", "apollo", "ramp", "vanta", "checkr", "carta", "sourcegraph"
  ];
  for (const b of boards) {
    try {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${b}/jobs?content=true`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of (data.jobs || [])) {
        ingestJob({
          title: j.title,
          url: j.absolute_url,
          company: b.toUpperCase(),
          location: j.location ? j.location.name : "Remote",
          description: j.content || "",
          date_posted: j.updated_at
        }, source);
      }
    } catch (e) {}
  }
}

// 2. Ashby Direct ATS Boards
async function harvestAshby() {
  const source = "Ashby ATS";
  console.log(`\n--- [2/8] Harvesting ${source} ---`);
  scorecard.metrics[source] = { ran: true, scraped: 0, verified: 0, skipped_dup: 0, skipped_filter: 0 };
  const boards = [
    "ramp", "langchain", "tavily", "resend", "posthog", "vapi", "cursor", "incident-io", 
    "linear", "retool", "supabase", "pylon", "dust", "elevenlabs", "warp", "modal", "harvey"
  ];
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

// 3. Lever Direct ATS Boards
async function harvestLever() {
  const source = "Lever ATS";
  console.log(`\n--- [3/8] Harvesting ${source} ---`);
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

// 4. SmartRecruiters Public API
async function harvestSmartRecruiters() {
  const source = "SmartRecruiters ATS";
  console.log(`\n--- [4/8] Harvesting ${source} ---`);
  scorecard.metrics[source] = { ran: true, scraped: 0, verified: 0, skipped_dup: 0, skipped_filter: 0 };
  const companies = ["EndeavorITSolution", "visa", "square", "bosch", "publicissapient"];
  for (const c of companies) {
    try {
      const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${c}/postings`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of (data.content || [])) {
        ingestJob({
          title: j.name,
          url: `https://jobs.smartrecruiters.com/${c}/${j.id}`,
          company: c,
          location: j.location ? `${j.location.city || ''}, ${j.location.country || ''}` : "Remote",
          description: "",
          date_posted: j.releasedDate
        }, source);
      }
    } catch (e) {}
  }
}

// 5. The Muse Jobs API (Entry Level & Mid Level Tech)
async function harvestTheMuse() {
  const source = "The Muse";
  console.log(`\n--- [5/8] Harvesting ${source} ---`);
  scorecard.metrics[source] = { ran: true, scraped: 0, verified: 0, skipped_dup: 0, skipped_filter: 0 };
  try {
    const res = await fetch("https://www.themuse.com/api/public/jobs?category=Software%20Engineering&level=Entry%20Level&page=1", { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      for (const j of (data.results || [])) {
        ingestJob({
          title: j.name,
          url: j.refs ? j.refs.landing_page : `https://www.themuse.com/jobs/${j.id}`,
          company: j.company ? j.company.name : "Tech Firm",
          location: (j.locations && j.locations.length > 0) ? j.locations[0].name : "Remote",
          description: j.contents || "",
          date_posted: j.publication_date
        }, source);
      }
    }
  } catch (e) {}
}

// 6. RemoteOK API
async function harvestRemoteOK() {
  const source = "RemoteOK";
  console.log(`\n--- [6/8] Harvesting ${source} ---`);
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

// 7. Remotive API
async function harvestRemotive() {
  const source = "Remotive";
  console.log(`\n--- [7/8] Harvesting ${source} ---`);
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

// 8. Jobicy API
async function harvestJobicy() {
  const source = "Jobicy";
  console.log(`\n--- [8/8] Harvesting ${source} ---`);
  scorecard.metrics[source] = { ran: true, scraped: 0, verified: 0, skipped_dup: 0, skipped_filter: 0 };
  try {
    const res = await fetch("https://jobicy.com/api/v2/remote-jobs?count=50&tag=frontend", {
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

// Main Execution
async function main() {
  console.log("=================================================================");
  console.log(`🚀 [SLOT 2] COMPREHENSIVE MULTI-SOURCE MCP HARVEST (${TODAY})`);
  console.log("=================================================================");

  await harvestGreenhouse();
  await harvestAshby();
  await harvestLever();
  await harvestSmartRecruiters();
  await harvestTheMuse();
  await harvestRemoteOK();
  await harvestRemotive();
  await harvestJobicy();

  todayPool.total = todayPool.jobs.length;
  scorecard.total_pipeline_today = todayPool.total;

  fs.writeFileSync(file3TodayPath, JSON.stringify(todayPool, null, 2), "utf8");
  fs.writeFileSync(scorecardPath, JSON.stringify(scorecard, null, 2), "utf8");

  console.log("\n=================================================================");
  console.log(`🏁 [SLOT 2 COMPLETE] HARVEST SUMMARY`);
  console.log(`- Total Raw Discovered:           ${totalDiscovered}`);
  console.log(`- Historical Duplicates Skipped:  ${totalHistoricalDuplicates}`);
  console.log(`- Out of Range / Non-Stack Dropped: ${totalOutOfRange}`);
  console.log(`- Clean Pending Audit Leads Staged: ${totalCleanIngested}`);
  console.log(`- File 3 Pool Total:             ${todayPool.total}`);
  console.log("=================================================================\n");
}

main().catch(err => {
  console.error("FATAL ERROR in Slot 2 Comprehensive Harvest:", err);
  process.exit(1);
});
