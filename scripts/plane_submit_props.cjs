const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function submitViaPropsOnChange() {
  console.log('[REA Plane] Connecting...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('jobs.ashbyhq.com/plane')) || pages[0];

  console.log('[REA Plane] Invoking __reactProps$*.onChange on all inputs...');
  await page.evaluate(() => {
    function fireReactPropsOnChange(el, val) {
      if (!el) return;
      el.focus();
      const propsKey = Object.keys(el).find(k => k.startsWith('__reactProps$'));
      if (propsKey && el[propsKey] && typeof el[propsKey].onChange === 'function') {
        el[propsKey].onChange({ target: { value: val }, currentTarget: { value: val } });
      }
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    // 1. Textarea: How did you come to know about Plane?
    const textarea = document.querySelector('textarea[name="4f7971df-d94f-418a-8ae3-b15e84836e5b"]');
    if (textarea) fireReactPropsOnChange(textarea, 'Through Plane open-source GitHub repository and developer community');

    // 2. What is your current location?
    const locInput = document.querySelector('input[name="31de3c24-9062-4ded-b409-aed6e05f94d1"]');
    if (locInput) fireReactPropsOnChange(locInput, 'Indore, MP');

    // 3. Relocate to Hyderabad: 69e6b652-c867-4fd6-b8e3-0dcd393b451e
    const relocateInput = document.querySelector('input[name="69e6b652-c867-4fd6-b8e3-0dcd393b451e"]');
    if (relocateInput) fireReactPropsOnChange(relocateInput, 'Yes, ready to relocate immediately');

    // 4. By when can you join?
    const joinInput = document.querySelector('input[name="63edbd32-3b07-4bd0-bc53-7884144ed51c"]');
    if (joinInput) fireReactPropsOnChange(joinInput, '15 Days (or Immediate)');

    // 5. Last working day: dce1118e-11e5-4bf5-a4c8-e92ee8d36fe7
    const lastDayInput = document.querySelector('input[name="dce1118e-11e5-4bf5-a4c8-e92ee8d36fe7"]');
    if (lastDayInput) fireReactPropsOnChange(lastDayInput, 'October 2026');

    // 6. Current CTC: 81c588bf-3471-4f09-9872-41c08f5d1ff0
    const ctcInput = document.querySelector('input[name="81c588bf-3471-4f09-9872-41c08f5d1ff0"]');
    if (ctcInput) fireReactPropsOnChange(ctcInput, '2.16 LPA');

    // 7. Total work experience: 726caa52-a0ca-4842-a72a-eee829dad928
    const expInput = document.querySelector('input[name="726caa52-a0ca-4842-a72a-eee829dad928"]');
    if (expInput) fireReactPropsOnChange(expInput, '1.5 Years');
  });

  // Human mouse wiggle
  console.log('[REA Plane] Simulating natural human movements...');
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(200 + Math.random() * 400);
    const y = Math.floor(200 + Math.random() * 300);
    await page.mouse.move(x, y, { steps: 2 });
    await new Promise(r => setTimeout(r, 40));
  }

  // Check if error alerts disappeared
  const errorText = await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('*')).filter(el => {
      const t = el.innerText ? el.innerText.trim() : '';
      return el.children.length === 0 && (t.includes('Missing entry') || t.includes('corrections'));
    }).map(e => e.innerText.trim());
    return alerts;
  });
  console.log('[REA Plane] Error alerts after ReactProps dispatch:', errorText);

  // Click Submit
  console.log('[REA Plane] Clicking submit button...');
  await page.evaluate(() => {
    const btn = document.querySelector('.ashby-application-form-submit-button');
    if (btn) btn.click();
  });

  console.log('[REA Plane] Waiting for confirmation...');
  let isConfirmed = false;
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 2000));
    isConfirmed = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      return text.includes('Thank you') ||
             text.includes('Application submitted') ||
             text.includes('received your application');
    });
    if (isConfirmed) break;
  }

  console.log('[REA Plane] isConfirmed:', isConfirmed);
  const screenshotPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/plane_software_ashby_confirmed.png';
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  console.log('[REA Plane] Screenshot saved:', screenshotPath);

  if (isConfirmed) {
    const file5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json';
    const file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8'));
    file5.jobs.push({
      company: 'Plane Software, Inc.',
      role: 'Software Engineer, Frontend (React)',
      url: 'https://jobs.ashbyhq.com/plane/15cf6387-af74-4616-924f-3659fb76de01/application',
      channel: 'Ashby Direct ATS (Candidate #9 Confirmed)',
      proof_screenshot: screenshotPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    file5.total = file5.jobs.length;
    fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2), 'utf8');

    // Remove from skipped list
    const skippedPath = 'C:/mcp/job-search-mcp-engine/data/daily/already_applied_or_skipped_todays_2026-10-23.json';
    let skipped = JSON.parse(fs.readFileSync(skippedPath, 'utf8'));
    skipped = skipped.filter(j => j.company !== 'Plane Software, Inc.');
    fs.writeFileSync(skippedPath, JSON.stringify(skipped, null, 2), 'utf8');

    console.log('[REA Plane] Plane Software CONFIRMED APPLIED! Total today:', file5.total);
    await page.close();
  }

  await browser.disconnect();
}

submitViaPropsOnChange().catch(console.error);
