import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ROOT_DIR = 'C:/mcp/job-search-mcp-engine';
const TODAY = '2026-10-16';
const SHIFT = 1;

const file1HistPath = path.join(ROOT_DIR, 'total_historical_except_today.json');
const file3TodayShiftPath = path.join(ROOT_DIR, `total_todays_${TODAY}_shift${SHIFT}.json`);
const file3TodayPath = path.join(ROOT_DIR, `total_todays_${TODAY}.json`);
const deadEmailsPath = path.join(ROOT_DIR, 'dead_recruiter_emails.json');

function normalize(str) {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\/+$/, '');
}

// 1. Read Historical Master Blacklist (File 1)
let historicalJobs = [];
try {
  const hRaw = JSON.parse(fs.readFileSync(file1HistPath, 'utf8'));
  historicalJobs = Array.isArray(hRaw) ? hRaw : (hRaw.jobs || []);
} catch (e) {
  console.error('Error reading File 1:', e.message);
}
const historicalSet = new Set(
  historicalJobs.map(j => normalize(j.recipient_or_url || j.url || j.applyUrl || j.link || j.recipient)).filter(Boolean)
);

// 2. Read Dead Recruiter Emails Blacklist
let deadEmailsSet = new Set();
try {
  if (fs.existsSync(deadEmailsPath)) {
    const dRaw = JSON.parse(fs.readFileSync(deadEmailsPath, 'utf8'));
    const list = Array.isArray(dRaw) ? dRaw : (dRaw.emails || Object.keys(dRaw) || []);
    list.forEach(e => deadEmailsSet.add(normalize(e)));
  }
} catch (e) {
  console.error('Error reading dead emails:', e.message);
}

// 3. Read Today's File 3 Pool
let todayPool = {
  date: TODAY,
  shift: SHIFT,
  cycle: 1,
  description: `Raw and candidate jobs discovered on ${TODAY} Shift ${SHIFT}`,
  total: 0,
  jobs: []
};

if (fs.existsSync(file3TodayShiftPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(file3TodayShiftPath, 'utf8'));
    if (Array.isArray(raw.jobs)) todayPool.jobs = raw.jobs;
  } catch (e) {}
}

const seenToday = new Set(
  todayPool.jobs.map(j => normalize(j.url || j.recipient || j.applyUrl || j.link)).filter(Boolean)
);

const initialCount = todayPool.jobs.length;
let totalDiscovered = 0;
let totalDuplicatesDropped = 0;
let totalFilteredOut = 0;
let totalNetAdded = 0;

function ingestRecruiterPost(post) {
  totalDiscovered++;
  const { text, email, link, author } = post;

  if (!email && !link) return;

  const targetIdentifier = normalize(email || link);
  if (!targetIdentifier) return;

  if (seenToday.has(targetIdentifier)) {
    totalDuplicatesDropped++;
    return;
  }
  if (historicalSet.has(targetIdentifier)) {
    totalDuplicatesDropped++;
    return;
  }
  if (email && deadEmailsSet.has(normalize(email))) {
    totalDuplicatesDropped++;
    return;
  }

  // Filter 0-2 YOE & non-stack
  const tLow = text.toLowerCase();
  if (/\b(senior|sr\.?|lead|principal|architect|manager|head|director|vp)\b/i.test(tLow)) {
    totalFilteredOut++;
    return;
  }
  if (/\b(3\+|4\+|5\+|6\+|7\+|8\+|10\+|3\s*-\s*[5678]|4\s*-\s*[678]|5\s*-\s*[78])\s*(years|yrs|yoe)\b/i.test(tLow)) {
    totalFilteredOut++;
    return;
  }
  if (/\b(c2c|corp to corp|w2 only|us citizen|green card)\b/i.test(tLow)) {
    totalFilteredOut++;
    return;
  }
  if (/\b(android|ios|flutter|react native|python|django|devops|aws|golang|c\+\+|dotnet|\.net)\b/i.test(tLow)) {
    totalFilteredOut++;
    return;
  }
  if (!/\b(frontend|front end|react|next\.?js|ui developer|web developer|mern|full stack|fullstack|sde|software engineer|intern)\b/i.test(tLow)) {
    totalFilteredOut++;
    return;
  }

  seenToday.add(targetIdentifier);

  let role = 'Frontend Developer';
  if (tLow.includes('mern') || tLow.includes('full stack') || tLow.includes('fullstack')) {
    role = 'MERN Full Stack Developer';
  } else if (tLow.includes('react')) {
    role = 'React Developer';
  }

  let resume = 'Pratik Patidar Resume - Frontend Engineer.pdf';
  if (role.includes('React')) {
    resume = 'Pratik Patidar Resume - React Developer.pdf';
  } else if (role.includes('MERN')) {
    resume = 'Pratik Patidar Resume - MERN Full Stack.pdf';
  }

  // Extract company name heuristically
  let comp = 'Direct Tech Lead';
  const atMatch = text.match(/\bat\s+([A-Z][a-zA-Z0-9&.-]+(?:\s+[A-Z][a-zA-Z0-9&.-]+)?)/);
  if (atMatch && atMatch[1] && !/hiring|looking|we|our|the|urgent/i.test(atMatch[1])) {
    comp = atMatch[1].trim();
  } else if (author && author.length < 35 && !/hiring|recruiter|hr|talent/i.test(author)) {
    comp = author.trim();
  }

  const entry = {
    id: todayPool.jobs.length + 1,
    company: comp,
    role: role,
    location: 'India / Remote',
    url: link || 'https://www.linkedin.com',
    recipient: email || null,
    source: 'LinkedIn Recruiter Post (Past 24h Buffer)',
    resume_mapped: resume,
    notes: text.slice(0, 300),
    status: 'DISCOVERED_PENDING_AUDIT',
    discovered_at: new Date().toISOString()
  };

  todayPool.jobs.push(entry);
  totalNetAdded++;
  console.log(`[INGESTED] + [${comp}] ${role} | ${email || link}`);
}

