import "dotenv/config";
import fs from "fs";
import path from "path";

const discPath = path.resolve("discovered_jobs_7days.json");
let disc = [];
if (fs.existsSync(discPath)) {
  disc = JSON.parse(fs.readFileSync(discPath, "utf8"));
}

const seenIdentifiers = new Set(
  disc.map(d => (d.recipient_or_url || d.contact_or_url || d.url || d.email || '').toLowerCase().trim()).filter(Boolean)
);

const candidates = [];

function checkJob(j, source, companyName) {
  const title = j.title || j.text || '';
  const url = j.hostedUrl || j.absolute_url || j.url || '';
  const loc = (typeof j.location === 'string' ? j.location : j.location?.name) || (j.categories?.location) || 'India';
  const date = j.createdAt || j.updated_at || j.date || new Date().toISOString();

  if (!url || !title) return;
  if (seenIdentifiers.has(url.toLowerCase())) return;

  // Rule 32 & 23 filter: Exclude Senior / Staff / Lead / Mobile / Intern
  if (/\b(senior|sr\.?|lead|principal|architect|director|staff|manager|head)\b/i.test(title)) return;
  if (/native|flutter|android|ios|mobile|intern/i.test(title)) return;
  
  // Whitelist match
  if (!/react|frontend|front-end|front end|web developer|ui developer|full stack|mern|javascript|typescript|next\.?js/i.test(title)) return;

  seenIdentifiers.add(url.toLowerCase());
  candidates.push({
    source,
    company: companyName,
    title,
    location: loc,
    url,
    date_posted: date,
    status: "PENDING_DEEP_VERIFY",
    timestamp: new Date().toISOString()
  });
  console.log(` ✅ FOUND: [${companyName}] ${title} | ${loc} -> ${url}`);
}

async function sweepLever() {
  console.log("\n--- Sweeping Lever Boards (India Tech) ---");
  const leverCompanies = [
    "postman", "meesho", "browserstack", "clevertap", "khatabook", "groww", "slice", "urbancompany", "zepto"
  ];

  for (const comp of leverCompanies) {
    try {
      const res = await fetch(`https://api.lever.co/v0/postings/${comp}?mode=json`, {
        signal: AbortSignal.timeout(3500)
      });
      if (!res.ok) continue;
      const jobs = await res.json();
      if (Array.isArray(jobs)) {
        for (const j of jobs) {
          checkJob(j, `Lever (${comp})`, comp.charAt(0).toUpperCase() + comp.slice(1));
        }
      }
    } catch (e) {
      // timeout or 404
    }
  }
}

async function sweepAshby() {
  console.log("\n--- Sweeping Ashby Boards (India Tech / Global Remote) ---");
  const ashbyCompanies = [
    "ramp", "langchain", "tavily", "resend", "posthog", "vapi", "cursor", "incident-io"
  ];

  for (const comp of ashbyCompanies) {
    try {
      const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${comp}`, {
        signal: AbortSignal.timeout(3500)
      });
      if (!res.ok) continue;
      const data = await res.json();
      const jobs = data.jobs || [];
      for (const j of jobs) {
        const item = {
          title: j.title,
          url: j.jobUrl,
          location: j.location,
          date: j.publishedAt
        };
        checkJob(item, `Ashby (${comp})`, comp.charAt(0).toUpperCase() + comp.slice(1));
      }
    } catch (e) {
      // timeout or 404
    }
  }
}

async function run() {
  await sweepLever();
  await sweepAshby();

  console.log(`\n========================================`);
  console.log(`🎯 TOTAL CANDIDATES DISCOVERED: ${candidates.length}`);
  console.log(`========================================`);
  const outPath = path.resolve("scripts/raw_scraped_ats_unicorns.json");
  fs.writeFileSync(outPath, JSON.stringify(candidates, null, 2), "utf8");
}

run();
