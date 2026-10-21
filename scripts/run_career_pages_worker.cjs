/**
 * GENERIC CAREER PAGE FORM SUBMITTER
 * Targets direct company career pages and single application forms:
 * - Types standard fields with Rule 70 pre-clear.
 * - Injects verified resume via programmatic CDP file upload.
 * - Detects live DOM confirmation before recording and screenshot capture.
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

async function runCareerPages() {
  const verifiedFile = 'C:/mcp/job-search-mcp-engine/verified_todays_2026-10-15_shift1.json';
  const ver = JSON.parse(fs.readFileSync(verifiedFile, 'utf8'));

  const appliedFile = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-15_shift1.json';
  let appliedUrls = new Set();
  if (fs.existsSync(appliedFile)) {
    try {
      const appData = JSON.parse(fs.readFileSync(appliedFile, 'utf8'));
      (appData.jobs || []).forEach(j => { if (j.url) appliedUrls.add(j.url); });
    } catch(e) {}
  }

  // Filter career page candidates
  const careerJobs = ver.jobs.filter(j => {
    if (j.recipient || !j.url) return false;
    if (appliedUrls.has(j.url)) return false;
    const isSpecial = j.url.includes('ashbyhq.com') || j.url.includes('greenhouse.io') || j.url.includes('smartrecruiters.com');
    return !isSpecial;
  });

  console.log(`=================================================================`);
  console.log(`🚀 EXECUTING DIRECT CAREER PAGES & FORMS (Queue: ${careerJobs.length})`);
  console.log(`=================================================================`);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const profile = getProfile();
  let submittedCount = 0;

  for (let i = 0; i < careerJobs.length; i++) {
    const job = careerJobs[i];
    const prefix = `[Career Job ${i + 1}/${careerJobs.length}]`;
    console.log(`\n${prefix} ${job.company} — Opening: ${job.url}`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await sleep(3000);

      const pageText = await page.evaluate(() => document.body.innerText);
      const isClosed = /no longer accepting applications|position closed|404 not found|job is closed/i.test(pageText);
      if (isClosed) {
        console.log(`${prefix} ${job.company} — SKIPPED_CLOSED`);
        await page.close();
        continue;
      }

      const audit = auditJobText(pageText, job.role);
      if (!audit.passed) {
        console.log(`🚫 ${prefix} ${job.company} — GATEKEEPER BLOCKED: ${audit.reason} (Rule 60 Kill)`);
        await page.close();
        continue;
      }
      console.log(`${prefix} ${job.company} — Gatekeeper Audit Passed ✅`);

      // Check for application form fields
      const hasForm = await page.evaluate(() => {
        return !!document.querySelector('form, input[type="email"], input[name*="email"], input[id*="email"]');
      });

      if (!hasForm) {
        console.log(`${prefix} ${job.company} — External / No Direct Form. Tab closed.`);
        await page.close();
        continue;
      }

      // Fill Form with Rule 70 Pre-Clear
      console.log(`${prefix} ${job.company} — Populating fields with Rule 70 pre-clear...`);
      await page.evaluate((prof) => {
        function setCleanVal(el, val) {
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
          if (l.includes('first name') || l.includes('firstname')) setCleanVal(i, prof.first_name);
          else if (l.includes('last name') || l.includes('lastname')) setCleanVal(i, prof.last_name);
          else if (l.includes('name') && !l.includes('user') && !l.includes('company')) setCleanVal(i, prof.name);
          else if (l.includes('email')) setCleanVal(i, prof.email);
          else if (l.includes('phone') || l.includes('mobile')) setCleanVal(i, prof.phone_raw);
          else if (l.includes('linkedin')) setCleanVal(i, prof.linkedin);
          else if (l.includes('github')) setCleanVal(i, prof.github);
          else if (l.includes('portfolio') || l.includes('website')) setCleanVal(i, prof.portfolio);
          else if (l.includes('location') || l.includes('city')) setCleanVal(i, 'Indore, India');
        });
      }, profile);

      // Upload Resume
      const resumeFile = getBestResume(job.role);
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.uploadFile(resumeFile);
        console.log(`${prefix} ${job.company} — Attached resume: ${path.basename(resumeFile)}`);
      }

      await sleep(1500);

      // Submit
      const submitBtn = await page.$('button[type="submit"], input[type="submit"], button.submit, button#submit');
      if (submitBtn) {
        await submitBtn.click();
        console.log(`${prefix} ${job.company} — Submit clicked, checking confirmation...`);
      }

      // Assert confirmation (Rule 69)
      let isConfirmed = false;
      for (let w = 0; w < 5; w++) {
        await sleep(2500);
        isConfirmed = await page.evaluate(() => {
          const t = document.body.innerText.toLowerCase();
          return t.includes('thank you') || 
                 t.includes('application submitted') || 
                 t.includes('received your application') ||
                 t.includes('successfully submitted');
        });
        if (isConfirmed) break;
      }

      if (isConfirmed) {
        const vault = getScreenshotsVault();
        const ssName = `post_submit_${job.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${Date.now()}.png`;
        const ssPath = path.join(vault, ssName);
        await page.screenshot({ path: ssPath, fullPage: true });
        console.log(`🎯 [CONFIRMED APPLIED] ${job.company} — Proof saved: ${ssPath}`);

        recordConfirmedApplication({
          company: job.company,
          role: job.role,
          url: job.url,
          channel: 'Direct Career Page Form',
          proof_screenshot: ssPath,
          status: 'APPLIED_CONFIRMED',
          notes: `Confirmed application submitted on ${new Date().toISOString()}`
        });

        // Record in shift1
        const s1File = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-15_shift1.json';
        if (fs.existsSync(s1File)) {
          const s1 = JSON.parse(fs.readFileSync(s1File, 'utf8'));
          s1.jobs.push({
            company: job.company,
            role: job.role,
            url: job.url,
            channel: 'Direct Career Page Form',
            proof_screenshot: ssPath,
            status: 'APPLIED_CONFIRMED',
            timestamp: new Date().toISOString()
          });
          s1.total = s1.jobs.length;
          fs.writeFileSync(s1File, JSON.stringify(s1, null, 2));
        }

        submittedCount++;
        await page.close();
      } else {
        console.log(`❌ ${prefix} ${job.company} — Confirmation NOT detected. Tab closed (Rule 69 Zero Phantom Log).`);
        await page.close();
      }

    } catch (err) {
      console.log(`${prefix} ${job.company} — ERROR: ${err.message}`);
      try { await page.close(); } catch(e) {}
    }
  }

  browser.disconnect();
  console.log(`\n=================================================================`);
  console.log(`🏁 CAREER PAGES RUN FINISHED! Confirmed Applications: ${submittedCount}`);
  console.log(`=================================================================`);
}

runCareerPages().catch(console.error);
