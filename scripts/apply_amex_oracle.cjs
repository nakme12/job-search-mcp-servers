const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function applyAmexFull() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const url = 'https://egug.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/26014930/apply/email';
  console.log('[Amex Oracle ATS] Navigating directly to email screen:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

  // 1. Enter email
  await page.evaluate(() => {
    const email = document.getElementById('primary-email-0');
    if (email) {
      email.focus();
      email.value = 'pratikpatidar7990@gmail.com';
      email.dispatchEvent(new Event('input', { bubbles: true }));
      email.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // Tick legal checkbox
    const cb = document.getElementById('legal-disclaimer-checkbox');
    if (cb && !cb.checked) {
      cb.click();
      cb.checked = true;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  // 2. Click Continue button
  console.log('[Amex Oracle ATS] Clicking Continue button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const contBtn = btns.find(b => b.innerText.trim().toLowerCase().includes('continue') || b.innerText.trim().toLowerCase().includes('next'));
    if (contBtn) contBtn.click();
  });

  await new Promise(r => setTimeout(r, 5000));
  console.log('[Amex Oracle ATS] URL after continue:', page.url());

  const state = await page.evaluate(() => {
    return {
      bodySnippet: document.body.innerText.substring(0, 600),
      inputs: Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        label: i.getAttribute('aria-label')
      }))
    };
  });
  console.log('[Amex Oracle ATS] Next screen state:', state.bodySnippet.replace(/\n+/g, ' '));
  console.log('[Amex Oracle ATS] Inputs count:', state.inputs.length);

  const proofDir = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1');
  fs.mkdirSync(proofDir, { recursive: true });
  const auditPath = path.join(proofDir, 'amex_step2_audit.png');
  await page.screenshot({ path: auditPath });
  console.log('[Amex Oracle ATS] Step 2 screenshot saved:', auditPath);

  await page.close();
  await browser.disconnect();
}

applyAmexFull().catch(console.error);
