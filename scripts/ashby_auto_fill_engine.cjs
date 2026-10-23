/**
 * DEDICATED ASHBY ATS SUBMISSION ENGINE (REA HARDENED & ENHANCED)
 * Runs strictly on Ashby application forms (https://jobs.ashbyhq.com/...)
 * Auto-detects custom dropdowns, passport country, residency, and programmatic uploads
 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { CANONICAL_PATHS, getScreenshotsVault } = require('./canonical_paths.cjs');

function getProfile() {
  return JSON.parse(fs.readFileSync(CANONICAL_PATHS.PROFILE_FILE, 'utf8')).profile;
}

function getBestResume(roleTitle) {
  const t = (roleTitle || '').toLowerCase();
  if (t.includes('full stack') || t.includes('mern') || t.includes('node') || t.includes('backend')) {
    return path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - MERN Full Stack.pdf');
  }
  if (t.includes('react') || t.includes('ui') || t.includes('front end') || t.includes('frontend')) {
    return path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - MERN Full Stack.pdf');
  }
  return path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - MERN Full Stack.pdf');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function applyAshbyJob(page, job) {
  const profile = getProfile();
  console.log(`\n======================================================`);
  console.log(`🚀 [Ashby Engine - REA Enhanced] Processing: ${job.company} - ${job.role}`);
  console.log(`URL: ${job.url}`);
  console.log(`======================================================`);

  // 1. Ensure /application URL
  let targetUrl = job.url;
  if (!targetUrl.includes('/application')) {
    targetUrl = targetUrl.replace(/\/$/, '') + '/application';
  }
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await sleep(3000);

  // 2. Programmatic Resume Upload via CDP FileChooser or File Input
  const resumePath = getBestResume(job.role);
  console.log(`[Ashby Engine] Attaching Resume via CDP: ${path.basename(resumePath)}`);
  
  const fileInputs = await page.$$('input[type="file"]');
  if (fileInputs.length > 0) {
    const targetFileInput = fileInputs[fileInputs.length - 1];
    await targetFileInput.uploadFile(resumePath);
    await sleep(2000);
  }

  // 3. React Hydrated State Native Setter (Name, Email, Phone, Socials & Questions)
  await page.evaluate((prof) => {
    function setNativeValue(element, value) {
      if (!element) return;
      const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
      const prototype = Object.getPrototypeOf(element);
      const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
      } else if (valueSetter) {
        valueSetter.call(element, value);
      } else {
        element.value = value;
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Direct system fields
    setNativeValue(document.querySelector('input[name="_systemfield_name"], #name'), prof.name);
    setNativeValue(document.querySelector('input[name="_systemfield_email"], #email'), prof.email);
    setNativeValue(document.querySelector('input[type="tel"], input#phone, input[name="phone"]'), prof.phone.replace('+91 ', ''));

    // Dynamic Questions & Labels
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    allInputs.forEach(i => {
      let p = i.parentElement;
      let label = '';
      while (p && p !== document.body) {
        if (p.querySelector('label') || p.innerText.length > 3) {
          label = p.innerText.toLowerCase();
          break;
        }
        p = p.parentElement;
      }

      if (label.includes('passport') || label.includes('residence') || label.includes('country') || label.includes('location')) {
        setNativeValue(i, 'India');
      } else if (label.includes('linkedin')) {
        setNativeValue(i, prof.linkedin);
      } else if (label.includes('github')) {
        setNativeValue(i, prof.github);
      } else if (label.includes('portfolio') || label.includes('website') || label.includes('twitter')) {
        setNativeValue(i, prof.portfolio);
      } else if (label.includes('hear about') || label.includes('vacancy')) {
        setNativeValue(i, 'LinkedIn / Job Board');
      } else if (label.includes('open source') || label.includes('contributions')) {
        setNativeValue(i, 'Yes, built open-source developer tooling and React web applications (https://github.com/nakme12).');
      } else if (label.includes('notice') || label.includes('when can you start')) {
        setNativeValue(i, '15 Days');
      } else if (label.includes('current ctc')) {
        setNativeValue(i, '2.16 LPA');
      } else if (label.includes('expected ctc')) {
        setNativeValue(i, '4.65 LPA');
      }
    });

    // Handle Yes/No Option Buttons & Age Check
    const buttons = Array.from(document.querySelectorAll('button'));
    buttons.forEach(b => {
      const p = b.closest('div, fieldset');
      const pText = (p?.innerText || '').toLowerCase();
      const bText = b.innerText.trim();

      if (pText.includes('18 years') || pText.includes('age') || pText.includes('over the age of 18')) {
        if (bText === 'Yes') b.click();
      } else if (pText.includes('sponsorship')) {
        if (bText === 'Yes') b.click();
      } else if (pText.includes('relocate')) {
        if (bText === 'Yes') b.click();
      }
    });

    // Checkboxes (Consent / Terms)
    const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    cbs.forEach(cb => {
      if (!cb.checked) cb.click();
    });
  }, profile);

  await sleep(2000);

  // 4. Trigger Submit Application Button
  console.log('[Ashby Engine] Clicking Submit Application Button...');
  const submitClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => {
      const t = b.innerText.toLowerCase();
      return t.includes('submit application') || t.includes('submit') || t.includes('apply');
    });
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.click();
      return true;
    }
    return false;
  });

  console.log('[Ashby Engine] Submit Clicked Status:', submitClicked);
  console.log('[Ashby Engine] Waiting for post-submit confirmation on DOM...');

  // 5. Post-Submit Confirmation Assertion (Rule 69 Zero Phantom Logging)
  let isConfirmed = false;
  for (let poll = 0; poll < 12; poll++) {
    await sleep(2000);
    const result = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const match = /thank you|application submitted|application received|submitted successfully|your application has been sent/i.test(text);
      return { match, snippet: text.substring(0, 300).replace(/\s+/g, ' ') };
    });

    if (result.match) {
      isConfirmed = true;
      break;
    }
  }

  if (isConfirmed) {
    console.log(`🎉 [Ashby Engine] CONFIRMED SUBMISSION DETECTED for ${job.company}!`);
    const dateStr = new Date().toISOString().split('T')[0];
    const vaultDir = path.join(CANONICAL_PATHS.SCREENSHOTS_DIR, dateStr, 'shift2');
    fs.mkdirSync(vaultDir, { recursive: true });

    const ssPath = path.join(vaultDir, `ashby_${job.company.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`);
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log(`📸 [Ashby Engine] Physical proof saved: ${ssPath}`);

    // Update File 5 (Canonical & Shift 2)
    const file5Path = CANONICAL_PATHS.getFile5Applied();
    let file5 = { date: dateStr, shift: 2, total: 0, jobs: [] };
    if (fs.existsSync(file5Path)) {
      try { file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8')); } catch(e){}
    }

    const entry = {
      company: job.company,
      role: job.role,
      url: job.url,
      channel: 'Direct ATS Portal Form (Ashby)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    };

    file5.jobs.push(entry);
    file5.total = file5.jobs.length;
    fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2));
    console.log(`✅ [FILE 5 LOCKED] Submission permanently registered! Total applied today: ${file5.total}`);
    return true;
  } else {
    console.log(`❌ [Ashby Engine] Confirmation DOM not detected for ${job.company}. Zero phantom logging preserved.`);
    return false;
  }
}

module.exports = { applyAshbyJob };
