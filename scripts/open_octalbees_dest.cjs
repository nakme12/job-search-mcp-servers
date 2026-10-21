const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const octalbees = pages.find(p => p.url().includes('5925630660'));
  if (octalbees) {
    const dest = await octalbees.evaluate(() => {
      const a = document.querySelector('a[href*="/land/ad/"]');
      return a ? a.href : null;
    });
    if (dest) {
      console.log('Navigating to landing URL:', dest);
      await octalbees.goto(dest, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await new Promise(r => setTimeout(r, 4000));
      console.log('Landing URL reached:', octalbees.url());
      console.log('Landing Page Title:', await octalbees.title());
    }
  }
  browser.disconnect();
})();
