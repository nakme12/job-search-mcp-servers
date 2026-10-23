const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const fs = require('fs');
const path = require('path');

async function testApplyFromHome() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();

  const targetJob = 'https://www.naukri.com/job-listings-react-mean-mern-node-js-developers-freshers-chennai-tvm-infotech-chennai-0-to-1-years-161026019268';
  console.log('Navigating to job page from active session...');
  await page.goto(targetJob, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000));

  // Find apply button
  const applyBtn = await page.$('.apply-button');
  console.log('Apply button handle found?:', !!applyBtn);

  if (applyBtn) {
    console.log('Clicking Apply button...');
    await applyBtn.click();
    await new Promise(r => setTimeout(r, 5000));

    const checkText = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const isSuccess = /already applied|application submitted|successfully applied|applied/i.test(text);
      const applyBtnText = document.querySelector('.apply-button')?.innerText || '';
      return { isSuccess, applyBtnText, snippet: text.substring(0, 300).replace(/\s+/g, ' ') };
    });

    console.log('Post-click evaluation:', JSON.stringify(checkText, null, 2));

    if (checkText.isSuccess || checkText.applyBtnText.toLowerCase().includes('applied')) {
      console.log('🎉 100% PROGRAMMATIC SUBMISSION DETECTED ON NAUKRI!');
      const dateStr = new Date().toISOString().split('T')[0];
      const vaultDir = path.join('C:/mcp/job-search-mcp-engine/screenshots', dateStr, 'shift2');
      fs.mkdirSync(vaultDir, { recursive: true });
      const ssPath = path.join(vaultDir, `naukri_tvm_infotech_${Date.now()}.png`);
      await page.screenshot({ path: ssPath, fullPage: true });
      console.log('📸 Proof screenshot captured:', ssPath);

      // Save to File 5
      const f5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-22.json';
      let f5 = { date: dateStr, shift: 2, total: 0, jobs: [] };
      if (fs.existsSync(f5Path)) {
        try { f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8')); } catch(e){}
      }
      f5.jobs.push({
        company: 'TVM Infotech',
        role: 'React, MEAN/MERN & Node.js Developers - Freshers',
        url: targetJob,
        channel: 'Naukri Direct 1-Click (100% Automated Script)',
        proof_screenshot: ssPath,
        status: 'APPLIED_CONFIRMED',
        timestamp: new Date().toISOString()
      });
      f5.total = f5.jobs.length;
      fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2));
      console.log('✅ [FILE 5 LOCKED] Submission registered! Total applied today:', f5.total);
    }
  }

  await page.close();
}

testApplyFromHome().catch(console.error);
