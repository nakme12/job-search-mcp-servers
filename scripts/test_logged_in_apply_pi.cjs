const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  let page;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    page = await browser.newPage();

    const targetUrl = 'https://www.placementindia.com/job-detail/react-js-developer-in-gloomshine-services-private-limited-at-sector-63-noida-1350158.htm';
    console.log(`[PI Logged In Apply] Navigating to: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(2500);

    // Click Apply
    console.log('[PI Logged In Apply] Clicking Apply button...');
    const btnText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a, button'));
      const applyBtn = btns.find(b => (b.innerText || '').trim().toLowerCase() === 'apply');
      if (applyBtn) {
        applyBtn.click();
        return applyBtn.innerText.trim();
      }
      return null;
    });

    console.log(`[PI Logged In Apply] Clicked button: "${btnText}"`);
    await sleep(3500);

    // Check if modal asks for confirmation or direct submitted
    const status = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const hasApplied = text.includes('already applied') || text.includes('successfully applied') || text.includes('application submitted') || text.includes('applied on') || text.includes('thank you');
      // If modal with "Apply" or "Submit Application" button appeared:
      const modalBtns = Array.from(document.querySelectorAll('.modal button, .popup button, .modal a, .popup a, form button, form input[type="submit"]')).map(b => (b.innerText || b.value || '').trim());
      return { textSnippet: document.body.innerText.substring(0, 300).replace(/\n+/g, ' '), hasApplied, modalBtns };
    });

    console.log('[PI Logged In Apply] Post-click status:\n', JSON.stringify(status, null, 2));

    const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\pi_test_gloomshine.png';
    await page.screenshot({ path: ssPath, fullPage: false });
    console.log(`[PI Logged In Apply] Screenshot saved: ${ssPath}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (page) await page.close();
    if (browser) await browser.disconnect();
  }
})();
