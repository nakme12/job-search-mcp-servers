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

const seenInShift = new Set(totalShift1.jobs.map(j => normalizeTargetId(j.url || j.applyUrl || j.link || '')));

async function harvestNaukri() {
  console.log("=======================================================");
  console.log("🔍 SLOT 3: HARVESTING NAUKRI LIVE 0-2 YOE (PAST 3 DAYS)");
  console.log("=======================================================");

  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await b.newPage();
  
  const searchUrl = 'https://www.naukri.com/frontend-developer-jobs?k=frontend%20developer&experience=0&experience=1&experience=2&jobAge=3';
  await p.goto(searchUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4500));

  const scraped = await p.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.cust-job-tuple, .srp-jobtuple-wrapper, article'));
    return cards.map(c => {
      const titleLink = c.querySelector('.title, a[class*="title"]');
      const compLink = c.querySelector('.comp-name, a[class*="comp-name"]');
      const locEl = c.querySelector('.locWdth, .loc-wrap, [class*="loc"]');
      return {
        title: titleLink ? titleLink.innerText.trim() : '',
        company: compLink ? compLink.innerText.trim() : 'Company',
        url: titleLink ? titleLink.href : '',
        location: locEl ? locEl.innerText.trim() : 'India'
      };
    }).filter(j => j.title && j.url);
  });

  console.log(`Scraped ${scraped.length} raw cards from Naukri.`);
  await p.close();
  b.disconnect();

  let added = 0;
  for (const j of scraped) {
    if (!/\b(react|frontend|front-end|ui developer|web developer|mern)\b/i.test(j.title)) continue;
    if (/\b(senior|sr\.?|lead|principal|architect|manager)\b/i.test(j.title)) continue;

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
      source: "Naukri (Past 3 Days)",
      status: "DISCOVERED_PENDING_AUDIT",
      discovered_at: new Date().toISOString()
    };
    totalShift1.jobs.push(entry);
    added++;
    console.log(`[SLOT 3 NAUKRI] + [${j.company}] ${j.title} | ${j.location}`);
  }

  totalShift1.total = totalShift1.jobs.length;
  fs.writeFileSync(shift1TotalFile, JSON.stringify(totalShift1, null, 2), 'utf8');
  fs.writeFileSync(paths.todayTotal, JSON.stringify(totalShift1, null, 2), 'utf8');

  console.log(`\n✅ Added ${added} clean Naukri cards to today's raw pool.`);
}

harvestNaukri().catch(console.error);
