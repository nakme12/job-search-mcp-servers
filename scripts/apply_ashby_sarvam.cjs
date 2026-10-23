const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function applySarvamClean() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const url = 'https://jobs.ashbyhq.com/sarvam/10a352d0-a65b-4599-8998-e09deef34349/application';
  console.log('[Sarvam AI] Opening application:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });

  // 1. Upload resume
  const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
  console.log('[Sarvam AI] Uploading resume:', resumePath);
  const fileInputs = await page.$$('input[type="file"]');
  const targetFileInput = fileInputs.length > 1 ? fileInputs[1] : fileInputs[0];
  if (targetFileInput) {
    await targetFileInput.uploadFile(resumePath);
    await new Promise(r => setTimeout(r, 3000));
  }

  // 2. Set all inputs safely using DOM ID map
  console.log('[Sarvam AI] Setting form inputs...');
  await page.evaluate(() => {
    function setVal(id, val) {
      const el = document.getElementById(id);
      if (!el) return;
      el.focus();
      const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
      if (fiberKey && el[fiberKey] && el[fiberKey].memoizedProps && typeof el[fiberKey].memoizedProps.onChange === 'function') {
        el[fiberKey].memoizedProps.onChange({ target: { value: val }, currentTarget: { value: val } });
      }
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    setVal('_systemfield_name', 'Pratik Patidar');
    setVal('_systemfield_email', 'pratikpatidar7990@gmail.com');
    setVal('6f9c9903-0146-41b7-b6eb-35575104087b', '+91 82696 47990');
    setVal('21ee1315-088b-47f1-bfe9-091e141792f3', 'https://www.linkedin.com/in/pratik-patidar');
    setVal('54de20b6-3976-4b62-a281-dddf833950aa', 'https://github.com/pratikpatidar7990');
    setVal('3880a764-8b4d-40e0-a580-338c758111d9', 'I am inspired by Sarvam AI mission to build sovereign AI for India. As a React/Next.js/TS frontend engineer, I want to contribute to accessible high-performance interfaces.');
  });

  await new Promise(r => setTimeout(r, 1500));

  // 3. Click Submit Application
  console.log('[Sarvam AI] Submitting...');
  await page.evaluate(() => {
    const btn = document.querySelector('.ashby-application-form-submit-button') ||
                Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Submit Application');
    if (btn && !btn.disabled) btn.click();
  });

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

  console.log('[Sarvam AI] Post-submit result:', result);

  const proofDir = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1');
  fs.mkdirSync(proofDir, { recursive: true });
  const proofPath = path.join(proofDir, 'sarvam_ai_ashby_confirmed.png');
  await page.screenshot({ path: proofPath, fullPage: true });

  if (result.isSuccess) {
    console.log('[Sarvam AI] Submission Confirmed! Saved screenshot:', proofPath);
    const ledgerPath = path.resolve('C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json');
    let ledger = { date: '2026-10-23', cycle: 'Cycle 1 (11:00 AM - 03:00 PM)', total: 0, jobs: [] };
    if (fs.existsSync(ledgerPath)) {
      ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    }
    ledger.jobs.push({
      company: 'Sarvam AI',
      role: 'Frontend Engineer, Chanakya',
      url: url,
      channel: 'Ashby Direct ATS (Candidate #4 Confirmed)',
      proof_screenshot: proofPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    ledger.total = ledger.jobs.length;
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
    console.log('[Sarvam AI] Appended to File 5! Total applied today:', ledger.total);
    await page.close();
  } else {
    console.log('[Sarvam AI] Errors:', result.errors);
  }

  await browser.disconnect();
}

applySarvamClean().catch(console.error);
