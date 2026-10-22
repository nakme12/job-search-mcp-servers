const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  let page;
  try {
    console.log('[PI Test] Connecting to Brave...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

    page = await browser.newPage();
    const testUrl = 'https://www.placementindia.com/job-detail/react-js-developer-in-gloomshine-services-private-limited-at-sector-63-noida-1350158.htm';
    console.log(`[PI Test] Navigating to: ${testUrl}`);
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(3000);

    // Click Apply button
    console.log('[PI Test] Looking for Apply button...');
    const applyClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a, button, input[type="button"]'));
      const btn = btns.find(b => {
        const t = (b.innerText || b.value || '').trim().toLowerCase();
        return t === 'apply' || t === 'apply now' || t.includes('apply on');
      });
      if (btn) {
        btn.click();
        return btn.innerText || btn.value;
      }
      return null;
    });

    console.log(`[PI Test] Clicked apply button: "${applyClicked}"`);
    await sleep(2500);

    // Check modal or form
    const formCheck = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
        tag: i.tagName,
        type: i.type,
        name: i.name,
        id: i.id,
        placeholder: i.placeholder,
        visible: i.offsetParent !== null
      }));
      const text = document.body.innerText.substring(0, 500);
      return { inputsCount: inputs.length, visibleInputs: inputs.filter(i => i.visible).slice(0, 15) };
    });

    console.log('[PI Test] Form elements found:\n', JSON.stringify(formCheck, null, 2));

    await page.screenshot({ path: 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\pi_test_modal.png' });
    console.log('[PI Test] Screenshot saved.');

  } catch (err) {
    console.error('[PI Test] Error:', err.message);
  } finally {
    if (page) await page.close();
    if (browser) await browser.disconnect();
  }
})();
