/**
 * UNIVERSAL ASHBY HQ APPLICATION AUTOMATION ENGINE
 * Handles:
 * 1. Personal Details (Name, Email, Phone, Location)
 * 2. Authorized Resume PDF Upload
 * 3. Links (LinkedIn, GitHub, Portfolio)
 * 4. Experience & Education Mapping from candidate_screening_profile.json
 * 5. Dynamic Custom Questions (Current CTC, Expected CTC, Notice Period, Relocation)
 * 6. React/Next/Select/Combobox Custom Inputs
 * 7. Clean Alerting for Captcha & Post-Submit Confirmation Screenshot
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PROFILE_PATH = 'C:/mcp/job-search-mcp-engine/candidate_screening_profile.json';
const RESUME_PATH = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf';

async function autoFillAshby(targetUrl = null) {
  const profileData = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'));
  const profile = profileData.profile;

  console.log(`[Ashby Engine] Starting auto-fill with Profile: ${profile.name} (${profile.email})`);

  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  let page = null;

  if (targetUrl) {
    page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });
  } else {
    page = pages.find(p => p.url().includes('ashbyhq.com'));
  }

  if (!page) {
    console.error('[Ashby Engine] No active Ashby HQ page found!');
    process.exit(1);
  }

  console.log('[Ashby Engine] Target page found:', page.url());

  // Wait for Ashby container
  await page.waitForSelector('form, [data-qa="application-form"], input', { timeout: 15000 });

  // 1. Fill Text Inputs by label / placeholder / name
  await page.evaluate((prof) => {
    function setReactValue(input, val) {
      if (!input || !val) return;
      input.focus();
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set ||
                           Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(input, val);
      } else {
        input.value = val;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    const allInputs = Array.from(document.querySelectorAll('input, textarea'));

    allInputs.forEach(input => {
      if (input.type === 'file' || input.type === 'hidden') return;

      const id = (input.id || '').toLowerCase();
      const name = (input.name || '').toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();
      const parentText = (input.closest('label, div[class*="field"], div[class*="container"]') ? input.closest('label, div[class*="field"], div[class*="container"]').innerText : '').toLowerCase();

      // Name fields
      if (name.includes('first') || id.includes('first') || placeholder.includes('first')) {
        setReactValue(input, 'Pratik');
      } else if (name.includes('last') || id.includes('last') || placeholder.includes('last')) {
        setReactValue(input, 'Patidar');
      } else if (name.includes('name') || id.includes('name') || placeholder.includes('full name') || parentText.includes('full name')) {
        setReactValue(input, prof.name);
      }
      // Email
      else if (input.type === 'email' || name.includes('email') || id.includes('email') || placeholder.includes('email') || parentText.includes('email')) {
        setReactValue(input, prof.email);
      }
      // Phone
      else if (input.type === 'tel' || name.includes('phone') || id.includes('phone') || placeholder.includes('phone') || parentText.includes('phone')) {
        setReactValue(input, prof.phone.replace('+91 ', ''));
      }
      // Location / City
      else if (name.includes('location') || id.includes('location') || placeholder.includes('location') || parentText.includes('location') || parentText.includes('city')) {
        setReactValue(input, 'Indore, Madhya Pradesh, India');
      }
      // LinkedIn
      else if (parentText.includes('linkedin') || name.includes('linkedin') || placeholder.includes('linkedin')) {
        setReactValue(input, prof.linkedin);
      }
      // GitHub
      else if (parentText.includes('github') || name.includes('github') || placeholder.includes('github')) {
        setReactValue(input, prof.github);
      }
      // Portfolio / Website
      else if (parentText.includes('portfolio') || parentText.includes('website') || name.includes('website') || placeholder.includes('portfolio')) {
        setReactValue(input, prof.portfolio);
      }
      // Current CTC / Compensation
      else if (parentText.includes('current ctc') || parentText.includes('current compensation') || parentText.includes('current salary')) {
        setReactValue(input, `${prof.current_ctc_lpa} LPA`);
      }
      // Expected CTC / Compensation
      else if (parentText.includes('expected ctc') || parentText.includes('expected compensation') || parentText.includes('expected salary')) {
        setReactValue(input, `${prof.expected_ctc_lpa} LPA`);
      }
      // Notice Period
      else if (parentText.includes('notice') || name.includes('notice')) {
        setReactValue(input, `${prof.notice_period_days} Days`);
      }
      // Total Experience
      else if (parentText.includes('years of experience') || parentText.includes('total experience')) {
        setReactValue(input, prof.total_experience_years);
      }
    });
  }, profile);

  // 2. Upload Resume PDF
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    console.log('[Ashby Engine] Uploading authorized resume:', RESUME_PATH);
    await fileInput.uploadFile(RESUME_PATH);
    await new Promise(r => setTimeout(r, 2000));
  }

  // 3. Auto-handle Select / Dropdowns / Radios (Relocation, Yes/No, Gender)
  await page.evaluate(() => {
    // Relocation Yes
    const radioLabels = Array.from(document.querySelectorAll('label, div[role="radio"], button'));
    radioLabels.forEach(el => {
      const text = el.innerText.trim().toLowerCase();
      if (text === 'yes' || text.startsWith('yes')) {
        const parent = el.closest('div[class*="field"], fieldset');
        if (parent && (parent.innerText.toLowerCase().includes('relocate') || parent.innerText.toLowerCase().includes('authorized') || parent.innerText.toLowerCase().includes('full-time'))) {
          el.click();
        }
      }
    });
  });

  console.log('[Ashby Engine] Form prefill sequence complete.');

  // Check for Captcha
  const hasCaptcha = await page.evaluate(() => {
    return !!(document.querySelector('iframe[src*="turnstile"]') || 
              document.querySelector('iframe[src*="recaptcha"]') || 
              document.querySelector('.g-recaptcha') ||
              document.querySelector('.cf-turnstile'));
  });

  if (hasCaptcha) {
    console.log('[Ashby Engine] 🚨 CAPTCHA detected on Ashby page! Alerting user...');
  } else {
    console.log('[Ashby Engine] No CAPTCHA detected. Ready for physical confirmation.');
  }

  process.exit(0);
}

const target = process.argv[2] || null;
autoFillAshby(target).catch(err => {
  console.error('[Ashby Engine Error]:', err);
  process.exit(1);
});
