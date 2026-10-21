/**
 * CONTINUOUS SLOT 6 NON-STOP DIRECT PORTAL RUNNER
 * Operates across all 56 clean direct portal targets:
 * - Naukri, Indeed, LinkedIn, Tech ATS (Kula, Ashby, Greenhouse)
 * - Zero wait on CAPTCHA: logs to pending_captcha_queue.json and advances INSTANTLY.
 * - Captures strictly ONE post-submit confirmation screenshot per applied job.
 * - Saves confirmed application into applied_todays_<DATE>_shift1.json.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { CANONICAL_PATHS, getScreenshotsVault } = require('./canonical_paths.cjs');
const { recordConfirmedApplication } = require('./workflow_5file_manager.mjs');
const { auditJobText } = require('./job_gatekeeper.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

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

async function runNonStopPortals() {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const verifiedFile = path.join(__dirname, '..', `verified_todays_${todayStr}_shift1.json`);
  const appliedFile = path.join(__dirname, '..', `applied_todays_${todayStr}_shift1.json`);
  const captchaQueueFile = path.join(__dirname, '..', 'pending_captcha_queue.json');

  const ver = JSON.parse(fs.readFileSync(verifiedFile, 'utf8'));
  const appliedData = JSON.parse(fs.readFileSync(appliedFile, 'utf8'));

  const appliedUrls = new Set((appliedData.jobs || []).map(j => (j.url || '').toLowerCase()).filter(Boolean));
  const appliedCompanies = new Set((appliedData.jobs || []).map(j => (j.company || '').toLowerCase()).filter(Boolean));

  // Filter 56 direct non-adzuna portals
  const rawDirectJobs = ver.jobs.filter(j => {
    if (j.recipient || !j.url) return false;
    if (j.url.includes('adzuna.in')) return false; // Held for dedicated script
    if (appliedUrls.has(j.url.toLowerCase())) return false;
    return true;
  });

  // Group by platform source for true round-robin interleaving (Anti-Rate-Limit)
  const buckets = {
    naukri: [],
    indeed: [],
    linkedin: [],
    tech_ats: []
  };

  rawDirectJobs.forEach(j => {
    const u = j.url.toLowerCase();
    if (u.includes('naukri.com')) buckets.naukri.push(j);
    else if (u.includes('indeed.com')) buckets.indeed.push(j);
    else if (u.includes('linkedin.com')) buckets.linkedin.push(j);
    else buckets.tech_ats.push(j);
  });

  // Interleave round-robin: [ATS, Naukri, Indeed, LinkedIn, ATS, Naukri, ...]
  const directJobs = [];
  const maxLen = Math.max(buckets.naukri.length, buckets.indeed.length, buckets.linkedin.length, buckets.tech_ats.length);
  for (let k = 0; k < maxLen; k++) {
    if (buckets.tech_ats[k]) directJobs.push(buckets.tech_ats[k]);
    if (buckets.naukri[k]) directJobs.push(buckets.naukri[k]);
    if (buckets.indeed[k]) directJobs.push(buckets.indeed[k]);
    if (buckets.linkedin[k]) directJobs.push(buckets.linkedin[k]);
  }

  console.log(`=================================================================`);
  console.log(`🚀 NON-STOP DIRECT PORTAL RUNNER (Target Queue: ${directJobs.length} Jobs)`);
  console.log(`🛡️ Platform Interleaved: ATS (${buckets.tech_ats.length}) | Naukri (${buckets.naukri.length}) | Indeed (${buckets.indeed.length}) | LinkedIn (${buckets.linkedin.length})`);
  console.log(`=================================================================`);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const profile = getProfile();
  const vault = getScreenshotsVault();

  let submittedCount = 0;
  let lastCompany = '';

  for (let i = 0; i < directJobs.length; i++) {
    const job = directJobs[i];
    const prefix = `[Portal ${i + 1}/${directJobs.length}]`;

    // Rule 76 Interleaving: Avoid consecutive applications to the exact same company
    if (lastCompany && job.company && lastCompany.toLowerCase() === job.company.toLowerCase()) {
      console.log(`${prefix} ${job.company} — Rule 76 Spacing: Moving to end of queue to avoid consecutive spam.`);
      directJobs.push(job);
      continue;
    }

    console.log(`\n${prefix} Opening: ${job.company} — ${job.role}`);
    console.log(`  URL: ${job.url}`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await sleep(3500);

      // Gatekeeper Audit (0-2 YOE & freshness)
      const pageText = await page.evaluate(() => document.body.innerText);
      const isClosed = /no longer accepting applications|position closed|404 not found|job is closed/i.test(pageText);
      if (isClosed) {
        console.log(`${prefix} ${job.company} — SKIPPED_CLOSED`);
        await page.close();
        continue;
      }

      const audit = auditJobText(pageText, job.role);
      if (!audit.passed) {
        console.log(`🚫 ${prefix} ${job.company} — GATEKEEPER BLOCKED: ${audit.reason}`);
        await page.close();
        continue;
      }
      console.log(`${prefix} ${job.company} — Gatekeeper Audit Passed ✅`);

      // Check if CAPTCHA present before or during form
      const hasCaptcha = await page.evaluate(() => {
        return !!document.querySelector('iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], div[class*="recaptcha"], div[class*="turnstile"]');
      });

      if (hasCaptcha) {
        console.log(`⚠️ ${prefix} ${job.company} — CAPTCHA DETECTED! Sidewise queued (Zero Wait).`);
        let queue = [];
        if (fs.existsSync(captchaQueueFile)) {
          try { queue = JSON.parse(fs.readFileSync(captchaQueueFile, 'utf8')); } catch(e) {}
        }
        queue.push({
          company: job.company,
          role: job.role,
          url: job.url,
          timestamp: new Date().toISOString()
        });
        fs.writeFileSync(captchaQueueFile, JSON.stringify(queue, null, 2));
        await page.close();
        continue;
      }

      // 1. Direct Greenhouse Embed URL Resolver (e.g. Stripe, Airbnb, etc.)
      if (job.url.includes('gh_jid=')) {
        const match = job.url.match(/gh_jid=(\d+)/);
        if (match && match[1]) {
          const directGhUrl = `https://job-boards.greenhouse.io/${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}/jobs/${match[1]}`;
          console.log(`  -> Resolved Direct Greenhouse ATS Endpoint: ${directGhUrl}`);
          try {
            await page.goto(directGhUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
            await sleep(3000);
          } catch(e) {}
        }
      }

      // 2. Multi-Stage Button Click: Search for any Apply / Submit Application button
      let clickedAny = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        clickedAny = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('button, a, input[type="button"], div[role="button"], span'));
          const btn = elements.find(el => {
            const t = (el.innerText || el.value || '').trim().toLowerCase();
            return t === 'apply now' || 
                   t === 'apply for this role' || 
                   t === 'apply for this position' || 
                   t === 'apply' || 
                   t === 'easy apply' ||
                   t === 'apply online' ||
                   t.includes('apply for job');
          });
          if (btn && btn.offsetParent !== null) {
            btn.click();
            return true;
          }
          return false;
        });

        if (clickedAny) {
          console.log(`  -> Clicked Apply Button on page. Waiting for form/modal/iframe render...`);
          await sleep(4000);
          break;
        }
      }

      // 3. Iframe Form Penetration: Check if form is embedded inside an iframe (Greenhouse/Lever/Workable)
      let targetFrame = page;
      const iframes = await page.$$('iframe');
      for (const frameHandle of iframes) {
        const frame = await frameHandle.contentFrame();
        if (frame) {
          const isEmbedForm = await frame.evaluate(() => !!document.querySelector('form, input[type="email"], input[id*="email"], input[name*="email"]'));
          if (isEmbedForm) {
            console.log(`  -> Found embedded application form inside iframe! Penetrating frame context...`);
            targetFrame = frame;
            break;
          }
        }
      }

      // 4. Verify Form Fields in active context (page or iframe)
      const hasForm = await targetFrame.evaluate(() => {
        return !!document.querySelector('form, input[type="email"], input[name*="email"], input[id*="email"], input[type="tel"], input[name*="name"], input[placeholder*="Name"]');
      });

      if (!hasForm) {
        console.log(`${prefix} ${job.company} — No Direct Form detected even after deep button click & iframe search. Tab closed.`);
        await page.close();
        continue;
      }

      // Fill Form with Rule 70 Pre-Clear on targetFrame
      console.log(`${prefix} ${job.company} — Populating canonical screening profile...`);
      await targetFrame.evaluate((prof) => {
        function setClean(el, val) {
          if (!el) return;
          el.value = '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const inputs = Array.from(document.querySelectorAll('input, textarea'));
        inputs.forEach(i => {
          const l = ((i.closest('label')?.innerText || '') + ' ' + (i.name || '') + ' ' + (i.id || '') + ' ' + (i.placeholder || '')).toLowerCase();
          if (l.includes('first name') || l.includes('firstname')) setClean(i, prof.first_name);
          else if (l.includes('last name') || l.includes('lastname')) setClean(i, prof.last_name);
          else if (l.includes('name') && !l.includes('user') && !l.includes('company')) setClean(i, prof.name);
          else if (l.includes('email')) setClean(i, prof.email);
          else if (l.includes('phone') || l.includes('mobile')) setClean(i, prof.phone_raw);
          else if (l.includes('linkedin')) setClean(i, prof.linkedin);
          else if (l.includes('github')) setClean(i, prof.github);
          else if (l.includes('portfolio') || l.includes('website')) setClean(i, prof.portfolio);
          else if (l.includes('city') || l.includes('location')) setClean(i, 'Indore, India');
          else if (l.includes('notice')) setClean(i, '15');
          else if (l.includes('current ctc') || l.includes('current salary')) setClean(i, '216000');
          else if (l.includes('expected ctc') || l.includes('expected salary')) setClean(i, '465000');
          else if (l.includes('total experience') || l.includes('years of experience')) setClean(i, '1.5');
        });
      }, profile);

      // Attach Resume via CDP file input
      const resumeFile = getBestResume(job.role);
      const fileInput = await targetFrame.$('input[type="file"]');
      if (fileInput) {
        await fileInput.uploadFile(resumeFile);
        console.log(`${prefix} ${job.company} — Attached resume: ${path.basename(resumeFile)}`);
        await sleep(2000);
      }

      // Check for submit button
      const submitBtn = await targetFrame.$('button[type="submit"], input[type="submit"], button.submit, button#submit');
      if (submitBtn) {
        await submitBtn.click();
        console.log(`${prefix} ${job.company} — Submit triggered, asserting confirmation...`);
        await sleep(4000);
      }

      // Confirmation Assertion (Rule 69)
      const isConfirmed = await page.evaluate(() => {
        const t = document.body.innerText.toLowerCase();
        return t.includes('thank you') || 
               t.includes('application submitted') || 
               t.includes('received your application') ||
               t.includes('successfully submitted') ||
               t.includes('application received');
      });

      if (isConfirmed) {
        const ssName = `post_submit_${job.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${Date.now()}.png`;
        const ssPath = path.join(vault, ssName);
        await page.screenshot({ path: ssPath, fullPage: true });
        console.log(`🎯 [CONFIRMED APPLIED] ${job.company} — Proof saved: ${ssPath}`);

        recordConfirmedApplication({
          company: job.company,
          role: job.role,
          url: job.url,
          channel: 'Direct Company Career Portal',
          proof_screenshot: ssPath,
          status: 'APPLIED_CONFIRMED',
          notes: `Confirmed ATS submission on ${new Date().toISOString()}`
        });

        // Update shift 1 ledger
        const currentApp = JSON.parse(fs.readFileSync(appliedFile, 'utf8'));
        currentApp.jobs.push({
          id: currentApp.jobs.length + 1,
          company: job.company,
          role: job.role,
          url: job.url,
          channel: 'Direct Company Career Portal',
          proof_screenshot: ssPath,
          status: 'APPLIED_CONFIRMED',
          timestamp: new Date().toISOString()
        });
        currentApp.total = currentApp.jobs.length;
        fs.writeFileSync(appliedFile, JSON.stringify(currentApp, null, 2));

        submittedCount++;
        lastCompany = job.company;
        console.log(`🎯 [SLOT 6 PROGRESS] Total Confirmed Today: ${currentApp.total}`);
      } else {
        console.log(`⚠️ ${prefix} ${job.company} — Confirmation NOT detected on DOM (Rule 69 Zero Phantom Log). Tab closed.`);
      }

      await page.close();
      await sleep(4000);

    } catch (err) {
      console.log(`${prefix} ${job.company} — ERROR: ${err.message}`);
      try { await page.close(); } catch(e) {}
    }
  }

  browser.disconnect();
  console.log(`=================================================================`);
  console.log(`🏁 NON-STOP PORTAL RUNNER COMPLETE. Newly Submitted: ${submittedCount}`);
  console.log(`=================================================================`);
}

runNonStopPortals().catch(console.error);
