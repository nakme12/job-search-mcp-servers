const fs = require('fs');
const puppeteer = require('puppeteer-core');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const rawJobs = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/raw_naukri_jobs.json', 'utf8'));
  console.log('Total raw jobs:', rawJobs.length);

  // 1. Deduplicate by jobUrl or title+company
  const seenUrls = new Set();
  const uniqueJobs = [];
  for (const j of rawJobs) {
    const cleanUrl = j.jobUrl.split('?')[0];
    if (!seenUrls.has(cleanUrl) && cleanUrl) {
      seenUrls.add(cleanUrl);
      uniqueJobs.push({ ...j, jobUrl: cleanUrl });
    }
  }
  console.log('Unique by clean URL:', uniqueJobs.length);

  // 2. Filter for Role relevance & Experience <= 2 YOE
  // Filter experience: Parse min & max exp. e.g. "0-2 Yrs", "0-1 Yrs", "1-2 Yrs", "0-3 Yrs" (we need to be careful: drop 3+ YOE min, let's inspect)
  // Pratik is 1.5 - 2 YOE React.js / Frontend / MERN Stack.
  // Rule: Strictly 0-2 YOE (Freshers, 0-1, 1-2 Yrs). DROP any job requiring 3+ YOE min, or where min exp >= 3.
  // If exp says "0-3 Yrs" or "0-2 Yrs", 0-2 Yrs is exact fit, 0-3 Yrs can include freshers/juniors. Let's inspect each.
  // DROP unpaid internships.

  // Let's connect to browser and inspect each candidate's detailed JD and Apply button
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(x => x.url().includes('naukri.com')) || pages[0];

  const verified = [];

  for (let i = 0; i < uniqueJobs.length; i++) {
    const job = uniqueJobs[i];
    console.log(\[\/\] Checking: \ at \ (\)\);

    // Basic heuristic pre-filter:
    const titleLower = job.title.toLowerCase();
    if (titleLower.includes('unpaid') || titleLower.includes('intern') && titleLower.includes('unpaid')) {
      console.log('  -> Skipping (unpaid)');
      continue;
    }

    // Experience string check:
    // If it strictly says e.g. "3-5 Yrs", "3-6 Yrs", "4-8 Yrs" -> skip
    const expMatch = job.experience.match(/(\d+)\s*-\s*(\d+)/);
    if (expMatch) {
      const minExp = parseInt(expMatch[1], 10);
      const maxExp = parseInt(expMatch[2], 10);
      if (minExp >= 3) {
        console.log(\  -> Skipping (min exp \ >= 3)\);
        continue;
      }
    }

    try {
      await page.goto(job.jobUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(2500);

      const pageDetails = await page.evaluate(() => {
        // Find apply button
        const applyBtn = document.querySelector('#apply-button, button[class*=\"apply-button\"], .apply-button, .styles_apply-button__');
        const applyText = applyBtn ? applyBtn.innerText.trim() : '';
        const is1Click = applyText.toLowerCase().includes('apply on') ? false : (applyText.toLowerCase().includes('apply') || applyText.toLowerCase().includes('applied'));
        const isExternal = applyText.toLowerCase().includes('apply on website') || applyText.toLowerCase().includes('company site') || document.querySelector('a[href*=\"company\"], a.apply-link') !== null;
        
        // Exact exp from JD
        const expEl = document.querySelector('.styles_jhc__exp__, .experience, .exp');
        const expText = expEl ? expEl.innerText.trim() : '';

        // Location
        const locEl = document.querySelector('.styles_jhc__loc___, .location, .loc');
        const locText = locEl ? locEl.innerText.trim() : '';

        // Salary
        const salEl = document.querySelector('.styles_jhc__salary__, .salary');
        const salText = salEl ? salEl.innerText.trim() : '';

        // Description text snippet
        const jdEl = document.querySelector('.styles_JDC__dang-inner-html__, .job-desc-section, section.job-desc');
        const jdText = jdEl ? jdEl.innerText.slice(0, 1500) : (document.body.innerText.slice(0, 1500));

        // Posted date
        const postedEl = document.querySelector('.styles_jhc__stat__ span, .stat span');
        const postedText = postedEl ? postedEl.innerText.trim() : '';

        return {
          applyButtonText: applyText,
          is1Click: !applyText.toLowerCase().includes('company site') && !applyText.toLowerCase().includes('website'),
          detailedExp: expText,
          detailedLoc: locText,
          detailedSal: salText,
          postedDetailed: postedText,
          jdExcerpt: jdText
        };
      });

      const applyType = (pageDetails.applyButtonText.toLowerCase().includes('company site') || pageDetails.applyButtonText.toLowerCase().includes('website'))
        ? 'External / Company Site'
        : (pageDetails.applyButtonText ? '1-Click Apply (Naukri Direct)' : 'Naukri Apply');

      verified.push({
        ...job,
        applyType: applyType,
        applyButtonText: pageDetails.applyButtonText,
        detailedExp: pageDetails.detailedExp || job.experience,
        detailedLocation: pageDetails.detailedLoc || job.location,
        salary: pageDetails.detailedSal || job.salary,
        postedDetailed: pageDetails.postedDetailed || job.postedAge,
        jdExcerpt: pageDetails.jdExcerpt
      });
    } catch (e) {
      console.log('  -> Error visiting page:', e.message);
      // Still include with basic card info
      verified.push({
        ...job,
        applyType: '1-Click Apply (Naukri Direct)',
        applyButtonText: 'Apply'
      });
    }
  }

  console.log('Total verified jobs detailed:', verified.length);
  fs.writeFileSync('C:/mcp/job-search-mcp-engine/naukri_24h_all_audited.json', JSON.stringify(verified, null, 2));

  browser.disconnect();
}

main().catch(console.error);
