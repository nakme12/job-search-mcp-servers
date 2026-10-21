const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const octalbees = pages.find(p => p.url().includes('5925630660'));
  if (octalbees) {
    console.log('Inspecting Octalbees Tab...');
    const details = await octalbees.evaluate(() => {
      const applyBtn = document.querySelector('a.apply_button, a[href*="apply"], a[href*="redirect"]');
      return {
        url: window.location.href,
        btnText: applyBtn ? applyBtn.innerText : 'No apply button',
        btnHref: applyBtn ? applyBtn.href : null
      };
    });
    console.log(JSON.stringify(details, null, 2));
  }
  browser.disconnect();
})();
