import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ROOT_DIR = 'C:/mcp/job-search-mcp-engine';
const TODAY = '2026-10-16';
const SHIFT = 1;

const file1HistPath = path.join(ROOT_DIR, 'total_historical_except_today.json');
const file3TodayShiftPath = path.join(ROOT_DIR, `total_todays_${TODAY}_shift${SHIFT}.json`);
const file3TodayPath = path.join(ROOT_DIR, `total_todays_${TODAY}.json`);

function normalizeTargetId(str) {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\/+$/, '');
}

// 1. Load Historical Blacklist
let historicalJobs = [];
try {
  const hRaw = JSON.parse(fs.readFileSync(file1HistPath, 'utf8'));
  historicalJobs = Array.isArray(hRaw) ? hRaw : (hRaw.jobs || []);
} catch (e) {
  console.error('Error reading historical jobs:', e.message);
}

const historicalSet = new Set(
  historicalJobs.map(j => normalizeTargetId(j.recipient_or_url || j.url || j.applyUrl || j.link || j.recipient)).filter(Boolean)
);

// 2. Load File 3 Today
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
  todayPool.jobs.map(j => normalizeTargetId(j.url || j.recipient || j.applyUrl || j.link)).filter(Boolean)
);

const initialCount = todayPool.jobs.length;
let totalDiscovered = 0;
let totalDuplicatesDropped = 0;
let totalFilteredOut = 0;
let totalNetAdded = 0;

function ingestBufferJob(job, sourceName) {
  totalDiscovered++;
  const url = (job.url || job.applyUrl || job.link || '').trim();
  const title = (job.title || job.role || job.position || '').trim();
  const company = (job.company || job.company_name || 'Direct Employer').trim();
  const location = (job.location || 'India / Remote').trim();
  const datePosted = job.date_posted || new Date().toISOString();

  if (!url || !title) return;

  const norm = normalizeTargetId(url);
  if (seenToday.has(norm)) {
    totalDuplicatesDropped++;
    return;
  }

  if (historicalSet.has(norm)) {
    totalDuplicatesDropped++;
    return;
  }

  // Filter 0-2 YOE & exclusions
  const tLow = title.toLowerCase();
  if (/\b(senior|sr\.?|lead|principal|architect|manager|director|head|vp)\b/i.test(tLow)) {
    totalFilteredOut++;
    return;
  }
  if (/\b(android|ios|flutter|react native|python|django|devops|aws|golang|java|c\+\+|dotnet|\.net)\b/i.test(tLow)) {
    totalFilteredOut++;
    return;
  }
  if (!/\b(frontend|front end|react|next\.?js|ui developer|web developer|mern|full stack|fullstack|software engineer|sde|intern)\b/i.test(tLow)) {
    totalFilteredOut++;
    return;
  }

  seenToday.add(norm);

  let resume = 'Pratik Patidar Resume - Frontend Engineer.pdf';
  if (tLow.includes('react') || tLow.includes('ui') || tLow.includes('next')) {
    resume = 'Pratik Patidar Resume - React Developer.pdf';
  } else if (tLow.includes('mern') || tLow.includes('full stack') || tLow.includes('fullstack') || tLow.includes('node')) {
    resume = 'Pratik Patidar Resume - MERN Full Stack.pdf';
  }

  const entry = {
    id: todayPool.jobs.length + 1,
    company,
    role: title,
    location,
    url,
    source: sourceName,
    resume_mapped: resume,
    date_posted: datePosted,
    status: 'DISCOVERED_PENDING_AUDIT',
    discovered_at: new Date().toISOString()
  };

  todayPool.jobs.push(entry);
  totalNetAdded++;
  console.log(`[HARVESTED] + [${company}] ${title} | ${location} (${sourceName})`);
}

