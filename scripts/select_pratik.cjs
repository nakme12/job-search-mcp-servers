const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await b.pages();
  const popup = pages.find(p => p.url().includes('accounts.google.com'));
  if (popup) {
    console.log('Clicking Pratik Patidar account...');
    await popup.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div[data-email], div[role="link"], li'));
      const pratik = items.find(el => el.innerText.includes('pratikpatidar7990@gmail.com') || el.getAttribute('data-email') === 'pratikpatidar7990@gmail.com');
      if (pratik) {
        pratik.click();
      }
    });

    await new Promise(r => setTimeout(r, 4000));
    console.log('Clicked. Checking if popup closed or redirected...');
  }
  b.disconnect();
})();
