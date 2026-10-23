const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const company = 'Developer Bazaar Technologies';
  const role = 'Frontend Intern';
  const url = 'https://getfirsthire.com/jobs/18dd85a6d805b2f1035dc821bcffc36f7978e3261c665bf23b825a121bb5ca46?utm_campaign=google_jobs_apply&utm_source=google_jobs_apply&utm_medium=organic';
  const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
  const screenshotDir = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-21/shift2';
  fs.mkdirSync(screenshotDir, { recursive: true });

  console.log('[Job 3/5] Connecting to Brave 9222 for Developer Bazaar Technologies...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Navigating to GetFirstHire direct portal:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(3000);

  // Click Apply Button
  console.log('Looking for Apply button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('a, button'));
    const b = btns.find(x => x.innerText && x.innerText.toLowerCase().includes('apply'));
    if (b) b.click();
  });
  await sleep(3000);

  // Fill Candidate inputs
  console.log('Filling form inputs...');
  await page.evaluate(() => {
    function setInput(sel, val) {
      const el = document.querySelector(sel);
      if (el) {
        el.value = '';
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    setInput('input[name*="name"], input#name', 'Pratik Patidar');
    setInput('input[name*="email"], input#email', 'pratikpatidar7990@gmail.com');
    setInput('input[name*="phone"], input#phone', '8269647990');
    setInput('input[name*="experience"], input#experience', '1.5');
    setInput('input[name*="city"], input[name*="location"]', 'Indore');
  });
  await sleep(2000);

  // Upload Resume
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    console.log('Uploading resume...');
    await fileInput.uploadFile(resumePath);
    await sleep(4000);
  }

  // Submit
  console.log('Clicking Submit application...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(x => x.innerText && (x.innerText.toLowerCase().includes('submit') || x.innerText.toLowerCase().includes('apply')));
    if (btn) btn.click();
  });
  await sleep(6000);

  const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
  const confirmed = bodyText.includes('thank you') || bodyText.includes('submitted') || bodyText.includes('received') || bodyText.includes('application sent');
  console.log('Developer Bazaar Live Confirmation:', confirmed);

  const screenshotPath = path.join(screenshotDir, 'Developer_Bazaar_Confirmed.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  if (confirmed) {
    const f5Path = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-21.json';
    const f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8'));
    f5.jobs.push({
      id: 'dev_bazaar_' + Date.now(),
      company,
      role,
      channel: 'Direct Portal / GetFirstHire',
      url,
      status: 'CONFIRMED_SUBMITTED',
      applied_at: new Date().toISOString(),
      confirmation_screenshot: screenshotPath,
      resume_used: 'Pratik Patidar Resume - MERN Full Stack.pdf'
    });
    f5.total = f5.jobs.length;
    f5.updated_at = new Date().toISOString();
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('✅ Developer Bazaar Technologies successfully logged to File 5!');
  }

  await page.close();
  await browser.disconnect();
})();
