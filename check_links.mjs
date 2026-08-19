import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { parse } from "csv-parse/sync";

const envContent = readFileSync("D:/adi/mcp/.env", "utf8");
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

const CSV_IN  = "D:/adi/mcp/verified_jobs.csv";
const CSV_OUT = "D:/adi/mcp/active_jobs.csv";

const EXPIRED_PATTERNS = [
  /job\s*(listing\s*)?is\s*no\s*longer\s*available/i,
  /this\s*job\s*(has\s*been\s*)?(expired|closed|filled|removed)/i,
  /job\s*expired/i,
  /no\s*longer\s*accepting\s*applications/i,
  /position\s*has\s*been\s*filled/i,
  /this\s*position\s*is\s*(closed|no longer available)/i,
  /listing\s*not\s*found/i,
  /page\s*not\s*found/i,
  /404/i,
];

const raw  = readFileSync(CSV_IN, "utf8");
const jobs = parse(raw, { columns: true, skip_empty_lines: true });

console.log(`\n🔍 Checking ${jobs.length} job URLs for expired/dead links...\n`);

const active  = [];
const expired = [];

for (let i = 0; i < jobs.length; i++) {
  const job = jobs[i];
  const url = job.Apply_URL;
  process.stdout.write(`[${i+1}/${jobs.length}] ${job.Title.slice(0,38).padEnd(38)} | `);

  if (!url || url.length < 10) {
    console.log("❌ No URL");
    expired.push({ ...job, reason: "No URL" });
    continue;
  }

  let html = "";
  let status = 0;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      redirect: "follow"
    });
    clearTimeout(t);
    status = res.status;
    html = await res.text();
  } catch (e) {
    console.log(`❌ Fetch error`);
    expired.push({ ...job, reason: "Fetch error" });
    continue;
  }

  if (status === 404) {
    console.log(`❌ 404 Not Found`);
    expired.push({ ...job, reason: "404" });
    continue;
  }

  const isExpired = EXPIRED_PATTERNS.some(p => p.test(html.slice(0, 10000)));
  if (isExpired) {
    console.log(`❌ Job expired/closed`);
    expired.push({ ...job, reason: "Expired" });
    continue;
  }

  console.log(`✅ ACTIVE`);
  active.push(job);

  await new Promise(r => setTimeout(r, 400));
}

console.log(`\n✅ Active jobs: ${active.length}`);
console.log(`❌ Expired/dead: ${expired.length}\n`);

if (active.length === 0) { console.log("No active jobs found."); process.exit(0); }

// Print table
const pad = (s, n) => String(s ?? "").slice(0, n).padEnd(n);
console.log(pad("#",3)+pad("Title",42)+pad("Company",25)+pad("Location",28)+pad("Posted",12)+"Apply URL");
console.log("-".repeat(160));
active.forEach((j, i) => {
  console.log(pad(i+1,3)+pad(j.Title,42)+pad(j.Company,25)+pad(j.Location,28)+pad(j.Real_Date_Posted,12)+j.Apply_URL.slice(0,60));
});

// Write active CSV
const keys = Object.keys(active[0]);
const csv = [keys.join(","), ...active.map(j => keys.map(k => `"${String(j[k]??'').replace(/"/g,'""')}"`).join(","))].join("\n");
writeFileSync(CSV_OUT, csv, "utf8");
console.log(`\n📄 Active jobs CSV: ${CSV_OUT}`);
