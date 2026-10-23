const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const targetJob = {
  company: 'VersatileIT',
  role: 'React.js Developer',
  url: 'https://www.naukri.com/job-listings-react-js-developer-versatileit-surat-0-to-1-years-191026504377'
};

async function applyNaukriJob(job) {
  console.log(`\n======================================================`);
  console.log(`[NAUKRI DIRECT 1-CLICK] Targeting: ${job.company} - ${job.role}`);
  console.log(`URL: ${job.url}`);
  console.log(`======================================================`);

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

  console.log('[1] Navigating to job listing page...');
  await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Check if already applied or apply button exists
  const applyBtnState = await page.evaluate(() => {
    const btn = document.querySelector('button#apply-button, button[class*="apply-button"]');
    const alreadyApplied = document.body ? document.body.innerText.toLowerCase().includes('already applied') : false;
    return {
      hasBtn: !!btn,
      btnText: btn ? btn.innerText.trim() : null,
      alreadyApplied
    };
  });
  console.log('[2] Page Button State:', applyBtnState);

  if (applyBtnState.alreadyApplied) {
    console.log('ℹ️ Already applied to this job earlier.');
    await page.close();
    return;
  }

  if (applyBtnState.hasBtn) {
    console.log('[3] Clicking #apply-button...');
    await page.click('button#apply-button');
    await page.waitForTimeout(4000);

    console.log('[4] API Response status:', applyResponse ? applyResponse.status : 'No direct API intercepted');
    console.log('[4] API Response body:', applyResponse ? JSON.stringify(applyResponse.body) : 'None');

    // Check DOM confirmation
    const isDomConfirmed = await page.evaluate(() => {
      const text = document.body ? document.body.innerText.toLowerCase() : '';
      return text.includes('successfully applied') || text.includes('application submitted') || text.includes('applied');
    });

    const isSuccess = (applyResponse && applyResponse.status === 200) || isDomConfirmed;
    if (isSuccess) {
      console.log('🎉🎉🎉 NAUKRI SUBMISSION CONFIRMED!');
      const dateStr = new Date().toISOString().split('T')[0];
      const vaultDir = path.join('C:/mcp/job-search-mcp-engine/screenshots', dateStr, 'shift1');
      fs.mkdirSync(vaultDir, { recursive: true });
      const ssPath = path.join(vaultDir, `naukri_${job.company.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.png`);
      await page.screenshot({ path: ssPath, fullPage: true });
      console.log('[5] Proof screenshot physically saved:', ssPath);

      // Save to File 5
      const f5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-22.json';
      let f5 = { date: dateStr, shift: 1, total: 0, jobs: [] };
      if (fs.existsSync(f5Path)) {
        try { f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8')); } catch(e){}
      }
      f5.jobs.push({
        company: job.company,
        role: job.role,
        url: job.url,
        channel: 'Naukri Direct 1-Click (Slot 7 Fully Automated)',
        proof_screenshot: ssPath,
        status: 'APPLIED_CONFIRMED',
        timestamp: new Date().toISOString()
      });
      f5.total = f5.jobs.length;
      fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2));
      console.log('[6] ✅ [FILE 5 LOCKED] Total applied today:', f5.total);
    } else {
      console.log('⚠️ Could not confirm submission. Inspecting further...');
    }
  } else {
    console.log('⚠️ Apply button not found on page.');
  }

  await page.close();
  console.log('[7] Tab closed per Rule 57.');
}

applyNaukriJob(targetJob).then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Error applying to Naukri job:', err);
  process.exit(1);
});
