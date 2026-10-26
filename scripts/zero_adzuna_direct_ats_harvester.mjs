import "dotenv/config";
import fs from "fs";
import path from "path";
import { evaluateExperience } from "../servers/experience-filter.js";

const ROOT_DIR = "C:/mcp/job-search-mcp-engine";
const TODAY = process.argv[2] || "2026-10-25";
const SHIFT = 1;

const file1HistPath = path.join(ROOT_DIR, "total_historical_except_today.json");
const file3TodayShiftPath = path.join(ROOT_DIR, `total_todays_${TODAY}_shift${SHIFT}.json`);
const file3TodayPath = path.join(ROOT_DIR, `total_todays_${TODAY}.json`);

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
  cycle: 2,
  description: `Zero-Adzuna High-Quality ATS & Direct Portal leads discovered on ${TODAY} Shift ${SHIFT}`,
  total: 0,
  jobs: []
};

const seenUrls = new Set();

function ingest(job, sourceName) {
  const url = (job.url || job.applyUrl || job.link || "").trim();
  const title = (job.title || job.role || job.position || "").trim();
  const company = (job.company || job.company_name || "Unknown").trim();
  const location = (job.location || "India / Remote").trim();
  const description = job.description || "";
  const datePosted = job.date_posted || new Date().toISOString();

  if (!url || !title) return;
  const nUrl = normalize(url);
  if (seenUrls.has(nUrl) || historicalSet.has(nUrl)) return;

  const ev = evaluateExperience({ title, description }, 2, true);
  if (ev.exclude || !ev.passes_whitelist || ev.is_non_stack) return;

  seenUrls.add(nUrl);

  let resume = "Pratik Patidar Resume - Frontend Engineer.pdf";
  const tLower = title.toLowerCase();
  if (tLower.includes("react") || tLower.includes("ui") || tLower.includes("next")) {
    resume = "Pratik Patidar Resume - React Developer.pdf";
  } else if (tLower.includes("mern") || tLower.includes("full stack") || tLower.includes("node")) {
    resume = "Pratik Patidar Resume - MERN Full Stack.pdf";
  }

  todayPool.jobs.push({
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
  });

  console.log(`[Job ${todayPool.jobs.length}] + [${company}] ${title} | ${location} (${sourceName})`);
}

// 1. Greenhouse High-Quality ATS Direct Boards (Zero Captcha, 100% Forms)
async function harvestGreenhouse() {
  console.log("\n--- [1/5] Harvesting Greenhouse ATS Direct Boards ---");
  const ghBoards = [
    "figma", "stripe", "airtable", "datadog", "brex", "affirm", "gusto", "plaid", 
    "cloudflare", "instacart", "scaleai", "samsara", "rippling", "hashicorp",
    "elastic", "monzo", "robinhood", "hubspot", "benchling", "discord", "reddit",
    "enterpret", "apollo", "ramp", "vanta", "checkr", "carta", "sourcegraph"
  ];

  for (const b of ghBoards) {
    try {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${b}/jobs?content=true`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of (data.jobs || [])) {
        ingest({
          title: j.title,
          company: b.toUpperCase(),
          url: j.absolute_url,
          location: j.location?.name || "Remote / India",
          description: j.content || "",
          date_posted: j.updated_at
        }, "Greenhouse ATS");
      }
    } catch (e) {}
  }
}

// 2. Lever ATS Direct Boards (Zero Captcha, 100% Forms)
async function harvestLever() {
  console.log("\n--- [2/5] Harvesting Lever ATS Direct Boards ---");
  const leverSites = [
    "netflix", "spotify", "atlassian", "palantir", "auth0", "gitlab", 
    "postman", "coupa", "box", "lever", "automattic", "canonical"
  ];

  for (const site of leverSites) {
    try {
      const res = await fetch(`https://api.lever.co/v0/postings/${site}?mode=json`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of data) {
        ingest({
          title: j.text,
          company: site.toUpperCase(),
          url: j.hostedUrl,
          location: j.categories?.location || "Remote",
          description: j.descriptionPlain || "",
          date_posted: new Date(j.createdAt).toISOString()
        }, "Lever ATS");
      }
    } catch (e) {}
  }
}

