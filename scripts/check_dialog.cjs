const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (p) {
    const info = await p.evaluate(() => {
      const composeBox = document.querySelector('div[role="dialog"]');
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        name: i.name,
        ariaLabel: i.getAttribute('aria-label'),
        placeholder: i.placeholder,
        value: i.value
      }));
      return { hasDialog: !!composeBox, inputs: inputs.filter(i => i.name || i.ariaLabel || i.value) };
    });
    console.log(JSON.stringify(info, null, 2));
  }
  b.disconnect();
})();
