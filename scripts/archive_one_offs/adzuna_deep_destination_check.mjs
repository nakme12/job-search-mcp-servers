/**
 * Adzuna Destination Deep Checker
 * - Opens each Adzuna job via fetch, extracts the land/redirect URL
 * - Follows to real destination (Cutshort, Naukri, company site etc)
 * - Extracts real posted date from destination
 * - Saves stale/dead jobs to dead_jobs_blacklist.json
 * - Rule: if posted > 30 days ago OR expired → BLACKLIST
 */

import { createRequire } from 'module';
import { writeFileSync, existsSync, readFileSync } from 'fs';
const require = createRequire(import.meta.url);

const slot4 = require('./slot4_verified_all_active.json');
const adzunaJobs = slot4.filter(j => j.source && j.source.includes('Adzuna'));

// Load existing blacklist
const BLACKLIST_PATH = '../dead_jobs_blacklist.json';
let blacklist = [];
if (existsSync(BLACKLIST_PATH)) {
  try { blacklist = JSON.parse(readFileSync(BLACKLIST_PATH, 'utf8')); } catch(e) {}
}

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9'
};

async function fetchText(url, timeout = 12000) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeout), redirect: 'follow' });
    return { html: await res.text(), finalUrl: res.url };
  } catch(e) {
    return { html: null, finalUrl: url };
  }
}

function parsePostedDate(html, url) {
  if (!html) return { posted: null, daysAgo: null, source: 'FETCH_FAILED' };

  const expired = /no longer accepting|job.*expired|position.*filled|this job.*closed|not available|removed/i.test(html);

  // Various date patterns
  const patterns = [
    // "Posted 26 Dec 2025" or "Posted: 26 Dec 2025"
    { rx: /[Pp]osted[:\s]+(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i, type: 'full_date' },
    // ISO in JSON-LD
    { rx: /"datePosted"\s*:\s*"(\d{4}-\d{2}-\d{2})"/i, type: 'iso' },
    { rx: /"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/i, type: 'iso' },
    // "X days ago"
    { rx: /(\d+)\s*days?\s*ago/i, type: 'relative_day' },
    // "X hours ago"
    { rx: /(\d+)\s*hours?\s*ago/i, type: 'relative_hour' },
    // "X weeks ago"
    { rx: /(\d+)\s*weeks?\s*ago/i, type: 'relative_week' },
    // "X months ago"
    { rx: /(\d+)\s*months?\s*ago/i, type: 'relative_month' },
    // DD/MM/YYYY or DD-MM-YYYY
    { rx: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, type: 'dmy' },
  ];

  let posted = null;
  let daysAgo = null;

  for (const { rx, type } of patterns) {
    const m = html.match(rx);
    if (!m) continue;

    if (type === 'iso') {
      posted = m[1];
      daysAgo = Math.floor((Date.now() - new Date(m[1]).getTime()) / 86400000);
      break;
    } else if (type === 'full_date') {
      posted = m[1];
      daysAgo = Math.floor((Date.now() - new Date(m[1]).getTime()) / 86400000);
      break;
    } else if (type === 'relative_hour') {
      posted = `${m[1]} hours ago`; daysAgo = 0; break;
    } else if (type === 'relative_day') {
      posted = `${m[1]} days ago`; daysAgo = parseInt(m[1]); break;
    } else if (type === 'relative_week') {
      posted = `${m[1]} weeks ago`; daysAgo = parseInt(m[1]) * 7; break;
    } else if (type === 'relative_month') {
      posted = `${m[1]} months ago`; daysAgo = parseInt(m[1]) * 30; break;
    } else if (type === 'dmy') {
      const d = new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`);
      posted = d.toISOString().slice(0,10);
      daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000);
      break;
    }
  }

  const isStale = daysAgo !== null ? daysAgo > 30 : null;

  return { posted, daysAgo, expired, isStale, finalUrl: url };
}

// Extract real apply URL from Adzuna page
async function getRealDestination(adzunaUrl) {
  const { html } = await fetchText(adzunaUrl);
  if (!html) return null;

  // Adzuna uses /land/ad/ redirect links
  const landMatch = html.match(/href="(https?:\/\/www\.adzuna\.in\/land\/ad\/[^"]+)"/);
  if (landMatch) {
    const { finalUrl } = await fetchText(landMatch[1]);
    return finalUrl;
  }

  // Sometimes direct apply_url in page
  const directMatch = html.match(/["']apply_url["']\s*:\s*["'](https?:\/\/[^"']+)["']/);
  if (directMatch) return directMatch[1];

  return null;
}

console.log(`\n🔍 Checking ${adzunaJobs.length} Adzuna jobs for real destination + posted date...\n`);

const verified = [];
const toBlacklist = [];

for (let i = 0; i < adzunaJobs.length; i++) {
  const job = adzunaJobs[i];
  process.stdout.write(`[${i+1}/${adzunaJobs.length}] ${job.company} | ${job.role}\n  → Getting destination... `);

  const destUrl = await getRealDestination(job.url);
  if (!destUrl) {
    process.stdout.write('FETCH FAILED\n');
    toBlacklist.push({ ...job, real_url: null, posted: null, daysAgo: null, reason: 'FETCH_FAILED', blacklisted_on: new Date().toISOString().slice(0,10) });
    continue;
  }

  process.stdout.write(`${destUrl.slice(0,60)}...\n  → Checking date... `);
  const { html: destHtml } = await fetchText(destUrl);
  const info = parsePostedDate(destHtml, destUrl);

  const status = info.expired ? 'EXPIRED' : (info.isStale ? 'STALE' : (info.daysAgo !== null ? 'ACTIVE' : 'UNKNOWN_DATE'));

  console.log(`${status} | Posted: ${info.posted || 'unknown'} | ${info.daysAgo !== null ? info.daysAgo+'d ago' : '?'}`);

  const entry = {
    id: job.id,
    company: job.company,
    role: job.role,
    adzuna_url: job.url,
    real_url: destUrl,
    posted: info.posted,
    daysAgo: info.daysAgo,
    expired: info.expired,
    isStale: info.isStale,
    status,
    checked_on: new Date().toISOString().slice(0,10)
  };

  if (status === 'EXPIRED' || status === 'STALE') {
    toBlacklist.push({ ...entry, reason: status, blacklisted_on: entry.checked_on });
  } else {
    verified.push(entry);
  }

  await new Promise(r => setTimeout(r, 500));
}

// Merge with existing blacklist (avoid duplicates by adzuna_url)
const existingUrls = new Set(blacklist.map(b => b.adzuna_url || b.url || b.recipient_or_url));
const newBlacklistEntries = toBlacklist.filter(j => !existingUrls.has(j.adzuna_url));
const updatedBlacklist = [...blacklist, ...newBlacklistEntries];

writeFileSync(BLACKLIST_PATH, JSON.stringify(updatedBlacklist, null, 2));
writeFileSync('./adzuna_destination_final_checked.json', JSON.stringify(verified, null, 2));

console.log(`\n${'='.repeat(50)}`);
console.log(`✅ ACTIVE / UNKNOWN DATE  : ${verified.length}`);
console.log(`❌ BLACKLISTED (stale/exp): ${toBlacklist.length}`);
console.log(`📁 Blacklist total entries: ${updatedBlacklist.length}`);
console.log(`Saved → dead_jobs_blacklist.json`);
console.log(`Saved → adzuna_destination_final_checked.json`);
