import "dotenv/config";
import fs from "fs";
import path from "path";

const API_KEY = process.env.SERPAPI_API_KEY;
if (!API_KEY) {
  console.log("No SERPAPI_API_KEY");
  process.exit(1);
}

const companies = JSON.parse(fs.readFileSync("scripts/indore_51_500_companies.json", "utf8"));
console.log(`Loaded ${companies.length} Indore audited companies.`);

const discPath = path.resolve("discovered_jobs_7days.json");
let disc = [];
if (fs.existsSync(discPath)) {
  disc = JSON.parse(fs.readFileSync(discPath, "utf8"));
}
const seen = new Set(disc.map(d => (d.recipient_or_url || d.url || '').toLowerCase()));

const results = [];

async function checkCompany(c) {
  const query = `${c.name} Indore (React OR Frontend OR MERN) job`;
  try {
    const url = new URL("https://serpapi.com/search");
    url.searchParams.set("engine", "google_jobs");
    url.searchParams.set("api_key", API_KEY);
    url.searchParams.set("q", query);
    url.searchParams.set("hl", "en");
    url.searchParams.set("gl", "in");

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return;
    const data = await res.json();
    const jobs = data.jobs_results || [];
    for (const j of jobs) {
      const title = j.title || '';
      const company = j.company_name || c.name;
      const applyUrl = j.apply_options?.[0]?.link || j.share_link || '';
      if (!applyUrl || seen.has(applyUrl.toLowerCase())) continue;

      if (!/\b(senior|sr\.?|lead|architect|manager)\b/i.test(title) &&
          /\b(react|frontend|front-end|mern|web developer|ui developer)\b/i.test(title)) {
        seen.add(applyUrl.toLowerCase());
        results.push({
          company: c.name,
          title,
          location: j.location || "Indore",
          applyUrl,
          posted_at: j.detected_extensions?.posted_at || "Recent"
        });
        console.log(` ✅ FOUND INDORE IT JOB: [${c.name}] ${title} -> ${applyUrl}`);
      }
    }
  } catch (e) {
    // ignore timeout
  }
}

async function main() {
  console.log("Starting targeted sweep of Indore 51-500 IT companies...");
  // Check top 25 companies in parallel batches of 5
  for (let i = 0; i < Math.min(companies.length, 30); i += 5) {
    const batch = companies.slice(i, i + 5);
    await Promise.all(batch.map(checkCompany));
  }
  fs.writeFileSync("scripts/indore_it_audited_live_jobs.json", JSON.stringify(results, null, 2));
  console.log(`\n🎯 TOTAL LIVE JOBS FOUND FROM INDORE 51-500 COMPANIES: ${results.length}`);
}

main().catch(console.error);
