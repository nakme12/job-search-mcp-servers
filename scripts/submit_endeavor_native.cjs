const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const screenshotDir = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-21/shift2';

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.bringToFront();

  console.log('Navigating directly to Endeavor IT SmartRecruiters apply page...');
  await page.goto('https://jobs.smartrecruiters.com/EndeavorITSolution/99740233-openings-for-front-end-developer-fresher-', { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Click 'I\'m interested'
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('a, button')).find(b => b.innerText && b.innerText.includes('interested'));
    if (btn) btn.click();
  });
  await sleep(4000);

  console.log('Current URL:', page.url());

  // Upload Resume to the file input
  console.log('Injecting resume file into SmartRecruiters input[type="file"]...');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    console.log('Resume injected. Waiting 10s for SmartRecruiters to parse resume and render fields...');
    await sleep(10000);
  }

  // Pre-clear & Fill all fields (Rule 70)
  console.log('Filling form fields with candidate screening profile...');
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

  // Check errors before submit
  const preErrors = await page.evaluate(() => {
    const errs = Array.from(document.querySelectorAll('.error, [aria-invalid="true"], .invalid-feedback, .error-message'));
    return errs.map(e => e.innerText.trim()).filter(Boolean);
  });
  console.log('Pre-submit errors:', JSON.stringify(preErrors));

  // Click Submit button (strictly targeting Next / Submit / Apply, ignoring Indeed SSO)
  console.log('Finding native submit button...');
  const submitText = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find(b => {
      const t = (b.innerText || '').toLowerCase();
      return (t.includes('submit') || t.includes('next') || t.includes('continue') || t.includes('apply')) && !t.includes('indeed');
    });
    if (target) {
      target.scrollIntoView();
      target.click();
      return target.innerText;
    }
    return null;
  });
  console.log('Clicked native button:', submitText);
  await sleep(7000);

  // Check confirmation
  const result = await page.evaluate(() => {
    const t = document.body.innerText.toLowerCase();
    const confirmed = t.includes('thank you') || t.includes('application submitted') || t.includes('received') || t.includes('application sent');
    const errs = Array.from(document.querySelectorAll('.error, [aria-invalid="true"], .invalid-feedback, .error-message, [role="alert"]')).map(e => e.innerText.trim()).filter(Boolean);
    return { confirmed, errs, currentUrl: window.location.href };
  });

  console.log('Submission Check:', JSON.stringify(result, null, 2));

  const screenshotPath = path.join(screenshotDir, 'Endeavor_IT_Solution_Confirmed.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to:', screenshotPath);

  if (result.confirmed) {
    const f5Path = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-21.json';
    const f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8'));
    f5.jobs.push({
      id: 'endeavor_it_' + Date.now(),
      company: 'Endeavor IT Solution',
      role: 'Front end Developer (Fresher)',
      location: 'Indore, MP',
      url: 'https://jobs.smartrecruiters.com/EndeavorITSolution/99740233-openings-for-front-end-developer-fresher-',
      channel: 'Direct ATS / SmartRecruiters',
      status: 'CONFIRMED_SUBMITTED',
      applied_at: new Date().toISOString(),
      confirmation_screenshot: screenshotPath,
      resume_used: 'Pratik Patidar Resume - Frontend Engineer.pdf'
    });
    f5.total = f5.jobs.length;
    f5.updated_at = new Date().toISOString();
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('🎉 SUCCESS: Endeavor IT Solution confirmed and recorded in File 5!');
  } else if (result.errs.length > 0) {
    console.log('⚠️ Validation errors on page:', result.errs);
  }

  // Keep tab open in Brave for user inspection
  await browser.disconnect();
})();
