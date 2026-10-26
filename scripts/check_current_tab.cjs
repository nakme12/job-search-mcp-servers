const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (p) {
    console.log('Current URL:', p.url());
    console.log('Title:', await p.title());
    const snippet = await p.evaluate(() => document.body.innerText.slice(0, 300));
    console.log('Body snippet:', snippet);
  }
  b.disconnect();
})();
