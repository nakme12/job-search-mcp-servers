const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('career.infosys.com'));
    if (!page) {
      console.log('No page');
      return;
    }
    await page.bringToFront();

    // Click "Applied" tab
    console.log('Clicking "Applied" tab...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.mat-mdc-tab, div[role="tab"], span.mdc-tab__text-label, a, button'));
      const appliedTab = tabs.find(t => t.innerText.trim().toUpperCase() === 'APPLIED');
      if (appliedTab) appliedTab.click();
    });
    await sleep(3500);

    const appliedData = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.card, .job-card, .application-card, mat-card, .row, div[role="tabpanel"]')).map(el => el.innerText.trim()).filter(t => t.length > 15);
      return {
        appliedTabSnippet: document.querySelector('div[role="tabpanel"]')?.innerText || 'none',
        cards: cards.slice(0, 10)
      };
    });

    console.log('=== APPLIED TAB CONTENT ===');
    console.log(JSON.stringify(appliedData, null, 2));

    // Also check "Review and Save Profile" button link
    const profileBtn = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('a, button')).find(b => b.innerText.includes('Review and Save Profile'));
      return btn ? { text: btn.innerText, href: btn.href || null } : null;
    });
    console.log('Profile Button:', profileBtn);

    browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    if (browser) browser.disconnect();
  }
})();
