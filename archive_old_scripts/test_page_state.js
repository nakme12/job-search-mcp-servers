import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
  console.log('URL:', page.url());
  console.log('Title:', await page.title());
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
  console.log('Body snippet:\n', bodyText);
  process.exit(0);
})();
