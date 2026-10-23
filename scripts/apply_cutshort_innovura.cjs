const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function applyCutshortInnovura() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const url = 'https://cutshort.io/job/React-js-Developer-Ahmedabad-Vadodara-Mumbai-Innovura-Technologies-Private-Limited-77hmsRTb';
  console.log('[Cutshort Innovura] Opening URL:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });

  // 1. Click "Apply to this job"
  console.log('[Cutshort Innovura] Clicking Apply button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText && b.innerText.toLowerCase().includes('apply to this job'));
    if (btns.length > 0) btns[0].click();
  });

  await new Promise(r => setTimeout(r, 4000));

  // 2. Check modal / application drawer / questions
  const state = await page.evaluate(() => {
    const text = document.body.innerText;
    const isApplied = text.includes('Application submitted') || 
                      text.includes('Applied') || 
                      text.includes('Application sent') ||
                      text.includes('You have applied');
    const modals = Array.from(document.querySelectorAll('div[role="dialog"], div[class*="modal"], div[class*="drawer"]')).map(d => d.innerText.substring(0, 300));
    const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(i => ({
      id: i.id, name: i.name, type: i.type, placeholder: i.placeholder, visible: i.offsetParent !== null
    }));
    return { isApplied, modals, inputs, textSnippet: text.substring(0, 400) };
  });

  console.log('[Cutshort Innovura] Post-click state:', state);

  // Take screenshot
  const proofDir = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1');
  fs.mkdirSync(proofDir, { recursive: true });
  const proofPath = path.join(proofDir, 'cutshort_innovura_confirmed.png');
  await page.screenshot({ path: proofPath, fullPage: true });

  if (state.isApplied) {
    console.log('[Cutshort Innovura] Confirmed applied! Screenshot saved:', proofPath);
    const ledgerPath = path.resolve('C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json');
    let ledger = { date: '2026-10-23', cycle: 'Cycle 1 (11:00 AM - 03:00 PM)', total: 0, jobs: [] };
    if (fs.existsSync(ledgerPath)) {
      ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    }
    ledger.jobs.push({
      company: 'Innovura Technologies Private Limited',
      role: 'React.js Developer',
      url: url,
      channel: 'Cutshort (Resolved from Adzuna)',
      proof_screenshot: proofPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    ledger.total = ledger.jobs.length;
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
    console.log('[Cutshort Innovura] Saved to applied_todays_2026-10-23.json. Today total applied:', ledger.total);
    await page.close();
  } else {
    console.log('[Cutshort Innovura] Modal opened, needs review or inputs.');
  }

  await browser.disconnect();
}

applyCutshortInnovura().catch(console.error);
