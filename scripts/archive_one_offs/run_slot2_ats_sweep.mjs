import "dotenv/config";
import fs from "fs";
import path from "path";

// 1. Load Discovered 7-day tracker
const discPath = path.resolve("discovered_jobs_7days.json");
let disc = [];
if (fs.existsSync(discPath)) {
  disc = JSON.parse(fs.readFileSync(discPath, "utf8"));
}

const seenIdentifiers = new Set(
  disc.map(d => (d.recipient_or_url || d.contact_or_url || d.url || d.email || '').toLowerCase().trim()).filter(Boolean)
);

console.log(`[SLOT 2 SWEEP] Loaded 7-Day Index with ${seenIdentifiers.size} unique previously tracked jobs/leads.`);

const freshJobs = [];

// Helper to filter and push job
function addCandidateJob(job, source) {
  const url = (job.url || job.apply_url || job.link || '').trim();
  const title = (job.title || job.position || '').trim();
  const company = (job.company || job.company_name || '').trim();
  const location = (job.location || job.candidate_required_location || 'Remote').trim();
  const datePosted = job.date || job.publication_date || job.posted_at || new Date().toISOString();

  if (!url || !title || !company) return;

  const id = url.toLowerCase();
  if (seenIdentifiers.has(id)) {
    return; // Already seen or applied in last 7 days!
  }

  // Pre-filter: Exclude mobile/Native or senior keywords in title
  if (/native|senior|lead|principal|architect|director|staff|manager/i.test(title)) {
    return;
  }

  // Pre-filter: Title must match candidate stack
  if (!/react|frontend|front-end|front end|web developer|ui developer|full stack|mern|javascript|next\.?js/i.test(title)) {
    return;
  }

  seenIdentifiers.add(id);
  freshJobs.push({
    source,
    company,
    title,
    location,
    url,
    date_posted: datePosted,
    status: "PENDING_DEEP_VERIFY", // Must be verified in Slot 4 DOM
    timestamp: new Date().toISOString()
  });
}

// 2. Query RemoteOK API
async function sweepRemoteOK() {
  console.log("\n[1/4] Sweeping RemoteOK...");
  try {
    const res = await fetch("https://remoteok.com/api?tag=react", {
      headers: { "User-Agent": "JobSearchEngine/2.0 (Candidate Outreach)" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const jobs = Array.isArray(data) ? data.slice(1) : []; // first element is metadata
    let added = 0;
    for (const j of jobs) {
      const before = freshJobs.length;
      addCandidateJob({
        url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
        title: j.position,
        company: j.company,
        location: j.location || "Remote",
        date: j.date
      }, "RemoteOK");
      if (freshJobs.length > before) added++;
    }
    console.log(` -> RemoteOK: Fetched ${jobs.length} jobs, Added ${added} fresh candidates.`);
  } catch (err) {
    console.error("RemoteOK error:", err.message);
  }
}

// 3. Query Remotive API
async function sweepRemotive() {
  console.log("\n[2/4] Sweeping Remotive...");
  try {
    const res = await fetch("https://remotive.com/api/remote-jobs?category=software-dev&search=react");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const jobs = data.jobs || [];
    let added = 0;
    for (const j of jobs) {
      const before = freshJobs.length;
      addCandidateJob({
        url: j.url,
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || "Remote",
        date: j.publication_date
      }, "Remotive");
      if (freshJobs.length > before) added++;
    }
    console.log(` -> Remotive: Fetched ${jobs.length} jobs, Added ${added} fresh candidates.`);
  } catch (err) {
    console.error("Remotive error:", err.message);
  }
}

// 4. Query Jobicy API
async function sweepJobicy() {
  console.log("\n[3/4] Sweeping Jobicy...");
  try {
    const res = await fetch("https://jobicy.com/api/v2/remote-jobs?tag=react&count=50");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const jobs = data.jobs || [];
    let added = 0;
    for (const j of jobs) {
      const before = freshJobs.length;
      addCandidateJob({
        url: j.url,
        title: j.jobTitle,
        company: j.companyName,
        location: j.jobGeo || "Remote",
        date: j.pubDate
      }, "Jobicy");
      if (freshJobs.length > before) added++;
    }
    console.log(` -> Jobicy: Fetched ${jobs.length} jobs, Added ${added} fresh candidates.`);
  } catch (err) {
    console.error("Jobicy error:", err.message);
  }
}

// 5. Query Himalayas API
async function sweepHimalayas() {
  console.log("\n[4/4] Sweeping Himalayas...");
  try {
    const res = await fetch("https://himalayas.app/jobs/api?q=react&limit=50");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const jobs = data.jobs || [];
    let added = 0;
    for (const j of jobs) {
      const before = freshJobs.length;
      addCandidateJob({
        url: j.applicationLink || `https://himalayas.app/companies/${j.companySlug}/jobs/${j.slug}`,
        title: j.title,
        company: j.companyName,
        location: (j.locationRestrictions || []).join(", ") || "Remote",
        date: j.pubDate
      }, "Himalayas");
      if (freshJobs.length > before) added++;
    }
    console.log(` -> Himalayas: Fetched ${jobs.length} jobs, Added ${added} fresh candidates.`);
  } catch (err) {
    console.error("Himalayas error:", err.message);
  }
}

async function run() {
  await sweepRemoteOK();
  await sweepRemotive();
  await sweepJobicy();
  await sweepHimalayas();

  console.log(`\n========================================`);
  console.log(`🎯 SLOT 2 TOTAL FRESH CANDIDATE POOL: ${freshJobs.length}`);
  console.log(`========================================`);

  // Save to raw scraped JSON for Slot 4 Deep Verification
  const outputPath = path.resolve("scripts/raw_scraped_cycle2_mcp.json");
  fs.writeFileSync(outputPath, JSON.stringify(freshJobs, null, 2), "utf8");
  console.log(`Saved raw candidates to ${outputPath}`);
}

run().catch(console.error);
