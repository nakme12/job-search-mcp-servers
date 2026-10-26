const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('career.infosys.com'));
  if (p) {
    const html = await p.evaluate(() => {
      const container = document.querySelector('mat-dialog-container, .modal, .forgot-password, form') || document.body;
      return container.innerHTML.slice(0, 1500);
    });
    console.log('HTML snippet:\n', html);
  }
  b.disconnect();
})();