async function harvestBufferSources() {
  console.log('================================================================');
  console.log('🚀 RULE 73: BUFFER HARVESTING (LinkedIn, Naukri, Indeed)');
  console.log(`Current File 3 Pool: ${initialCount} jobs`);
  console.log('================================================================');

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  // Source 1: Indeed India (Headless / single tab via CDP)
  try {
    console.log('\n--- Harvesting Indeed India (0-2 YOE Frontend) ---');
    const pIndeed = await browser.newPage();
    const searchIndeed = 'https://in.indeed.com/jobs?q=Frontend+Developer&l=India&fromage=1';
    await pIndeed.goto(searchIndeed, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(e => console.log('Indeed nav timeout/err:', e.message));
    await new Promise(r => setTimeout(r, 4000));

    const indeedJobs = await pIndeed.evaluate(() => {
      const list = [];
      const links = Array.from(document.querySelectorAll('a')).filter(a => a.href && a.href.includes('jk='));
      for (const a of links) {
        const text = a.innerText.trim();
        if (!text || text.length < 4) continue;
        let comp = 'Direct Tech Employer';
        let parent = a.parentElement;
        for (let i = 0; i < 5; i++) {
          if (!parent) break;
          const compEl = parent.querySelector('[data-testid="company-name"], .companyName');
          if (compEl) {
            comp = compEl.innerText.trim();
            break;
          }
          parent = parent.parentElement;
        }
        const matchJk = a.href.match(/jk=([a-zA-Z0-9]+)/);
        const cleanUrl = matchJk ? `https://in.indeed.com/viewjob?jk=${matchJk[1]}` : a.href.split('&')[0];
        list.push({ title: text.replace(/\n+/g, ' '), company: comp, url: cleanUrl });
      }
      return list;
    }).catch(() => []);

    console.log(`Indeed raw cards found: ${indeedJobs.length}`);
    await pIndeed.close();

    for (const j of indeedJobs) {
      ingestBufferJob(j, 'Indeed India (Past 24h Buffer)');
    }
  } catch (err) {
    console.error('Indeed harvest error:', err.message);
  }

  // Source 2: Naukri (0-2 YOE, Past 3 days)
  try {
    console.log('\n--- Harvesting Naukri Live (0-2 YOE Frontend) ---');
    const pNaukri = await browser.newPage();
    const searchNaukri = 'https://www.naukri.com/frontend-developer-jobs?k=frontend%20developer&experience=0&experience=1&experience=2&jobAge=3';
    await pNaukri.goto(searchNaukri, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(e => console.log('Naukri nav timeout/err:', e.message));
    await new Promise(r => setTimeout(r, 4500));

    const naukriJobs = await pNaukri.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.cust-job-tuple, .srp-jobtuple-wrapper, article'));
      return cards.map(c => {
        const titleLink = c.querySelector('.title, a[class*="title"]');
        const compLink = c.querySelector('.comp-name, a[class*="comp-name"]');
        const locEl = c.querySelector('.locWdth, .loc-wrap, [class*="loc"]');
        return {
          title: titleLink ? titleLink.innerText.trim() : '',
          company: compLink ? compLink.innerText.trim() : 'Direct Tech Company',
          url: titleLink ? titleLink.href : '',
          location: locEl ? locEl.innerText.trim() : 'India'
        };
      }).filter(j => j.title && j.url);
    }).catch(() => []);

    console.log(`Naukri raw cards found: ${naukriJobs.length}`);
    await pNaukri.close();

    for (const j of naukriJobs) {
      ingestBufferJob(j, 'Naukri (Buffer Harvest)');
    }
  } catch (err) {
    console.error('Naukri harvest error:', err.message);
  }

  // Source 3: LinkedIn Jobs / Posts (Rule 61: max 2 tabs, close immediately)
  try {
    console.log('\n--- Harvesting LinkedIn Past 24h (0-2 YOE, Strict Rule 61) ---');
    const pLinkedin = await browser.newPage();
    const searchLinkedin = 'https://www.linkedin.com/jobs/search/?keywords=Frontend%20Developer&f_TPR=r86400&location=India&f_E=1%2C2';
    await pLinkedin.goto(searchLinkedin, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(e => console.log('LinkedIn nav err:', e.message));
    await new Promise(r => setTimeout(r, 5000));

    const linkedInJobs = await pLinkedin.evaluate(() => {
      const list = [];
      const elements = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item, div[data-job-id]');
      for (const el of elements) {
        const titleLink = el.querySelector('a.job-card-list__title, a.artdeco-entity-lockup__title, a[href*="/jobs/view/"]');
        const companyEl = el.querySelector('.job-card-container__primary-description, .artdeco-entity-lockup__subtitle, .job-card-container__company-name');
        const locEl = el.querySelector('.job-card-container__metadata-item');

        if (titleLink) {
          const title = titleLink.innerText.trim();
          const rawUrl = titleLink.href || '';
          const cleanUrl = rawUrl.split('?')[0];
          const company = companyEl ? companyEl.innerText.trim() : 'Direct Employer';
          const location = locEl ? locEl.innerText.trim() : 'India';

          if (cleanUrl.includes('/jobs/view/')) {
            list.push({ title, company, location, url: cleanUrl });
          }
        }
      }
      return list;
    }).catch(() => []);

    console.log(`LinkedIn raw cards found: ${linkedInJobs.length}`);
    // Immediately close tab per Rule 61
    await pLinkedin.close();

    for (const j of linkedInJobs) {
      ingestBufferJob(j, 'LinkedIn Past 24h (Buffer Harvest)');
    }
  } catch (err) {
    console.error('LinkedIn harvest fallback triggered:', err.message);
  }

  // Fallback Source 4: Naukri React / Next.js Secondary Sweep
  try {
    console.log('\n--- Fallback Sweep: Naukri React & Next.js Secondary ---');
    const pNaukri2 = await browser.newPage();
    const searchUrl2 = 'https://www.naukri.com/react-developer-jobs?k=react%20developer&experience=0&experience=1&experience=2&jobAge=3';
    await pNaukri2.goto(searchUrl2, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(e => console.log('Naukri secondary nav err:', e.message));
    await new Promise(r => setTimeout(r, 4000));

    const naukriJobs2 = await pNaukri2.evaluate(() => {
      const list = [];
      const cards = document.querySelectorAll('.cust-job-tuple, .srp-jobtuple-wrapper, article');
      for (const c of cards) {
        const titleLink = c.querySelector('.title, a[class*="title"]');
        const compLink = c.querySelector('.comp-name, a[class*="comp-name"]');
        const locEl = c.querySelector('.locWdth, .loc-wrap, [class*="loc"]');
        if (titleLink) {
          list.push({
            title: titleLink.innerText.trim(),
            company: compLink ? compLink.innerText.trim() : 'Direct Employer',
            location: locEl ? locEl.innerText.trim() : 'India',
            url: titleLink.href
          });
        }
      }
      return list;
    }).catch(() => []);

    console.log(`Naukri secondary raw cards found: ${naukriJobs2.length}`);
    await pNaukri2.close();

    for (const j of naukriJobs2) {
      ingestBufferJob(j, 'Naukri React (Buffer Sweep)');
    }
  } catch (err) {
    console.error('Naukri secondary error:', err.message);
  }

  browser.disconnect();

  // Save back to File 3
  todayPool.total = todayPool.jobs.length;
  fs.writeFileSync(file3TodayShiftPath, JSON.stringify(todayPool, null, 2), 'utf8');
  fs.writeFileSync(file3TodayPath, JSON.stringify(todayPool, null, 2), 'utf8');

  console.log('\n================================================================');
  console.log('📊 BUFFER HARVEST REPORT:');
  console.log(`- Total Raw Discovered: ${totalDiscovered}`);
  console.log(`- Duplicates Dropped (Shift/Historical): ${totalDuplicatesDropped}`);
  console.log(`- Out of Range (YOE/Stack Filtered): ${totalFilteredOut}`);
  console.log(`- Net Clean Added to File 3: ${totalNetAdded}`);
  console.log(`- New Total Pool Size: ${todayPool.total}`);
  console.log('================================================================');

  process.exit(0);
}

harvestBufferSources().catch(err => {
  console.error('Fatal error in buffer harvester:', err);
  process.exit(1);
});
