const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const fs = require('fs');
const path = require('path');

async function autoApplyNaukriPureProgrammatic() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  const jobUrl = 'https://www.naukri.com/job-listings-react-mean-mern-node-js-developers-freshers-chennai-tvm-infotech-chennai-0-to-1-years-161026019268';
  console.log(`[Slot 7 Engine] Navigating to: ${jobUrl}`);
  await page.goto(jobUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));

  console.log('[Slot 7 Engine] Clicking Apply Button...');
  await page.locator('#apply-button, .apply-button, button.apply-btn').first().click();
  await new Promise(r => setTimeout(r, 4000));

  // Check if confirmation appeared or already applied
  const result = await page.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const success = /applied|already applied|application sent|successfully applied/i.test(text);
    return { success, snippet: text.substring(0, 300).replace(/\s+/g, ' ') };
  });

  console.log('[Slot 7 Engine] Live Post-Apply Result:', result);

  if (result.success) {
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
      url: jobUrl,
      channel: 'Naukri Direct 1-Click (Slot 7 Fully Automated)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    f5.total = f5.jobs.length;
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2));
    console.log('🎉 [FILE 5 LOCKED] 100% Fully Automated Submission Registered! Total today:', f5.total);
  }

  await page.close();
}

autoApplyNaukriPureProgrammatic().catch(console.error);
