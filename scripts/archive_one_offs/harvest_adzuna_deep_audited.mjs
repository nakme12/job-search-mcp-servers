import "dotenv/config";
import fs from "fs";
import path from "path";
import { getFilePaths, isDuplicateHistorical, normalizeTargetId } from "./workflow_5file_manager.mjs";
import { evaluateExperience } from "../servers/experience-filter.js";

const appId = process.env.ADZUNA_APP_ID;
const appKey = process.env.ADZUNA_APP_KEY;

if (!appId || !appKey) {
  console.log("❌ Adzuna API credentials missing in .env");
  process.exit(1);
}

const paths = getFilePaths();
const todayTotalFile = paths.todayTotal;

let todayTotal = { date: paths.today, total: 0, jobs: [] };
if (fs.existsSync(todayTotalFile)) {
  try {
    todayTotal = JSON.parse(fs.readFileSync(todayTotalFile, "utf8"));
    if (!Array.isArray(todayTotal.jobs)) todayTotal.jobs = [];
  } catch (e) {
    todayTotal = { date: paths.today, total: 0, jobs: [] };
  }
}

const seenInToday = new Set(todayTotal.jobs.map(j => normalizeTargetId(j.url || j.applyUrl || j.link)));

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9'
};

async function fetchDestination(url) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000), redirect: 'follow' });
    const text = await res.text();
    return { html: text, finalUrl: res.url };
  } catch (e) {
    return { html: null, finalUrl: url, error: e.message };
  }
}

function parseDestinationAudit(html, finalUrl) {
  if (!html) return { valid: false, reason: 'FETCH_FAILED' };

  // 1. Closed / Expired Check
  if (/no longer accepting|job.*expired|position.*filled|this job.*closed|not available|removed|job.*inactive/i.test(html)) {
    return { valid: false, reason: 'EXPIRED_OR_CLOSED' };
  }

  // 2. Strict 0-2 YOE Check on Live DOM
  if (/\b([3-9]|\d{2,})\s*(?:\+|-|\s*to\s*\d+)?\s*(?:years?|yrs?)\b/i.test(html) ||
      /\b(senior|lead|principal|architect|staff|director|manager)\b/i.test(html)) {
    // Only flag if it's explicitly experience requirement
    if (/experience[:\s]+[3-9]/i.test(html) || /([3-9]|\d{2,})\+?\s*years?\s*(?:of)?\s*experience/i.test(html)) {
      return { valid: false, reason: 'DOM_REQUIRES_3_PLUS_YOE' };
    }
  }

  // 3. Stale Date Check
  if (/posted\s*30\+\s*days\s*ago|posted\s*[2-9]\s*months?\s*ago|posted\s*1\s*year\s*ago/i.test(html)) {
    return { valid: false, reason: 'STALE_POSTING_DOM' };
  }

  return { valid: true, finalUrl };
}

async function runAdzunaWithAudit() {
  console.log(`=======================================================`);
  console.log(`🔍 ADZUNA HARVEST WITH LIVE DESTINATION DOM AUDIT`);
  console.log(`=======================================================`);

  const queries = [
    "Junior React developer",
    "Frontend developer",
    "Next.js developer",
    "React developer Indore",
    "MERN developer"
  ];

  let rawDiscovered = 0;
  let auditedAdded = 0;
  let skippedStaleOrExp = 0;
  let skippedDup = 0;

  for (const q of queries) {
    console.log(`\nQuerying Adzuna for: "${q}"...`);
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(q)}&max_days_old=7&results_per_page=30`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        console.log(`Adzuna HTTP error: ${res.status}`);
        continue;
      }
      const data = await res.json();
      const results = data.results || [];
      console.log(`Found ${results.length} raw listings from Adzuna for "${q}"`);

      for (const r of results) {
        rawDiscovered++;
        const title = r.title || '';
        const company = r.company?.display_name || '';
        const redirectUrl = r.redirect_url || '';
        const description = r.description || '';
        const location = r.location?.display_name || 'India';
        const date = r.created || new Date().toISOString();

        if (!redirectUrl || !title || !company) continue;

        const normId = normalizeTargetId(redirectUrl);
        if (seenInToday.has(normId)) continue;

        if (isDuplicateHistorical(normId)) {
          skippedDup++;
          continue;
        }

        // Snippet pre-filter
        const ev = evaluateExperience({ title, description }, 2, true);
        if (ev.exclude || !ev.passes_whitelist || ev.is_non_stack) {
          skippedStaleOrExp++;
          continue;
        }

        // Live Deep Destination DOM Audit
        process.stdout.write(`Auditing destination for [${company}] ${title}... `);
        const dest = await fetchDestination(redirectUrl);
        const audit = parseDestinationAudit(dest.html, dest.finalUrl);

        if (!audit.valid) {
          console.log(`❌ DROPPED (${audit.reason})`);
          skippedStaleOrExp++;
          continue;
        }

        const effectiveUrl = audit.finalUrl || redirectUrl;
        const normFinal = normalizeTargetId(effectiveUrl);
        if (seenInToday.has(normFinal) || isDuplicateHistorical(normFinal)) {
          console.log(`⚠️ DUPLICATE DESTINATION`);
          skippedDup++;
          continue;
        }

        seenInToday.add(normId);
        seenInToday.add(normFinal);

        let resume = "Pratik Patidar Resume - Frontend Engineer.pdf";
        if (/react/i.test(title)) resume = "Pratik Patidar Resume - React Developer.pdf";
        if (/mern|full stack/i.test(title)) resume = "Pratik Patidar Resume - MERN Full Stack.pdf";

        const entry = {
          id: todayTotal.jobs.length + 1,
          company,
          role: title,
          location,
          url: effectiveUrl,
          adzuna_redirect_url: redirectUrl,
          source: "Adzuna (Live Audited)",
          resume_mapped: resume,
          date_posted: date,
          status: "AUDITED_VERIFIED_ACTIVE",
          discovered_at: new Date().toISOString()
        };

        todayTotal.jobs.push(entry);
        auditedAdded++;
        console.log(`✅ VERIFIED & ADDED`);
      }
    } catch (e) {
      console.log(`Error querying Adzuna for "${q}":`, e.message);
    }
  }

  todayTotal.total = todayTotal.jobs.length;
  fs.writeFileSync(todayTotalFile, JSON.stringify(todayTotal, null, 2), "utf8");

  console.log(`\n=======================================================`);
  console.log(`🎯 ADZUNA AUDITED HARVEST SUMMARY`);
  console.log(`- Raw Listings Evaluated: ${rawDiscovered}`);
  console.log(`- Passed Deep DOM Audit & Added: ${auditedAdded}`);
  console.log(`- Dropped (Stale / Expired / 3+ YOE): ${skippedStaleOrExp}`);
  console.log(`- Skipped Duplicates: ${skippedDup}`);
  console.log(`- Total Today Pipeline Count: ${todayTotal.total}`);
  console.log(`=======================================================`);
}

runAdzunaWithAudit();
