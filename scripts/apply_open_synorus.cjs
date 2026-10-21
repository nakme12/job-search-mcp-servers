/**
 * LIVE TEST: Apply to Synorus (Next.js Developer - Intern) on the currently open Adzuna tab
 * Follows Adzuna redirect with 3s sleep, fills form, uploads resume, and logs live.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { submitCutshortJob, submitIndeedJob, submitStandardAtsJob } = require('./universal_form_submission_engine.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function applyFromOpenAdzunaTab() {
  console.log('======================================================');
  console.log('🚀 [STARTING SCRIPT ON OPEN ADZUNA TAB]');
  console.log('Target: Synorus — Next.js Developer - Intern');
  console.log('======================================================');

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('5925644150') || p.url().includes('adzuna.in/details'));

  if (!page) {
    console.log('❌ Adzuna tab not found in browser!');
    return;
  }

  await page.bringToFront();

  // Step 1: Banner Check
  console.log('\n[1/5] Checking Adzuna email banner...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const noThanks = btns.find(b => b.innerText && b.innerText.trim().toLowerCase() === 'no, thanks');
    if (noThanks) noThanks.click();
  });
  console.log('⏳ Pacing delay 3 seconds (Watch screen)...');
  await sleep(3000);

  // Step 2: Click "No thanks, take me to the job" or Apply Button
  console.log('\n[2/5] Triggering Adzuna redirect link...');
  const redirectTriggered = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const takeMe = links.find(a => a.innerText && a.innerText.toLowerCase().includes('take me to the job'));
    if (takeMe) {
      takeMe.click();
      return 'Clicked: No thanks, take me to the job';
    }
    const applyBtn = document.querySelector('a.apply_btn, a[href*="/land/ad/"], a[id*="apply"]');
    if (applyBtn) {
      applyBtn.click();
      return 'Clicked: Adzuna Apply Button';
    }
    return 'None found';
  });

  console.log(`  -> Action: ${redirectTriggered}`);
  console.log('⏳ Awaiting navigation to live employer destination (3 seconds)...');
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await sleep(3000);

  const destUrl = page.url();
  console.log(`\n🎯 Landed on Live Destination URL: ${destUrl}`);

  // Step 3: Check Destination JD
  console.log('\n[3/5] Inspecting Destination Page DOM & Requirements...');
  const jdInfo = await page.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const isOverExp = /3\+|4\+|5\+|6\+|3-5|4-6/i.test(text);
    const isUnpaid = /unpaid|stipend.*(3000|5000|8000)/i.test(text);
    return {
      title: document.title,
      isOverExp,
      isUnpaid,
      snippet: text.substring(0, 400).replace(/\s+/g, ' ')
    };
  });

  console.log(`  - Page Title: "${jdInfo.title}"`);
  console.log(`  - Experience Requirement: OverExp=${jdInfo.isOverExp}, LowStipend=${jdInfo.isUnpaid}`);
  console.log(`  - DOM Snippet: "${jdInfo.snippet.substring(0, 200)}..."`);
  console.log('⏳ Pacing delay 3 seconds...');
  await sleep(3000);

  if (jdInfo.isOverExp || jdInfo.isUnpaid) {
    console.log('  ⚠️ Job violates candidate rules (Out of range / Unpaid). Halting submission.');
    return;
  }

  // Step 4: Submit Application
  console.log('\n[4/5] Executing Application Form Submission...');
  const job = {
    company: 'Synorus',
    role: 'Next.js Developer - Intern',
    url: destUrl
  };
  const profile = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8'));

  if (destUrl.includes('cutshort.io')) {
    console.log('  -> Routing to Cutshort Submitter Engine...');
    const result = await submitCutshortJob(page, job, profile, 1);
    console.log('Cutshort Result:', result);
  } else if (destUrl.includes('indeed.com')) {
    console.log('  -> Routing to Indeed Stepper Engine...');
    const result = await submitIndeedJob(page, job, profile, 1);
    console.log('Indeed Result:', result);
  } else {
    console.log('  -> Routing to Direct ATS Submitter...');
    const result = await submitStandardAtsJob(page, job, profile, 1);
    console.log('Direct ATS Result:', result);
  }

  console.log('\n[5/5] FINISHED! Tab open hi rahegi screen par review karne ke liye.');
  browser.disconnect();
}

applyFromOpenAdzunaTab().catch(console.error);
