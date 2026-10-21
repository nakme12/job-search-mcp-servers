const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const company = 'Endeavor IT Solution';
  const role = 'Front end Developer (Fresher)';
  const applyUrl = 'https://jobs.smartrecruiters.com/oneclick-ui/company/EndeavorITSolution/publication/e41ad219-770b-4492-975f-ec11b5a513ef?dcr_ci=EndeavorITSolution';
  const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const screenshotDir = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-21/shift2';

  console.log('Connecting to Brave port 9222...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Navigating directly to SmartRecruiters oneclick-ui form...');
  await page.goto(applyUrl, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(4000);

  // Upload Resume first (SmartRecruiters parses resume to auto-fill)
  console.log('Uploading Resume to SmartRecruiters file input...');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    console.log('Resume injected. Waiting 8s for SmartRecruiters AI parser...');
    await sleep(8000);
  }

  // Pre-clear & Fill explicit inputs
  console.log('Injecting / Asserting Candidate Details...');
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
    setVal('input[name*="firstName"], input[data-test="first-name"]', 'Pratik');
    setVal('input[name*="lastName"], input[data-test="last-name"]', 'Patidar');
    setVal('input[name*="email"], input[data-test="email"]', 'pratikpatidar7990@gmail.com');
    setVal('input[name*="phone"], input[data-test="phone-number"]', '8269647990');
    setVal('input[name*="city"], input[data-test="city"]', 'Indore');
  });
  await sleep(2000);

  // Click Submit Application
  console.log('Clicking Submit on SmartRecruiters...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const sub = btns.find(b => b.innerText && (b.innerText.toLowerCase().includes('submit') || b.innerText.toLowerCase().includes('apply')));
    if (sub) sub.click();
  });
  await sleep(6000);

  const text = await page.evaluate(() => document.body.innerText.toLowerCase());
  const confirmed = text.includes('thank you') || text.includes('received') || text.includes('submitted') || text.includes('application sent');
  console.log('Live Confirmation Detected:', confirmed);

  const screenshotPath = path.join(screenshotDir, 'Endeavor_IT_Solution_Confirmed.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Post-submit screenshot saved:', screenshotPath);

  if (confirmed) {
    const f5Path = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-21.json';
    const f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8'));
    f5.jobs.push({
      id: 'endeavor_it_' + Date.now(),
      company,
      role,
      location: 'Indore',
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
    console.log('✅ Endeavor IT Solution confirmed and logged in File 5!');
  }

  await page.close();
  await browser.disconnect();
})();