// 3. Ashby ATS Direct Boards (Zero Captcha, 100% Forms)
async function harvestAshby() {
  console.log("\n--- [3/5] Harvesting Ashby ATS Direct Boards ---");
  const ashbyBoards = [
    "ramp", "langchain", "tavily", "resend", "posthog", "vapi", "cursor", 
    "incident-io", "linear", "retool", "supabase", "pylon", "dust", "elevenlabs",
    "replicate", "together-ai", "perplexity", "modal", "anysphere", "cursor"
  ];

  for (const b of ashbyBoards) {
    try {
      const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${b}`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of (data.jobs || [])) {
        ingest({
          title: j.title,
          company: b.toUpperCase(),
          url: j.jobUrl,
          location: j.location || "Remote",
          description: j.descriptionHtml || "",
          date_posted: j.publishedAt
        }, "Ashby ATS");
      }
    } catch (e) {}
  }
}

// 4. Google Jobs (SerpApi) Pan-India & Indore Deep Search
async function harvestGoogleJobs() {
  console.log("\n--- [4/5] Harvesting Google Jobs Pan-India & Indore Tech ---");
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return;

  const queries = [
    "Frontend Developer jobs in Indore",
    "React Developer jobs in Indore",
    "React Developer jobs India entry level",
    "Junior React Developer remote India",
    "Full Stack React Developer Bangalore 0-2 years",
    "Frontend Engineer jobs Pune fresher",
    "MERN Stack Developer Gurgaon 1 year experience",
    "Next.js Developer jobs India fresher"
  ];

  for (const q of queries) {
    try {
      const url = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(q)}&hl=en&gl=in&api_key=${key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of (data.jobs_results || [])) {
        const applyLink = (j.apply_options && j.apply_options[0]?.link) || j.share_link || (j.related_links && j.related_links[0]?.link);
        ingest({
          title: j.title,
          company: j.company_name,
          url: applyLink,
          location: j.location || "India",
          description: j.description || "",
          date_posted: new Date().toISOString()
        }, "Google Jobs Direct");
      }
    } catch (e) {}
  }
}

// 5. Remote Developer Boards (Remotive / Jobicy / Himalayas)
async function harvestRemotePortals() {
  console.log("\n--- [5/5] Harvesting Direct Remote Tech Portals ---");
  try {
    const res = await fetch("https://remotive.com/api/remote-jobs?category=software-dev&limit=100", { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      for (const j of (data.jobs || [])) {
        ingest({
          title: j.title,
          company: j.company_name,
          url: j.url,
          location: j.candidate_required_location || "Worldwide",
          description: j.description || "",
          date_posted: j.publication_date
        }, "Remotive Direct");
      }
    }
  } catch (e) {}

  try {
    const res2 = await fetch("https://jobicy.com/api/v2/remote-jobs?count=50&tag=react", { signal: AbortSignal.timeout(6000) });
    if (res2.ok) {
      const data2 = await res2.json();
      for (const j of (data2.jobs || [])) {
        ingest({
          title: j.jobTitle,
          company: j.companyName,
          url: j.url,
          location: j.jobGeo || "Remote",
          description: j.jobDescription || "",
          date_posted: j.pubDate
        }, "Jobicy Direct");
      }
    }
  } catch (e) {}
}

async function run() {
  console.log(`=======================================================`);
  console.log(`🚀 RUNNING ZERO-ADZUNA DIRECT ATS & PORTAL HARVESTER`);
  console.log(`=======================================================`);

  await harvestGreenhouse();
  await harvestLever();
  await harvestAshby();
  await harvestGoogleJobs();
  await harvestRemotePortals();

  todayPool.total = todayPool.jobs.length;
  fs.writeFileSync(file3TodayShiftPath, JSON.stringify(todayPool, null, 2), "utf8");
  fs.writeFileSync(file3TodayPath, JSON.stringify(todayPool, null, 2), "utf8");

  console.log(`\n=======================================================`);
  console.log(`🎯 TOTAL HIGH-QUALITY DIRECT LEADS IN FILE 3: ${todayPool.total}`);
  console.log(`=======================================================`);
}

run();
