import "dotenv/config";
import fs from "fs";
import path from "path";
import { evaluateExperience } from "../servers/experience-filter.js";

const ROOT_DIR = "C:/mcp/job-search-mcp-engine";
const TODAY = "2026-10-21";
const SHIFT = 2;

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
  description: `Expanded Multi-Source leads discovered on ${TODAY} Shift ${SHIFT}`,
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

async function fetchAdzunaMultiPage() {
  console.log("--- 1. Harvesting Adzuna Multi-Page ---");
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return;

  const queries = [
    "React developer", "Frontend developer", "Next.js developer", "MERN developer",
    "UI developer React", "Full Stack React Developer", "Junior Frontend Developer"
  ];

  for (const q of queries) {
    for (let page = 1; page <= 3; page++) {
      try {
        const url = `https://api.adzuna.com/v1/api/jobs/in/search/${page}?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(q)}&max_days_old=7&results_per_page=50`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) break;
        const data = await res.json();
        for (const r of (data.results || [])) {
          ingest({
            title: r.title,
            company: r.company?.display_name,
            url: r.redirect_url,
            location: r.location?.display_name || "India",
            description: r.description || "",
            date_posted: r.created
          }, "Adzuna India");
        }
      } catch (e) {}
    }
  }
}

async function fetchGoogleJobs() {
  console.log("--- 2. Harvesting Google Jobs (SerpApi) ---");
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return;

  const queries = [
    "React Developer jobs in India",
    "Frontend Developer jobs in Indore",
    "Junior React Developer remote India",
    "Full Stack React Developer jobs Bangalore"
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
        }, "Google Jobs (SerpApi)");
      }
    } catch (e) {}
  }
}

async function fetchAshbyBoards() {
  console.log("--- 3. Harvesting Ashby Boards ---");
  const boards = ["ramp", "langchain", "tavily", "resend", "posthog", "vapi", "cursor", "incident-io", "linear", "retool", "supabase", "pylon", "dust", "elevenlabs"];
  for (const b of boards) {
    try {
      const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${b}`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of (data.jobs || [])) {
        ingest({
          title: j.title,
          url: j.jobUrl,
          company: b.toUpperCase(),
          location: j.location || "Remote",
          description: j.descriptionHtml || "",
          date_posted: j.publishedAt || new Date().toISOString()
        }, "Ashby ATS");
      }
    } catch (e) {}
  }
}

async function fetchRemoteWeb() {
  console.log("--- 4. Harvesting Remote Tech Boards ---");
  try {
    const res = await fetch("https://remotive.com/api/remote-jobs?category=software-dev&limit=60", { signal: AbortSignal.timeout(6000) });
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
        }, "Remotive");
      }
    }
  } catch (e) {}
}

async function run() {
  console.log("🚀 STARTING EXPANDED MULTI-SOURCE HARVEST FOR SHIFT 2...");
  await fetchAdzunaMultiPage();
  await fetchGoogleJobs();
  await fetchAshbyBoards();
  await fetchRemoteWeb();

  todayPool.total = todayPool.jobs.length;
  fs.writeFileSync(file3TodayShiftPath, JSON.stringify(todayPool, null, 2), "utf8");
  fs.writeFileSync(file3TodayPath, JSON.stringify(todayPool, null, 2), "utf8");

  console.log(`\n=======================================================`);
  console.log(`🎯 TOTAL EXPANDED CLEAN LEADS IN FILE 3: ${todayPool.total}`);
  console.log(`=======================================================`);
}

run();
