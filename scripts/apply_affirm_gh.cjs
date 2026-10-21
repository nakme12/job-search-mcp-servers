const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const company = 'AFFIRM';
  const role = 'Software Engineer, Early Career (SF)';
  const url = 'https://job-boards.greenhouse.io/affirm/jobs/8010617003';
  const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const screenshotDir = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-21/shift2';
  fs.mkdirSync(screenshotDir, { recursive: true });

  console.log('[Job 4/5] Connecting to Brave 9222 for AFFIRM Greenhouse Direct Board...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Navigating to Affirm Greenhouse:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(3000);

  // Fill standard fields
  console.log('Filling Candidate Fields...');
  await page.evaluate(() => {
    function set(id, val) {
      const el = document.querySelector(id);
      if (el) {
        el.value = '';
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    set('input#first_name', 'Pratik');
    set('input#last_name', 'Patidar');
    set('input#email', 'pratikpatidar7990@gmail.com');
    set('input#phone', '+918269647990');
    set('input#job_application_location', 'Indore, India');
    set('input[name*="linkedin"]', 'https://www.linkedin.com/in/pratik-patidar');
    set('input[name*="website"]', 'https://pratik-portfolio-nine-orcin.vercel.app');
  });
  await sleep(1500);

  // Resume upload
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    console.log('Injecting resume file into Affirm...');
    await fileInput.uploadFile(resumePath);
    await sleep(5000);
  }

  // Submit
  console.log('Clicking Submit button on Affirm...');
  await page.evaluate(() => {
    const btn = document.querySelector('input[type="submit"], button[type="submit"], #submit_app');
    if (btn) btn.click();
  });
  await sleep(6000);

  const text = await page.evaluate(() => document.body.innerText.toLowerCase());
  const confirmed = text.includes('thank you') || text.includes('submitted') || text.includes('received') || text.includes('application sent');
  console.log('Affirm Live Confirmation:', confirmed);

  const screenshotPath = path.join(screenshotDir, 'Affirm_SF_Confirmed.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  if (confirmed) {
    const f5Path = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-21.json';
    const f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8'));
    f5.jobs.push({
      id: 'affirm_gh_' + Date.now(),
      company,
      role,
      channel: 'Direct ATS (Greenhouse)',
      url,
      status: 'CONFIRMED_SUBMITTED',
      applied_at: new Date().toISOString(),
      confirmation_screenshot: screenshotPath,
      resume_used: 'Pratik Patidar Resume - Frontend Engineer.pdf'
    });
    f5.total = f5.jobs.length;
    f5.updated_at = new Date().toISOString();
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('✅ AFFIRM successfully logged to File 5!');
  }

  await page.close();
  await browser.disconnect();
})();
