// Adzuna Live Date Verifier
// Checks each Adzuna listing page for real posted date + active/expired status
// Saves results to adzuna_live_date_verified.json

import { createRequire } from 'module';
import { writeFileSync } from 'fs';
const require = createRequire(import.meta.url);

const slot4 = require('./slot4_verified_all_active.json');
const adzunaJobs = slot4.filter(j => j.source && j.source.includes('Adzuna'));

// CDP fetch each page
async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html'
      },
      signal: AbortSignal.timeout(10000)
    });
    return await res.text();
  } catch(e) {
    return null;
  }
}

function extractDateAndStatus(html, url) {
  if (!html) return { posted: 'FETCH_FAILED', status: 'UNKNOWN', daysAgo: null };

  // Check if expired/closed
  const expired = /no longer accepting|job has expired|position (is|has been) filled|closed|not available/i.test(html);

  // Try to find posted date patterns
  // Adzuna typically shows: "X days ago", "X hours ago", "Posted: DD Mon YYYY"
  let posted = 'Unknown';
  let daysAgo = null;

  const hourMatch = html.match(/(\d+)\s*hour[s]?\s*ago/i);
  const dayMatch = html.match(/(\d+)\s*day[s]?\s*ago/i);
  const weekMatch = html.match(/(\d+)\s*week[s]?\s*ago/i);
  const monthMatch = html.match(/(\d+)\s*month[s]?\s*ago/i);
  const dateMatch = html.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i);
  const isoMatch = html.match(/"datePosted"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
  const publishedMatch = html.match(/"datePublished"\s*:\s*"([^"]+)"/);

  if (isoMatch) {
    posted = isoMatch[1];
    const diff = Math.floor((Date.now() - new Date(isoMatch[1]).getTime()) / 86400000);
    daysAgo = diff;
  } else if (publishedMatch) {
    posted = publishedMatch[1].slice(0, 10);
    const diff = Math.floor((Date.now() - new Date(publishedMatch[1]).getTime()) / 86400000);
    daysAgo = diff;
  } else if (hourMatch) {
    posted = `${hourMatch[1]} hours ago`;
    daysAgo = 0;
  } else if (dayMatch) {
    posted = `${dayMatch[1]} days ago`;
    daysAgo = parseInt(dayMatch[1]);
  } else if (weekMatch) {
    posted = `${weekMatch[1]} week(s) ago`;
    daysAgo = parseInt(weekMatch[1]) * 7;
  } else if (monthMatch) {
    posted = `${monthMatch[1]} month(s) ago`;
    daysAgo = parseInt(monthMatch[1]) * 30;
  } else if (dateMatch) {
    posted = dateMatch[1];
    daysAgo = Math.floor((Date.now() - new Date(dateMatch[1]).getTime()) / 86400000);
  }

  const fresh = daysAgo !== null ? daysAgo <= 7 : null;

  return {
    posted,
    daysAgo,
    fresh,
    expired,
    status: expired ? 'EXPIRED' : (fresh === false ? 'STALE' : 'ACTIVE')
  };
}

console.log(`Checking ${adzunaJobs.length} Adzuna listings...`);
const results = [];

for (let i = 0; i < adzunaJobs.length; i++) {
  const job = adzunaJobs[i];
  process.stdout.write(`[${i+1}/${adzunaJobs.length}] ${job.company}... `);
  const html = await fetchPage(job.url);
  const info = extractDateAndStatus(html, job.url);
  results.push({
    id: job.id,
    company: job.company,
    role: job.role,
    exp: job.verified_exp,
    url: job.url,
    ...info
  });
  console.log(`${info.status} | ${info.posted} | ${info.daysAgo !== null ? info.daysAgo + 'd ago' : '?'}`);
  await new Promise(r => setTimeout(r, 300)); // polite delay
}

writeFileSync('./adzuna_live_date_verified.json', JSON.stringify(results, null, 2));

const active = results.filter(r => r.status === 'ACTIVE');
const stale = results.filter(r => r.status === 'STALE');
const expired = results.filter(r => r.status === 'EXPIRED');
const failed = results.filter(r => r.status === 'UNKNOWN');

console.log('\n=== SUMMARY ===');
console.log(`ACTIVE (≤7d): ${active.length}`);
console.log(`STALE  (>7d): ${stale.length}`);
console.log(`EXPIRED     : ${expired.length}`);
console.log(`FETCH FAILED: ${failed.length}`);
console.log('Saved to adzuna_live_date_verified.json');
