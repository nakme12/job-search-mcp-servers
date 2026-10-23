const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const company = 'Endeavor IT Solution';
  const role = 'Front end Developer (Fresher)';
  const url = 'https://jobs.smartrecruiters.com/EndeavorITSolution/99740233-openings-for-front-end-developer-fresher-';
  const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
  const screenshotDir = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-21/shift2';
  fs.mkdirSync(screenshotDir, { recursive: true });

  console.log('[Job 1/5] Connecting to Brave 9222 for Endeavor IT Solution...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Navigating to SmartRecruiters page:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(3000);

  // Click Apply Now / I'm Interested
  console.log('Looking for Apply button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('a, button'));
    const target = btns.find(b => b.innerText && (b.innerText.toLowerCase().includes("interested") || b.innerText.toLowerCase().includes("apply")));
    if (target) target.click();
  });
  await sleep(4000);

  // Fill form
  console.log('Filling Candidate Form Fields...');
  await page.evaluate(() => {
    function setVal(sel, val) {
      const el = document.querySelector(sel);
      if (el) {
        el.value = '';
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    setVal('input[name="firstName"], input#first-name-input', 'Pratik');
    setVal('input[name="lastName"], input#last-name-input', 'Patidar');
    setVal('input[name="email"], input#email-input', 'pratikpatidar7990@gmail.com');
    setVal('input[name="confirmEmail"], input#confirm-email-input', 'pratikpatidar7990@gmail.com');
    setVal('input[name="phoneNumber"], input#phone-number-input', '8269647990');
    setVal('input[name="city"], input#city-input', 'Indore');
  });

  await sleep(2000);

  // Upload Resume
  console.log('Injecting Resume...');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    console.log('Resume uploaded! Waiting 6s for parse...');
    await sleep(6000);
  }

  // Check form presence and submit
  console.log('Submitting Application...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const sub = btns.find(b => b.innerText && (b.innerText.toLowerCase().includes('submit') || b.innerText.toLowerCase().includes('next')));
    if (sub) sub.click();
  });
  await sleep(6000);

  // Confirmation assertion
  const text = await page.evaluate(() => document.body.innerText.toLowerCase());
  const confirmed = text.includes('thank you') || text.includes('received') || text.includes('submitted') || text.includes('application sent');
  console.log('Live Confirmation Detected:', confirmed);

  const screenshotPath = path.join(screenshotDir, 'Endeavor_IT_Solution_Confirmed.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to:', screenshotPath);

  if (confirmed) {
    const f5Path = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-21.json';
    const f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8'));
    f5.jobs.push({
      id: 'endeavor_it_' + Date.now(),
      company,
      role,
      location: 'Indore',
      url,
      channel: 'Direct ATS / SmartRecruiters',
      status: 'CONFIRMED_SUBMITTED',
      applied_at: new Date().toISOString(),
      confirmation_screenshot: screenshotPath,
      resume_used: 'Pratik Patidar Resume - MERN Full Stack.pdf'
    });
    f5.total = f5.jobs.length;
    f5.updated_at = new Date().toISOString();
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('✅ Endeavor IT Solution logged to File 5!');
  }

  await page.close();
  await browser.disconnect();
})();
