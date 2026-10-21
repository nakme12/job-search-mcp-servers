/**
 * SLOT 6 DIRECT ATS PORTAL SUBMISSION WORKER
 * Standardized 10-step flow per Rule 58:
 * 1. Open verified job URL one-by-one from verified_todays_2026-10-15_shift1.json.
 * 2. Re-verify live JD body (confirm active & fits 0-2 YOE).
 * 3. Fill form strictly from candidate_screening_profile.json.
 * 4. Cross-verify populated inputs before submitting.
 * 5. Mandatory console/terminal log of all field values.
 * 6. If CAPTCHA detected -> STOP, trigger alert, wait for solve.
 * 7. Trigger submit button.
 * 8. Check validation errors -> fix via profile -> re-submit.
 * 9. Post-submit confirmation detected -> Capture strictly ONE confirmation screenshot & log to applied_todays_2026-10-15_shift1.json.
 * 10. Immediately close completed tab and advance to next.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { applyAshbyJob } = require('./ashby_auto_fill_engine.cjs');
const { applyGreenhouseJob } = require('./greenhouse_auto_fill_engine.cjs');
const { CANONICAL_PATHS, getScreenshotsVault } = require('./canonical_paths.cjs');
const { recordConfirmedApplication } = require('./workflow_5file_manager.mjs');
const { auditJobText } = require('./job_gatekeeper.cjs');
const { assertSlot } = require('./slot_guard.cjs');

// HARD CLOCK ENFORCEMENT — ZERO PREMATURE LEAP (Rule 10 & Rule 58)
assertSlot(['CYCLE1_SLOT6', 'CYCLE2_SLOT6'], 'Slot 6 Direct ATS Portal Applications');

function getProfile() {
  return JSON.parse(fs.readFileSync(CANONICAL_PATHS.PROFILE_FILE, 'utf8')).profile;
}

function getBestResume(roleTitle) {
  const t = (roleTitle || '').toLowerCase();
  if (t.includes('full stack') || t.includes('mern') || t.includes('node') || t.includes('backend')) {
    return path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - MERN Full Stack.pdf');
  }
  if (t.includes('react') || t.includes('ui') || t.includes('front end') || t.includes('frontend')) {
    return path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - React Developer.pdf');
  }
  return path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - Frontend Engineer.pdf');
}

const SCREENSHOTS_DIR = getScreenshotsVault();

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runSlot6Portals() {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentShift = now.getHours() >= 15 ? 2 : 1;

  const verifiedFile = path.join(__dirname, '..', `verified_todays_${todayStr}_shift${currentShift}.json`);
  const ver = JSON.parse(fs.readFileSync(verifiedFile, 'utf8'));

  const appliedFile = path.join(__dirname, '..', `applied_todays_${todayStr}_shift${currentShift}.json`);
  let appliedUrls = new Set();
  if (fs.existsSync(appliedFile)) {
    try {
      const appData = JSON.parse(fs.readFileSync(appliedFile, 'utf8'));
      (appData.jobs || []).forEach(j => { if (j.url) appliedUrls.add(j.url); });
    } catch(e) {}
  }

  // Get direct ATS portal jobs, strictly matching 0-2 YOE & freshness, excluding already applied
  const portalJobs = ver.jobs.filter(j => {
    if (j.recipient || !j.url) return false;
    if (appliedUrls.has(j.url)) return false;
    
    const isATS = j.url.includes('ashbyhq.com') || j.url.includes('greenhouse.io') || j.url.includes('smartrecruiters.com') || j.url.includes('lever.co') || j.url.includes('kula.ai');
    if (!isATS) return false;

    // Filter by Location: Must be India or Remote
    const loc = (j.location || '').toLowerCase();
    const isIndiaOrRemote = loc.includes('india') || loc.includes('remote') || loc.includes('bangalore') || loc.includes('pune') || loc.includes('gurgaon') || loc.includes('noida') || loc.includes('mumbai') || loc.includes('in') || loc.includes('anywhere');
    const isStrictUS = (loc.includes('new york') || loc.includes('san francisco') || loc.includes('austin')) && !loc.includes('remote');
    if (!isIndiaOrRemote || isStrictUS) return false;

    // Filter by Date freshness (Rule 3: <= 7-10 days)
    if (j.date_posted) {
      const postedDate = new Date(j.date_posted);
      const diffDays = (new Date() - postedDate) / (1000 * 60 * 60 * 24);
      if (diffDays > 10) return false;
    }

    return true;
  });

  console.log(`=================================================================`);
  console.log(`🚀 SLOT 6: EXECUTING DIRECT ATS PORTALS (India/Remote Fresh Queue: ${portalJobs.length})`);
  console.log(`Target Floor: Min 40 Portals Shift 1`);
  console.log(`=================================================================`);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null, protocolTimeout: 60000 });
  const profile = getProfile();

  let submittedCount = 0;

  for (let i = 0; i < portalJobs.length; i++) {
    const job = portalJobs[i];
    const prefix = `[Job ${i + 1}/${portalJobs.length}]`;
    console.log(`\n${prefix} ${job.company} — Portal URL open kiya: ${job.url}`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3500);

      // 1. Live JD body re-verify via Gatekeeper: Active + 0-2 YOE + Freshness + Stack
      const pageText = await page.evaluate(() => document.body.innerText);
      const isClosed = /no longer accepting applications|position closed|404 not found|job is closed/i.test(pageText);
      if (isClosed) {
        console.log(`${prefix} ${job.company} — SKIPPED_CLOSED (Position no longer accepting applications)`);
        await page.close();
        continue;
      }

      const audit = auditJobText(pageText, job.role);
      if (!audit.passed) {
        console.log(`🚫 ${prefix} ${job.company} — GATEKEEPER BLOCKED: ${audit.reason} (Rule 60 Instant Tab Kill)`);
        await page.close();
        continue;
      }
      console.log(`${prefix} ${job.company} — Gatekeeper Audit Passed (0-2 YOE, Clean Stack, Fresh <= 10 days) ✅`);

      // 2. Submit via Dedicated Engine (Ashby or Greenhouse)
      let isSuccess = false;
      if (job.url.includes('ashbyhq.com')) {
        isSuccess = await applyAshbyJob(page, job);
      } else if (job.url.includes('greenhouse.io')) {
        isSuccess = await applyGreenhouseJob(page, job);
      }

      if (isSuccess) {
        submittedCount++;
        console.log(`🎯 [SLOT 6 PROGRESS] Confirmed ATS Portal Applications Today: ${submittedCount}`);
      }

      // 3. Close tab immediately (Rule 57)
      await page.close();
      console.log(`${prefix} ${job.company} — Tab closed. Advancing to next job.`);
      await sleep(10000); // Cooldown (Rule 34)

    } catch (err) {
      console.log(`${prefix} ${job.company} — ERROR: ${err.message} — SKIPPED`);
      try { await page.close(); } catch(e) {}
    }
  }

  browser.disconnect();
  console.log(`\n=================================================================`);
  console.log(`✅ SLOT 6 ATS PORTALS RUN FINISHED! Total Confirmed: ${submittedCount}`);
  console.log(`=================================================================`);
}

runSlot6Portals().catch(console.error);
