import "dotenv/config";
import fs from "fs";
import path from "path";
import { loadMasterStatusRegistry } from "../servers/master-status-filter.js";

const API_KEY = process.env.SERPAPI_API_KEY;
const masterRegistry = loadMasterStatusRegistry();
const googleCandidates = [];

async function sweepGoogleJobs() {
  console.log(`======================================================`);
  console.log(`🔍 SWEEPING GOOGLE JOBS (SERPAPI) WITH STRICT NEGATIVE-FILTERED 0-2 YOE QUERIES`);
  console.log(`======================================================`);

  if (!API_KEY) {
    console.log("No SERPAPI_API_KEY found, skipping.");
    return;
  }

  // Sharp, High-Precision 0-2 YOE Queries (clean Google Jobs syntax)
  const queries = [
    'Junior React developer India -senior -lead',
    'Frontend developer 1 year experience India -senior -lead',
    'React developer PAN India -senior -lead',
    'Associate Frontend Engineer India -senior',
    'Next.js developer Remote India -senior'
  ];

  for (const q of queries) {
    try {
      console.log(`Querying: "${q}"...`);
      const url = new URL("https://serpapi.com/search");
      url.searchParams.set("engine", "google_jobs");
      url.searchParams.set("api_key", API_KEY);
      url.searchParams.set("q", q);
      url.searchParams.set("hl", "en");
      url.searchParams.set("gl", "in");

      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const data = await res.json();
      const jobs = data.jobs_results || [];

      for (const j of jobs) {
        const title = j.title || '';
        const company = j.company_name || '';
        const location = j.location || 'India';
        const applyOptions = j.apply_options || [];
        const applyUrl = (applyOptions[0]?.link) || j.share_link || '';

        if (!applyUrl || !title || !company) continue;

        // Master Status Gate: Drop if ALREADY_APPLIED, ALREADY_SKIPPED, or ALREADY_SEEN
        const check = masterRegistry.checkStatus(applyUrl);
        if (!check.shouldAudit) {
          continue;
        }

        // Filter out senior titles
        if (/\b(senior|sr\.?|lead|principal|architect|manager)\b/i.test(title)) continue;
        if (/native|flutter|ios|android/i.test(title)) continue;

        seenIdentifiers.add(applyUrl.toLowerCase());
        googleCandidates.push({
          source: "Google Jobs (SerpApi)",
          company,
          title,
          location,
          url: applyUrl,
          extensions: (j.extensions || []).join(' | '),
          status: "PENDING_DEEP_VERIFY",
          timestamp: new Date().toISOString()
        });
        console.log(` ✅ GOOGLE JOBS: [${company}] ${title} | ${location}`);
      }
    } catch (e) {
      console.error(`Error querying "${q}":`, e.message);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎯 GOOGLE JOBS HARVEST COMPLETE: ${googleCandidates.length} FRESH ROLES`);
  console.log(`======================================================`);

  const outPath = path.resolve("scripts/raw_scraped_google_jobs.json");
  fs.writeFileSync(outPath, JSON.stringify(googleCandidates, null, 2), "utf8");
}

sweepGoogleJobs().catch(console.error);
