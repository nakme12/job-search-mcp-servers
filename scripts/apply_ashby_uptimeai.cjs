const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function applyUptimeAI() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const url = 'https://jobs.ashbyhq.com/uptimeai/1554854a-7281-4540-af3d-c6ae60464914/application';
  console.log('[UptimeAI Ashby] Opening application:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });

  // 1. Upload resume
  const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
  console.log('[UptimeAI Ashby] Uploading resume:', resumePath);
  const fileInputs = await page.$$('input[type="file"]');
  const targetFileInput = fileInputs.length > 1 ? fileInputs[1] : fileInputs[0];
  if (targetFileInput) {
    await targetFileInput.uploadFile(resumePath);
    console.log('[UptimeAI Ashby] Resume uploaded. Waiting 3s...');
    await new Promise(r => setTimeout(r, 3000));
  }

  // 2. Set Name & Email via React Fiber memoizedProps.onChange
  console.log('[UptimeAI Ashby] Setting Name & Email via React Fiber...');
  await page.evaluate(() => {
    function setFiberValue(id, val) {
      const el = document.getElementById(id);
      if (!el) return;
      el.focus();
      const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
      if (fiberKey && el[fiberKey] && el[fiberKey].memoizedProps && typeof el[fiberKey].memoizedProps.onChange === 'function') {
        el[fiberKey].memoizedProps.onChange({ target: { value: val }, currentTarget: { value: val } });
      } else {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    setFiberValue('_systemfield_name', 'Pratik Patidar');
    setFiberValue('_systemfield_email', 'pratikpatidar7990@gmail.com');
  });

  await new Promise(r => setTimeout(r, 1000));

  // Verify values
  const currentVals = await page.evaluate(() => {
    const n = document.getElementById('_systemfield_name');
    const e = document.getElementById('_systemfield_email');
    return { nameVal: n ? n.value : null, emailVal: e ? e.value : null };
  });
  console.log('[UptimeAI Ashby] Populated values check:', currentVals);

  if (!currentVals.nameVal) {
    console.log('[UptimeAI Ashby] Fallback typing...');
    await page.click('#_systemfield_name');
    await page.keyboard.type('Pratik Patidar', { delay: 50 });
    await page.click('#_systemfield_email');
    await page.keyboard.type('pratikpatidar7990@gmail.com', { delay: 50 });
  }

  await new Promise(r => setTimeout(r, 1000));

  // 3. Click Submit Application
  console.log('[UptimeAI Ashby] Clicking Submit Application button...');
  await page.evaluate(() => {
    const btn = document.querySelector('.ashby-application-form-submit-button') ||
                Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Submit Application');
    if (btn && !btn.disabled) btn.click();
  });

  // 4. Wait for submission confirmation
  await new Promise(r => setTimeout(r, 6000));

  const result = await page.evaluate(() => {
    const text = document.body.innerText;
    const isSuccess = text.includes('Application submitted') || 
                      text.includes('Thank you') || 
                      text.includes('received your application') ||
                      text.includes('Thanks for applying') ||
                      text.includes('successfully submitted');
    const errors = Array.from(document.querySelectorAll('div[class*="_error_"], span[class*="_error_"], div[role="alert"]')).map(e => e.innerText);
    return { isSuccess, errors, textSnippet: text.substring(0, 300) };
  });

  console.log('[UptimeAI Ashby] Post-submit result:', result);

  const proofDir = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1');
  fs.mkdirSync(proofDir, { recursive: true });
  const proofPath = path.join(proofDir, 'uptimeai_ashby_confirmed.png');
  await page.screenshot({ path: proofPath, fullPage: true });

  if (result.isSuccess) {
    console.log('[UptimeAI Ashby] Submission Confirmed! Saved screenshot:', proofPath);
    const ledgerPath = path.resolve('C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json');
    let ledger = { date: '2026-10-23', cycle: 'Cycle 1 (11:00 AM - 03:00 PM)', total: 0, jobs: [] };
    if (fs.existsSync(ledgerPath)) {
      ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    }
    ledger.jobs.push({
      company: 'UptimeAI',
      role: 'Full stack Developer (MEAN/MERN Stack)',
      url: url,
      channel: 'Ashby Direct ATS (Candidate #5 Confirmed)',
      proof_screenshot: proofPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    ledger.total = ledger.jobs.length;
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
    console.log('[UptimeAI Ashby] Appended to File 5! Total applied today:', ledger.total);
    await page.close();
  } else {
    console.log('[UptimeAI Ashby] Errors:', result.errors);
  }

  await browser.disconnect();
}

applyUptimeAI().catch(console.error);