async function surfLinkedInPostsDirect() {
  console.log('================================================================');
  console.log('🔍 RULE 73: DEEP HARVESTING LINKEDIN POSTS VIA BRAVE (PAST 24H)');
  console.log(`Current Pool: ${initialCount} jobs`);
  console.log('================================================================');

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const page = await browser.newPage();

  const searchUrls = [
    'https://www.linkedin.com/search/results/content/?keywords=(%22hiring%22%20OR%20%22looking%20for%22)%20AND%20(%22React%22%20OR%20%22Frontend%22)%20AND%20(%22India%22%20OR%20%22Remote%22)%20AND%20%22@%22&sortBy=%22date_posted%22',
    'https://www.linkedin.com/search/results/content/?keywords=(%22hiring%22%20OR%20%22we%20are%20hiring%22)%20AND%20%22MERN%22%20AND%20%22India%22%20AND%20%22@%22&sortBy=%22date_posted%22'
  ];

  for (let idx = 0; idx < searchUrls.length; idx++) {
    const sUrl = searchUrls[idx];
    console.log(`\n--- Query ${idx + 1}/${searchUrls.length} ---`);
    try {
      await page.goto(sUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await new Promise(r => setTimeout(r, 4500));

      for (let s = 0; s < 5; s++) {
        await page.evaluate(() => window.scrollBy(0, 1400));
        await new Promise(r => setTimeout(r, 1500));
      }

      const extracted = await page.evaluate(() => {
        const results = [];
        const items = Array.from(document.querySelectorAll('div.fie-impression-container, div.search-results-container li, ul.search-results-list > li, div[data-chameleon-result-urn]'));
        
        for (const it of items) {
          const text = (it.innerText || '').replace(/\s+/g, ' ');
          if (text.length < 50 || text.length > 3500) continue;

          const emailMatches = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi) || [];
          const linkEl = it.querySelector('a[href*="/feed/update/"], a[href*="/posts/"], a[href*="activity-"]');
          const authorEl = it.querySelector('.update-components-actor__name, .app-aware-link, span[dir="ltr"]');

          const link = linkEl ? linkEl.href.split('?')[0] : '';
          const author = authorEl ? authorEl.innerText.trim() : '';

          if (emailMatches.length > 0 || link) {
            results.push({
              text,
              email: emailMatches[0] || null,
              link,
              author
            });
          }
        }
        return results;
      }).catch(() => []);

      console.log(`Query ${idx + 1}: Found ${extracted.length} raw candidates with emails/links.`);

      for (const p of extracted) {
        ingestRecruiterPost(p);
      }
    } catch (e) {
      console.error(`Query ${idx + 1} err:`, e.message);
    }
  }

  await page.close();
  browser.disconnect();

  todayPool.total = todayPool.jobs.length;
  fs.writeFileSync(file3TodayShiftPath, JSON.stringify(todayPool, null, 2), 'utf8');
  fs.writeFileSync(file3TodayPath, JSON.stringify(todayPool, null, 2), 'utf8');

  console.log('\n================================================================');
  console.log('📊 LINKEDIN BUFFER SURFING REPORT:');
  console.log(`- Total Evaluated: ${totalDiscovered}`);
  console.log(`- Duplicates Dropped: ${totalDuplicatesDropped}`);
  console.log(`- Filtered Out (Senior/Non-Stack/C2C): ${totalFilteredOut}`);
  console.log(`- Net Clean Added to File 3: ${totalNetAdded}`);
  console.log(`- Updated File 3 Total: ${todayPool.total}`);
  console.log('================================================================');

  process.exit(0);
}

surfLinkedInPostsDirect().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
