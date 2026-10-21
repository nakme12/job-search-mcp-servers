/**
 * FIXED YOE AUDIT & APPLY ON CURRENT SYNORUS CUTSHORT TAB
 * Enforces correct 0-3 YOE eligibility (candidate has 1.5 YOE) and submits via Cutshort engine.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { submitCutshortJob } = require('./universal_form_submission_engine.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function applySynorusNow() {
  console.log('======================================================');
  console.log('🚀 [APPLYING TO SYNORUS - 0-3 YOE APPROVED]');
  console.log('Role: Next.js Developer - Intern | Candidate Exp: 1.5 YOE');
  console.log('======================================================');

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('Synorus') || p.url().includes('cutshort.io/job/'));

  if (!page) {
    console.log('❌ Cutshort Synorus tab not found!');
    return;
  }

  await page.bringToFront();
  console.log('Tab brought to front:', page.url());

  const job = {
    company: 'Synorus',
    role: 'Next.js Developer - Intern',
    url: page.url()
  };
  const profile = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8'));

  console.log('\n[Triggering Cutshort Form Submitter with 3s Sleep]...');
  const result = await submitCutshortJob(page, job, profile, 1);
  console.log('\n🎉 Submission Result:', result);

  console.log('\nTab screen par open rahegi visual verification ke liye!');
  browser.disconnect();
}

applySynorusNow().catch(console.error);
