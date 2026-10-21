import "dotenv/config";
import fs from "fs";
import path from "path";

// Massive Harvest Across All India Tech Hubs & Remote
const queries = [
  "Frontend developer Remote India 0-2 years",
  "React developer Bangalore 1 year experience",
  "MERN stack developer Pune 0-2 years",
  "React developer Hyderabad 1 year experience",
  "Frontend engineer Gurgaon 0-2 years",
  "React developer Noida 1-2 years experience",
  "Junior Frontend Developer India",
  "Next.js developer Remote India",
  "UI Developer React Ahmedabad 1-2 years",
  "Software Engineer Frontend 0-2 years India"
];

async function massHarvest() {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) {
    console.error("Missing SERPAPI_API_KEY");
    return;
  }

  // Load tracker to avoid re-applying
  const trackerPath = path.resolve("applied_and_seen_tracker.json");
  let tracker = { applied: [], seen: [] };
  if (fs.existsSync(trackerPath)) {
    tracker = JSON.parse(fs.readFileSync(trackerPath, "utf8"));
  }

  const appliedCompanies = new Set(tracker.applied.map((a) => (a.company || "").toLowerCase().trim()));
  const seenUrls = new Set([...(tracker.seen || []), ...(tracker.applied || []).map((a) => a.recipient_or_url || a.url)]);

  console.log(`Starting High-Volume All-India & Remote Harvest (Targeting 100+ Qualified Pool)...`);
  const rawJobs = [];

  for (const q of queries) {
    try {
      const url = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(q)}&api_key=${key}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const list = data.jobs_results || [];
      console.log(` -> "${q}": found ${list.length} jobs`);
      list.forEach((j) => rawJobs.push(j));
    } catch (e) {
      console.error(`Error querying "${q}":`, e.message);
    }
  }

  console.log(`\nTotal Raw Collected: ${rawJobs.length}`);

  // Deduplicate and filter strict 0-2 YOE Frontend / React / MERN
  const qualified = [];
  const seenKeys = new Set();

  for (const j of rawJobs) {
    const title = (j.title || "").toLowerCase();
    const company = (j.company_name || "").trim();
    const companyLower = company.toLowerCase();

    // Check if already applied
    if (appliedCompanies.has(companyLower)) continue;

    // Positive stack match
    const isTargetStack =
      title.includes("react") ||
      title.includes("frontend") ||
      title.includes("front end") ||
      title.includes("web developer") ||
      title.includes("full stack") ||
      title.includes("fullstack") ||
      title.includes("next.js") ||
      title.includes("ui developer") ||
      title.includes("software engineer");

    if (!isTargetStack) continue;

    // Hard disqualify
    if (
      title.includes("senior") ||
      title.includes("lead") ||
      title.includes("principal") ||
      title.includes("architect") ||
      title.includes("manager") ||
      title.includes("intern") ||
      title.includes("trainee") ||
      title.includes("native") ||
      title.includes("flutter") ||
      title.includes("devops")
    ) {
      continue;
    }

    const applyOptions = j.apply_options || [];
    const targetUrl = applyOptions[0]?.link || j.share_link || "";
    const key = `${companyLower}_${title}`;

    if (seenKeys.has(key) || seenUrls.has(targetUrl)) continue;
    seenKeys.add(key);

    // Map resume
    let targetResume = "Pratik Patidar Resume - Frontend Engineer (Updated).pdf";
    let category = "Frontend Engineer";

    if (title.includes("full stack") || title.includes("fullstack") || title.includes("mern")) {
      targetResume = "Pratik Patidar Resume - MERN Full Stack (Updated).pdf";
      category = "MERN Full Stack";
    } else if (title.includes("react")) {
      targetResume = "Pratik Patidar Resume - React Developer (Updated).pdf";
      category = "React Developer";
    }

    qualified.push({
      company,
      title: j.title,
      location: j.location,
      url: targetUrl,
      posted_at: j.detected_extensions?.posted_at || "Recent",
      category,
      targetResume,
      description: j.description?.slice(0, 300) || ""
    });
  }

  console.log(`\n======================================================`);
  console.log(`🎯 TOTAL HIGH-VOLUME QUALIFIED UNAPPLIED TARGETS: ${qualified.length}`);
  console.log(`======================================================`);

  const outPath = path.resolve("scripts/high_volume_all_india_pool.json");
  fs.writeFileSync(outPath, JSON.stringify(qualified, null, 2));
  console.log(`Saved to: ${outPath}`);

  // Breakdown
  const catCount = {};
  qualified.forEach((q) => {
    catCount[q.category] = (catCount[q.category] || 0) + 1;
  });
  console.log("Stack Breakdown:", catCount);
}

massHarvest().catch(console.error);
