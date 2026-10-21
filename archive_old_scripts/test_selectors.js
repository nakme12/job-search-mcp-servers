import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
  if (!page) { console.log('No linkedin page'); return; }
  
  const selectors = [
    'li.reusable-search__result-container',
    'div.feed-shared-update-v2',
    'div[data-urn*="activity"]',
    'div.update-components-text',
    'div.search-results-container li',
    'div[data-view-name*="search"]'
  ];

  const counts = await page.evaluate((sels) => {
    return sels.map(s => ({ selector: s, count: document.querySelectorAll(s).length }));
  }, selectors);

  console.log(JSON.stringify(counts, null, 2));
  process.exit(0);
})();
