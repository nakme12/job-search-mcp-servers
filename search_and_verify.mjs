import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";

// Load .env
const envContent = readFileSync("D:/adi/mcp/.env", "utf8");
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

const API_KEY = process.env.SERPAPI_API_KEY;
if (!API_KEY) { console.error("No SERPAPI key"); process.exit(1); }

const QUERIES_GLOBAL = [
  { q: "Frontend Developer", location: "" },
  { q: "React Developer", location: "" },
  { q: "React.js Developer", location: "" },
  { q: "Next.js Developer", location: "" },
  { q: "UI Developer", location: "" },
  { q: "Frontend Engineer", location: "" },
  { q: "JavaScript Developer", location: "" },
];

const QUERIES_INDIA = [
  { q: "Frontend Developer", location: "India" },
  { q: "React Developer", location: "India" },
  { q: "React.js Developer", location: "India" },
  { q: "Next.js Developer", location: "India" },
  { q: "Frontend Engineer", location: "India" },
  { q: "JavaScript Developer", location: "India" },
];

const SENIOR_RE = /\b(senior|sr\.|lead|staff|principal|architect|manager|director|head of)\b/i;
const INTERN_RE = /\b(intern|internship|trainee|apprentice)\b/i;
const STACK_RE  = /\b(angular|vue\.?js|vue|svelte|ember|backbone|flutter|xamarin|kotlin|swift|\.net|php|ruby|django|laravel|wordpress|drupal)\b/i;
const YOE_RE    = /(\d+)\s*\+?\s*(?:to|-)\s*(\d+)\s*years?|(\d+)\s*\+\s*years?\s*(?:of\s*)?(?:experience)?|(\d+)\s*years?\s*(?:of\s*)?experience/gi;

function extractMinYoe(text) {
  const nums = [];
  let m;
  const re = new RegExp(YOE_RE.source, "gi");
  while ((m = re.exec(text)) !== null) {
    const d = m[0].match(/\d+/g);
    if (d) nums.push(...d.map(Number));
  }
  return nums.length ? Math.min(...nums) : 0;
}

function extractDatePosted(html) {
  const jld = html.match(/"datePosted"\s*:\s*"([^"]+)"/);
  if (jld) return jld[1];
  const meta = html.match(/date[_-]?posted['":\s]+([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  if (meta) return meta[1];
  return null;
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 8000);
}

function ageDays(dateStr) {
  if (!dateStr) return 9999;
  const d = new Date(dateStr);
  if (isNaN(d)) return 9999;
  return Math.round((Date.now() - d.getTime()) / 86400000);
}

async function serpSearch(q, location) {
  const url = new URL("https://serpapi.com/search");
  url.searchParams.set("engine", "google_jobs");
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("q", q);
  url.searchParams.set("chips", "date_posted:week");
  url.searchParams.set("hl", "en");
  if (location) url.searchParams.set("location", location);
  const res = await fetch(url);
  const data = await res.json();
  return data.jobs_results || [];
}

// ── PHASE 1: Collect jobs ────────────────────────────────────────────────────
const seen = new Set();
const allJobs = [];

const allQueries = [...QUERIES_GLOBAL, ...QUERIES_INDIA];
console.log(`\n🔍 Searching ${allQueries.length} queries (global + India)...\n`);

for (const { q, location } of allQueries) {
  const label = location ? `"${q}" in ${location}` : `"${q}" (worldwide)`;
  process.stdout.write(`  ${label.padEnd(45)} ... `);
  try {
    const jobs = await serpSearch(q, location);
    let added = 0;
    for (const j of jobs) {
      const title = j.title || "";
      const company = j.company_name || "";
      const loc = j.location || "";
      const desc = (j.description || "") + " " + title;
      const applyUrl = j.apply_options?.[0]?.link || "";
      const key = `${title}|${company}|${loc}`;
      if (seen.has(key)) continue;
      if (SENIOR_RE.test(title)) continue;
      if (INTERN_RE.test(title) || INTERN_RE.test(desc)) continue;
      if (STACK_RE.test(title)) continue;
      const minYoe = extractMinYoe(desc);
      if (minYoe >= 3) continue;
      seen.add(key);
      allJobs.push({ title, company, location: loc, posted: j.detected_extensions?.posted_at || "", minYoe, applyUrl });
      added++;
    }
    console.log(`${jobs.length} found, ${added} added`);
  } catch (e) {
    console.log(`ERROR: ${e.message.slice(0, 50)}`);
  }
  await new Promise(r => setTimeout(r, 400));
}

console.log(`\n📋 Total after phase 1: ${allJobs.length} jobs. Now verifying JDs...\n`);

// ── PHASE 2: Verify JDs ──────────────────────────────────────────────────────
const MAX_YOE  = 2;
const MAX_DAYS = 7;
const verified = [];

for (let i = 0; i < allJobs.length; i++) {
  const job = allJobs[i];
  process.stdout.write(`[${i+1}/${allJobs.length}] ${job.title.slice(0,38).padEnd(38)} | ${job.company.slice(0,18).padEnd(18)} | `);

  if (!job.applyUrl || job.applyUrl.length < 10) {
    console.log("❌ No URL"); continue;
  }

  let html = "";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(job.applyUrl, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; job-checker/1.0)" }
    });
    clearTimeout(t);
    html = await res.text();
  } catch (e) {
    console.log(`❌ Fetch fail`); continue;
  }

  const jdText      = stripHtml(html);
  const datePosted  = extractDatePosted(html);
  const age         = ageDays(datePosted);
  const realMinYoe  = extractMinYoe(jdText);
  const isSenior    = SENIOR_RE.test(jdText.slice(0, 3000));

  if (age > MAX_DAYS)    { console.log(`❌ Too old (${age}d)`); continue; }
  if (realMinYoe > MAX_YOE) { console.log(`❌ Needs ${realMinYoe}+ yrs`); continue; }
  if (isSenior)          { console.log(`❌ Senior in JD`); continue; }

  console.log(`✅ Posted: ${(datePosted||"?").slice(0,10)}  YOE: ${realMinYoe||"not specified"}`);
  verified.push({
    Title:             job.title,
    Company:           job.company,
    Location:          job.location,
    Real_Date_Posted:  (datePosted || job.posted || "").slice(0, 10),
    Real_Min_YOE:      realMinYoe || "not specified",
    Apply_URL:         job.applyUrl,
  });

  await new Promise(r => setTimeout(r, 500));
}

// ── PHASE 3: Write CSV ───────────────────────────────────────────────────────
console.log(`\n\n✅ Verified & passing: ${verified.length}`);

if (verified.length === 0) { console.log("No jobs passed."); process.exit(0); }

const pad = (s, n) => String(s ?? "").slice(0, n).padEnd(n);
console.log("\n" + pad("#",3)+pad("Title",42)+pad("Company",25)+pad("Location",28)+pad("Posted",12)+pad("YOE",20)+"Apply URL");
console.log("-".repeat(175));
verified.forEach((j, i) => {
  console.log(pad(i+1,3)+pad(j.Title,42)+pad(j.Company,25)+pad(j.Location,28)+pad(j.Real_Date_Posted,12)+pad(j.Real_Min_YOE,20)+j.Apply_URL.slice(0,60));
});

const OUT = "D:/adi/mcp/verified_jobs.csv";
const keys = Object.keys(verified[0]);
const csv = [keys.join(","), ...verified.map(j => keys.map(k => `"${String(j[k]??'').replace(/"/g,'""')}"`).join(","))].join("\n");
writeFileSync(OUT, csv, "utf8");
console.log(`\n📄 CSV updated: ${OUT}`);
