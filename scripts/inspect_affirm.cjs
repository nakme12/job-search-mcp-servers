const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('affirm/jobs/8008649003'));
  if (page) {
    console.log('URL:', page.url());
    const errs = await page.evaluate(() => {
      const errNodes = Array.from(document.querySelectorAll('.error, [aria-invalid="true"], .field-error, div[class*="error"], span[class*="error"], p[class*="error"]'));
      return errNodes.map(n => n.innerText).filter(t => t && t.trim().length > 0);
    });
    console.log('Errors:', JSON.stringify(errs, null, 2));
    const title = await page.title();
    console.log('Title:', title);
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    console.log('Body snippet:\n', bodyText);
  } else {
    console.log('No Affirm page found');
  }
  browser.disconnect();
})();
