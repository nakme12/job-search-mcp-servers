const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function applySupabase() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const url = 'https://jobs.ashbyhq.com/supabase/e569b7f7-fa8f-4139-86f6-4f52b456882d/application';
  console.log('[Supabase] Opening Ashby form:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

  // 1. Basic text fields
  await page.evaluate(() => {
    function setField(id, val) {
      const el = document.getElementById(id);
      if (el) {
        el.focus();
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    setField('_systemfield_name', 'Pratik Patidar');
    setField('_systemfield_email', 'pratikpatidar7990@gmail.com');
    setField('a1a1ff15-2eef-4c24-b732-2938b7b11697', 'https://github.com/pratikpatidar7990');
    setField('e6fae51b-b49a-400b-a018-58fc83850182', 'https://www.linkedin.com/in/pratik-patidar');
  });

  // 2. Upload Resume
  const resumePath = path.resolve('resumes/Pratik Patidar Resume - React Developer.pdf');
  console.log('[Supabase] Attaching resume:', resumePath);
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    await new Promise(r => setTimeout(r, 2000));
  }

  // 3. Country comboboxes (Passport & Residence) using React Fiber onSelect or clicks
  await page.evaluate(() => {
    function selectCountry(id, countryName) {
      const el = document.getElementById(id);
      if (!el) return;
      el.focus();
      el.value = countryName;
      el.dispatchEvent(new Event('input', { bubbles: true }));

      // Look for fiber key
      const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
      if (fiberKey) {
        let curr = el[fiberKey];
        while (curr) {
          if (curr.memoizedProps && typeof curr.memoizedProps.onSelect === 'function') {
            curr.memoizedProps.onSelect({ label: countryName, value: countryName });
            break;
          }
          curr = curr.return;
        }
      }
    }
    selectCountry('b00d7771-a0bc-414c-9868-a565483ba454', 'India');
    selectCountry('99930a87-5d77-4ae1-915f-653693ad3614', 'India');
  });

  // Check if dropdown popup appeared and click 'India' option if present
  await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => {
    const options = Array.from(document.querySelectorAll('div, li, button')).filter(el => {
      return el.innerText && el.innerText.trim() === 'India' && (el.getAttribute('role') === 'option' || el.className.includes('option') || el.className.includes('item'));
    });
    options.forEach(opt => opt.click());
  });

  // 4. Radio Buttons
  await page.evaluate(() => {
    // Vacancy: LinkedIn
    const rVacancy = document.getElementById('a7a6709c-916c-467e-81ca-08715992371e_bdd51f88-aa8e-4a57-b0b2-1f3f2b81ea51-labeled-radio-1');
    if (rVacancy) rVacancy.click();

    // Auth systems: Some exposure
    const rAuth = document.getElementById('a7a6709c-916c-467e-81ca-08715992371e_8ec862ce-d517-45c5-b5c5-bacd2b6523ff-labeled-radio-1');
    if (rAuth) rAuth.click();

    // Go/TS: Both, strong in one
    const rGoTS = document.getElementById('a7a6709c-916c-467e-81ca-08715992371e_e2fc90ad-65b2-407b-8b60-b13b8bffd8a3-labeled-radio-3');
    if (rGoTS) rGoTS.click();

    // Web frameworks: Single-paradigm
    const rFramework = document.getElementById('a7a6709c-916c-467e-81ca-08715992371e_8dca36d0-2b14-40ac-9b06-ebf32e5e55e5-labeled-radio-1');
    if (rFramework) rFramework.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  // 5. Submit application
  console.log('[Supabase] Clicking Submit button...');
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find(b => b.innerText.toLowerCase().includes('submit application') || b.type === 'submit');
    if (submitBtn && !submitBtn.disabled) {
      submitBtn.click();
      return true;
    }
    return false;
  });
  console.log('[Supabase] Submit button clicked:', clicked);

  // 6. Wait for submission confirmation
  await new Promise(r => setTimeout(r, 4000));

  const result = await page.evaluate(() => {
    const text = document.body.innerText;
    const isSuccess = text.includes('Application submitted') || 
                      text.includes('Thank you') || 
                      text.includes('received your application') ||
                      text.includes('Thanks for applying');
    const errors = Array.from(document.querySelectorAll('div[class*="_error_"], span[class*="_error_"], div[role="alert"]')).map(e => e.innerText);
    return { isSuccess, errors, url: window.location.href };
  });

  console.log('[Supabase] Submission result:', result);

  if (result.isSuccess) {
    const proofDir = path.resolve('screenshots/2026-10-23/shift1');
    fs.mkdirSync(proofDir, { recursive: true });
    const proofPath = path.join(proofDir, 'supabase_auth_confirmed.png');
    await page.screenshot({ path: proofPath, fullPage: true });
    console.log('[Supabase] Confirmation screenshot saved:', proofPath);

    // Record in File 5
    const ledgerPath = path.resolve('data/daily/applied_todays_2026-10-23.json');
    let ledger = { date: '2026-10-23', cycle: 'Cycle 1 (11:00 AM - 03:00 PM)', total: 0, jobs: [] };
    if (fs.existsSync(ledgerPath)) {
      ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    }
    ledger.jobs.push({
      company: 'Supabase',
      role: 'Software Engineer - Auth',
      url: url,
      channel: 'Ashby Direct ATS',
      proof_screenshot: proofPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    ledger.total = ledger.jobs.length;
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
    console.log('[Supabase] Successfully appended to applied_todays_2026-10-23.json. Total applied today:', ledger.total);
    await page.close();
  } else {
    console.log('[Supabase] Confirmation not yet detected or validation errors:', result.errors);
    const errPath = path.resolve('screenshots/2026-10-23/shift1/supabase_debug_error.png');
    await page.screenshot({ path: errPath });
    console.log('[Supabase] Debug screenshot saved:', errPath);
  }

  await browser.disconnect();
}

applySupabase().catch(console.error);
