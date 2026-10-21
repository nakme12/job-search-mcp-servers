import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null, protocolTimeout: 60000 });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('placementindia.com'));
  if (!page) {
    console.log('No placementindia tab found');
    await browser.disconnect();
    return;
  }

  const errs = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*')).filter(el => {
      const cls = (el.className || '').toString().toLowerCase();
      const id = (el.id || '').toLowerCase();
      return (cls.includes('error') || id.includes('error')) && window.getComputedStyle(el).display !== 'none' && el.innerText.trim().length > 0;
    });
    return all.map(e => ({ tag: e.tagName, id: e.id, class: e.className, text: e.innerText.trim() }));
  });

  console.log('Errors found:', errs);
  await browser.disconnect();
})();
