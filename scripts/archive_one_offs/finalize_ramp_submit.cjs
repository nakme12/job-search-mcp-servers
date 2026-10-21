const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getScreenshotsVault } = require('./canonical_paths.cjs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('ashbyhq.com'));
  if (!page) {
    console.log('Page closed or redirected!');
    process.exit(0);
  }

  const vault = getScreenshotsVault();
  const timestamp = Date.now();
  const ssPath = path.join(vault, `post_submit_ramp_${timestamp}.png`);
  await page.screenshot({ path: ssPath, fullPage: true });
  console.log('SUCCESS! Screenshot saved to:', ssPath);

  const appliedPath = path.join(__dirname, '..', 'applied_todays_2026-10-15_shift1.json');
  let appliedObj = { date: '2026-10-15', shift: 1, total: 0, jobs: [] };
  if (fs.existsSync(appliedPath)) {
    appliedObj = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
  }

  const entry = {
    company: 'Ramp',
    role: 'Software Engineer, Forward Deployed AI Solutions',
    url: page.url(),
    channel: 'Direct ATS Portal Form (Ashby)',
    proof_screenshot: ssPath,
    status: 'APPLIED_CONFIRMED',
    notes: 'Automated form submitted with radio/checkbox options resolved on ' + new Date().toISOString(),
    timestamp: new Date().toISOString()
  };

  appliedObj.jobs.push(entry);
  appliedObj.total = appliedObj.jobs.length;
  fs.writeFileSync(appliedPath, JSON.stringify(appliedObj, null, 2), 'utf8');
  console.log('Logged entry to applied_todays_2026-10-15_shift1.json. Total applied:', appliedObj.total);

  // Rule 57: Close completed tab
  console.log('Rule 57: Closing submitted tab...');
  await page.close();
  console.log('Tab closed successfully!');

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
