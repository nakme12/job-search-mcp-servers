/**
 * DEDICATED SLOT 3 HARVESTER: NAUKRI (LAST 3 DAYS, 0-2 YOE)
 * Connects to Brave CDP port 9222.
 * Enforces:
 * - Rule 81: Single dedicated tab, zero touching user tabs.
 * - Rule 82: Salary floor & unpaid role rejection.
 * - Experience ceiling: 0-2 YOE.
 * - Saves strictly to slot3_naukri_leads.json.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runNaukriHarvest() {
  console.log('=================================================================');
  console.log('🚀 [SLOT 3] DEDICATED NAUKRI HARVEST (LAST 3 DAYS, 0-2 YOE)');
  console.log('=================================================================');

  const engineRoot = path.resolve(__dirname, '..');
  const todayStr = '2026-10-19';

  // Load historical blacklist for deduplication
  const histPath = path.join(engineRoot, 'total_historical_except_today.json');
  let historicalSet = new Set();
  if (fs.existsSync(histPath)) {
    try {
      const hData = JSON.parse(fs.readFileSync(histPath, 'utf8'));
      (Array.isArray(hData) ? hData : (hData.jobs || [])).forEach(j => {
        const u = (j.recipient_or_url || j.url || j.recipient || j.applyUrl || '').trim().toLowerCase();
        if (u) historicalSet.add(u);
      });
    } catch(e) {}
  }

  // Load existing Naukri leads
  const outPath = path.join(engineRoot, 'slot3_naukri_leads.json');
  let existingJobs = [];
  if (fs.existsSync(outPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      existingJobs = prev.jobs || [];
    } catch (e) {}
  }
  const seenUrls = new Set(existingJobs.map(j => (j.url || '').trim().toLowerCase()));

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  let newNaukriCount = 0;
  const naukriSearches = [
    { cat: 'React Developer', url: 'https://www.naukri.com/react-developer-jobs?experience=0&experience=1&experience=2&jobAge=3' },
    { cat: 'Frontend Developer', url: 'https://www.naukri.com/frontend-developer-jobs?experience=0&experience=1&experience=2&jobAge=3' },
    { cat: 'MERN Stack Developer', url: 'https://www.naukri.com/mern-stack-developer-jobs?experience=0&experience=1&experience=2&jobAge=3' }
  ];

  for (const s of naukriSearches) {
    console.log(`\n🔍 Scraping Naukri: ${s.cat} (jobAge=3)...`);
    try {
      await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await sleep(3500);

      const items = await page.evaluate(() => {
        const tuples = Array.from(document.querySelectorAll('.srp-jobtuple-wrapper, .cust-job-tuple'));
        return tuples.map(el => {
          const titleEl = el.querySelector('a.title');
          const compEl = el.querySelector('.comp-name, a.comp-name');
          const expEl = el.querySelector('.expwdth, .exp-wrap');
          const locEl = el.querySelector('.locWdth, .loc-wrap');
          const salEl = el.querySelector('.sal-wrap, .salary');
          const descEl = el.querySelector('.job-desc');
          const postDayEl = el.querySelector('.job-post-day');

          return {
            title: titleEl ? titleEl.innerText.trim() : '',
            url: titleEl ? titleEl.href : '',
            company: compEl ? compEl.innerText.trim() : 'Unknown',
            experience: expEl ? expEl.innerText.trim() : '0-2 Yrs',
            location: locEl ? locEl.innerText.trim() : 'India',
            salary: salEl ? salEl.innerText.trim() : 'Not Disclosed',
            description: descEl ? descEl.innerText.trim() : '',
            postedAge: postDayEl ? postDayEl.innerText.trim() : ''
          };
        });
      });

      console.log(`   Captured ${items.length} raw cards on Naukri for ${s.cat}.`);

      for (const item of items) {
        if (!item.url || !item.title) continue;
        const normUrl = item.url.trim().toLowerCase();
        if (historicalSet.has(normUrl) || seenUrls.has(normUrl)) continue;

        // Banned non-dev roles
        if (/delivery|data entry|hardware|ios developer|solution architect|bpo|telecaller/i.test(item.title)) {
          continue;
        }

        // Experience validation (0-2 YOE ceiling)
        if (/\b([3-9]|\d{2})\s*\+?\s*years?/i.test(item.experience)) continue;

        // Rule 82: Salary floor check
        if (/unpaid/i.test(item.salary) || /unpaid/i.test(item.title)) continue;
        if (/stipend\s*:\s*[₹Rs.]*\s*(?:[1-9][0-9]{2,3}|1[0-9]{4})\b/i.test(item.salary)) continue;

        const newJob = {
          id: `naukri_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          title: item.title,
          company: item.company,
          location: item.location,
          url: item.url,
          salary: item.salary,
          experience: item.experience,
          posted_age: item.postedAge,
          application_type: "Naukri Direct Apply",
          source: "Naukri (Past 3 Days)",
          date_posted: new Date().toISOString(),
          status: "DISCOVERED_PENDING_AUDIT"
        };

        existingJobs.push(newJob);
        seenUrls.add(normUrl);
        newNaukriCount++;
      }
    } catch (e) {
      console.log(`   ⚠️ Naukri query failed for ${s.cat}: ${e.message}`);
    }
  }

  // Close the dedicated page (Rule 81)
  await page.close();

  const outData = {
    source: "Naukri (Past 3 Days)",
    date: todayStr,
    total: existingJobs.length,
    jobs: existingJobs
  };

  fs.writeFileSync(outPath, JSON.stringify(outData, null, 2));

  console.log('\n=================================================================');
  console.log(`✅ [NAUKRI HARVEST COMPLETE]`);
  console.log(`Newly Added Leads: ${newNaukriCount}`);
  console.log(`Total Staged in slot3_naukri_leads.json: ${existingJobs.length}`);
  console.log('=================================================================');
}

runNaukriHarvest().catch(err => {
  console.error('Fatal in Naukri harvester:', err);
  process.exit(1);
});
