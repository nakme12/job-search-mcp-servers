const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
  const screenshotDir = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-21/shift2';
  fs.mkdirSync(screenshotDir, { recursive: true });

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('smartrecruiters.com'));

  if (!page) {
    console.error('SmartRecruiters tab not found!');
    await browser.disconnect();
    return;
  }

  await page.bringToFront();
  console.log('Targeting open tab:', page.url());

  // Step 1: Upload Resume
  console.log('Uploading Resume file...');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    console.log('Resume uploaded! Waiting 8s for SmartRecruiters form fields to expand...');
    await sleep(8000);
  }

  // Step 2: Fill all visible inputs
  console.log('Filling form inputs...');
  await page.evaluate(() => {
    function set(sel, val) {
      const el = document.querySelector(sel);
      if (el) {
        el.value = '';
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    set('input[name*="firstName"], input[id*="first-name"], input[placeholder*="First"]', 'Pratik');
    set('input[name*="lastName"], input[id*="last-name"], input[placeholder*="Last"]', 'Patidar');
    set('input[name*="email"], input[id*="email"], input[placeholder*="email"]', 'pratikpatidar7990@gmail.com');
    set('input[name*="phone"], input[id*="phone"], input[placeholder*="Phone"]', '8269647990');
    set('input[name*="city"], input[id*="city"], input[placeholder*="City"]', 'Indore');
  });
  await sleep(2000);

  // Step 3: Check for validation errors before submit
  console.log('Checking validation errors before submit...');
  const preErrors = await page.evaluate(() => {
    const errs = Array.from(document.querySelectorAll('.error, [aria-invalid="true"], .invalid-feedback, .error-message'));
    return errs.map(e => e.innerText.trim()).filter(Boolean);
  });
  console.log('Pre-submit errors found:', JSON.stringify(preErrors));

  // Step 4: Click Submit / Next / Continue button
  console.log('Looking for and clicking Submit/Next button...');
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
    const sub = btns.find(b => {
      const t = (b.innerText || b.value || '').toLowerCase();
      return t.includes('submit') || t.includes('next') || t.includes('continue') || t.includes('apply');
    });
    if (sub) {
      sub.scrollIntoView();
      sub.click();
      return sub.innerText || sub.value || 'clicked';
    }
    return null;
  });
  console.log('Submit button clicked:', clicked);
  await sleep(6000);

  // Step 5: Post-submit check: Errors vs Confirmation
  const postStatus = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    const isConfirmed = text.includes('thank you') || text.includes('application submitted') || text.includes('received') || text.includes('application sent');
    const errElements = Array.from(document.querySelectorAll('.error, [aria-invalid="true"], .invalid-feedback, .error-message, [role="alert"]'));
    const errors = errElements.map(e => e.innerText.trim()).filter(Boolean);
    return { isConfirmed, errors, currentUrl: window.location.href };
  });

  console.log('Post-Submit Live Status:', JSON.stringify(postStatus, null, 2));

  // Screenshot capture
  const screenshotPath = path.join(screenshotDir, 'Endeavor_IT_Solution_Confirmed.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to:', screenshotPath);

  if (postStatus.isConfirmed) {
    const f5Path = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-21.json';
    const f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8'));
    f5.jobs.push({
      id: 'endeavor_it_' + Date.now(),
      company: 'Endeavor IT Solution',
      role: 'Front end Developer (Fresher)',
      location: 'Indore',
      url: 'https://jobs.smartrecruiters.com/EndeavorITSolution/99740233-openings-for-front-end-developer-fresher-',
      channel: 'Direct ATS / SmartRecruiters',
      status: 'CONFIRMED_SUBMITTED',
      applied_at: new Date().toISOString(),
      confirmation_screenshot: screenshotPath,
      resume_used: 'Pratik Patidar Resume - MERN Full Stack.pdf'
    });
    f5.total = f5.jobs.length;
    f5.updated_at = new Date().toISOString();
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('✅ CONFIRMED: Endeavor IT Solution successfully recorded in File 5!');
  } else if (postStatus.errors.length > 0) {
    console.log('⚠️ Form has validation errors to resolve:', postStatus.errors);
  }

  await browser.disconnect();
})();
