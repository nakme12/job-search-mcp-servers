import "dotenv/config";
import { createWriteStream } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

// Load .env manually since it's in D:/adi/mcp
const envPath = "D:/adi/mcp/.env";
const envContent = readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

const API_KEY = process.env.SERPAPI_API_KEY;
if (!API_KEY) { console.error("No SERPAPI key"); process.exit(1); }

// Role queries to search
const QUERIES = [
  "Frontend Developer",
  "React Developer",
  "React.js Developer",
  "Next.js Developer",
  "UI Developer",
  "Frontend Engineer",
  "JavaScript Developer",
];


const SENIOR_PATTERNS = /\b(senior|sr\.|lead|staff|principal|architect|manager|director|head of)\b/i;

const INTERN_PATTERNS = /\b(intern|internship|trainee|apprentice)\b/i;

const WRONG_STACK_PATTERNS = /\b(angular|vue\.?js|vue|svelte|ember|backbone|flutter|xamarin|kotlin|swift|\.net|php|ruby|django|laravel|wordpress|drupal|java\s+back|java backend)\b/i;

function extractYOE(text) {
  const matches = text.match(/(\d+)\+?\s*(?:to|-)\s*(\d+)\s*years?|(\d+)\+\s*years?|(\d+)\s*years?\s*(?:of)?\s*experience/gi);
  if (!matches) return 0;
  const nums = [];
  for (const m of matches) {
    const digits = m.match(/\d+/g);
    if (digits) nums.push(...digits.map(Number));
  }
  return nums.length ? Math.min(...nums) : 0;
}

async function searchSerpApi(query) {
  const url = new URL("https://serpapi.com/search");
  url.searchParams.set("engine", "google_jobs");
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("q", query);
  url.searchParams.set("chips", "date_posted:week"); // last 7 days
  url.searchParams.set("hl", "en");
  
  const res = await fetch(url);
  const data = await res.json();
  return data.jobs_results || [];
}

function ageDays(dateStr) {
  if (!dateStr) return 9999;
  const now = new Date();
  const d = new Date(dateStr);
  if (isNaN(d)) return 9999;
  return Math.round((now - d) / 86400000);
}

const seen = new Set();
const results = [];

console.log("🔍 Searching worldwide for fresh Frontend/React jobs...\n");

for (const query of QUERIES) {
  process.stdout.write(`  Querying: "${query}" ... `);
  try {
    const jobs = await searchSerpApi(query);
    let added = 0;
    for (const j of jobs) {
      const title = j.title || "";
      const location = j.location || "";
      const desc = (j.description || "") + " " + title;
      const applyUrl = j.apply_options?.[0]?.link || j.job_id || "";
      const key = `${title}|${j.company_name}|${location}`;

      // Dedup
      if (seen.has(key)) continue;


      // Exclude senior titles / internships / wrong stack
      if (SENIOR_PATTERNS.test(title)) continue;
      if (INTERN_PATTERNS.test(title) || INTERN_PATTERNS.test(desc)) continue;
      if (WRONG_STACK_PATTERNS.test(title)) continue;

      // Exclude 3+ YOE
      const minYoe = extractYOE(desc);
      if (minYoe >= 3) continue;

      seen.add(key);
      results.push({
        title,
        company: j.company_name || "",
        location,
        posted: j.detected_extensions?.posted_at || "",
        schedule: j.detected_extensions?.schedule_type || "",
        minYoe,
        applyUrl,
        description: (j.description || "").slice(0, 200),
      });
      added++;
    }
    console.log(`${jobs.length} found, ${added} passed filters`);
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
  // Small delay to avoid hammering API
  await new Promise(r => setTimeout(r, 500));
}

console.log(`\n✅ Total qualifying jobs: ${results.length}\n`);

// Print table
const cols = ["#", "Title", "Company", "Location", "Posted", "YOE Min", "Apply URL"];
const rows = results.map((j, i) => [
  String(i + 1),
  j.title.slice(0, 40),
  j.company.slice(0, 25),
  j.location.slice(0, 30),
  j.posted,
  String(j.minYoe || "-"),
  j.applyUrl.slice(0, 60),
]);

// Simple table print
function pad(s, n) { return String(s).padEnd(n); }
console.log(
  pad("#", 3) +
  pad("Title", 42) +
  pad("Company", 27) +
  pad("Location", 32) +
  pad("Posted", 16) +
  pad("YOE", 6) +
  "Apply URL"
);
console.log("-".repeat(180));
for (const r of rows) {
  console.log(pad(r[0],3)+pad(r[1],42)+pad(r[2],27)+pad(r[3],32)+pad(r[4],16)+pad(r[5],6)+r[6]);
}

// Write CSV
const csvPath = "D:/adi/mcp/fresh_jobs_worldwide.csv";
const header = "Title,Company,Location,Posted,Schedule,YOE_Min,Apply_URL,Description\n";
const csvRows = results.map(j =>
  [j.title, j.company, j.location, j.posted, j.schedule, j.minYoe, j.applyUrl, j.description]
    .map(v => `"${String(v).replace(/"/g, '""')}"`)
    .join(",")
).join("\n");
import { writeFileSync } from "fs";
writeFileSync(csvPath, header + csvRows, "utf8");
console.log(`\n📄 CSV saved to: ${csvPath}`);
