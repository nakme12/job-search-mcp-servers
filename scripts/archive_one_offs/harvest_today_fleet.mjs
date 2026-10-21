import "dotenv/config";
import fs from "fs";
import path from "path";
import { getFilePaths, isDuplicateHistorical, normalizeTargetId } from "./workflow_5file_manager.mjs";
import { evaluateExperience } from "../servers/experience-filter.js";

const paths = getFilePaths();
const todayTotalFile = paths.todayTotal;

let todayTotal = { date: paths.today, total: 0, jobs: [] };
if (fs.existsSync(todayTotalFile)) {
  try {
    todayTotal = JSON.parse(fs.readFileSync(todayTotalFile, "utf8"));
    if (!Array.isArray(todayTotal.jobs)) todayTotal.jobs = [];
  } catch (e) {
    todayTotal = { date: paths.today, total: 0, jobs: [] };
  }
}

const seenInToday = new Set(todayTotal.jobs.map(j => normalizeTargetId(j.url || j.applyUrl || j.link)));

let addedCount = 0;
let skippedDupCount = 0;
let skippedExpCount = 0;

function ingestJob(job, source) {
  const url = (job.url || job.applyUrl || job.link || '').trim();
  const title = (job.title || job.position || job.jobTitle || '').trim();
  const company = (job.company || job.company_name || job.companyName || '').trim();
  const location = (job.location || job.jobGeo || 'India / Remote').trim();
  const description = job.description || job.jobDescription || '';
  const datePosted = job.date || job.pubDate || job.publishedAt || job.createdAt || new Date().toISOString();

  if (!url || !title || !company) return;

  const normId = normalizeTargetId(url);
  if (seenInToday.has(normId)) return;
  seenInToday.add(normId);

  // Check Historical Duplication Gate
  if (isDuplicateHistorical(normId)) {
    skippedDupCount++;
    return;
  }

  // Check 0-2 YOE Filter (title + description if available)
  const ev = evaluateExperience({ title, description }, 2, true);
  if (ev.exclude || !ev.passes_whitelist || ev.is_non_stack) {
    skippedExpCount++;
    return;
  }

  // Assign optimal approved resume
  let resume = "Pratik Patidar Resume - Frontend Engineer.pdf";
  if (/react/i.test(title)) resume = "Pratik Patidar Resume - React Developer.pdf";
  if (/mern|full stack/i.test(title)) resume = "Pratik Patidar Resume - MERN Full Stack.pdf";

  const entry = {
    id: todayTotal.jobs.length + 1,
    company,
    role: title,
    location,
    url,
    source,
    resume_mapped: resume,
    date_posted: datePosted,
    status: "DISCOVERED_PENDING_AUDIT",
    discovered_at: new Date().toISOString()
  };

  todayTotal.jobs.push(entry);
  addedCount++;
  console.log(`[HARVEST] + [${company}] ${title} | ${location} (${source})`);
}

// 1. Ashby Boards
async function harvestAshby() {
  console.log("\n--- [1/6] Harvesting Ashby ATS Boards ---");
  const ashbyCompanies = [
    "ramp", "langchain", "tavily", "resend", "posthog", "vapi", "cursor", "incident-io",
    "linear", "retool", "supabase", "pylon", "dust", "modal", "bland", "cartesia", "elevenlabs"
  ];
  for (const comp of ashbyCompanies) {
    try {
      const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${comp}`, {
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of (data.jobs || [])) {
        ingestJob({
          title: j.title,
          url: j.jobUrl,
          company: comp.charAt(0).toUpperCase() + comp.slice(1),
          location: j.location || "Remote",
          description: j.descriptionPlain || "",
          date: j.publishedAt
        }, `Ashby (${comp})`);
      }
    } catch (e) {}
  }
}

// 2. Lever Boards
async function harvestLever() {
  console.log("\n--- [2/6] Harvesting Lever ATS Boards ---");
  const leverCompanies = [
    "postman", "meesho", "browserstack", "clevertap", "khatabook", "groww", "slice",
    "urbancompany", "zepto", "atlassian", "deliveroo", "elastic"
  ];
  for (const comp of leverCompanies) {
    try {
      const res = await fetch(`https://api.lever.co/v0/postings/${comp}?mode=json`, {
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) continue;
      const jobs = await res.json();
      if (Array.isArray(jobs)) {
        for (const j of jobs) {
          ingestJob({
            title: j.text,
            url: j.hostedUrl || j.applyUrl,
            company: comp.charAt(0).toUpperCase() + comp.slice(1),
            location: (typeof j.categories?.location === 'string' ? j.categories.location : 'India'),
            description: j.descriptionPlain || "",
            date: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString()
          }, `Lever (${comp})`);
        }
      }
    } catch (e) {}
  }
}

// 3. RemoteOK
async function harvestRemoteOK() {
  console.log("\n--- [3/6] Harvesting RemoteOK (Frontend) ---");
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
        date: j.date
      }, "RemoteOK");
    }
  } catch (e) {}
}

// 4. Remotive
async function harvestRemotive() {
  console.log("\n--- [4/6] Harvesting Remotive (Frontend & Dev) ---");
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
        date: j.publication_date
      }, "Remotive");
    }
  } catch (e) {}
}

// 5. Jobicy
async function harvestJobicy() {
  console.log("\n--- [5/6] Harvesting Jobicy (Frontend) ---");
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
        date: j.pubDate
      }, "Jobicy");
    }
  } catch (e) {}
}

// 6. Himalayas
async function harvestHimalayas() {
  console.log("\n--- [6/6] Harvesting Himalayas (Frontend) ---");
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
        date: j.pubDate
      }, "Himalayas");
    }
  } catch (e) {}
}

async function run() {
  console.log(`=======================================================`);
  console.log(`🚀 RUNNING FULL FLEET MCP/ATS HARVEST INTO ${paths.todayTotal}`);
  console.log(`=======================================================`);

  await harvestAshby();
  await harvestLever();
  await harvestRemoteOK();
  await harvestRemotive();
  await harvestJobicy();
  await harvestHimalayas();

  todayTotal.total = todayTotal.jobs.length;
  fs.writeFileSync(todayTotalFile, JSON.stringify(todayTotal, null, 2), "utf8");

  console.log(`\n=======================================================`);
  console.log(`🎯 HARVEST COMPLETE`);
  console.log(`- Fresh 0-2 YOE Leads Ingested Today: ${addedCount}`);
  console.log(`- Skipped Historical Duplicates: ${skippedDupCount}`);
  console.log(`- Skipped Out-of-Range / Senior: ${skippedExpCount}`);
  console.log(`- Total Today Pipeline Count: ${todayTotal.total}`);
  console.log(`=======================================================`);
}

run();
