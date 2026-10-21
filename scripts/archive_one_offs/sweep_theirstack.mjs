import "dotenv/config";
import fs from "fs";
import path from "path";

const API_KEY = process.env.THEIRSTACK_API_KEY;

const discPath = path.resolve("discovered_jobs_7days.json");
let disc = [];
if (fs.existsSync(discPath)) {
  disc = JSON.parse(fs.readFileSync(discPath, "utf8"));
}

const seenIdentifiers = new Set(
  disc.map(d => (d.recipient_or_url || d.contact_or_url || d.url || d.email || '').toLowerCase().trim()).filter(Boolean)
);

const theirstackCandidates = [];

async function sweepTheirStack() {
  console.log(`======================================================`);
  console.log(`🔍 SWEEPING THEIRSTACK MCP (TECHNOLOGY: REACT, COUNTRY: IN)`);
  console.log(`======================================================`);

  if (!API_KEY) {
    console.log("No THEIRSTACK_API_KEY found, skipping.");
    return;
  }

  try {
    const payload = {
      page: 0,
      limit: 25,
      posted_at_max_age_days: 7,
      job_country_code_or: ["IN"],
      job_technology_slug_or: ["react", "next-js"],
      job_title_pattern_or: ["*React*", "*Frontend*", "*Front End*", "*MERN*"]
    };

    const res = await fetch("https://api.theirstack.com/v1/jobs/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(7000)
    });

    if (!res.ok) {
      console.log(`TheirStack returned status ${res.status}`);
      return;
    }

    const data = await res.json();
    const jobs = data.data || [];
    console.log(`TheirStack returned ${jobs.length} jobs.`);

    for (const j of jobs) {
      const title = j.job_title || '';
      const company = j.company_name || '';
      const url = j.url || j.final_url || '';
      const location = j.job_location || 'India';
      const date = j.date_posted || new Date().toISOString();

      if (!url || !title || !company) continue;
      if (seenIdentifiers.has(url.toLowerCase())) continue;

      // Exclude Senior
      if (/\b(senior|sr\.?|lead|principal|architect|manager)\b/i.test(title)) continue;
      if (/native|flutter|ios|android/i.test(title)) continue;

      seenIdentifiers.add(url.toLowerCase());
      theirstackCandidates.push({
        source: "TheirStack (MCP)",
        company,
        title,
        location,
        url,
        date_posted: date,
        status: "PENDING_DEEP_VERIFY",
        timestamp: new Date().toISOString()
      });
      console.log(` ✅ THEIRSTACK: [${company}] ${title} | ${location}`);
    }
  } catch (e) {
    console.error("TheirStack error:", e.message);
  }

  const outPath = path.resolve("scripts/raw_scraped_theirstack.json");
  fs.writeFileSync(outPath, JSON.stringify(theirstackCandidates, null, 2), "utf8");
  console.log(`Saved ${theirstackCandidates.length} TheirStack candidates to ${outPath}`);
}

sweepTheirStack().catch(console.error);
