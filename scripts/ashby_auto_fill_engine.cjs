/**
 * DEDICATED ASHBY ATS SUBMISSION ENGINE
 * Runs strictly on Ashby application forms (https://jobs.ashbyhq.com/...)
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
    return path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - React Developer.pdf');
  }
  return path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - Frontend Engineer.pdf');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function applyAshbyJob(page, job) {
  const profile = getProfile();
  console.log(`\n======================================================`);
  console.log(`[Ashby Engine] Processing: ${job.company} - ${job.role}`);
  console.log(`[Ashby Engine] URL: ${job.url}`);
  console.log(`======================================================`);

  // 1. Ensure /application URL
  let targetUrl = job.url;
  if (!targetUrl.includes('/application')) {
    targetUrl = targetUrl.replace(/\/$/, '') + '/application';
  }
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2500);

  // 2. Native fast value setting for Name, Email, Phone
  await page.evaluate((prof) => {
    function setVal(selector, val) {
      const el = document.querySelector(selector);
      if (!el) return;
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setVal('input[name="_systemfield_name"]', prof.name);
    setVal('input[name="_systemfield_email"]', prof.email);
    setVal('input#phone, input[name="phone"]', prof.phone.replace('+91 ', ''));
  }, profile);

  // 3. Exact Resume Upload
  const resumePath = getBestResume(job.role);
  console.log('[Ashby Engine] Attaching Resume:', resumePath);
  const resumeInput = await page.$('input#_systemfield_resume') || (await page.$$('input[type="file"]'))[1];
  if (resumeInput) {
    await resumeInput.uploadFile(resumePath);
    await sleep(2500);
  }

  // 4. Fill Dynamic Inputs, Textareas, Radios, Checkboxes
  await page.evaluate((prof) => {
    function setNativeValue(element, value) {
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

    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="url"], textarea'));
    inputs.forEach(i => {
      let p = i.parentElement;
      let label = '';
      while (p && p !== document.body) {
        if (p.querySelector('label') || p.innerText.length > 3) {
          label = p.innerText.toLowerCase();
          break;
        }
        p = p.parentElement;
      }

      if (label.includes('linkedin')) setNativeValue(i, prof.linkedin);
      else if (label.includes('github')) setNativeValue(i, prof.github);
      else if (label.includes('portfolio') || label.includes('website')) setNativeValue(i, prof.portfolio);
      else if (label.includes('location') || label.includes('residing')) setNativeValue(i, 'India');
      else if (label.includes('relocate') || label.includes('relocation')) setNativeValue(i, 'Yes, ready to relocate immediately');
      else if (label.includes('notice') || label.includes('when can you join')) setNativeValue(i, '15 Days / Immediate');
      else if (label.includes('current ctc')) setNativeValue(i, '2.16 LPA');
      else if (label.includes('expected ctc')) setNativeValue(i, '4.65 LPA');
      else if (label.includes('experience')) setNativeValue(i, '1.5');
      else if (label.includes('excited about') || label.includes('mission')) {
        setNativeValue(i, 'I am excited by the cutting-edge product and scalable architectures your team is building. With 1.5 years of experience in React, Next.js, and TypeScript, I want to contribute high-impact frontend engineering.');
      }
      else if (label.includes('hard problem') || label.includes('achievement')) {
        setNativeValue(i, 'Engineered a real-time reactive dashboard using React, WebSocket, and memoization that reduced client-side rendering bottlenecks by 40% and maintained sub-100ms UI responsiveness.');
      }
    });

    // Handle Radios
    const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
    radios.forEach(r => {
      const parentLabel = (r.closest('label')?.innerText || r.parentElement?.innerText || '').toLowerCase();
      if (parentLabel.includes('linkedin') || parentLabel.includes('user') || parentLabel.includes('social')) {
        if (!r.checked) r.click();
      }
    });

    // Handle Yes/No Option Buttons
    const buttons = Array.from(document.querySelectorAll('button'));
    buttons.forEach(b => {
      const p = b.closest('div, fieldset');
      const pText = (p?.innerText || '').toLowerCase();
      const bText = b.innerText.trim();

      if (pText.includes('require sponsorship') || pText.includes('sponsorship')) {
        // Will you require sponsorship -> Yes (Candidate in India needs visa/sponsorship for US)
        if (bText === 'Yes') b.click();
      } else if (pText.includes('authorized to work in') && (pText.includes('sponsorship') || pText.includes('u.s.'))) {
        if (bText === 'No') b.click();
      } else if (pText.includes('relocate') || pText.includes('relocation')) {
        if (bText === 'Yes') b.click();
      } else if (pText.includes('18 years') || pText.includes('age')) {
        if (bText === 'Yes') b.click();
      }
    });

    // Handle Checkboxes
    const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    cbs.forEach(cb => {
      const text = ((cb.closest('label')?.innerText || '') + ' ' + (cb.name || '')).toLowerCase();
      if (text.includes('other') || text.includes('he/his') || text.includes('agree') || text.includes('consent')) {
        if (!cb.checked) cb.click();
      }
    });
  }, profile);

  await sleep(1500);

  // 5. Submit Application
  console.log('[Ashby Engine] Clicking Submit Application...');
  const submitBtn = await page.$('.ashby-application-form-submit-button, button[type="submit"]');
  if (submitBtn) {
    await submitBtn.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await sleep(500);
    await submitBtn.click();
  }

  // 6. Post-Submit Confirmation Check (Rule 69 Hard Lock)
  console.log('[Ashby Engine] Waiting for post-submit confirmation on DOM...');
  let isConfirmed = false;
  for (let w = 0; w < 6; w++) {
    await sleep(2500);
    isConfirmed = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('thank you') || 
             text.includes('application submitted') || 
             text.includes('received your application') || 
             text.includes('submitted successfully') ||
             text.includes('application has been received');
    });
    if (isConfirmed) break;
  }

  if (isConfirmed) {
    const vault = getScreenshotsVault();
    const cleanCo = job.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const ssPath = path.join(vault, `post_submit_${cleanCo}_${Date.now()}.png`);
    await page.screenshot({ path: ssPath, fullPage: true });

    console.log(`✅ [Ashby Engine] SUBMISSION CONFIRMED! Screenshot saved to: ${ssPath}`);

    recordConfirmedApplication({
      company: job.company,
      role: job.role,
      url: job.url,
      channel: 'Direct ATS Portal Form (Ashby)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      notes: `Submitted and confirmed via dedicated Ashby engine on ${new Date().toISOString()}`
    });

    // Also update Shift 1 file
    try {
      const s1File = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-15_shift1.json';
      if (fs.existsSync(s1File)) {
        const s1Data = JSON.parse(fs.readFileSync(s1File, 'utf8'));
        if (!s1Data.jobs.some(j => j.url === job.url)) {
          s1Data.jobs.push({
            company: job.company,
            role: job.role,
            url: job.url,
            channel: 'Direct ATS Portal Form (Ashby)',
            proof_screenshot: ssPath,
            status: 'APPLIED_CONFIRMED',
            notes: `Submitted and confirmed via dedicated Ashby engine on ${new Date().toISOString()}`,
            timestamp: new Date().toISOString()
          });
          s1Data.total = s1Data.jobs.length;
          fs.writeFileSync(s1File, JSON.stringify(s1Data, null, 2));
        }
      }
    } catch(e) {}

    return true;
  } else {
    console.log(`❌ [Ashby Engine] CONFIRMATION NOT DETECTED for ${job.company}. Zero phantom logging enforced.`);
    return false;
  }
}

module.exports = { applyAshbyJob };
