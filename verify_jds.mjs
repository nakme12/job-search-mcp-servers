import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { parse } from "csv-parse/sync";

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

const CSV_IN  = "D:/adi/mcp/fresh_jobs_worldwide.csv";
const CSV_OUT = "D:/adi/mcp/verified_jobs.csv";

const MAX_YOE   = 2;
const MAX_DAYS  = 7;

const SENIOR_RE = /\b(senior|sr\.|lead|staff|principal|architect|manager|director|head of)\b/i;
const YOE_RE    = /(\d+)\s*\+?\s*(?:to|-)\s*(\d+)\s*years?|(\d+)\s*\+\s*years?\s*(?:of\s*)?(?:experience)?|(\d+)\s*years?\s*(?:of\s*)?experience/gi;

function extractMinYoe(text) {
  const nums = [];
  let m;
  const re = new RegExp(YOE_RE.source, "gi");
  while ((m = re.exec(text)) !== null) {
    const digits = m[0].match(/\d+/g);
    if (digits) nums.push(...digits.map(Number));
  }
  return nums.length ? Math.min(...nums) : 0;
}

function extractDatePosted(html) {
  // Try JSON-LD datePosted
  const jldMatch = html.match(/"datePosted"\s*:\s*"([^"]+)"/);
  if (jldMatch) return jldMatch[1];
  // Try meta
  const metaMatch = html.match(/date[_-]?posted['":\s]+([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  if (metaMatch) return metaMatch[1];
  return null;
}

function extractJdText(html) {
  // Strip all HTML tags
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 8000);
}

function ageDays(dateStr) {
  if (!dateStr) return 9999;
  const d = new Date(dateStr);
  if (isNaN(d)) return 9999;
  return Math.round((Date.now() - d.getTime()) / 86400000);
}

// Read CSV
const raw = readFileSync(CSV_IN, "utf8");
const jobs = parse(raw, { columns: true, skip_empty_lines: true });

console.log(`\n📋 Verifying ${jobs.length} jobs by fetching their JDs...\n`);

const verified = [];
const rejected = [];

for (let i = 0; i < jobs.length; i++) {
  const job = jobs[i];
  const url = job.Apply_URL;
  process.stdout.write(`[${i+1}/${jobs.length}] ${job.Title.slice(0,40).padEnd(40)} | ${job.Company.slice(0,20).padEnd(20)} | `);

  if (!url || url.length < 10) {
    console.log("❌ No URL");
    rejected.push({ ...job, reject_reason: "No URL" });
    continue;
  }

  let html = "";
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; job-checker/1.0)" }
    });
    clearTimeout(timeout);
    html = await res.text();
  } catch (e) {
    console.log(`❌ Fetch error: ${e.message.slice(0,40)}`);
    rejected.push({ ...job, reject_reason: `Fetch error: ${e.message.slice(0,40)}` });
    continue;
  }

  const jdText = extractJdText(html);
  const datePosted = extractDatePosted(html);
  const age = ageDays(datePosted);
  const minYoe = extractMinYoe(jdText);
  const isSenior = SENIOR_RE.test(jdText.slice(0, 2000));

  // Apply filters
  if (age > MAX_DAYS) {
    console.log(`❌ Too old (${age} days, posted ${datePosted})`);
    rejected.push({ ...job, reject_reason: `Too old: ${age} days`, real_date: datePosted });
    continue;
  }
  if (minYoe > MAX_YOE) {
    console.log(`❌ Needs ${minYoe}+ yrs exp`);
    rejected.push({ ...job, reject_reason: `Requires ${minYoe}+ yrs`, real_date: datePosted });
    continue;
  }
  if (isSenior) {
    console.log(`❌ Senior role detected in JD`);
    rejected.push({ ...job, reject_reason: "Senior role in JD", real_date: datePosted });
    continue;
  }

  console.log(`✅ PASS | Posted: ${datePosted || job.Posted} | YOE: ${minYoe || "not specified"}`);
  verified.push({
    ...job,
    Real_Date_Posted: datePosted || job.Posted,
    Real_Min_YOE: minYoe || "not specified",
    Age_Days: age === 9999 ? "unknown" : age
  });

  // Small delay
  await new Promise(r => setTimeout(r, 600));
}

console.log(`\n✅ Verified & passing: ${verified.length}`);
console.log(`❌ Rejected: ${rejected.length}\n`);

if (verified.length === 0) {
  console.log("No jobs passed verification.");
  process.exit(0);
}

// Print clean table
const pad = (s, n) => String(s ?? "").slice(0, n).padEnd(n);
console.log(pad("#",3) + pad("Title",42) + pad("Company",25) + pad("Location",28) + pad("Posted",14) + pad("YOE",6) + "Apply URL");
console.log("-".repeat(170));
verified.forEach((j, idx) => {
  console.log(
    pad(idx+1, 3) +
    pad(j.Title, 42) +
    pad(j.Company, 25) +
    pad(j.Location, 28) +
    pad(j.Real_Date_Posted, 14) +
    pad(j.Real_Min_YOE, 6) +
    j.Apply_URL.slice(0, 60)
  );
});

// Write verified CSV
const headers = Object.keys(verified[0]);
const csvOut = [
  headers.join(","),
  ...verified.map(j => headers.map(h => `"${String(j[h] ?? "").replace(/"/g,'""')}"`).join(","))
].join("\n");
writeFileSync(CSV_OUT, csvOut, "utf8");
console.log(`\n📄 Verified CSV: ${CSV_OUT}`);
