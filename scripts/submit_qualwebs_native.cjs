const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function submitQualwebsDirect() {
  console.log('[Qualwebs] Connecting...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('qualwebs')) || pages[0];
  
  await page.bringToFront();

  // Populate via evaluate with complete events
  console.log('[Qualwebs] Injecting values with native setters...');
  await page.evaluate(() => {
    function fillNative(selector, val) {
      const el = document.querySelector(selector);
      if (!el) return;
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) desc.set.call(el, val);
      else el.value = val;
      el.classList.remove('invalid');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    fillNative('input[name="linkedin_url"]', 'https://www.linkedin.com/in/pratik-patidar');
    fillNative('input[name="notice_period"]', '15');
    fillNative('textarea[name="about"]', 'Full Stack / Frontend Developer with 1.5+ years of experience in React.js, TypeScript, Next.js, and REST APIs. Based in Indore, ready to join immediately.');
  });

  // Verify all fields are valid
  const validationCheck = await page.evaluate(() => {
    const invalidList = Array.from(document.querySelectorAll('form input, form textarea')).filter(el => {
      return el.required && (!el.value || (el.checkValidity && !el.checkValidity()));
    }).map(e => e.name);
    return { invalidCount: invalidList.length, invalidList };
  });
  console.log('[Qualwebs] Validation status before click:', validationCheck);

  // Click Submit
  console.log('[Qualwebs] Clicking Submit button...');
  await page.evaluate(() => {
    const btn = document.querySelector('form button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('submit'));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 6000));

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

    console.log('[Qualwebs] SUCCESS! Recorded to File 5. Total applied today:', file5.total);
    await page.close();
  } else {
    console.log('[Qualwebs] Warning: DOM text:\n', text.substring(0, 300).replace(/\n+/g, ' '));
  }

  await browser.disconnect();
}

submitQualwebsDirect().catch(console.error);
