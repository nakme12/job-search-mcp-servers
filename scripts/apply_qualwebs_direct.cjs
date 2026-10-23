const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function applyQualwebs() {
  console.log('[Direct Career] Connecting to browser for Qualwebs...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.bringToFront();

  const jobUrl = 'https://www.qualwebs.com/career/junior-frontend-developer';
  await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 2500));

  // Resume path
  const resumePath = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - React Developer.pdf';

  // 1. Upload Resume via CDP file input
  console.log('[Direct Career] Uploading authorized resume...');
  const fileInput = await page.$('input[name="resume"], input[type="file"]');
  if (fileInput && fs.existsSync(resumePath)) {
    await fileInput.uploadFile(resumePath);
    await new Promise(r => setTimeout(r, 1500));
  }

  // 2. Physical CDP Type Helper
  async function typeField(selector, text) {
    const el = await page.$(selector);
    if (el) {
      await el.scrollIntoViewIfNeeded();
      await el.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.keyboard.type(String(text), { delay: 10 });
      await page.keyboard.press('Tab');
      await new Promise(r => setTimeout(r, 50));
    }
  }

  console.log('[Direct Career] Filling canonical screening data via physical CDP...');
  await typeField('input[name="first_name"]', 'Pratik');
  await typeField('input[name="last_name"]', 'Patidar');
  await typeField('input[name="email"]', 'pratikpatidar7990@gmail.com');
  await typeField('input[name="phone"]', '+918269647990');
  await typeField('input[name="company"]', 'IT Services Firm');
  await typeField('input[name="location"]', 'Indore, MP');
  await typeField('input[name="current_ctc"]', '216000');
  await typeField('input[name="expected_ctc"]', '465000');
  await typeField('input[name="linkedin_url"]', 'https://www.linkedin.com/in/pratik-patidar');
  await typeField('input[name="notice_period"]', '15');
  
  const aboutText = 'Full Stack / Frontend Developer with 1.5+ years of experience in React.js, TypeScript, Next.js, and REST APIs. Based in Indore, ready to join in 15 days or immediately. Portfolio: https://pratik-portfolio-nine-orcin.vercel.app';
  await typeField('textarea[name="about"]', aboutText);

  // Check consent checkbox
  console.log('[Direct Career] Checking consent checkbox...');
  await page.evaluate(() => {
    const cb = document.querySelector('input[type="checkbox"]');
    if (cb && !cb.checked) cb.click();
  });

  // Human mouse wiggle
  for (let m = 0; m < 15; m++) {
    const x = Math.floor(200 + Math.random() * 400);
    const y = Math.floor(200 + Math.random() * 300);
    await page.mouse.move(x, y, { steps: 2 });
    await new Promise(r => setTimeout(r, 30));
  }

  // Submit Application
  console.log('[Direct Career] Clicking Submit Your Application...');
  await page.evaluate(() => {
    const btn = document.querySelector('form button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('submit'));
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.click();
    }
  });

  console.log('[Direct Career] Waiting for submission response...');
  await new Promise(r => setTimeout(r, 7000));

  const snippet = await page.evaluate(() => document.body ? document.body.innerText : '');
  const isConfirmed = snippet.includes('Thank you') ||
                      snippet.includes('successfully') ||
                      snippet.includes('received') ||
                      snippet.includes('Application submitted');

  console.log('[Direct Career] isConfirmed:', isConfirmed);

  const screenshotPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/qualwebs_direct_confirmed.png';
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  console.log('[Direct Career] Saved proof screenshot:', screenshotPath);

  if (isConfirmed) {
    const file5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json';
    const file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8'));
    file5.jobs.push({
      company: 'Qualwebs',
      role: 'Junior Frontend Developer',
      url: jobUrl,
      channel: 'Direct Company Career Site (Candidate #12 Confirmed)',
      proof_screenshot: screenshotPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    file5.total = file5.jobs.length;
    fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2), 'utf8');

    console.log('[Direct Career] QUALWEBS APPLIED SUCCESSFULLY! Total today:', file5.total);
    await page.close();
  } else {
    console.log('[Direct Career] Warning: Check page snippet:\n', snippet.substring(0, 300).replace(/\n+/g, ' '));
  }

  await browser.disconnect();
}

applyQualwebs().catch(console.error);
