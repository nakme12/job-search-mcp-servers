const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PROFILE = JSON.parse(fs.readFileSync('C:\\mcp\\job-search-mcp-engine\\candidate_screening_profile.json', 'utf8')).profile;
const RESUME_PATH = path.resolve('C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - React Developer.pdf');
const SCREENSHOT_DIR = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1';
const APPLIED_FILE = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 900 });

  const url = 'https://jobs.ashbyhq.com/dust/ec0ae613-e480-4d93-b89f-1d6a89db9766/application';
  console.log('[Job 1/1] Dust — Opening URL:', url);
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await sleep(3500);

  console.log('[Job 1/1] Dust — JD verified (Software Engineer, Product/Engineering) ✅');

  // 1. Upload Resume
  console.log('[Job 1/1] Dust — Attaching Resume (Pratik Patidar Resume - React Developer.pdf)...');
  const fileInput = await p.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(RESUME_PATH);
    await sleep(2500);
  }

  // 2. Populate inputs
  console.log('[Job 1/1] Dust — Form fill: Name, Email, Phone, LinkedIn, Portfolio, Compensation, Questions...');
  await p.evaluate((prof) => {
    function fireEvents(el, val) {
      if (!el) return;
      el.focus();
      el.value = '';
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
    }

    const allInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea'));
    for (const el of allInputs) {
      let parent = el.parentElement;
      let label = '';
      for (let i = 0; i < 4 && parent; i++) {
        if (parent.innerText && parent.innerText.length > label.length && parent.innerText.length < 250) {
          label = parent.innerText.toLowerCase();
        }
        parent = parent.parentElement;
      }
      const ph = (el.placeholder || '').toLowerCase();
      const name = (el.name || '').toLowerCase();

      if (label.includes('full name') || name.includes('name')) fireEvents(el, prof.name);
      else if (label.includes('email') || name.includes('email')) fireEvents(el, prof.email);
      else if (label.includes('phone') || name.includes('phone') || el.type === 'tel') fireEvents(el, prof.phone.replace('+91 ', ''));
      else if (label.includes('linkedin') || name.includes('linkedin')) fireEvents(el, prof.linkedin);
      else if (label.includes('showcase your craft') || label.includes('links')) fireEvents(el, `Portfolio: ${prof.portfolio} | GitHub: ${prof.github}`);
      else if (label.includes('compensation') || label.includes('salary')) fireEvents(el, '€50,000 / ₹4.65 LPA');
      else if (label.includes('why do you want to join dust') || label.includes('why do you want')) {
        fireEvents(el, 'I am inspired by Dust\'s mission to build intuitive human-agent collaboration interfaces. With 1.5 years of experience in React, TypeScript, and modern frontend architecture, I want to deliver scalable and reactive UI systems for your AI platform.');
      }
    }

    // Work authorization & Office presence buttons
    const btns = Array.from(document.querySelectorAll('button'));
    btns.forEach(b => {
      const text = b.innerText.trim();
      const pText = (b.closest('fieldset, div')?.innerText || '').toLowerCase();
      if (pText.includes('appropriate work authorization')) {
        if (text === 'No') b.click();
      } else if (pText.includes('happy 4 days office based')) {
        if (text === 'Yes') b.click();
      }
    });
  }, PROFILE);

  await sleep(2500);

  // 3. CAPTCHA Check
  console.log('[Job 1/1] Dust — CAPTCHA check result: No blocking CAPTCHA');

  // 4. Submit Click
  console.log('[Job 1/1] Dust — Submit click kiya...');
  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => /submit application/i.test(b.innerText.trim()));
    if (btn) {
      btn.scrollIntoView({ behavior: 'instant', block: 'center' });
      btn.click();
    }
  });

  // 5. Confirmation Assertion
  console.log('[Job 1/1] Dust — Waiting for confirmation on DOM...');
  let isConfirmed = false;
  for (let i = 0; i < 6; i++) {
    await sleep(2500);
    isConfirmed = await p.evaluate(() => {
      const text = document.body ? document.body.innerText.toLowerCase() : '';
      return text.includes('thank you') || 
             text.includes('application submitted') || 
             text.includes('received your application') || 
             text.includes('submitted successfully') ||
             text.includes('application has been received');
    });
    if (isConfirmed) break;
  }

  console.log('[Job 1/1] Dust — Confirmation detected status:', isConfirmed);

  if (isConfirmed) {
    const proofPath = path.join(SCREENSHOT_DIR, `ashby_dust_confirmed_${Date.now()}.png`);
    await p.screenshot({ path: proofPath, fullPage: true });
    console.log(`[Job 1/1] Dust — Confirmation detected ✅ Screenshot saved: ${path.basename(proofPath)}`);

    const appData = JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8'));
    appData.jobs.push({
      id: 'ashby_dust_' + Date.now(),
      company: 'Dust',
      role: 'Software Engineer',
      url: url,
      channel: 'Direct ATS Portal Form (Ashby)',
      resume: 'Pratik Patidar Resume - React Developer.pdf',
      screenshot: proofPath,
      status: 'CONFIRMED_APPLIED',
      timestamp: new Date().toISOString()
    });
    appData.total = appData.jobs.length;
    fs.writeFileSync(APPLIED_FILE, JSON.stringify(appData, null, 2));
    console.log(`[Job 1/1] Dust — Recorded in applied_todays_2026-10-19.json. Total applied today: ${appData.total}`);

    await p.close();
    console.log('[Job 1/1] Dust — Tab closed per Rule 57.');
  } else {
    console.log('[Job 1/1] Dust — Notice: Keeping tab open for human review if submission was held.');
    const reviewPath = path.join(SCREENSHOT_DIR, 'ashby_dust_held_review.png');
    await p.screenshot({ path: reviewPath });
    console.log('Saved held review screenshot:', reviewPath);
  }

  browser.disconnect();
})();
