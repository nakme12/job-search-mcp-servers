const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function testPhysicalClick() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const url = 'https://www.naukri.com/job-listings-react-mean-mern-node-js-developers-freshers-chennai-tvm-infotech-chennai-0-to-1-years-161026019268';
  console.log('[TVM Infotech] Opening URL:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });

  const btn = await page.$('#apply-button');
  if (btn) {
    console.log('[TVM Infotech] Clicking #apply-button via CDP...');
    await btn.click({ delay: 100 });
    await new Promise(r => setTimeout(r, 4000));
    
    // Check if modal or apply questions appeared
    const state = await page.evaluate(() => {
      const text = document.body.innerText;
      const isApplied = text.includes('Already Applied') || text.includes('Applied') || text.includes('successfully applied');
      const modals = Array.from(document.querySelectorAll('div[class*="modal"], div[class*="drawer"], div[role="dialog"]')).map(d => d.innerText.substring(0, 200));
      return { isApplied, modals };
    });
    console.log('[TVM Infotech] Result state:', state);

    if (state.isApplied) {
      const proofDir = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1');
      fs.mkdirSync(proofDir, { recursive: true });
      const proofPath = path.join(proofDir, 'tvm_infotech_confirmed.png');
      await page.screenshot({ path: proofPath, fullPage: true });
      console.log('[TVM Infotech] Screenshot saved:', proofPath);

      // Save to File 5
      const ledgerPath = path.resolve('C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json');
      let ledger = { date: '2026-10-23', cycle: 'Cycle 1 (11:00 AM - 03:00 PM)', total: 0, jobs: [] };
      if (fs.existsSync(ledgerPath)) {
        ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
      }
      ledger.jobs.push({
        company: 'TVM Infotech Private Limited',
        role: 'React, MEAN/MERN & Node.js Developers - Freshers(Chennai)',
        url: url,
        channel: 'Naukri Direct 1-Click Apply',
        proof_screenshot: proofPath,
        status: 'APPLIED_CONFIRMED',
        timestamp: new Date().toISOString()
      });
      ledger.total = ledger.jobs.length;
      fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
      console.log('[TVM Infotech] Confirmed applied! Total applied today:', ledger.total);
    }
  }

  await page.close();
  await browser.disconnect();
}

testPhysicalClick().catch(console.error);
