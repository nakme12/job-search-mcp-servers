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

export async function harvestIndeedIndia() {
  console.log("=======================================================");
  console.log("🔍 SLOT 3: HARVESTING INDEED INDIA PAST 24H (0-2 YOE)");
  console.log("=======================================================");

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();

  const searchUrl = 'https://in.indeed.com/jobs?q=Frontend+Developer&l=India&fromage=1';
  
  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const jobs = await page.evaluate(() => {
      const list = [];
      const links = Array.from(document.querySelectorAll('a')).filter(a => a.href && a.href.includes('jk='));
      
      for (const a of links) {
        const text = a.innerText.trim();
        if (!text || text.length < 5) continue;
        
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

        list.push({
          title: text.replace(/\n+/g, ' '),
          company: comp,
          url: cleanUrl
        });
      }
      return list;
    });

    console.log(`Extracted ${jobs.length} jobs from Indeed India DOM.`);
    await page.close();
    browser.disconnect();

    let added = 0;
    for (const j of jobs) {
      if (!j.title || !j.url) continue;
      if (/\b(senior|lead|principal|architect|manager|staff)\b/i.test(j.title)) continue;
      if (/\b(android|ios|flutter|python|java|devops)\b/i.test(j.title)) continue;
      if (!/\b(frontend|react|next\.?js|web|ui|mern|sde|developer|intern)\b/i.test(j.title)) continue;

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
        source: "Indeed India (Past 24h)",
        status: "DISCOVERED_PENDING_AUDIT",
        discovered_at: new Date().toISOString()
      };

      totalShift.jobs.push(entry);
      added++;
      console.log(`[SLOT 3 INDEED] + ${j.company} | ${j.title} -> ${j.url}`);
    }

    totalShift.total = totalShift.jobs.length;
    fs.writeFileSync(shiftTotalFile, JSON.stringify(totalShift, null, 2), 'utf8');
    fs.writeFileSync(paths.todayTotal, JSON.stringify(totalShift, null, 2), 'utf8');

    console.log(`\n✅ Added ${added} new clean Indeed India jobs to raw pool.`);
    return added;
  } catch (err) {
    console.error("Indeed harvest error:", err.message);
    try { await page.close(); } catch(e) {}
    browser.disconnect();
    return 0;
  }
}

if (process.argv[1].endsWith('harvest_indeed_india.mjs')) {
  harvestIndeedIndia().catch(console.error);
}
