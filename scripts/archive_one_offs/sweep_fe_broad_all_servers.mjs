import "dotenv/config";
import fs from "fs";
import path from "path";
import { evaluateExperience } from "../servers/experience-filter.js";

const discPath = path.resolve("discovered_jobs_7days.json");
let disc = [];
if (fs.existsSync(discPath)) {
  disc = JSON.parse(fs.readFileSync(discPath, "utf8"));
}

const poolFile = path.resolve("scripts/merged_slot2_clean_pool.json");
let existingPool = [];
if (fs.existsSync(poolFile)) {
  existingPool = JSON.parse(fs.readFileSync(poolFile, "utf8"));
}

const seenIdentifiers = new Set([
  ...disc.map(d => (d.recipient_or_url || d.contact_or_url || d.url || d.email || '').toLowerCase().trim()),
  ...existingPool.map(p => (p.url || '').toLowerCase().trim())
].filter(Boolean));

const newFeCandidates = [];

function checkAndAdd(job, source) {
  const url = (job.url || '').trim();
  const title = (job.title || '').trim();
  const company = (job.company || '').trim();
  const location = (job.location || 'India').trim();
  const dateStr = job.date || new Date().toISOString();

  if (!url || !title || !company) return false;
  if (seenIdentifiers.has(url.toLowerCase())) return false;

  // 1. Strict Freshness Filter: <= 7 Days Old
  const dateObj = new Date(dateStr);
  if (!isNaN(dateObj.getTime())) {
    const ageDays = (Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > 7) {
      return false; // Dropped: older than 7 days
    }
  }

  // 2. Strict 0-2 YOE Filter
  const ev = evaluateExperience({ title, description: job.description || '' }, 2, true);
  if (ev.exclude || !ev.passes_whitelist || ev.is_non_stack) return false;

  seenIdentifiers.add(url.toLowerCase());

  let resume = "Pratik Patidar Resume - Frontend Engineer.pdf";
  if (/react/i.test(title)) resume = "Pratik Patidar Resume - React Developer.pdf";
  if (/mern|full stack/i.test(title)) resume = "Pratik Patidar Resume - MERN Full Stack.pdf";

  newFeCandidates.push({
    id: existingPool.length + newFeCandidates.length + 1,
    company,
    role: title,
    location,
    url,
    source,
    resume,
    status: "APPROVED_FOR_VERIFY",
    timestamp: new Date().toISOString()
  });

  console.log(` ✅ [FE EXPANSION] [${company}] ${title} | ${location} (${dateStr.slice(0, 10)})`);
  return true;
}

// 1. RemoteOK with "frontend" tag
async function sweepRemoteOKFrontend() {
  console.log("\n[1/5] Sweeping RemoteOK with tag 'frontend'...");
  try {
    const res = await fetch("https://remoteok.com/api?tag=frontend", {
      headers: { "User-Agent": "JobSearchEngine/2.0" },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return;
    const data = await res.json();
    for (const j of (Array.isArray(data) ? data.slice(1) : [])) {
      checkAndAdd({
        url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
        title: j.position,
        company: j.company,
        location: j.location || "Remote",
        description: j.description,
        date: j.date
      }, "RemoteOK (Frontend)");
    }
  } catch (e) {}
}

// 2. Remotive with "frontend" search
async function sweepRemotiveFrontend() {
  console.log("\n[2/5] Sweeping Remotive with search 'frontend'...");
  try {
    const res = await fetch("https://remotive.com/api/remote-jobs?category=software-dev&search=frontend", {
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return;
    const data = await res.json();
    for (const j of data.jobs || []) {
      checkAndAdd({
        url: j.url,
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || "Remote",
        description: j.description,
        date: j.publication_date
      }, "Remotive (Frontend)");
    }
  } catch (e) {}
}

// 3. Jobicy with "frontend" tag
async function sweepJobicyFrontend() {
  console.log("\n[3/5] Sweeping Jobicy with tag 'frontend'...");
  try {
    const res = await fetch("https://jobicy.com/api/v2/remote-jobs?tag=frontend&count=50", {
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return;
    const data = await res.json();
    for (const j of data.jobs || []) {
      checkAndAdd({
        url: j.url,
        title: j.jobTitle,
        company: j.companyName,
        location: j.jobGeo || "Remote",
        description: j.jobDescription,
        date: j.pubDate
      }, "Jobicy (Frontend)");
    }
  } catch (e) {}
}

// 4. Himalayas with "frontend" query
async function sweepHimalayasFrontend() {
  console.log("\n[4/5] Sweeping Himalayas with query 'frontend'...");
  try {
    const res = await fetch("https://himalayas.app/jobs/api?q=frontend&limit=50", {
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return;
    const data = await res.json();
    for (const j of data.jobs || []) {
      checkAndAdd({
        url: j.applicationLink || `https://himalayas.app/companies/${j.companySlug}/jobs/${j.slug}`,
        title: j.title,
        company: j.companyName,
        location: (j.locationRestrictions || []).join(", ") || "Remote",
        description: j.description,
        date: j.pubDate
      }, "Himalayas (Frontend)");
    }
  } catch (e) {}
}

// 5. SmartRecruiters with "frontend"
async function sweepSmartRecruitersFrontend() {
  console.log("\n[5/5] Sweeping SmartRecruiters with 'frontend'...");
  const comps = ["Nagarro1", "PublicisGroupe", "Capgemini"];
  for (const c of comps) {
    try {
      const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${c}/postings?q=frontend&limit=25`, {
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const p of data.content || []) {
        checkAndAdd({
          url: `https://jobs.smartrecruiters.com/${c}/${p.id}`,
          title: p.name,
          company: c,
          location: `${p.location?.city || ''}, ${p.location?.country || ''}`,
          description: '',
          date: p.releasedDate
        }, `SmartRecruiters (${c})`);
      }
    } catch (e) {}
  }
}

async function run() {
  await sweepRemoteOKFrontend();
  await sweepRemotiveFrontend();
  await sweepJobicyFrontend();
  await sweepHimalayasFrontend();
  await sweepSmartRecruitersFrontend();

  console.log(`\n======================================================`);
  console.log(`🎯 NEW BROAD FRONTEND CANDIDATES ADDED: ${newFeCandidates.length}`);
  console.log(`======================================================`);

  if (newFeCandidates.length > 0) {
    const updated = [...existingPool, ...newFeCandidates];
    fs.writeFileSync(poolFile, JSON.stringify(updated, null, 2), "utf8");
    console.log(`Total Pool Updated to: ${updated.length} Roles in ${poolFile}`);
  }
}

run().catch(console.error);
