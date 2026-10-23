const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function fixQualwebsForm() {
  console.log('[Qualwebs] Connecting to browser...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('qualwebs')) || pages[0];
  
  await page.bringToFront();

  // Helper to type directly by ID/selector
  async function fillInput(selector, val) {
    const el = await page.$(selector);
    if (el) {
      await el.scrollIntoViewIfNeeded();
      await el.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.keyboard.type(val, { delay: 15 });
    }
  }

  console.log('[Qualwebs] Filling missing fields via physical keyboard...');
  await fillInput('input[name="company"]', 'IT Services Firm');
  await fillInput('input[name="linkedin_url"]', 'https://www.linkedin.com/in/pratik-patidar');
  await fillInput('input[name="notice_period"]', '15');
  await fillInput('textarea[name="about"]', 'Full Stack / Frontend Developer with 1.5+ years of experience in React.js, TypeScript, Next.js, and REST APIs. Ready to join in 15 days or immediately.');

  // Validate form in DOM
  const check = await page.evaluate(() => {
    const empty = Array.from(document.querySelectorAll('form input, form textarea')).filter(el => el.required && !el.value).map(e => e.name);
    return { emptyCount: empty.length, emptyFields: empty };
  });
  console.log('[Qualwebs] Empty required fields check:', check);

  // Click Submit
  console.log('[Qualwebs] Submitting form...');
  await page.evaluate(() => {
    const btn = document.querySelector('form button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('submit'));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 7000));

  const text = await page.evaluate(() => document.body ? document.body.innerText : '');
  const isConfirmed = text.includes('Thank you') ||
                      text.includes('successfully') ||
                      text.includes('received') ||
                      text.includes('Application submitted');

  console.log('[Qualwebs] isConfirmed:', isConfirmed);

  const screenshotPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/qualwebs_direct_confirmed.png';
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  console.log('[Qualwebs] Saved proof screenshot:', screenshotPath);

  if (isConfirmed) {
    const file5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json';
    const file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8'));
    file5.jobs.push({
      company: 'Qualwebs',
      role: 'Junior Frontend Developer',
      url: 'https://www.qualwebs.com/career/junior-frontend-developer',
      channel: 'Direct Company Career Site (Candidate #12 Confirmed)',
      proof_screenshot: screenshotPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    file5.total = file5.jobs.length;
    fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2), 'utf8');

    console.log('[Qualwebs] SUCCESS! Added to File 5. Total today:', file5.total);
    await page.close();
  } else {
    console.log('[Qualwebs] Note: DOM snippet after submit:\n', text.substring(0, 400).replace(/\n+/g, ' '));
  }

  await browser.disconnect();
}

fixQualwebsForm().catch(console.error);
