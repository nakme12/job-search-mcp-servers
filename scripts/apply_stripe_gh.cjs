const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const company = 'STRIPE';
  const role = 'Frontend Engineer, Data Product Experiences';
  const url = 'https://job-boards.greenhouse.io/stripe/jobs/8194606';
  const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const screenshotDir = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-21/shift2';
  fs.mkdirSync(screenshotDir, { recursive: true });

  console.log('[Job 2/5] Connecting to Brave 9222 for STRIPE Greenhouse Direct Board...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Navigating directly to Greenhouse job endpoint:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(4000);

  // Pre-clear & Fill Candidate Fields
  console.log('Injecting candidate fields...');
  await page.evaluate(() => {
    function fill(sel, val) {
      const el = document.querySelector(sel);
      if (el) {
        el.value = '';
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    fill('input#first_name, input[name="first_name"]', 'Pratik');
    fill('input#last_name, input[name="last_name"]', 'Patidar');
    fill('input#email, input[name="email"]', 'pratikpatidar7990@gmail.com');
    fill('input#phone, input[name="phone"]', '+918269647990');
    fill('input#job_application_location, input[name*="location"]', 'Indore, India');
    fill('input[name*="linkedin"], input[id*="linkedin"]', 'https://www.linkedin.com/in/pratik-patidar');
    fill('input[name*="website"], input[id*="website"], input[name*="portfolio"]', 'https://pratik-portfolio-nine-orcin.vercel.app');
  });
  await sleep(2000);

  // Resume Upload
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    console.log('Injecting resume file into Stripe Greenhouse...');
    await fileInput.uploadFile(resumePath);
    console.log('Resume injected. Waiting 6s for parse...');
    await sleep(6000);
  }

  // Click Submit
  console.log('Clicking Submit button...');
  await page.evaluate(() => {
    const btn = document.querySelector('button[type="submit"], input[type="submit"], #submit_app');
    if (btn) btn.click();
  });
  await sleep(6000);

  const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
  const confirmed = bodyText.includes('thank you') || bodyText.includes('submitted') || bodyText.includes('received') || bodyText.includes('application sent');
  console.log('Stripe Live Confirmation:', confirmed);

  const screenshotPath = path.join(screenshotDir, 'Stripe_Frontend_Confirmed.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  if (confirmed) {
    const f5Path = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-21.json';
    const f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8'));
    f5.jobs.push({
      id: 'stripe_gh_' + Date.now(),
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
    console.log('✅ STRIPE successfully logged to File 5!');
  }

  await page.close();
  await browser.disconnect();
})();
