const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function applySpectorAI() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const url = 'https://jobs.ashbyhq.com/spector-ai/68127883-4e2f-432b-95b2-e90335200b7c/application';
  console.log('[Spector.ai] Opening application:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });

  // 1. Upload resume
  const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
  console.log('[Spector.ai] Uploading resume:', resumePath);
  const fileInputs = await page.$$('input[type="file"]');
  const targetFileInput = fileInputs.length > 1 ? fileInputs[1] : fileInputs[0];
  if (targetFileInput) {
    await targetFileInput.uploadFile(resumePath);
    console.log('[Spector.ai] Resume uploaded. Waiting 3s...');
    await new Promise(r => setTimeout(r, 3000));
  }

  // 2. Set fields via React Fiber memoizedProps.onChange
  console.log('[Spector.ai] Setting fields via React Fiber...');
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
    setFiberValue('872b8c0f-1abf-4ce0-abf4-94b4588173f4', 'Previous Tech Startup');
    setFiberValue('57523176-e0e4-46c5-a76d-4b5bc7f27f93', 'Full Stack Developer');
    setFiberValue('7176b3bb-a426-4418-a44b-8dbe3de320a7', 'https://www.linkedin.com/in/pratik-patidar');
    setFiberValue('8cfaf771-0fdb-4129-af10-e6653d4963d4', 'https://github.com/pratikpatidar7990');
  });

  // 3. Handle Radio buttons:
  // "Are you legally authorized to work in the location where this role is based?" -> Yes
  // "Will you now or in the future require visa sponsorship?" -> No
  await page.evaluate(() => {
    const radioLabels = Array.from(document.querySelectorAll('label'));
    const yesAuth = radioLabels.find(l => l.innerText.trim() === 'Yes' && l.getAttribute('for') && l.getAttribute('for').includes('ad25d88a'));
    if (yesAuth) yesAuth.click();

    const noSponsor = radioLabels.find(l => l.innerText.trim() === 'No' && l.getAttribute('for') && l.getAttribute('for').includes('fc9ce9a4'));
    if (noSponsor) noSponsor.click();
  });

  await new Promise(r => setTimeout(r, 1500));

  // 4. Click Submit Application
  console.log('[Spector.ai] Clicking Submit Application button...');
  await page.evaluate(() => {
    const btn = document.querySelector('.ashby-application-form-submit-button') ||
                Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Submit Application');
    if (btn && !btn.disabled) btn.click();
  });

  // 5. Wait for submission confirmation
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

  console.log('[Spector.ai] Post-submit result:', result);

  const proofDir = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1');
  fs.mkdirSync(proofDir, { recursive: true });
  const proofPath = path.join(proofDir, 'spector_ai_ashby_confirmed.png');
  await page.screenshot({ path: proofPath, fullPage: true });

  if (result.isSuccess) {
    console.log('[Spector.ai] Submission Confirmed! Saved screenshot:', proofPath);
    const ledgerPath = path.resolve('C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json');
    let ledger = { date: '2026-10-23', cycle: 'Cycle 1 (11:00 AM - 03:00 PM)', total: 0, jobs: [] };
    if (fs.existsSync(ledgerPath)) {
      ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    }
    ledger.jobs.push({
      company: 'Spector.ai',
      role: 'Fullstack Software Engineer (Bengaluru Hybrid)',
      url: url,
      channel: 'Ashby Direct ATS (Candidate #6 Confirmed)',
      proof_screenshot: proofPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    ledger.total = ledger.jobs.length;
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
    console.log('[Spector.ai] Appended to File 5! Total applied today:', ledger.total);
    await page.close();
  } else {
    console.log('[Spector.ai] Errors:', result.errors);
  }

  await browser.disconnect();
}

applySpectorAI().catch(console.error);
