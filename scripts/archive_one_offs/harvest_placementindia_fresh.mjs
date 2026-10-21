import fs from "fs";
import path from "path";
import { parsePlacementIndiaSearchHtml, enrichJobDetails } from "../servers/placementindia-mcp.js";
import { loadMasterStatusRegistry } from "../servers/master-status-filter.js";
import { evaluateExperience } from "../servers/experience-filter.js";

const masterRegistry = loadMasterStatusRegistry();

const searchUrls = [
  "https://www.placementindia.com/job-search/search.php?seeker_search_keyword=React+Developer&seeker_search_experience=0",
  "https://www.placementindia.com/job-search/search.php?seeker_search_keyword=Frontend+Developer&seeker_search_experience=0",
  "https://www.placementindia.com/job-search/search.php?seeker_search_keyword=Next.js&seeker_search_city=Indore",
  "https://www.placementindia.com/job-search/search.php?seeker_search_keyword=React+Developer&seeker_search_city=Indore"
];

async function run() {
  console.log("======================================================");
  console.log("🔍 RUNNING DIRECT PLACEMENTINDIA FRESH RECRUITER SWEEP");
  console.log("======================================================");

  const freshAudited = [];

  for (const url of searchUrls) {
    try {
      console.log(`Fetching: ${url}...`);
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      if (!res.ok) continue;
      const html = await res.text();
      const rawJobs = parsePlacementIndiaSearchHtml(html);
      console.log(` -> Parsed ${rawJobs.length} raw cards`);

      for (const j of rawJobs) {
        if (!j.jobUrl || !j.title || !j.company) continue;

        // 1. Master status gate: Check against applied / skipped / dead
        const check = masterRegistry.checkStatus(j.jobUrl);
        if (!check.shouldAudit) continue;

        // 2. Strict 0-2 YOE Filter
        const ev = evaluateExperience({ title: j.title, description: j.description || '' }, 2, true);
        if (ev.exclude || !ev.passes_whitelist || ev.is_non_stack) continue;

        // 3. Enrich details (find posted date & direct email if present)
        const enriched = await enrichJobDetails(j);
        
        freshAudited.push({
          company: enriched.company,
          role: enriched.title,
          location: enriched.location || "India",
          experience: enriched.experience || "0-2 Yrs",
          url: enriched.jobUrl,
          contact: enriched.recruiter_contact || null,
          date_posted: enriched.postedDate || "Recent",
          source: "PlacementIndia (MCP)",
          status: "PENDING_DEEP_VERIFY"
        });
        console.log(` ✅ FRESH JOB: [${enriched.company}] ${enriched.title} | ${enriched.location}`);
      }
    } catch (e) {
      console.error("Error in sweep:", e.message);
    }
  }

  console.log(`\n🎯 TOTAL FRESH DIRECT ROLES HARVESTED: ${freshAudited.length}`);
  fs.writeFileSync("scripts/placementindia_fresh_slot2_harvest.json", JSON.stringify(freshAudited, null, 2));
}

run().catch(console.error);
