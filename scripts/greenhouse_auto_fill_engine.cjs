/**
 * DEDICATED GREENHOUSE ATS SUBMISSION ENGINE
 * Runs strictly on Greenhouse application forms (https://boards.greenhouse.io/... or https://job-boards.greenhouse.io/...)
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

async function applyGreenhouseJob(page, job) {
  const profile = getProfile();
  console.log(`\n======================================================`);
  console.log(`[Greenhouse Engine] Processing: ${job.company} - ${job.role}`);
  console.log(`[Greenhouse Engine] URL: ${job.url}`);
  console.log(`======================================================`);

  await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 35000 });
  await sleep(2500);

  // 1. Native click and typing for basic standard fields
  const fieldMappings = [
    { sel: '#first_name, input[name*="first_name"]', val: profile.first_name },
    { sel: '#last_name, input[name*="last_name"]', val: profile.last_name },
    { sel: '#email, input[name*="email"]', val: profile.email },
    { sel: '#phone, input[name*="phone"]', val: (profile.phone_raw || profile.phone.replace(/[^0-9]/g, '')).slice(-10) }
  ];

  for (const f of fieldMappings) {
    const el = await page.$(f.sel);
    if (el) {
      await el.click({ clickCount: 3 });
      await el.type(f.val, { delay: 15 });
    }
  }

  // 2. Fix Country Code Dropdown to India (+91)
  try {
    const itiFlag = await page.$('.iti__selected-flag, .iti__flag-container button, div[class*="flag-container"]');
    if (itiFlag) {
      await itiFlag.click();
      await sleep(400);
      const searchInput = await page.$('#iti-0__search-input, .iti__search-input, input[placeholder*="Search"]');
      if (searchInput) {
        await searchInput.type('India', { delay: 10 });
        await sleep(200);
      }
      const indiaOption = await page.$('#iti-0__item-in, [data-country-code="in"], .iti__country[data-country-code="in"]');
      if (indiaOption) await indiaOption.click();
    }
  } catch(e) {}

  // 3. Attach Authorized Resume
  const resumePath = getBestResume(job.role);
  console.log('[Greenhouse Engine] Attaching resume:', resumePath);
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    await sleep(2500);
  }

  // 4. Fill text inputs and textareas
  await page.evaluate((prof) => {
    function setReactVal(el, val) {
      if (!el || !val) return;
      el.focus();
      const valueSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;
      const prototype = Object.getPrototypeOf(el);
      const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(el, val);
      } else if (valueSetter) {
        valueSetter.call(el, val);
      } else {
        el.value = val;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    const allInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="url"], textarea'));
    allInputs.forEach(i => {
      const fieldContainer = i.closest('.field, div[class*="field"], div[class*="question"]') || i.parentElement;
      const label = ((fieldContainer?.querySelector('label')?.innerText || '') + ' ' + (i.placeholder || '') + ' ' + (i.name || '')).toLowerCase();

      if (label.includes('linkedin')) setReactVal(i, prof.linkedin);
      else if (label.includes('github')) setReactVal(i, prof.github);
      else if (label.includes('portfolio') || label.includes('website')) setReactVal(i, prof.portfolio);
      else if (label.includes('why do you want to join') || label.includes('why are you interested')) {
        setReactVal(i, `I have 1.5 years of experience building modern web applications with React, Next.js, and TypeScript. I admire the company's product excellence and engineering culture, and I am excited to contribute high-quality frontend solutions to the team.`);
      }
      else if (label.includes('from where do you intend to work') || label.includes('intended location') || label.includes('where will you work')) {
        setReactVal(i, 'Indore, India (Open to Remote / Relocate)');
      }
      else if (label.includes('current location') || label.includes('where are you based')) {
        setReactVal(i, 'Indore, Madhya Pradesh, India');
      }
      else if (label.includes('notice period') || label.includes('earliest start date')) {
        setReactVal(i, '15 Days / Immediate');
      }
      else if (label.includes('current ctc')) {
        setReactVal(i, '2.16 LPA');
      }
      else if (label.includes('expected ctc')) {
        setReactVal(i, '4.65 LPA');
      }
    });

    // 5. Handle Select Dropdowns
    const selects = Array.from(document.querySelectorAll('select'));
    selects.forEach(s => {
      const fieldContainer = s.closest('.field, div[class*="field"], div[class*="question"]') || s.parentElement;
      const label = ((fieldContainer?.querySelector('label')?.innerText || '') + ' ' + (s.name || '')).toLowerCase();
      const options = Array.from(s.options).map(o => ({ el: o, text: o.text.toLowerCase(), val: o.value }));

      function pick(matcher) {
        const found = options.find(o => matcher(o.text));
        if (found) {
          s.value = found.val;
          s.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      if (label.includes('authorized to work in the country') || label.includes('work authorization')) {
        pick(t => t.includes('no') || t.includes('require sponsorship') || t.includes('yes'));
      } else if (label.includes('ever worked for') || label.includes('previous employee')) {
        pick(t => t.includes('no'));
      } else if (label.includes('years of professional experience') || label.includes('years of experience')) {
        pick(t => t.includes('1-2') || t.includes('1 to 2') || t.includes('2') || t.includes('1'));
      } else if (label.includes('full-time software engineer in a professional setting')) {
        pick(t => t.includes('yes'));
      } else if (label.includes('built and maintained user-facing web applications')) {
        pick(t => t.includes('yes'));
      } else if (label.includes('primary technical expertise')) {
        pick(t => t.includes('frontend') || t.includes('front-end') || t.includes('full stack'));
      } else if (label.includes('programming languages do you regularly use')) {
        pick(t => t.includes('javascript') || t.includes('typescript') || t.includes('react'));
      } else if (label.includes('pronouns')) {
        pick(t => t.includes('he/him') || t.includes('he/his') || t.includes('prefer not to say'));
      } else if (label.includes('gender')) {
        pick(t => t.includes('male') || t.includes('man') || t.includes('prefer not to say'));
      } else if (label.includes('hispanic') || label.includes('latino')) {
        pick(t => t.includes('no'));
      } else if (label.includes('veteran')) {
        pick(t => t.includes('not a veteran') || t.includes('no') || t.includes('i am not'));
      } else if (label.includes('disability')) {
        pick(t => t.includes('no') || t.includes('i do not have') || t.includes('prefer not to say'));
      }
    });
  }, profile);

  await sleep(1500);

  // 6. Submit Button
  console.log('[Greenhouse Engine] Clicking Submit Application...');
  const submitBtn = await page.$('input#submit_app, button[type="submit"], input[type="submit"]');
  if (submitBtn) {
    await submitBtn.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await sleep(500);
    await submitBtn.click();
  }

  // 7. Post-Submit Confirmation Check
  console.log('[Greenhouse Engine] Waiting for post-submit confirmation on DOM...');
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

    console.log(`✅ [Greenhouse Engine] SUBMISSION CONFIRMED! Screenshot saved to: ${ssPath}`);

    recordConfirmedApplication({
      company: job.company,
      role: job.role,
      url: job.url,
      channel: 'Direct ATS Portal Form (Greenhouse)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      notes: `Submitted and confirmed via dedicated Greenhouse engine on ${new Date().toISOString()}`
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
            channel: 'Direct ATS Portal Form (Greenhouse)',
            proof_screenshot: ssPath,
            status: 'APPLIED_CONFIRMED',
            notes: `Submitted and confirmed via dedicated Greenhouse engine on ${new Date().toISOString()}`,
            timestamp: new Date().toISOString()
          });
          s1Data.total = s1Data.jobs.length;
          fs.writeFileSync(s1File, JSON.stringify(s1Data, null, 2));
        }
      }
    } catch(e) {}

    return true;
  } else {
    // Check for validation errors on DOM
    const errors = await page.evaluate(() => {
      const errNodes = Array.from(document.querySelectorAll('.error, [aria-invalid="true"], .field-error, .validation-error, [data-error]'));
      return errNodes.map(e => e.innerText.trim()).filter(Boolean);
    });

    console.log(`❌ [Greenhouse Engine] CONFIRMATION NOT DETECTED for ${job.company}.`);
    if (errors.length > 0) {
      console.log(`🚨 [VALIDATION ERRORS FOUND]:\n${errors.join('\n')}`);
    } else {
      console.log(`ℹ️ [No explicit validation class detected, waiting/checking required fields]`);
    }
    return false;
  }
}

module.exports = { applyGreenhouseJob };
