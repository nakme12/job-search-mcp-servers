import fs from "fs";
import path from "path";

const poolFile = path.resolve("scripts/merged_slot2_clean_pool.json");
const weeklyFile = path.resolve("weekly_applied.json");
const todayFile = path.resolve("todays_applied.json");
const discFile = path.resolve("discovered_jobs_7days.json");

const pool = JSON.parse(fs.readFileSync(poolFile, "utf8"));
const weekly = JSON.parse(fs.readFileSync(weeklyFile, "utf8"));
const today = JSON.parse(fs.readFileSync(todayFile, "utf8"));
const disc = JSON.parse(fs.readFileSync(discFile, "utf8"));

// Build lookup maps
const appliedUrls = new Set();
const appliedCompanies = new Set();

weekly.applied.forEach(a => {
  if (a.recipient_or_url) appliedUrls.add(a.recipient_or_url.toLowerCase().trim());
  if (a.company) appliedCompanies.add(a.company.toLowerCase().trim());
});

today.applied.forEach(a => {
  if (a.recipient_or_url) appliedUrls.add(a.recipient_or_url.toLowerCase().trim());
  if (a.company) appliedCompanies.add(a.company.toLowerCase().trim());
});

const discMap = new Map();
disc.forEach(d => {
  const id = (d.recipient_or_url || d.contact_or_url || d.url || d.email || '').toLowerCase().trim();
  if (id) discMap.set(id, d.status || 'SEEN');
});

console.log(`Auditing 101 pool jobs against Master Trackers...`);
console.log(`Total Lifetime Applied Records: ${weekly.applied.length}`);
console.log(`Total 7-Day Discovered Records: ${disc.length}`);

let alreadyAppliedCount = 0;
let alreadyInDiscCount = 0;
let completelyNewCount = 0;

const auditBreakdown = {
  already_applied: [],
  already_discovered: [],
  completely_brand_new: []
};

pool.forEach(job => {
  const urlLower = job.url.toLowerCase().trim();
  const compLower = job.company.toLowerCase().trim();

  const isApplied = appliedUrls.has(urlLower) || appliedCompanies.has(compLower);
  const discStatus = discMap.get(urlLower);

  if (isApplied) {
    alreadyAppliedCount++;
    auditBreakdown.already_applied.push({
      company: job.company,
      role: job.role,
      url: job.url,
      reason: appliedCompanies.has(compLower) ? `Company "${job.company}" already in applied tracker` : `URL already applied`
    });
  } else if (discStatus) {
    alreadyInDiscCount++;
    auditBreakdown.already_discovered.push({
      company: job.company,
      role: job.role,
      status: discStatus,
      url: job.url
    });
  } else {
    completelyNewCount++;
    auditBreakdown.completely_brand_new.push({
      company: job.company,
      role: job.role,
      location: job.location,
      url: job.url
    });
  }
});

console.log(`\n======================================================`);
console.log(`📊 101 POOL STATUS BREAKDOWN:`);
console.log(`- Already Applied (Prior Days): ${alreadyAppliedCount}`);
console.log(`- Already in 7-Day Discovered: ${alreadyInDiscCount}`);
console.log(`- Completely Brand New Fresh: ${completelyNewCount}`);
console.log(`======================================================`);

if (alreadyAppliedCount > 0) {
  console.log(`\n⚠️ Companies Already Applied:`);
  auditBreakdown.already_applied.forEach(a => console.log(` - ${a.company} (${a.reason})`));
}

console.log(`\nSample Brand New Roles (First 8):`);
auditBreakdown.completely_brand_new.slice(0, 8).forEach((b, i) => {
  console.log(` ${i+1}. [${b.company}] ${b.role} | ${b.location}`);
});

fs.writeFileSync("scripts/audit_101_results.json", JSON.stringify(auditBreakdown, null, 2));
