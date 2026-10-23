const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function applyAvocaFixed() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const url = 'https://jobs.ashbyhq.com/avoca/ec05c135-ab26-437a-8fe9-f7a5c4da08e5/application';
  console.log('[Avoca Ashby] Opening application:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });

  // 1. Upload resume
  const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - React Developer.pdf');
  console.log('[Avoca Ashby] Uploading resume:', resumePath);
  const fileInputs = await page.$$('input[type="file"]');
  const targetFileInput = fileInputs.length > 1 ? fileInputs[1] : fileInputs[0];
  if (targetFileInput) {
    await targetFileInput.uploadFile(resumePath);
    await new Promise(r => setTimeout(r, 3000));
  }

  // 2. Set value using HTMLInputElement.prototype descriptor
  await page.evaluate(() => {
    function setFieldVal(id, val) {
      const el = document.getElementById(id);
      if (!el) return;
      const proto = window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    setFieldVal('_systemfield_name', 'Pratik Patidar');
    setFieldVal('_systemfield_email', 'pratikpatidar7990@gmail.com');
    setFieldVal('85084e5c-a402-47b7-97d4-642a7efa0ecd', '+91 82696 47990');
    setFieldVal('93865842-fbf1-42b8-984a-9040cab95f75', 'https://www.linkedin.com/in/pratik-patidar');

    // EEOC radios
    const male = document.getElementById('92b80f27-f197-44db-b771-b2e6e71c930a__systemfield_eeoc_gender-labeled-radio-0');
    if (male) male.click();
    const asian = document.getElementById('92b80f27-f197-44db-b771-b2e6e71c930a__systemfield_eeoc_race-labeled-radio-4');
    if (asian) asian.click();
    const vet = document.getElementById('92b80f27-f197-44db-b771-b2e6e71c930a__systemfield_eeoc_veteran_status-labeled-radio-1');
    if (vet) vet.click();
  });

  await new Promise(r => setTimeout(r, 1500));

  // 3. Submit
  console.log('[Avoca Ashby] Submitting form...');
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

  console.log('[Avoca Ashby] Post-submit result:', result);

  const proofDir = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1');
  fs.mkdirSync(proofDir, { recursive: true });
  const proofPath = path.join(proofDir, 'avoca_ashby_confirmed.png');
  await page.screenshot({ path: proofPath, fullPage: true });

  if (result.isSuccess) {
    console.log('[Avoca Ashby] Submission Confirmed! Saved screenshot:', proofPath);
    const ledgerPath = path.resolve('C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json');
    let ledger = { date: '2026-10-23', cycle: 'Cycle 1 (11:00 AM - 03:00 PM)', total: 0, jobs: [] };
    if (fs.existsSync(ledgerPath)) {
      ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    }
    ledger.jobs.push({
      company: 'Avoca',
      role: 'Software Engineer (Product) - Bengaluru Hybrid',
      url: url,
      channel: 'Ashby Direct ATS (Candidate #7 Confirmed)',
      proof_screenshot: proofPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    ledger.total = ledger.jobs.length;
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
    console.log('[Avoca Ashby] Appended to File 5! Total applied today:', ledger.total);
    await page.close();
  } else {
    console.log('[Avoca Ashby] Errors:', result.errors);
  }

  await browser.disconnect();
}

applyAvocaFixed().catch(console.error);
