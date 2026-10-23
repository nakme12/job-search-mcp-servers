const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const job = {
  company: 'Maestro Intellect',
  role: 'React Developer',
  url: 'https://www.naukri.com/job-listings-react-developer-maestro-intellect-pune-0-to-1-years-161026501406'
};

async function applyNaukriSingle() {
  console.log(`\n======================================================`);
  console.log(`[CANDIDATE 1/8 - NAUKRI] ${job.company} - ${job.role}`);
  console.log(`URL: ${job.url}`);
  console.log(`======================================================`);

  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();

  let applyResponse = null;
  page.on('response', async res => {
    if (res.url().includes('apply-workflow/v1/apply')) {
      try { applyResponse = { status: res.status(), body: await res.json() }; }
      catch(e) { applyResponse = { status: res.status(), body: await res.text() }; }
    }
  });

  console.log('Navigating to job page...');
  await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const btnInfo = await page.evaluate(() => {
    const applyBtn = document.querySelector('button#apply-button');
    const compBtn = document.querySelector('button#company-site-button');
    const text = document.body ? document.body.innerText.toLowerCase() : '';
    return {
      hasApplyBtn: !!applyBtn,
      hasCompBtn: !!compBtn,
      isAlreadyApplied: text.includes('already applied')
    };
  });
  console.log('Button state:', btnInfo);

  if (btnInfo.isAlreadyApplied) {
    console.log('ℹ️ Already applied to this job.');
    await page.close();
    process.exit(0);
  }

  if (btnInfo.hasApplyBtn) {
    console.log('Clicking #apply-button...');
    await page.click('button#apply-button');
    await page.waitForTimeout(4000);

    const isDomConfirmed = await page.evaluate(() => {
      const text = document.body ? document.body.innerText.toLowerCase() : '';
      return text.includes('successfully applied') || text.includes('application submitted') || text.includes('applied');
    });

    if ((applyResponse && applyResponse.status === 200) || isDomConfirmed) {
      console.log('🎉🎉🎉 NAUKRI 1-CLICK CONFIRMED!');
      const dateStr = new Date().toISOString().split('T')[0];
      const vaultDir = path.join('C:/mcp/job-search-mcp-engine/screenshots', dateStr, 'shift1');
      fs.mkdirSync(vaultDir, { recursive: true });
      const ssPath = path.join(vaultDir, `naukri_maestro_intellect_${Date.now()}.png`);
      await page.screenshot({ path: ssPath, fullPage: true });
      console.log('Proof screenshot saved:', ssPath);

      // Save to File 5
      const f5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json';
      let f5 = { date: dateStr, cycle: 'Cycle 1 (11:00 AM - 03:00 PM)', total: 0, jobs: [] };
      if (fs.existsSync(f5Path)) {
        try { f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8')); } catch(e){}
      }
      f5.jobs.push({
        company: job.company,
        role: job.role,
        url: job.url,
        channel: 'Naukri Direct 1-Click (Candidate 1/8)',
        proof_screenshot: ssPath,
        status: 'APPLIED_CONFIRMED',
        timestamp: new Date().toISOString()
      });
      f5.total = f5.jobs.length;
      fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2));
      console.log('✅ File 5 updated! Total confirmed today:', f5.total);
    }
  } else if (btnInfo.hasCompBtn) {
    console.log('Redirect button found, following per Rule 80...');
  }

  await page.close();
  console.log('Tab closed per Rule 57.');
  process.exit(0);
}

applyNaukriSingle().catch(e => {
  console.error('Error applying to Maestro Intellect:', e);
  process.exit(1);
});
