import "dotenv/config";
import fs from "fs";
import path from "path";
import { evaluateExperience } from "../servers/experience-filter.js";

// Load files
const adzunaPath = path.resolve("scripts/raw_scraped_adzuna_fresh.json");
const googlePath = path.resolve("scripts/raw_scraped_google_jobs.json");
const atsPath = path.resolve("scripts/raw_scraped_ats_unicorns.json");
const trackerPath = path.resolve("discovered_jobs_7days.json");

let disc = [];
if (fs.existsSync(trackerPath)) {
  disc = JSON.parse(fs.readFileSync(trackerPath, "utf8"));
}

const seenIdentifiers = new Set(
  disc.map(d => (d.recipient_or_url || d.contact_or_url || d.url || d.email || '').toLowerCase().trim()).filter(Boolean)
);

const allPool = [];

function addJob(job) {
  const url = (job.url || '').trim();
  const company = (job.company || '').trim();
  const title = (job.title || '').trim();
  const loc = (job.location || 'India').trim();

  if (!url || !company || !title) return;
  if (seenIdentifiers.has(url.toLowerCase())) return;

  // Filter out senior / staff / lead / mobile
  if (/\b(senior|sr\.?|lead|principal|architect|manager|head)\b/i.test(title)) return;
  if (/native|flutter|ios|android/i.test(title)) return;
  if (/mailermen|training|internship|trainee/i.test(company + ' ' + title)) return;

  seenIdentifiers.add(url.toLowerCase());

  // Determine best resume
  let resume = "Pratik Patidar Resume - React Developer.pdf";
  if (/mern|full stack|fullstack/i.test(title)) {
    resume = "Pratik Patidar Resume - MERN Full Stack.pdf";
  } else if (/frontend|front-end|ui/i.test(title)) {
    resume = "Pratik Patidar Resume - Frontend Engineer.pdf";
  }

  allPool.push({
    id: allPool.length + 1,
    company,
    role: title,
    location: loc,
    url,
    source: job.source || "MCP Server",
    resume,
    status: "APPROVED_FOR_VERIFY",
    timestamp: new Date().toISOString()
  });
}

if (fs.existsSync(adzunaPath)) {
  const adz = JSON.parse(fs.readFileSync(adzunaPath, "utf8"));
  adz.forEach(addJob);
}

if (fs.existsSync(googlePath)) {
  const goog = JSON.parse(fs.readFileSync(googlePath, "utf8"));
  goog.forEach(addJob);
}

if (fs.existsSync(atsPath)) {
  const ats = JSON.parse(fs.readFileSync(atsPath, "utf8"));
  ats.forEach(addJob);
}

console.log(`======================================================`);
console.log(`🎯 MERGED DEDUPLICATED APPROVED POOL: ${allPool.length} ROLES`);
console.log(`======================================================`);

// Priority 1: Indore & MP
const indoreRoles = allPool.filter(j => /indore|bhopal|madhya pradesh/i.test(j.location));
console.log(`📍 Indore & MP Local Roles: ${indoreRoles.length}`);
indoreRoles.forEach((j, i) => console.log(`   ${i+1}. [${j.company}] ${j.role} (${j.location}) -> ${j.resume}`));

// Priority 2: Remote
const remoteRoles = allPool.filter(j => /remote|india/i.test(j.location) && !/indore|bhopal/i.test(j.location));
console.log(`\n🌐 Remote / Pan India Roles: ${remoteRoles.length}`);

const outMerged = path.resolve("scripts/merged_slot2_clean_pool.json");
fs.writeFileSync(outMerged, JSON.stringify(allPool, null, 2), "utf8");
console.log(`\nSaved ${allPool.length} clean roles to ${outMerged}`);
