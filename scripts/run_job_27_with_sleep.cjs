/**
 * OPEN & TEST JOB 27 FROM ADZUNA (WITH 3 SECONDS SLEEP AT EACH STEP)
 * Job: Interface Matters - Frontend Developer
 * URL: https://www.adzuna.in/details/5920569700?utm_medium=api&utm_source=de296ef6
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { submitCutshortJob, submitIndeedJob, submitStandardAtsJob } = require('./universal_form_submission_engine.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runJob27() {
  const job = JSON.parse(fs.readFileSync('target_job_27.json', 'utf8'));
  console.log('======================================================');
  console.log(`🚀 [JOB 27 TEST] Starting: ${job.company} (${job.role})`);
  console.log(`🔗 Adzuna URL: ${job.url}`);
  console.log('======================================================');

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  // Open fresh dedicated tab
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    console.log('\n[Step 1] Navigating to Adzuna URL in new tab...');
    await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    console.log('⏳ Sleeping 3 seconds...');
    await sleep(3000);

    // Dismiss banner if present
    console.log('\n[Step 2] Checking for email banner ("No, thanks")...');
    const bannerClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const noThanks = btns.find(b => b.innerText && b.innerText.trim().toLowerCase() === 'no, thanks');
      if (noThanks) {
        noThanks.click();
        return true;
      }
      return false;
    });
    console.log('  -> Banner handled:', bannerClicked);
    console.log('⏳ Sleeping 3 seconds...');
    await sleep(3000);

    // Click "No thanks, take me to the job"
    console.log('\n[Step 3] Clicking "No thanks, take me to the job"...');
    const takeMeResult = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const takeMe = links.find(a => a.innerText && a.innerText.toLowerCase().includes('take me to the job'));
      if (takeMe) {
        takeMe.click();
        return true;
      }
      return false;
    });

    if (takeMeResult) {
      console.log('  -> Clicked redirect link! Waiting for destination page navigation...');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
    } else {
      console.log('  -> Interstitial link not present (might be direct).');
    }

    console.log('⏳ Sleeping 3 seconds on destination page...');
    await sleep(3000);

    const currentUrl = page.url();
    console.log(`\n🎯 Landed on Live Destination URL: ${currentUrl}`);

    // Live JD Inspection (Rule 60 & Rule 82)
    console.log('\n[Step 4] Inspecting Live Destination JD...');
    const jdInfo = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const isSenior = /senior|lead|principal|architect|manager/i.test(text);
      const isOverExp = /3\+|4\+|5\+|6\+|3-5|4-6|5-7/i.test(text);
      const isUnpaid = /unpaid|stipend.*(3000|5000|8000)/i.test(text);
      return {
        title: document.title,
        isSenior,
        isOverExp,
        isUnpaid,
        snippet: text.substring(0, 500).replace(/\s+/g, ' ')
      };
    });

    console.log(`  - Page Title: "${jdInfo.title}"`);
    console.log(`  - JD Snippet: ${jdInfo.snippet.substring(0, 200)}...`);
    console.log(`  - Experience Check: OverExp=${jdInfo.isOverExp}, Senior=${jdInfo.isSenior}`);

    console.log('⏳ Sleeping 3 seconds...');
    await sleep(3000);

    // If matches profile, trigger application
    if (jdInfo.isOverExp || jdInfo.isSenior) {
      console.log('  ⚠️ Job requires 3+ YOE / Senior level (Rule 60: Out of 0-2 range).');
      console.log('  Screen par tab 10s open rahegi aapke dekhne ke liye.');
      await sleep(10000);
      return;
    }

    // Apply via Submitter
    console.log('\n[Step 5] Triggering Application via Universal Submitter...');
    const profile = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8'));

    if (currentUrl.includes('cutshort.io')) {
      await submitCutshortJob(page, job, profile, 1);
    } else if (currentUrl.includes('indeed.com')) {
      await submitIndeedJob(page, job, profile, 1);
    } else {
      await submitStandardAtsJob(page, job, profile, 1);
    }

    console.log('\n✅ Script step finished! Tab 15s tak open rahegi taaki aap dekh sako.');
    await sleep(15000);

  } catch(err) {
    console.error('❌ Error executing Job 27:', err.message);
  } finally {
    console.log('Cleanly closing test tab...');
    await page.close().catch(() => {});
    browser.disconnect();
  }
}

runJob27().catch(console.error);
