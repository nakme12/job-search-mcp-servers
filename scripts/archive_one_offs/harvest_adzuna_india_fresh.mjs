import "dotenv/config";
import fs from "fs";
import path from "path";
import { evaluateExperience } from "../servers/experience-filter.js";

const appId = process.env.ADZUNA_APP_ID;
const appKey = process.env.ADZUNA_APP_KEY;

const discPath = path.resolve("discovered_jobs_7days.json");
let disc = [];
if (fs.existsSync(discPath)) {
  disc = JSON.parse(fs.readFileSync(discPath, "utf8"));
}

const seenIdentifiers = new Set(
  disc.map(d => (d.recipient_or_url || d.contact_or_url || d.url || d.email || '').toLowerCase().trim()).filter(Boolean)
);

async function harvestAdzuna() {
  console.log(`======================================================`);
  console.log(`🔍 SWEEPING ADZUNA INDIA (FRESHNESS <= 7 DAYS)`);
  console.log(`======================================================`);

  const candidates = [];
  const queries = ["React developer", "Frontend developer", "Next.js developer", "MERN developer"];

  for (const q of queries) {
    console.log(`\nQuerying Adzuna for: "${q}"...`);
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(q)}&max_days_old=7&results_per_page=40`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const results = data.results || [];

      for (const r of results) {
        const title = r.title || '';
        const company = r.company?.display_name || '';
        const redirectUrl = r.redirect_url || '';
        const description = r.description || '';
        const location = r.location?.display_name || 'India';
        const date = r.created || new Date().toISOString();

        if (!redirectUrl || !title || !company) continue;
        if (seenIdentifiers.has(redirectUrl.toLowerCase())) continue;

        // Correct evaluation using shared filter
        const ev = evaluateExperience({ title, description }, 2, true);

        if (ev.exclude || !ev.passes_whitelist || ev.is_non_stack) {
          continue; // Dropped: senior, non-stack, or >2 YOE
        }

        seenIdentifiers.add(redirectUrl.toLowerCase());
        candidates.push({
          source: "Adzuna India (MCP)",
          company,
          title,
          location,
          url: redirectUrl,
          date_posted: date,
          detected_min_years: ev.detected_min_years_experience || 0,
          description_snippet: description.slice(0, 250),
          status: "PENDING_DEEP_VERIFY",
          timestamp: new Date().toISOString()
        });
        console.log(` ✅ ADZUNA CANDIDATE: [${company}] ${title} | ${location}`);
      }
    } catch (e) {
      console.error(`Error querying ${q}:`, e.message);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎯 ADZUNA HARVEST COMPLETE: ${candidates.length} FRESH CANDIDATES (0-2 YOE, <=7 DAYS)`);
  console.log(`======================================================`);

  const outPath = path.resolve("scripts/raw_scraped_adzuna_fresh.json");
  fs.writeFileSync(outPath, JSON.stringify(candidates, null, 2), "utf8");
  console.log(`Saved ${candidates.length} candidates to ${outPath}`);
}

harvestAdzuna().catch(console.error);
