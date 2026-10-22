const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const fs = require('fs');
const path = require('path');

async function checkNaukriApplyResponse() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  let applyResponse = null;
  page.on('response', async res => {
    if (res.url().includes('apply-workflow/v1/apply')) {
      try {
        applyResponse = { status: res.status(), body: await res.json() };
      } catch(e) {
        applyResponse = { status: res.status(), body: await res.text() };
      }
    }
  });

  const jobUrl = 'https://www.naukri.com/job-listings-react-mean-mern-node-js-developers-freshers-chennai-tvm-infotech-chennai-0-to-1-years-161026019268';
  await page.goto(jobUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));
  
  await page.click('button#apply-button');
  await new Promise(r => setTimeout(r, 4000));

  console.log('NAUKRI LIVE APPLY RESPONSE STATUS:', applyResponse ? applyResponse.status : 'None');

  if (applyResponse && applyResponse.status === 200) {
    console.log('🎉 100% PROGRAMMATIC NAUKRI SUBMISSION CONFIRMED!');
    const dateStr = new Date().toISOString().split('T')[0];
    const vaultDir = path.join('C:/mcp/job-search-mcp-engine/screenshots', dateStr, 'shift2');
    fs.mkdirSync(vaultDir, { recursive: true });
    const ssPath = path.join(vaultDir, `naukri_tvm_infotech_${Date.now()}.png`);
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log('Proof screenshot saved:', ssPath);

    // Save to File 5
    const f5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-22.json';
    let f5 = { date: dateStr, shift: 2, total: 0, jobs: [] };
    if (fs.existsSync(f5Path)) {
      try { f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8')); } catch(e){}
    }
    f5.jobs.push({
      company: 'TVM Infotech',
      role: 'React, MEAN/MERN & Node.js Developers - Freshers',
      url: jobUrl,
      channel: 'Naukri Direct 1-Click (Slot 7 Fully Automated)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    f5.total = f5.jobs.length;
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2));
    console.log('✅ [FILE 5 LOCKED] Submission recorded! Total applied today:', f5.total);
  }

  await page.close();
}

checkNaukriApplyResponse().catch(console.error);
