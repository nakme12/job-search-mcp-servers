import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { getFilePaths, isDuplicateHistorical, normalizeTargetId } from './workflow_5file_manager.mjs';

const paths = getFilePaths();
const shiftTotalFile = paths.shiftTotal;

let totalShift = { date: paths.today, shift: paths.shift, total: 0, jobs: [] };
if (fs.existsSync(shiftTotalFile)) {
  try {
    totalShift = JSON.parse(fs.readFileSync(shiftTotalFile, 'utf8'));
    if (!Array.isArray(totalShift.jobs)) totalShift.jobs = [];
  } catch (e) {}
}

const seenInShift = new Set(totalShift.jobs.map(j => normalizeTargetId(j.url || j.applyUrl || j.link || j.recipient || '')));

export async function harvestHiristFeed() {
  console.log("=======================================================");
  console.log("🔍 SLOT 3: HARVESTING HIRIST.TECH AUTHENTICATED JOB FEED");
  console.log("=======================================================");

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let hiristPage = pages.find(p => p.url().includes('hirist.tech'));

  if (!hiristPage) {
    hiristPage = await browser.newPage();
    await hiristPage.goto('https://www.hirist.tech/jobfeed', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4000));
  } else {
    await hiristPage.bringToFront();
  }

  const jobs = await hiristPage.evaluate(() => {
    const list = [];
    // Grab all job links or cards
    const links = Array.from(document.querySelectorAll('a[href*="/j/"]'));
    for (const a of links) {
      const text = a.innerText.trim();
      if (!text || text.length < 5) continue;
      const cleanUrl = a.href.split('?')[0];

      // Try finding company name nearby
      let company = "Hirist Employer";
      const card = a.closest('div[class*="card"], div[class*="item"], div[class*="job"]');
      if (card) {
        const compEl = card.querySelector('[class*="company"], [class*="recruiter"]');
        if (compEl) company = compEl.innerText.trim();
      }

      list.push({
        title: text.replace(/\n+/g, ' '),
        company: company,
        url: cleanUrl
      });
    }
    return list;
  });

  console.log(`Found ${jobs.length} jobs in Hirist feed.`);
  browser.disconnect();

  let added = 0;
  for (const j of jobs) {
    if (!j.title || !j.url) continue;
    if (/\b(senior|lead|principal|architect|manager)\b/i.test(j.title)) continue;
    if (/\b(android|ios|flutter|python|java|devops)\b/i.test(j.title)) continue;

    const norm = normalizeTargetId(j.url);
    if (seenInShift.has(norm)) continue;
    seenInShift.add(norm);

    if (isDuplicateHistorical(norm)) continue;

    const entry = {
      id: totalShift.jobs.length + 1,
      company: j.company,
      role: j.title,
      location: "India / Remote",
      url: j.url,
      source: "Hirist.tech (Jobfeed)",
      status: "DISCOVERED_PENDING_AUDIT",
      discovered_at: new Date().toISOString()
    };

    totalShift.jobs.push(entry);
    added++;
    console.log(`[SLOT 3 HIRIST] + ${j.company} | ${j.title} -> ${j.url}`);
  }

  totalShift.total = totalShift.jobs.length;
  fs.writeFileSync(shiftTotalFile, JSON.stringify(totalShift, null, 2), 'utf8');
  fs.writeFileSync(paths.todayTotal, JSON.stringify(totalShift, null, 2), 'utf8');

  console.log(`✅ Added ${added} new clean Hirist jobs to raw pool.`);
  return added;
}

if (process.argv[1].endsWith('harvest_hirist_feed.mjs')) {
  harvestHiristFeed().catch(console.error);
}
