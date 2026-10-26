const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('career.infosys.com'));
    if (!page) {
      b.disconnect();
      return;
    }
    await page.bringToFront();

    console.log('Navigating to myapplication...');
    await page.goto('https://career.infosys.com/jobs/myapplication', { waitUntil: 'domcontentloaded' });
    await sleep(3000);

    // Click "Rejected" tab
    console.log('Clicking "Rejected" tab...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.mat-mdc-tab, div[role="tab"], span.mdc-tab__text-label, a, button'));
      const rejTab = tabs.find(t => t.innerText.trim().toUpperCase() === 'REJECTED');
      if (rejTab) rejTab.click();
    });
    await sleep(3000);

    const rejData = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.card, .job-card, .application-card, mat-card, .row, div[role="tabpanel"]')).map(el => el.innerText.trim()).filter(t => t.length > 15);
      return {
        rejectedTabSnippet: document.querySelector('div[role="tabpanel"]')?.innerText || 'none',
        cards: cards.slice(0, 10)
      };
    });

    console.log('=== REJECTED TAB DATA ===');
    console.log(JSON.stringify(rejData, null, 2));

    browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    if (browser) browser.disconnect();
  }
})();
