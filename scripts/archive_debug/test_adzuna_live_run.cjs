/**
 * LIVE TEST RUNNER: Adzuna End-to-End Application
 * Opens a fresh dedicated tab, resolves Adzuna redirect, and submits on the destination ATS.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { submitCutshortJob, submitIndeedJob, submitStandardAtsJob } = require('./universal_form_submission_engine.cjs');
const { getScreenshotsVault } = require('./canonical_paths.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const testJob = {
  company: 'Tradylcom',
  role: 'Frontend Developer',
  url: 'https://www.adzuna.in/details/5923259529?utm_medium=api&utm_source=22d4b243'
};

async function testAdzunaLive() {
  console.log('======================================================');
  console.log(`🚀 [ADZUNA LIVE TEST] Starting job: ${testJob.company} (${testJob.role})`);
  console.log(`🔗 Target URL: ${testJob.url}`);
  console.log('======================================================');

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  // Open fresh dedicated tab (Rule 81)
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    console.log('[1] Navigating to Adzuna URL...');
    await page.goto(testJob.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await sleep(3000);

    // Adzuna Banner Bypass
    console.log('[2] Checking Adzuna Banner / Interstitial modal...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const noThanks = btns.find(b => b.innerText && b.innerText.trim().toLowerCase() === 'no, thanks');
      if (noThanks) {
        console.log('Found banner "No, thanks", clicking...');
        noThanks.click();
      }
    });
    await sleep(1500);

    // Interstitial Modal Redirect Click
    const takeMeClicked = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const takeMe = links.find(a => a.innerText && a.innerText.toLowerCase().includes('take me to the job'));
      if (takeMe) {
        takeMe.click();
        return true;
      }
      return false;
    });

    if (takeMeClicked) {
      console.log('  -> Clicked "No thanks, take me to the job" link! Awaiting redirect navigation...');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      await sleep(3500);
    } else {
      console.log('  -> Interstitial not triggered or already on destination.');
    }

    const currentUrl = page.url();
    console.log(`\n🎯 Landed on Live Destination URL: ${currentUrl}`);

    // Check JD requirements (Rule 60 & Rule 82)
    const jdAnalysis = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const isSenior = /senior|lead|principal|architect|manager/i.test(text);
      const isOverExp = /3\+|4\+|5\+|6\+|3-5|4-6|5-7/i.test(text);
      const isUnpaid = /unpaid|stipend.*(3000|5000|8000)/i.test(text);
      return { isSenior, isOverExp, isUnpaid, textSnippet: text.substring(0, 500).replace(/\s+/g, ' ') };
    });

    console.log('[3] Live Destination JD Analysis:');
    console.log(`  - Text Snippet: ${jdAnalysis.textSnippet.substring(0, 180)}...`);
    console.log(`  - Senior/OverExp check: Senior=${jdAnalysis.isSenior}, OverExp=${jdAnalysis.isOverExp}, LowStipend=${jdAnalysis.isUnpaid}`);

    if (jdAnalysis.isSenior || jdAnalysis.isOverExp || jdAnalysis.isUnpaid) {
      console.log('  ⚠️ Job does not match 0-2 YOE or salary floor. Aborting submission.');
      return;
    }

    // Handover to Submission Sub-Engine
    const profile = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8'));

    if (currentUrl.includes('cutshort.io')) {
      console.log('\n[4] Routing to Cutshort Form Submitter...');
      const res = await submitCutshortJob(page, testJob, profile, 1);
      console.log('Cutshort submission result:', res);
    } else if (currentUrl.includes('indeed.com')) {
      console.log('\n[4] Routing to Indeed Stepper Engine...');
      const res = await submitIndeedJob(page, testJob, profile, 1);
      console.log('Indeed submission result:', res);
    } else {
      console.log('\n[4] Routing to Direct ATS Submitter...');
      const res = await submitStandardAtsJob(page, testJob, profile, 1);
      console.log('Direct ATS submission result:', res);
    }

    console.log('\n✅ TEST COMPLETED. Tab will remain open for 15 seconds for your visual review.');
    await sleep(15000);

  } catch (err) {
    console.error('❌ Error in Adzuna live test:', err.message);
  } finally {
    // Cleanly close only this test tab
    console.log('Closing test worker tab...');
    await page.close().catch(() => {});
    browser.disconnect();
  }
}

testAdzunaLive().catch(console.error);
