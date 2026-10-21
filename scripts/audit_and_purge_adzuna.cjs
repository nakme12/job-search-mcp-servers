/**
 * CONTINUOUS AUDIT & PURGE RUNNER FOR ADZUNA JOBS
 * 
 * Rules:
 * 1. Evaluates Adzuna jobs one by one with 3s natural sleep.
 * 2. If valid (0-2 / 0-3 YOE, min 3 LPA, clean stack, live form) -> STOP IMMEDIATELY and ALERT USER.
 * 3. If invalid -> PURGE/REMOVE from verified_todays_2026-10-16_shift1.json instantly.
 * 4. Tab Isolation: Opens dedicated worker tab, closes cleanly after each job.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { auditJobText } = require('./job_gatekeeper.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const VERIFIED_FILE = path.resolve('verified_todays_2026-10-16_shift1.json');

async function auditAndPurgeAdzuna() {
  const allJobs = JSON.parse(fs.readFileSync('remaining_adzuna_to_audit.json', 'utf8'));

  console.log('=================================================================');
  console.log(`🔍 [CONTINUOUS ADZUNA AUDIT] Searching across ${allJobs.length} remaining jobs`);
  console.log('Target: Find 1st 100% Genuine Match OR Purge invalid from File 4');
  console.log('=================================================================');

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  for (let i = 0; i < allJobs.length; i++) {
    const job = allJobs[i];
    const prefix = `[Audit ${i + 1}/${allJobs.length}]`;
    console.log(`\n${prefix} Evaluating: ${job.company} — ${job.role}`);
    console.log(`  Adzuna URL: ${job.url}`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    try {
      // 1. Navigate to Adzuna
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(2500);

      // Dismiss Email Banner
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const noThanks = btns.find(b => b.innerText && b.innerText.trim().toLowerCase() === 'no, thanks');
        if (noThanks) noThanks.click();
      });
      await sleep(1500);

      // Click "No thanks, take me to the job" or Apply Button
      const redirected = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const takeMe = links.find(a => a.innerText && a.innerText.toLowerCase().includes('take me to the job'));
        if (takeMe) {
          takeMe.click();
          return 'take_me_link';
        }
        const applyBtn = document.querySelector('a.apply_btn, a[href*="/land/ad/"]');
        if (applyBtn) {
          applyBtn.click();
          return 'direct_apply_link';
        }
        return false;
      });

      if (redirected) {
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
        // Crucial: 4s settling sleep to prevent context destroyed
        await sleep(4000);
      }

      const destUrl = page.url();
      console.log(`  -> Landed Destination: ${destUrl}`);

      // Check for Adzuna Captcha / Auth wall
      const pageTitle = await page.title();
      if (pageTitle.includes('Human Verification') || destUrl.includes('/authenticate/register')) {
        console.log(`  🚫 PURGED: Adzuna Rate Limit or Forced Auth Wall`);
        purgeJobFromFile4(job.id, job.company, 'ADZUNA_AUTH_WALL');
        await page.close();
        continue;
      }

      // Dismiss overlay/modal if Cutshort
      await page.keyboard.press('Escape');
      await page.mouse.click(15, 15);
      await sleep(1000);

      // Expand "Read more" to see full JD details
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, span'));
        const rm = btns.find(b => b.innerText && (b.innerText.trim().toLowerCase() === 'read more' || b.innerText.trim().toLowerCase() === 'show more'));
        if (rm) rm.click();
      });
      await sleep(1500);

      // 2. Read full live DOM
      const domData = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const isClosed = /job not found|could not be found|no longer accepting applications|position closed|job has expired|job is closed|page not found|404/i.test(text);
        const hasApply = !isClosed && !!document.querySelector('button, a, input[type="file"], form');
        return {
          text: text.substring(0, 8000),
          snippet: text.substring(0, 300).replace(/\s+/g, ' '),
          isClosed,
          hasApply
        };
      });

      if (domData.isClosed) {
        console.log(`  🚫 PURGED: Live page shows "Job not found" or position expired.`);
        purgeJobFromFile4(job.id, job.company, 'JOB_EXPIRED_NOT_FOUND');
        await page.close();
        continue;
      }

      // 3. Run Universal Gatekeeper Audit (YOE, Salary Floor, Freshness, Banned Tech)
      const auditResult = auditJobText(domData.text, job.role);

      if (!auditResult.passed) {
        console.log(`  🚫 PURGED by Gatekeeper: ${auditResult.reason}`);
        purgeJobFromFile4(job.id, job.company, auditResult.reason);
        await page.close();
      } else if (!domData.hasApply) {
        console.log(`  🚫 PURGED: No application trigger or form detected.`);
        purgeJobFromFile4(job.id, job.company, 'NO_PHYSICAL_FORM');
        await page.close();
      } else {
        // 🎉 FOUND A GENUINE MATCH!
        console.log('\n=================================================================');
        console.log(`🎉 [100% GENUINE WORTH JOB FOUND!]`);
        console.log(`Company: ${job.company}`);
        console.log(`Role: ${job.role}`);
        console.log(`Destination URL: ${destUrl}`);
        console.log(`Snippet: ${domData.snippet}`);
        console.log('=================================================================');
        console.log('Tab will remain open on screen for you. Stopping search loop!');

        // Save target job for user
        fs.writeFileSync('target_worth_job.json', JSON.stringify({ ...job, destination_url: destUrl, snippet: domData.snippet }, null, 2));
        browser.disconnect();
        return;
      }

    } catch(err) {
      console.log(`  ❌ PURGED due to error: ${err.message}`);
      purgeJobFromFile4(job.id, job.company, `NAV_ERROR: ${err.message}`);
      await page.close().catch(() => {});
    }

    // Natural 3s pacing between jobs
    await sleep(3000);
  }

  browser.disconnect();
  console.log('\n🏁 Finished auditing all remaining Adzuna jobs.');
}

function purgeJobFromFile4(jobId, company, reason) {
  try {
    let file4 = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf8'));
    const initialCount = file4.jobs.length;
    file4.jobs = file4.jobs.filter(j => j.id !== jobId && j.company !== company);
    if (file4.jobs.length < initialCount) {
      file4.total = file4.jobs.length;
      fs.writeFileSync(VERIFIED_FILE, JSON.stringify(file4, null, 2));
      console.log(`     -> Removed "${company}" from verified File 4. Remaining File 4 jobs: ${file4.total}`);
    }
  } catch(e) {
    console.error('Error purging from File 4:', e.message);
  }
}

auditAndPurgeAdzuna().catch(console.error);
