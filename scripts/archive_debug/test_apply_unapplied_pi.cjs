const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();

  // Test Finflock Systems
  const testUrl = 'https://www.placementindia.com/job-detail/full-stack-developer-in-finflock-systems-private-limited-at-delhi-1376651.htm';
  console.log(`Navigating to: ${testUrl}`);
  await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(2500);

  const audit = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    const isAlreadyApplied = text.includes('applied on') || text.includes('already applied');
    const applyBtn = Array.from(document.querySelectorAll('a, button')).find(b => (b.innerText || '').trim().toLowerCase() === 'apply');
    return { isAlreadyApplied, hasApplyBtn: !!applyBtn, btnText: applyBtn?.innerText };
  });

  console.log('Audit before click:', audit);

  if (!audit.isAlreadyApplied && audit.hasApplyBtn) {
    console.log('Clicking Apply...');
    await page.evaluate(() => {
      const applyBtn = Array.from(document.querySelectorAll('a, button')).find(b => (b.innerText || '').trim().toLowerCase() === 'apply');
      if (applyBtn) applyBtn.click();
    });
    await sleep(3500);

    const postClick = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const success = text.includes('you have applied successfully') || text.includes('application submitted') || text.includes('applied successfully');
      return { success, snippet: document.body.innerText.substring(0, 300).replace(/\n+/g, ' ') };
    });

    console.log('Post click result:', postClick);

    const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\placementindia_finflock_test.png';
    await page.screenshot({ path: ssPath, fullPage: false });
    console.log('Screenshot saved to:', ssPath);
  }

  await page.close();
  await browser.disconnect();
})();
