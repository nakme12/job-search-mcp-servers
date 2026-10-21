/**
 * LIVE RUNNER: Random Adzuna Job with 3s Pacing Sleep & Live Logs
 * Picked: AimInfologics | Full Stack Developer - Node.js & Next.js
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { submitCutshortJob, submitIndeedJob, submitStandardAtsJob } = require('./universal_form_submission_engine.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runRandomJob() {
  const job = JSON.parse(fs.readFileSync('target_random_job.json', 'utf8'));
  console.log('======================================================');
  console.log(`🚀 [RANDOM ADZUNA JOB] ${job.company} — ${job.role}`);
  console.log(`🔗 Adzuna URL: ${job.url}`);
  console.log('======================================================');

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  // Open dedicated fresh tab
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    console.log('\n[Log 1/5] Opening Adzuna page in new tab...');
    await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    console.log('⏳ Sleeping 3 seconds...');
    await sleep(3000);

    // Banner check
    console.log('\n[Log 2/5] Checking for "Leave us your email" banner...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const noThanks = btns.find(b => b.innerText && b.innerText.trim().toLowerCase() === 'no, thanks');
      if (noThanks) noThanks.click();
    });
    console.log('⏳ Sleeping 3 seconds...');
    await sleep(3000);

    // Click "No thanks, take me to the job"
    console.log('\n[Log 3/5] Clicking "No thanks, take me to the job" link...');
    const takeMe = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const link = links.find(a => a.innerText && a.innerText.toLowerCase().includes('take me to the job'));
      if (link) {
        link.click();
        return true;
      }
      return false;
    });

    if (takeMe) {
      console.log('  -> Clicked redirect link! Waiting for destination navigation...');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
    }
    console.log('⏳ Sleeping 3 seconds on destination...');
    await sleep(3000);

    const destUrl = page.url();
    console.log(`\n🎯 Landed on Live Destination URL: ${destUrl}`);

    // Live JD Inspection
    console.log('\n[Log 4/5] Reading Destination Live JD...');
    const jd = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const hasApply = Array.from(document.querySelectorAll('button, a')).some(b => b.innerText && (b.innerText.trim() === 'Apply to this job' || b.innerText.trim() === 'Apply now'));
      const isOverExp = /3\+|4\+|5\+|6\+|3-5|4-6|5-7/i.test(text);
      return {
        title: document.title,
        hasApply,
        isOverExp,
        snippet: text.substring(0, 400).replace(/\s+/g, ' ')
      };
    });

    console.log(`  - Page Title: "${jd.title}"`);
    console.log(`  - Has Apply Button: ${jd.hasApply}`);
    console.log(`  - Over 2 YOE: ${jd.isOverExp}`);
    console.log(`  - Text Snippet: "${jd.snippet.substring(0, 200)}..."`);
    console.log('⏳ Sleeping 3 seconds...');
    await sleep(3000);

    // Application routing
    console.log('\n[Log 5/5] Checking Application Eligibility...');
    if (jd.isOverExp) {
      console.log('  ⚠️ Job requires 3+ YOE (Rule 60 Rejection). Tab will stay open for review.');
      await sleep(15000);
      return;
    }

    const profile = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8'));

    if (destUrl.includes('cutshort.io')) {
      console.log('  -> Routing to Cutshort Form Submitter...');
      const res = await submitCutshortJob(page, job, profile, 1);
      console.log('Result:', res);
    } else if (destUrl.includes('indeed.com')) {
      console.log('  -> Routing to Indeed Stepper Engine...');
      const res = await submitIndeedJob(page, job, profile, 1);
      console.log('Result:', res);
    } else {
      console.log('  -> Routing to Direct ATS Submitter...');
      const res = await submitStandardAtsJob(page, job, profile, 1);
      console.log('Result:', res);
    }

    console.log('\n🏁 Run complete. Tab will stay open for 20 seconds so you can see it!');
    await sleep(20000);

  } catch(err) {
    console.error('❌ Error running random job:', err.message);
  } finally {
    console.log('Closing dedicated test tab...');
    await page.close().catch(() => {});
    browser.disconnect();
  }
}

runRandomJob().catch(console.error);
