const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function applySoulside() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const url = 'https://jobs.ashbyhq.com/Soulside%20AI/7cdf48ca-e4f7-40f2-9521-0368cf9d0cba/application';
  console.log('[Soulside AI] Opening application:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });

  // 1. Upload resume to file input
  const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
  console.log('[Soulside AI] Attaching resume:', resumePath);
  const resumeInput = await page.$('#_systemfield_resume') || (await page.$$('input[type="file"]'))[1] || (await page.$('input[type="file"]'));
  if (resumeInput) {
    await resumeInput.uploadFile(resumePath);
    console.log('[Soulside AI] Resume uploaded. Waiting 3s...');
    await new Promise(r => setTimeout(r, 3000));
  }

  // 2. Set Name and Email via React Fiber memoizedProps.onChange
  console.log('[Soulside AI] Setting Name & Email via React Fiber...');
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

  // Verify DOM values
  const currentVals = await page.evaluate(() => {
    const n = document.getElementById('_systemfield_name');
    const e = document.getElementById('_systemfield_email');
    return { nameVal: n ? n.value : null, emailVal: e ? e.value : null };
  });
  console.log('[Soulside AI] Populated values check:', currentVals);

  if (!currentVals.nameVal) {
    console.log('[Soulside AI] Fallback typing...');
    await page.click('#_systemfield_name');
    await page.keyboard.type('Pratik Patidar', { delay: 50 });
    await page.click('#_systemfield_email');
    await page.keyboard.type('pratikpatidar7990@gmail.com', { delay: 50 });
  }

  await new Promise(r => setTimeout(r, 1000));

  // 3. Click Submit Application
  console.log('[Soulside AI] Clicking Submit Application button...');
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

  console.log('[Soulside AI] Post-submit result:', result);

  const proofDir = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1');
  fs.mkdirSync(proofDir, { recursive: true });
  const proofPath = path.join(proofDir, 'soulside_ai_ashby_confirmed.png');
  await page.screenshot({ path: proofPath, fullPage: true });

  if (result.isSuccess) {
    console.log('[Soulside AI] Submission Confirmed! Saved screenshot:', proofPath);
    const ledgerPath = path.resolve('C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json');
    let ledger = { date: '2026-10-23', cycle: 'Cycle 1 (11:00 AM - 03:00 PM)', total: 0, jobs: [] };
    if (fs.existsSync(ledgerPath)) {
      ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    }
    ledger.jobs.push({
      company: 'Soulside AI',
      role: 'Frontend Engineer (India/Remote)',
      url: url,
      channel: 'Ashby Direct ATS (Candidate #4 Confirmed)',
      proof_screenshot: proofPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    ledger.total = ledger.jobs.length;
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
    console.log('[Soulside AI] Appended to File 5! Total applied today:', ledger.total);
    await page.close();
  } else {
    console.log('[Soulside AI] Unconfirmed. Review:', result.errors);
  }

  await browser.disconnect();
}

applySoulside().catch(console.error);
