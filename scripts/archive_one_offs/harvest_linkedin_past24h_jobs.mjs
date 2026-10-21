import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { getFilePaths, isDuplicateHistorical, normalizeTargetId } from './workflow_5file_manager.mjs';

const paths = getFilePaths();
const shift1TotalFile = paths.shiftTotal;

let totalShift1 = { date: paths.today, shift: 1, total: 0, jobs: [] };
if (fs.existsSync(shift1TotalFile)) {
  try {
    totalShift1 = JSON.parse(fs.readFileSync(shift1TotalFile, 'utf8'));
    if (!Array.isArray(totalShift1.jobs)) totalShift1.jobs = [];
  } catch (e) {}
}

const seenInShift = new Set(totalShift1.jobs.map(j => normalizeTargetId(j.url || j.applyUrl || j.link || j.recipient || '')));

async function harvestLinkedInJobs() {
  console.log("=======================================================");
  console.log("🔍 SLOT 3: HARVESTING LINKEDIN PAST 24H JOBS (0-2 YOE)");
  console.log("=======================================================");

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();

  // Search past 24h, Entry Level & Associate, India, Frontend/React
  const searchUrl = 'https://www.linkedin.com/jobs/search/?keywords=Frontend%20Developer&f_TPR=r86400&location=India&f_E=1%2C2';
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));

  const jobs = await page.evaluate(() => {
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
        const company = companyEl ? companyEl.innerText.trim() : 'Unknown';
        const location = locEl ? locEl.innerText.trim() : 'India';

        if (cleanUrl.includes('/jobs/view/')) {
          list.push({ title, company, location, url: cleanUrl });
        }
      }
    }
    return list;
  });

  console.log(`Raw LinkedIn cards captured: ${jobs.length}`);
  await page.close();
  browser.disconnect();

  let added = 0;
  for (const j of jobs) {
    if (!j.title || !j.url) continue;
    if (/\b(senior|lead|principal|architect|manager|staff)\b/i.test(j.title)) continue;
    if (/\b(android|ios|flutter|react native|python|java|devops)\b/i.test(j.title)) continue;

    const norm = normalizeTargetId(j.url);
    if (seenInShift.has(norm)) continue;
    seenInShift.add(norm);

    if (isDuplicateHistorical(norm)) continue;

    const entry = {
      id: totalShift1.jobs.length + 1,
      company: j.company,
      role: j.title,
      location: j.location,
      url: j.url,
      source: "LinkedIn Past 24h Jobs (Entry/Assoc)",
      status: "DISCOVERED_PENDING_AUDIT",
      discovered_at: new Date().toISOString()
    };

    totalShift1.jobs.push(entry);
    added++;
    console.log(`[SLOT 3 LINKEDIN] + ${j.company} | ${j.title} -> ${j.url}`);
  }

  totalShift1.total = totalShift1.jobs.length;
  fs.writeFileSync(shift1TotalFile, JSON.stringify(totalShift1, null, 2), 'utf8');
  fs.writeFileSync(paths.todayTotal, JSON.stringify(totalShift1, null, 2), 'utf8');

  console.log(`\n✅ Added ${added} new LinkedIn jobs to today's raw pool.`);
  console.log(`📊 Total Staged in total_todays_${paths.today}_shift1.json: ${totalShift1.total}`);
}

harvestLinkedInJobs().catch(console.error);
