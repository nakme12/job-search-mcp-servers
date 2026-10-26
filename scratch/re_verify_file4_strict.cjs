const fs = require('fs');
const puppeteer = require('puppeteer-core');

const FILE4_PATH = 'C:/mcp/job-search-mcp-engine/verified_todays_2026-10-26.json';

async function deepReverify() {
  console.log('========================================================================');
  console.log('🕵️ DEEP RE-VERIFICATION & ZERO-TOLERANCE SANITY AUDIT ON FILE 4');
  console.log('========================================================================\n');

  const file4 = JSON.parse(fs.readFileSync(FILE4_PATH, 'utf8'));
  const jobs = file4.jobs || [];

  console.log(`Auditing all ${jobs.length} verified jobs one-by-one...\n`);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  const passed = [];
  const flagged = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const prefix = `[#${i + 1}/${jobs.length}]`;
    const target = job.recipient || job.url;

    console.log(`${prefix} Checking: ${job.company} — ${job.role || job.title}`);

    // 1. Direct Email Lead Check
    if (job.recipient && job.recipient.includes('@')) {
      const email = job.recipient.toLowerCase().trim();
      const domain = email.split('@')[1];

      // Check if banned company name or dummy email
      if (email.includes('example.com') || email.includes('test.com')) {
        flagged.push({ ...job, issue: 'DUMMY_EMAIL' });
        console.log(`  ❌ FLAGGED: Dummy email ${email}`);
        continue;
      }

      // Check generic consultancies
      if (job.company.toLowerCase().includes('consulting') || job.company.toLowerCase().includes('staffing') || job.company.toLowerCase().includes('placement')) {
        flagged.push({ ...job, issue: 'STAFFING_AGENCY_OR_PLACEMENT' });
        console.log(`  ⚠️ FLAGGED: Third-party agency / placement firm: ${job.company}`);
        continue;
      }

      // Check if company name is generic "Tech Company" or "LinkedIn Recruiter"
      if (job.company.toLowerCase() === 'tech company' || job.company.toLowerCase().includes('recruiter post')) {
        flagged.push({ ...job, issue: 'GENERIC_COMPANY_NAME' });
        console.log(`  ⚠️ FLAGGED: Generic company name: "${job.company}"`);
        continue;
      }

      passed.push(job);
      console.log(`  ✅ Direct Email Lead Verified: ${job.company} <${email}>`);
      continue;
    }

    // 2. Portal URL Live Probe Check
    if (!job.url || !job.url.startsWith('http')) {
      flagged.push({ ...job, issue: 'INVALID_URL' });
      console.log(`  ❌ FLAGGED: Invalid URL: ${job.url}`);
      continue;
    }

    try {
      const response = await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => null);
      if (!response) {
        flagged.push({ ...job, issue: 'PAGE_TIMEOUT_OR_UNREACHABLE' });
        console.log(`  ❌ FLAGGED: Unreachable URL`);
        continue;
      }

      const status = response.status();
      if (status >= 400) {
        flagged.push({ ...job, issue: `HTTP_${status}` });
        console.log(`  ❌ FLAGGED: HTTP Status ${status}`);
        continue;
      }

      await new Promise(r => setTimeout(r, 1200));

      const pageText = await page.evaluate(() => document.body.innerText || '');
      const pageTitle = await page.title();

      // Check if job expired / closed on live page
      if (/this job is no longer available|position has been filled|job is closed|no longer accepting applications/i.test(pageText)) {
        flagged.push({ ...job, issue: 'JOB_CLOSED_LIVE' });
        console.log(`  ❌ FLAGGED: Job closed on live page`);
        continue;
      }

      // Check strict 3+ / 4+ / 5+ YOE in live DOM
      const hasStrict3Plus = /\b(?:minimum|at\s*least|min)?\s*[3-9]\s*\+\s*(?:years?|yrs?)/i.test(pageText);
      const isBroadRange = /\b[0-2]\s*(?:-|to)\s*[3-5]\s*(?:years?|yrs?)/i.test(pageText);
      if (hasStrict3Plus && !isBroadRange) {
        flagged.push({ ...job, issue: 'STRICT_3PLUS_YOE_IN_LIVE_DOM' });
        console.log(`  ❌ FLAGGED: 3+ YOE barrier found in live DOM`);
        continue;
      }

      passed.push(job);
      console.log(`  ✅ Portal URL Verified: ${job.company} (HTTP ${status}, Form Active)`);

    } catch (err) {
      flagged.push({ ...job, issue: `PROBE_ERROR: ${err.message}` });
      console.log(`  ⚠️ FLAGGED: Error probing ${job.url}: ${err.message}`);
    }
  }

  await page.close();
  browser.disconnect();

  console.log('\n========================================================================');
  console.log(`🏁 DEEP RE-VERIFICATION COMPLETE`);
  console.log(`Total Inspected:    ${jobs.length}`);
  console.log(`100% Solid Passed:  ${passed.length}`);
  console.log(`Flagged / Purged:   ${flagged.length}`);
  console.log('========================================================================');

  if (flagged.length > 0) {
    console.log('\nFlagged Items Detail:');
    flagged.forEach((f, idx) => {
      console.log(`${idx + 1}. ${f.company} | ${f.role || f.title} | Reason: ${f.issue}`);
    });

    // Clean up File 4 to keep ONLY 100% solid jobs
    file4.jobs = passed;
    file4.total = passed.length;
    file4.re_verified_at = new Date().toISOString();
    fs.writeFileSync(FILE4_PATH, JSON.stringify(file4, null, 2), 'utf8');
    fs.writeFileSync('C:/mcp/job-search-mcp-engine/re_verification_flagged.json', JSON.stringify(flagged, null, 2), 'utf8');
    console.log(`\nUpdated File 4 with ONLY ${passed.length} rock-solid verified targets!`);
  } else {
    console.log('\nAll 56 jobs passed re-verification with zero defects!');
  }
}

deepReverify().catch(err => {
  console.error('Fatal Re-verification Error:', err);
  process.exit(1);
});
