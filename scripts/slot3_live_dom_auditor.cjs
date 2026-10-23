const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { auditJobText } = require('./job_gatekeeper.cjs');

async function runAudit() {
  console.log('=== [SLOT 3 AUDIT ENGINE] Starting Live DOM Audit for 2026-10-21 ===');
  
  const file3Path = 'C:/mcp/job-search-mcp-engine/total_todays_2026-10-21.json';
  const file4Path = 'C:/mcp/job-search-mcp-engine/verified_todays_2026-10-21.json';
  
  if (!fs.existsSync(file3Path)) {
    console.error('File 3 not found:', file3Path);
    process.exit(1);
  }
  
  const f3 = JSON.parse(fs.readFileSync(file3Path, 'utf8'));
  const jobs = f3.jobs || [];
  console.log(`Loaded ${jobs.length} raw jobs from File 3.`);
  
  // Existing verified jobs
  let file4Data = {
    date: '2026-10-21',
    shift: 'shift1',
    cycle: 1,
    description: "Verified Clean 0-2 YOE Jobs Ready for Direct Portal/Email Application",
    total: 0,
    email_dispatched_total: 0,
    verified_live_portals_total: 0,
    jobs: []
  };
  
  if (fs.existsSync(file4Path)) {
    try {
      const existing = JSON.parse(fs.readFileSync(file4Path, 'utf8'));
      if (Array.isArray(existing)) {
        file4Data.jobs = existing;
      } else if (existing && Array.isArray(existing.jobs)) {
        file4Data = existing;
      }
    } catch (e) {
      console.warn('Could not parse existing File 4, initializing fresh structure.');
    }
  }
  
  const verifiedUrls = new Set(file4Data.jobs.map(j => j.url));
  console.log(`File 4 currently has ${file4Data.jobs.length} verified jobs.`);

  // Connect to Brave CDP
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    console.log('✅ Connected to Brave via CDP (port 9222).');
  } catch (err) {
    console.error('Failed to connect to Brave CDP:', err.message);
    process.exit(1);
  }

  // Identify prioritized jobs
  // Priority: Ashby ATS, Google Jobs (SerpApi), Greenhouse ATS, Adzuna India, SmartRecruiters, Hacker News, JobsPipe, Instahyre
  const prioritizedJobs = [];
  const otherJobs = [];
  
  for (const j of jobs) {
    if (j.source.includes('Ashby') || j.source.includes('Google') || j.source.includes('Greenhouse') || j.source.includes('Adzuna')) {
      prioritizedJobs.push(j);
    } else {
      otherJobs.push(j);
    }
  }
  
  const auditList = [...prioritizedJobs, ...otherJobs];
  console.log(`Audit list ready: ${prioritizedJobs.length} prioritized jobs, ${otherJobs.length} secondary jobs.`);

  let auditPage = null;

  try {
    // Create dedicated single audit tab (Rule 61 & Rule 81)
    auditPage = await browser.newPage();
    await auditPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    console.log('✅ Created dedicated single audit tab in Brave.');

    let processedCount = 0;
    let verifiedCount = file4Data.jobs.length;
    let skippedCount = 0;

    for (let i = 0; i < auditList.length; i++) {
      const job = auditList[i];
      processedCount++;
      const prefix = `[Job ${processedCount}/${auditList.length}] ${job.company} - ${job.role}`;

      // Check duplicate
      if (verifiedUrls.has(job.url)) {
        console.log(`${prefix} ➔ SKIP: Already in File 4.`);
        continue;
      }

      // Title/Role pre-check
      const bannedRolesRegex = /react native|flutter|android|ios|mobile app|python developer|devops|data engineer|data entry|telecaller|bpo|sales executive/i;
      if (bannedRolesRegex.test(job.role) && !/react(?:\.js|js)?\b/i.test(job.role)) {
        console.log(`${prefix} ➔ FAIL: Banned role in title (${job.role})`);
        skippedCount++;
        continue;
      }

      const bannedSeniorityRegex = /\b(senior|lead developer|tech lead|principal|architect|staff engineer|sr\.?\s*developer)\b/i;
      if (bannedSeniorityRegex.test(job.role)) {
        console.log(`${prefix} ➔ FAIL: Seniority over ceiling in title (${job.role})`);
        skippedCount++;
        continue;
      }

      // Navigation target
      let targetUrl = job.url;
      // Greenhouse iframe/board rewrite if needed
      if (job.source.includes('Greenhouse') && targetUrl.includes('stripe.com/jobs/search?gh_jid=')) {
        const ghId = targetUrl.split('gh_jid=')[1];
        if (ghId) {
          targetUrl = `https://boards.greenhouse.io/stripe/jobs/${ghId}`;
        }
      }

      console.log(`\n------------------------------------------------------------`);
      console.log(`${prefix}`);
      console.log(`URL: ${targetUrl} [Source: ${job.source}]`);

      try {
        await auditPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        // Small settle wait
        await new Promise(r => setTimeout(r, 2000));
      } catch (navErr) {
        console.log(`${prefix} ➔ FAIL: Navigation error / timeout: ${navErr.message}`);
        skippedCount++;
        continue;
      }

      // Check current URL after redirects
      const finalUrl = auditPage.url();

      // Extract DOM text
      let pageText = '';
      try {
        pageText = await auditPage.evaluate(() => {
          return document.body ? document.body.innerText : '';
        });
      } catch (domErr) {
        console.log(`${prefix} ➔ FAIL: Could not extract body text: ${domErr.message}`);
        skippedCount++;
        continue;
      }

      if (!pageText || pageText.trim().length < 50) {
        console.log(`${prefix} ➔ FAIL: Page body empty or inaccessible.`);
        skippedCount++;
        continue;
      }

      // Live DOM Gatekeeper Audit
      const auditResult = auditJobText(pageText, job.role);
      if (!auditResult.passed) {
        console.log(`${prefix} ➔ FAIL: ${auditResult.reason}`);
        skippedCount++;
        continue;
      }

      // Additional checks for Ashby / Greenhouse / Portals
      let hasApplyFormOrButton = false;
      try {
        hasApplyFormOrButton = await auditPage.evaluate(() => {
          const bodyText = document.body.innerText.toLowerCase();
          const hasSubmitOrApply = /apply (?:now|for this|online)|submit application|attach resume/i.test(bodyText);
          const hasInputs = !!document.querySelector('input[type="file"], input[type="email"], form, button[type="submit"], a[href*="application"], a[href*="apply"]');
          return hasSubmitOrApply || hasInputs;
        });
      } catch (e) {
        hasApplyFormOrButton = true;
      }

      // Specific source resolution
      let destinationApplyUrl = finalUrl;
      if (job.source.includes('Ashby') && !destinationApplyUrl.includes('/application')) {
        destinationApplyUrl = destinationApplyUrl.replace(/\/?$/, '/application');
      }

      // Select proper authorized resume
      let mappedResume = 'Pratik Patidar Resume - MERN Full Stack.pdf';
      const roleLower = job.role.toLowerCase();
      if (roleLower.includes('mern') || roleLower.includes('full stack') || roleLower.includes('fullstack')) {
        mappedResume = 'Pratik Patidar Resume - MERN Full Stack.pdf';
      } else if (roleLower.includes('frontend') || roleLower.includes('front-end') || roleLower.includes('ui software') || roleLower.includes('ui engineer')) {
        mappedResume = 'Pratik Patidar Resume - MERN Full Stack.pdf';
      }

      const verifiedRecord = {
        id: job.id,
        company: job.company,
        role: job.role,
        location: job.location,
        url: destinationApplyUrl,
        original_url: job.url,
        source: job.source,
        application_type: job.source.includes('Email') ? 'Direct Recruiter Email' : 'Direct ATS / Career Portal',
        resume_mapped: mappedResume,
        date_posted: job.date_posted,
        status: 'VERIFIED_AUDITED',
        verified_at: new Date().toISOString()
      };

      file4Data.jobs.push(verifiedRecord);
      verifiedUrls.add(job.url);
      verifiedCount++;

      file4Data.total = file4Data.jobs.length;
      file4Data.verified_live_portals_total = file4Data.jobs.filter(j => j.application_type.includes('Portal')).length;
      file4Data.email_dispatched_total = file4Data.jobs.filter(j => j.application_type.includes('Email')).length;

      // Atomic persist to File 4
      fs.writeFileSync(file4Path, JSON.stringify(file4Data, null, 2), 'utf8');

      console.log(`${prefix} ➔ PASS ✅ [Resume: ${mappedResume}] (Total Verified in File 4: ${file4Data.jobs.length})`);

      // Gentle jitter before next
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n============================================================`);
    console.log(`Audit run completed!`);
    console.log(`Total inspected: ${processedCount}`);
    console.log(`Total verified & added to File 4: ${file4Data.jobs.length}`);
    console.log(`Total skipped: ${skippedCount}`);
    console.log(`============================================================`);

  } finally {
    if (auditPage) {
      try {
        await auditPage.close();
        console.log('✅ Dedicated audit tab closed cleanly.');
      } catch (e) {}
    }
    if (browser) {
      browser.disconnect();
      console.log('✅ Disconnected from Brave CDP.');
    }
  }
}

runAudit().catch(err => {
  console.error('Fatal error in Slot 3 Audit:', err);
  process.exit(1);
});
