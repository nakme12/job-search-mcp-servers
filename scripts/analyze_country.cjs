const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('affirm'));
  if (!page) {
    console.log('Affirm page not found');
    browser.disconnect();
    return;
  }

  const html = await page.evaluate(() => {
    const el = document.getElementById('country');
    if (!el) return 'No element with id country';
    const container = el.closest('div');
    return {
      id: el.id,
      className: el.className,
      value: el.value,
      parentClass: container ? container.className : null,
      parentHtml: container ? container.innerHTML : null
    };
  });

  console.log('Country Element Analysis:', JSON.stringify(html, null, 2));
  browser.disconnect();
})();
