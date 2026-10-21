import "dotenv/config";
import fs from "fs";
import path from "path";
import { loadMasterStatusRegistry } from "../servers/master-status-filter.js";

const masterRegistry = loadMasterStatusRegistry();

const seenIdentifiers = new Set();
const freshCandidates = [];

function addCandidateJob(job, source) {
  const url = (job.url || job.apply_url || job.link || '').trim();
  const title = (job.title || job.position || '').trim();
  const company = (job.company || job.company_name || '').trim();
  const location = (job.location || job.candidate_required_location || 'Remote').trim();
  const datePosted = job.date || job.publication_date || job.posted_at || new Date().toISOString();

  if (!url || !title || !company) return false;

  const id = url.toLowerCase();
  if (seenIdentifiers.has(id)) return false;

  // Master Status Gate: Drop if ALREADY_APPLIED, ALREADY_SKIPPED, or ALREADY_SEEN
  const check = masterRegistry.checkStatus(url);
  if (!check.shouldAudit) {
    return false;
  }

  // Rule 32 & Candidate profile: Exclude Senior / Lead / Manager / Staff / Principal
  if (/\b(senior|sr\.?|lead|principal|architect|director|staff|manager|head)\b/i.test(title)) {
    return false;
  }

  // Hard-exclude React Native / Mobile
  if (/native|flutter|android|ios|mobile/i.test(title)) {
    return false;
  }

  // Positive whitelist match
  if (!/react|frontend|front-end|front end|web developer|ui developer|full stack|mern|javascript|typescript|next\.?js/i.test(title)) {
    return false;
  }

  seenIdentifiers.add(id);
  freshCandidates.push({
    source,
    company,
    title,
    location,
    url,
    date_posted: datePosted,
    status: "PENDING_DEEP_VERIFY",
    timestamp: new Date().toISOString()
  });
  return true;
}

// 1. RemoteOK
async function sweepRemoteOK() {
  console.log("\n[1/5] Sweeping RemoteOK API...");
  try {
    const res = await fetch("https://remoteok.com/api?tag=react", {
      headers: { "User-Agent": "JobSearchEngine/2.0 (Candidate Outreach)" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const jobs = Array.isArray(data) ? data.slice(1) : [];
    let added = 0;
    for (const j of jobs) {
      if (addCandidateJob({
        url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
        title: j.position,
        company: j.company,
        location: j.location || "Remote",
        date: j.date
      }, "RemoteOK")) added++;
    }
    console.log(` -> RemoteOK: Fetched ${jobs.length} jobs, Added ${added} fresh candidates.`);
  } catch (err) {
    console.error("RemoteOK error:", err.message);
  }
}

// 2. Remotive
async function sweepRemotive() {
  console.log("\n[2/5] Sweeping Remotive API...");
  try {
    const res = await fetch("https://remotive.com/api/remote-jobs?category=software-dev&search=react");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const jobs = data.jobs || [];
    let added = 0;
    for (const j of jobs) {
      if (addCandidateJob({
        url: j.url,
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || "Remote",
        date: j.publication_date
      }, "Remotive")) added++;
    }
    console.log(` -> Remotive: Fetched ${jobs.length} jobs, Added ${added} fresh candidates.`);
  } catch (err) {
    console.error("Remotive error:", err.message);
  }
}

// 3. Jobicy
async function sweepJobicy() {
  console.log("\n[3/5] Sweeping Jobicy API...");
  try {
    const res = await fetch("https://jobicy.com/api/v2/remote-jobs?tag=react&count=50");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const jobs = data.jobs || [];
    let added = 0;
    for (const j of jobs) {
      if (addCandidateJob({
        url: j.url,
        title: j.jobTitle,
        company: j.companyName,
        location: j.jobGeo || "Remote",
        date: j.pubDate
      }, "Jobicy")) added++;
    }
    console.log(` -> Jobicy: Fetched ${jobs.length} jobs, Added ${added} fresh candidates.`);
  } catch (err) {
    console.error("Jobicy error:", err.message);
  }
}

// 4. Himalayas
async function sweepHimalayas() {
  console.log("\n[4/5] Sweeping Himalayas API...");
  try {
    const res = await fetch("https://himalayas.app/jobs/api?q=react&limit=50");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const jobs = data.jobs || [];
    let added = 0;
    for (const j of jobs) {
      if (addCandidateJob({
        url: j.applicationLink || `https://himalayas.app/companies/${j.companySlug}/jobs/${j.slug}`,
        title: j.title,
        company: j.companyName,
        location: (j.locationRestrictions || []).join(", ") || "Remote",
        date: j.pubDate
      }, "Himalayas")) added++;
    }
    console.log(` -> Himalayas: Fetched ${jobs.length} jobs, Added ${added} fresh candidates.`);
  } catch (err) {
    console.error("Himalayas error:", err.message);
  }
}

// 5. Greenhouse Public Boards (Top tech companies known to hire React / Frontend)
async function sweepGreenhouseBoards() {
  console.log("\n[5/5] Sweeping Greenhouse Public Boards...");
  const boards = ["gusto", "affirm", "cloudflare", "instacart", "brex", "datadog", "figma", "lyft", "hashicorp", "gitlab"];
  let added = 0;
  for (const board of boards) {
    try {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);
      if (!res.ok) continue;
      const data = await res.json();
      const jobs = data.jobs || [];
      for (const j of jobs) {
        if (addCandidateJob({
          url: j.absolute_url,
          title: j.title,
          company: board.charAt(0).toUpperCase() + board.slice(1),
          location: j.location?.name || "Remote",
          date: j.updated_at
        }, `Greenhouse (${board})`)) added++;
      }
    } catch (e) {
      // ignore individual board failure
    }
  }
  console.log(` -> Greenhouse Boards: Added ${added} fresh candidates.`);
}

async function run() {
  console.log(`======================================================`);
  console.log(`🚀 TRIGGERING SLOT 2 (11:20 AM – 12:00 PM) MCP ATS SWEEP`);
  console.log(`======================================================`);

  await sweepRemoteOK();
  await sweepRemotive();
  await sweepJobicy();
  await sweepHimalayas();
  await sweepGreenhouseBoards();

  console.log(`\n======================================================`);
  console.log(`🎯 SLOT 2 SWEEP COMPLETE: ${freshCandidates.length} FRESH CANDIDATES DISCOVERED`);
  console.log(`======================================================`);

  const outPath = path.resolve("scripts/raw_scraped_slot2_mcp.json");
  fs.writeFileSync(outPath, JSON.stringify(freshCandidates, null, 2), "utf8");
  console.log(`Saved to ${outPath}`);
}

run().catch(console.error);
